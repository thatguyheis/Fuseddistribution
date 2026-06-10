const SECURITY_HEADERS_BASE = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

function buildCSP(nonce) {
  const scriptSrc = nonce ? `'self' 'nonce-${nonce}'` : `'self'`;
  return `default-src 'self'; style-src 'self' 'unsafe-inline'; script-src ${scriptSrc}; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'self'`;
}

function withSecurityHeaders(response, nonce) {
  const r = new Response(response.body, response);
  for (const [k, v] of Object.entries(SECURITY_HEADERS_BASE)) {
    r.headers.set(k, v);
  }
  r.headers.set("Content-Security-Policy", buildCSP(nonce));
  return r;
}

function generateNonce() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function applyNonce(response, nonce) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  return new HTMLRewriter()
    .on("script", { element(el) { el.setAttribute("nonce", nonce); } })
    .transform(response);
}

// In-memory rate limiter (per isolate; resets on isolate restart)
const rateLimitStore = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip) {
  const now = Date.now();
  // Evict expired entries when the map grows, so it can't grow unbounded
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore) {
      if (now > v.reset) rateLimitStore.delete(k);
    }
  }
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitStore.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

const BLOCKED_PREFIXES = ["/.git", "/src/", "/node_modules/", "/wrangler.jsonc", "/cloudflare-upload/"];

async function sendLeadToWebhook(payload, env) {
  const response = await fetch(env.LEAD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Webhook delivery failed.");
  }
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
    payload.message
  ];

  const confirmationLines = [
    `Hi ${payload.name},`,
    "",
    "We received your message and will follow up shortly.",
    "",
    "If you have anything to add, just reply to this email.",
    "",
    "Fused Distribution",
    "help@fuseddistribution.com"
  ];

  const [internalRes, confirmRes] = await Promise.all([
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: env.LEAD_FROM_EMAIL,
        to: [env.LEAD_DESTINATION_EMAIL],
        subject,
        text: lines.join("\n")
      })
    }),
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: env.LEAD_FROM_EMAIL,
        to: [payload.email],
        subject: "We received your request",
        text: confirmationLines.join("\n")
      })
    })
  ]);

  if (!internalRes.ok || !confirmRes.ok) {
    throw new Error("Email delivery failed.");
  }
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });
}

function validateLead(payload) {
  if (!payload || typeof payload !== "object") {
    return "Invalid request.";
  }

  if (payload.website) {
    return "Invalid request.";
  }

  if (!payload.name || !payload.email || !payload.message) {
    return "Name, email, and message are required.";
  }

  return null;
}

async function handleSpot(env) {
  if (!env.METAL_PRICE_API_KEY) {
    return json({ error: "Spot price not configured." }, { status: 503 });
  }
  try {
    const upstream = await fetch(
      `https://api.metalpriceapi.com/v1/latest?api_key=${env.METAL_PRICE_API_KEY}&base=USD&currencies=XAG,XAU`,
      { cf: { cacheTtl: 3600, cacheEverything: true } }
    );
    const data = await upstream.json();
    if (!data.success) return json({ error: "Upstream error." }, { status: 502 });
    return json({ silver: data.rates.USDXAG, gold: data.rates.USDXAU });
  } catch {
    return json({ error: "Could not fetch spot price." }, { status: 502 });
  }
}

async function handleLead(request, env) {
  const payload = await request.json().catch(() => null);
  const validationError = validateLead(payload);

  if (validationError) {
    return json({ error: validationError }, { status: 400 });
  }

  const lead = {
    name: payload.name.trim(),
    company: (payload.company || "").trim(),
    email: payload.email.trim(),
    phone: (payload.phone || "").trim(),
    message: payload.message.trim(),
    source: "fuseddistribution.com",
    receivedAt: new Date().toISOString()
  };

  try {
    if (env.LEAD_WEBHOOK_URL) {
      await sendLeadToWebhook(lead, env);
    } else if (
      env.RESEND_API_KEY &&
      env.LEAD_DESTINATION_EMAIL &&
      env.LEAD_FROM_EMAIL
    ) {
      await sendLeadWithResend(lead, env);
    } else {
      return json(
        {
          error:
            "Lead capture is not configured yet. Add LEAD_WEBHOOK_URL or the Resend email variables in Cloudflare."
        },
        { status: 503 }
      );
    }

    return json({ ok: true });
  } catch (error) {
    console.error("Lead submission failed", error);
    return json(
      { error: "We could not send your request right now. Please try again shortly." },
      { status: 500 }
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const nonce = generateNonce();

    if (BLOCKED_PREFIXES.some(p => url.pathname.startsWith(p))) {
      return withSecurityHeaders(new Response("Not found.", { status: 404 }), null);
    }

    if (url.pathname === "/api/spot" && request.method === "GET") {
      return withSecurityHeaders(await handleSpot(env), null);
    }

    if (url.pathname === "/api/lead" && request.method === "POST") {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      if (isRateLimited(ip)) {
        return withSecurityHeaders(
          json({ error: "Too many requests. Try again in a minute." }, { status: 429 }),
          null
        );
      }
      return withSecurityHeaders(await handleLead(request, env), null);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404) {
      try {
        const notFound = await env.ASSETS.fetch(
          new Request(new URL("/404.html", request.url).toString())
        );
        if (notFound.status === 200) {
          // Copy only safe headers — content-encoding/content-length from the
          // asset response describe the compressed stream and corrupt the reply.
          const h = new Headers(notFound.headers);
          h.delete("content-encoding");
          h.delete("content-length");
          const r404 = new Response(notFound.body, { status: 404, headers: h });
          return withSecurityHeaders(await applyNonce(r404, nonce), nonce);
        }
      } catch {}
      return withSecurityHeaders(new Response("Not found.", { status: 404 }), null);
    }

    return withSecurityHeaders(await applyNonce(assetResponse, nonce), nonce);
  }
};
