import { DurableObject } from "cloudflare:workers";

const SECURITY_HEADERS_BASE = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

const BLOCKED_PREFIXES = ["/.git", "/src/", "/node_modules/", "/wrangler.jsonc", "/cloudflare-upload/"];
const MAILERLITE_GROUPS = {
  silver: "188457997474727782",
  tech: "188458016342804399",
};
const MAX_JSON_BODY_BYTES = 4096;
const REEL_MEDIA_PREFIXES = ["/reels/", "/reels-x/"];
const MP4_CACHE_CONTROL = "public, max-age=31536000, immutable";

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export class SubmissionRateLimiter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          bucket TEXT PRIMARY KEY,
          window_started_at INTEGER NOT NULL,
          request_count INTEGER NOT NULL
        )
      `);
    });
  }

  async allow(bucket, limit, windowMs) {
    const now = Date.now();
    const current = this.ctx.storage.sql
      .exec(
        "SELECT window_started_at, request_count FROM rate_limits WHERE bucket = ?",
        bucket,
      )
      .toArray()[0];

    if (!current || now - current.window_started_at >= windowMs) {
      this.ctx.storage.sql.exec(
        `INSERT INTO rate_limits (bucket, window_started_at, request_count)
         VALUES (?, ?, 1)
         ON CONFLICT(bucket) DO UPDATE SET
           window_started_at = excluded.window_started_at,
           request_count = 1`,
        bucket,
        now,
      );
      return true;
    }

    if (current.request_count >= limit) {
      return false;
    }

    this.ctx.storage.sql.exec(
      "UPDATE rate_limits SET request_count = request_count + 1 WHERE bucket = ?",
      bucket,
    );
    return true;
  }
}

function buildCSP(nonce) {
  const scriptSrc = nonce ? `'self' 'nonce-${nonce}'` : `'self'`;
  return `default-src 'self'; style-src 'self' 'unsafe-inline'; script-src ${scriptSrc}; img-src 'self' data: https://images.pexels.com; connect-src 'self'; form-action 'self'; frame-ancestors 'self'`;
}

function withSecurityHeaders(response, nonce) {
  const secured = new Response(response.body, response);
  for (const [key, value] of Object.entries(SECURITY_HEADERS_BASE)) {
    secured.headers.set(key, value);
  }
  secured.headers.set("Content-Security-Policy", buildCSP(nonce));
  return secured;
}

function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function applyNonce(response, nonce) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  return new HTMLRewriter()
    .on("script", {
      element(element) {
        element.setAttribute("nonce", nonce);
      },
    })
    .transform(response);
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

function assertSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new RequestError("Invalid request origin.", 403);
  }
}

async function readJsonBody(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new RequestError("Content-Type must be application/json.", 415);
  }

  const contentLength = request.headers.get("Content-Length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (!Number.isFinite(parsedLength) || parsedLength < 0 || parsedLength > MAX_JSON_BODY_BYTES) {
      throw new RequestError("Request body is too large.", 413);
    }
  }

  if (!request.body) {
    throw new RequestError("Invalid JSON request.");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let totalBytes = 0;
  let body = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        await reader.cancel();
        throw new RequestError("Request body is too large.", 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError("Invalid JSON request.");
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new RequestError("Invalid JSON request.");
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidEmail(value) {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,63}$/.test(value)
  );
}

function cleanOptionalString(value, maxLength, fieldName) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") {
    throw new RequestError(`${fieldName} must be text.`);
  }
  const cleaned = value.trim();
  if (cleaned.length > maxLength || /[\u0000-\u001F\u007F]/.test(cleaned)) {
    throw new RequestError(`${fieldName} is invalid.`);
  }
  return cleaned;
}

function validateNewsletter(payload) {
  if (!isPlainObject(payload) || payload.website) {
    throw new RequestError("Invalid request.");
  }

  const newsletter = typeof payload.newsletter === "string" ? payload.newsletter : "";
  if (!Object.hasOwn(MAILERLITE_GROUPS, newsletter)) {
    throw new RequestError("Newsletter type is invalid.");
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  if (!isValidEmail(email)) {
    throw new RequestError("Email address is invalid.");
  }

  const name = cleanOptionalString(payload.name, 80, "Name");
  if (newsletter === "tech" && !name) {
    throw new RequestError("Name is required.");
  }

  return { newsletter, email, name };
}

function validateLead(payload) {
  if (!isPlainObject(payload) || payload.website) {
    throw new RequestError("Invalid request.");
  }

  const name = cleanOptionalString(payload.name, 100, "Name");
  const company = cleanOptionalString(payload.company, 120, "Company");
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const phone = cleanOptionalString(payload.phone, 40, "Phone");
  const message = cleanOptionalString(payload.message, 3000, "Message");

  if (!name || !message || !isValidEmail(email)) {
    throw new RequestError("Name, a valid email, and message are required.");
  }

  return { name, company, email, phone, message };
}

async function clientRateLimitKey(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceRateLimit(request, env, bucket, limit, windowMs) {
  if (!env.SUBMISSION_RATE_LIMITER) {
    console.error(JSON.stringify({ event: "rate_limiter_missing", bucket }));
    throw new RequestError("Submission service is not configured.", 503);
  }

  const key = await clientRateLimitKey(request);
  const limiter = env.SUBMISSION_RATE_LIMITER.getByName(key);
  if (!(await limiter.allow(bucket, limit, windowMs))) {
    throw new RequestError("Too many requests. Try again later.", 429);
  }
}

async function sendLeadToWebhook(payload, env) {
  const response = await fetch(env.LEAD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Webhook delivery failed with status ${response.status}.`);
}

async function sendLeadWithResend(payload, env) {
  const subject = `New Fused Distribution lead from ${payload.name}`;
  const lines = [
    `Name: ${payload.name}`,
    `Company: ${payload.company || "Not provided"}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || "Not provided"}`,
    "",
    "Message:",
    payload.message,
  ];
  const confirmationLines = [
    `Hi ${payload.name},`,
    "",
    "We received your message and will follow up shortly.",
    "",
    "If you have anything to add, just reply to this email.",
    "",
    "Fused Distribution",
    "help@fuseddistribution.com",
  ];

  const [internalResponse, confirmationResponse] = await Promise.all([
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.LEAD_FROM_EMAIL,
        to: [env.LEAD_DESTINATION_EMAIL],
        subject,
        text: lines.join("\n"),
      }),
    }),
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.LEAD_FROM_EMAIL,
        to: [payload.email],
        subject: "We received your request",
        text: confirmationLines.join("\n"),
      }),
    }),
  ]);

  if (!internalResponse.ok || !confirmationResponse.ok) {
    throw new Error("Email delivery failed.");
  }
}

async function fetchSpotRates(env) {
  const upstream = await fetch(
    `https://api.metalpriceapi.com/v1/latest?api_key=${env.METAL_PRICE_API_KEY}&base=USD&currencies=XAG,XAU`,
    { cf: { cacheTtl: 3600, cacheEverything: true } },
  );
  const data = await upstream.json();
  if (!upstream.ok || !data.success) return null;
  return { silver: data.rates.USDXAG, gold: data.rates.USDXAU };
}

function utcDateString(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

async function readPreviousSpot(env) {
  if (!env.SPOT_KV) return null;
  for (let i = 1; i <= 7; i++) {
    const date = utcDateString(-i);
    const raw = await env.SPOT_KV.get(`spot:${date}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.silver === "number" && typeof parsed.gold === "number") {
          return { silver: parsed.silver, gold: parsed.gold, date };
        }
      } catch {
        return null;
      }
      return null;
    }
  }
  return null;
}

async function handleSpot(env) {
  if (!env.METAL_PRICE_API_KEY) {
    return json({ error: "Spot price not configured." }, { status: 503 });
  }

  try {
    const rates = await fetchSpotRates(env);
    if (!rates) {
      return json({ error: "Upstream error." }, { status: 502 });
    }
    const prev = await readPreviousSpot(env);
    return json(prev ? { ...rates, prev } : rates);
  } catch {
    return json({ error: "Could not fetch spot price." }, { status: 502 });
  }
}

async function handleNewsletter(request, env) {
  assertSameOrigin(request);
  await enforceRateLimit(request, env, "newsletter", 5, 10 * 60_000);
  const subscription = validateNewsletter(await readJsonBody(request));

  if (!env.MAILERLITE_API_KEY) {
    return json({ error: "Newsletter signup is not configured." }, { status: 503 });
  }

  const subscriber = {
    email: subscription.email,
    groups: [MAILERLITE_GROUPS[subscription.newsletter]],
  };
  if (subscription.name) {
    subscriber.fields = { name: subscription.name };
  }

  try {
    const upstream = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${env.MAILERLITE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriber),
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      console.error(JSON.stringify({ event: "mailerlite_error", status: upstream.status }));
      return json({ error: "We could not complete signup right now. Please try again." }, { status: 502 });
    }

    return json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "mailerlite_request_failed", error: String(error) }));
    return json({ error: "We could not complete signup right now. Please try again." }, { status: 502 });
  }
}

async function handleLead(request, env) {
  assertSameOrigin(request);
  await enforceRateLimit(request, env, "lead", 5, 60_000);
  const submitted = validateLead(await readJsonBody(request));
  const lead = {
    ...submitted,
    source: "fuseddistribution.com",
    receivedAt: new Date().toISOString(),
  };

  try {
    if (env.LEAD_WEBHOOK_URL) {
      await sendLeadToWebhook(lead, env);
    } else if (env.RESEND_API_KEY && env.LEAD_DESTINATION_EMAIL && env.LEAD_FROM_EMAIL) {
      await sendLeadWithResend(lead, env);
    } else {
      return json({ error: "Lead capture is not configured." }, { status: 503 });
    }

    return json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "lead_submission_failed", error: String(error) }));
    return json(
      { error: "We could not send your request right now. Please try again shortly." },
      { status: 502 },
    );
  }
}

function methodNotAllowed(allowedMethod) {
  return json(
    { error: "Method not allowed." },
    { status: 405, headers: { Allow: allowedMethod } },
  );
}

function isReelMediaPath(pathname) {
  return REEL_MEDIA_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && pathname.endsWith(".mp4");
}

function parseByteRange(rangeHeader, size) {
  if (!rangeHeader) return null;
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return "invalid";

  const [, startText, endText] = match;
  if (!startText && !endText) return "invalid";

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return "invalid";
    const start = Math.max(size - suffixLength, 0);
    return { start, end: size - 1 };
  }

  const start = Number(startText);
  const end = endText ? Number(endText) : size - 1;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return "invalid";
  }

  return { start, end: Math.min(end, size - 1) };
}

async function handleReelMediaRequest(request, env, url) {
  if (!isReelMediaPath(url.pathname) || !env.REELS_KV) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return methodNotAllowed("GET, HEAD");
  }

  const key = decodeURIComponent(url.pathname.slice(1));
  const media = await env.REELS_KV.get(key, "arrayBuffer");
  if (!media) return null;

  const size = media.byteLength;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": MP4_CACHE_CONTROL,
    "Content-Type": "video/mp4",
    "Content-Length": String(size),
    "X-Fused-Media-Source": "reels-kv",
  });

  const range = parseByteRange(request.headers.get("Range"), size);
  if (range === "invalid") {
    return new Response(null, {
      status: 416,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes */${size}`,
        "Cache-Control": MP4_CACHE_CONTROL,
        "X-Fused-Media-Source": "reels-kv",
      },
    });
  }

  if (range) {
    const body = request.method === "HEAD" ? null : media.slice(range.start, range.end + 1);
    headers.set("Content-Length", String(range.end - range.start + 1));
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    return new Response(body, { status: 206, headers });
  }

  return new Response(request.method === "HEAD" ? null : media, { headers });
}

async function handleApiRequest(request, env, url) {
  if (url.pathname === "/api/spot") {
    return request.method === "GET" ? handleSpot(env) : methodNotAllowed("GET");
  }
  if (url.pathname === "/api/lead") {
    return request.method === "POST" ? handleLead(request, env) : methodNotAllowed("POST");
  }
  if (url.pathname === "/api/newsletter") {
    return request.method === "POST" ? handleNewsletter(request, env) : methodNotAllowed("POST");
  }
  return json({ error: "Not found." }, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const nonce = generateNonce();

    try {
      if (BLOCKED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
        return withSecurityHeaders(new Response("Not found.", { status: 404 }), null);
      }

      if (url.pathname.startsWith("/api/")) {
        return withSecurityHeaders(await handleApiRequest(request, env, url), null);
      }

      const reelMediaResponse = await handleReelMediaRequest(request, env, url);
      if (reelMediaResponse) {
        return withSecurityHeaders(reelMediaResponse, null);
      }

      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status === 404) {
        try {
          const notFound = await env.ASSETS.fetch(
            new Request(new URL("/404.html", request.url).toString()),
          );
          if (notFound.status === 200) {
            const headers = new Headers(notFound.headers);
            headers.delete("content-encoding");
            headers.delete("content-length");
            const response = new Response(notFound.body, { status: 404, headers });
            return withSecurityHeaders(await applyNonce(response, nonce), nonce);
          }
        } catch (error) {
          console.error(JSON.stringify({ event: "custom_404_failed", error: String(error) }));
        }
        return withSecurityHeaders(new Response("Not found.", { status: 404 }), null);
      }

      return withSecurityHeaders(await applyNonce(assetResponse, nonce), nonce);
    } catch (error) {
      if (error instanceof RequestError) {
        return withSecurityHeaders(json({ error: error.message }, { status: error.status }), null);
      }
      console.error(JSON.stringify({ event: "worker_request_failed", error: String(error) }));
      return withSecurityHeaders(json({ error: "Internal server error." }, { status: 500 }), null);
    }
  },

  async scheduled(event, env) {
    if (!env.METAL_PRICE_API_KEY || !env.SPOT_KV) return;
    try {
      const rates = await fetchSpotRates(env);
      if (!rates) return;
      await env.SPOT_KV.put(`spot:${utcDateString()}`, JSON.stringify(rates), {
        expirationTtl: 60 * 60 * 24 * 40,
      });
    } catch (error) {
      console.error(JSON.stringify({ event: "spot_snapshot_failed", error: String(error) }));
    }
  },
};
