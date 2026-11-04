import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";

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

async function authenticate(request, env) {
  const token = bearerToken(request);
  if (!token) return { status: 401 };

  const client = await env.DB.prepare(
    "SELECT id, paid, access_until, bundle_name FROM clients WHERE token_hash = ?",
  ).bind(await tokenHash(token)).first();
  if (!client) return { status: 401 };
  if (client.access_until && !Number.isFinite(Date.parse(client.access_until))) {
    console.error(JSON.stringify({ event: "invalid_client_expiry", clientId: client.id }));
    return { status: 503 };
  }
  if (client.paid !== 1 || (client.access_until && Date.parse(client.access_until) <= Date.now())) {
    return { status: 403 };
  }
  return { client };
}

async function instructionBundle(env, client) {
  const bundle = await env.DB.prepare(
    "SELECT version, body, sha256 FROM instruction_bundles WHERE name = ? ORDER BY id DESC LIMIT 1",
  ).bind(client.bundle_name).first();
  if (!bundle) {
    console.error(JSON.stringify({ event: "missing_instruction_bundle", clientId: client.id }));
    return null;
  }
  console.log(JSON.stringify({ event: "instruction_access", clientId: client.id, version: bundle.version }));
  return bundle;
}

function createInstructionServer(env, client) {
  const server = new McpServer({ name: "fused-client-instructions", version: "1.0.0" });
  server.registerTool(
    "get_reel_instructions",
    { description: "Read the current paid reel production instructions for this client. Call at the start of each new reel workflow. Do not reuse a previous result after access is revoked." },
    async () => {
      const bundle = await instructionBundle(env, client);
      if (!bundle) return { isError: true, content: [{ type: "text", text: "Instruction service unavailable." }] };
      return {
        content: [{ type: "text", text: bundle.body }],
        structuredContent: { version: bundle.version, sha256: bundle.sha256 },
      };
    },
  );
  return server;
}

function authFailure(status, method) {
  const message = status === 401 ? "Authentication required." :
    status === 403 ? "Instruction access is inactive." : "Instruction service unavailable.";
  return reply(status, message, {}, method);
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path !== "/v1/instructions/reel" && path !== "/mcp") return reply(404, "Not found.");
    if (path === "/v1/instructions/reel" && request.method !== "GET" && request.method !== "HEAD") {
      return reply(405, "Method not allowed.", { Allow: "GET, HEAD" });
    }
    if (path === "/mcp" && request.method !== "GET" && request.method !== "POST" && request.method !== "DELETE") {
      return reply(405, "Method not allowed.", { Allow: "GET, POST, DELETE" });
    }

    try {
      const result = await authenticate(request, env);
      if (!result.client) return authFailure(result.status, request.method);

      if (path === "/mcp") {
        const handler = createMcpHandler(() => createInstructionServer(env, result.client));
        const response = await handler(request, env, ctx);
        const headers = new Headers(response.headers);
        for (const [name, value] of Object.entries(RESPONSE_HEADERS)) headers.set(name, value);
        return new Response(response.body, { status: response.status, headers });
      }

      const bundle = await instructionBundle(env, result.client);
      if (!bundle) return reply(503, "Instruction service unavailable.", {}, request.method);

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
