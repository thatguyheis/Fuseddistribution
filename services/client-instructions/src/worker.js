const MAX_TOKEN_LENGTH = 256;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Security-Policy": "default-src 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function reply(status, message, extraHeaders = {}, method = "GET") {
  return new Response(method === "HEAD" ? null : message, {
    status,
    headers: { ...RESPONSE_HEADERS, ...extraHeaders },
  });
}

function bearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  if (authorization.length > MAX_TOKEN_LENGTH + 7) return null;
  const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(authorization);
  return match && TOKEN_PATTERN.test(match[1]) ? match[1] : null;
}

async function tokenHash(token) {
  const bytes = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path !== "/v1/instructions/reel") return reply(404, "Not found.");
    if (request.method !== "GET" && request.method !== "HEAD") {
      return reply(405, "Method not allowed.", { Allow: "GET, HEAD" });
    }

    const token = bearerToken(request);
    if (!token) return reply(401, "Authentication required.", {}, request.method);

    try {
      const client = await env.DB.prepare(
        "SELECT id, paid, access_until, bundle_name FROM clients WHERE token_hash = ?",
      ).bind(await tokenHash(token)).first();
      if (!client) return reply(401, "Authentication required.", {}, request.method);
      if (client.paid !== 1 || (client.access_until && Date.parse(client.access_until) <= Date.now())) {
        return reply(403, "Instruction access is inactive.", {}, request.method);
      }
      if (client.access_until && !Number.isFinite(Date.parse(client.access_until))) {
        console.error(JSON.stringify({ event: "invalid_client_expiry", clientId: client.id }));
        return reply(503, "Instruction service unavailable.", {}, request.method);
      }

      const bundle = await env.DB.prepare(
        "SELECT version, body, sha256 FROM instruction_bundles WHERE name = ? ORDER BY id DESC LIMIT 1",
      ).bind(client.bundle_name).first();
      if (!bundle) {
        console.error(JSON.stringify({ event: "missing_instruction_bundle", clientId: client.id }));
        return reply(503, "Instruction service unavailable.", {}, request.method);
      }

      console.log(JSON.stringify({ event: "instruction_access", clientId: client.id, version: bundle.version }));
      return reply(200, bundle.body, {
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Instruction-Version": bundle.version,
        "X-Instruction-SHA256": bundle.sha256,
      }, request.method);
    } catch (error) {
      console.error(JSON.stringify({ event: "instruction_access_error", error: String(error) }));
      return reply(503, "Instruction service unavailable.", {}, request.method);
    }
  },
};
