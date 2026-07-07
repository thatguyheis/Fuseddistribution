import { SELF, env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://fuseddistribution.com";

function newsletterRequest(body, options = {}) {
  return SELF.fetch(`${ORIGIN}/api/newsletter`, {
    method: "POST",
    headers: {
      "CF-Connecting-IP": options.ip || "203.0.113.10",
      "Content-Type": options.contentType || "application/json",
      Origin: options.origin === undefined ? ORIGIN : options.origin,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/newsletter", () => {
  it("subscribes through MailerLite with a server-owned group", async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await newsletterRequest({
      newsletter: "tech",
      email: "person@example.com",
      name: "Alex",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(upstreamFetch).toHaveBeenCalledOnce();

    const [url, init] = upstreamFetch.mock.calls[0];
    expect(url).toBe("https://connect.mailerlite.com/api/subscribers");
    expect(init.headers.Authorization).toBe("Bearer test-value");
    expect(JSON.parse(init.body)).toEqual({
      email: "person@example.com",
      fields: { name: "Alex" },
      groups: ["188458016342804399"],
    });
  });

  it("rejects cross-origin requests before contacting the provider", async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await newsletterRequest(
      { newsletter: "silver", email: "person@example.com" },
      { origin: "https://attacker.example", ip: "203.0.113.11" },
    );

    expect(response.status).toBe(403);
    expect(upstreamFetch).not.toHaveBeenCalled();
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
  });

  it("validates newsletter type, email, and required tech name", async () => {
    const response = await newsletterRequest(
      { newsletter: "tech", email: "not-an-email", name: "" },
      { ip: "203.0.113.12" },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Email address is invalid." });
  });

  it("rejects unsupported content types and oversized bodies", async () => {
    const wrongType = await newsletterRequest(
      { newsletter: "silver", email: "person@example.com" },
      { contentType: "text/plain", ip: "203.0.113.13" },
    );
    expect(wrongType.status).toBe(415);

    const oversized = await newsletterRequest("x".repeat(4097), { ip: "203.0.113.14" });
    expect(oversized.status).toBe(413);
  });

  it("returns a generic error when MailerLite rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("provider details", { status: 400 })),
    );

    const response = await newsletterRequest(
      { newsletter: "silver", email: "person@example.com" },
      { ip: "203.0.113.15" },
    );

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("provider details");
  });

  it("persists rate limits across requests for the same client", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 201 })));
    const body = { newsletter: "silver", email: "person@example.com" };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await newsletterRequest(body, { ip: "203.0.113.16" });
      expect(response.status).toBe(200);
    }

    const blocked = await newsletterRequest(body, { ip: "203.0.113.16" });
    expect(blocked.status).toBe(429);
  });
});

describe("API routing", () => {
  it("returns 405 with an Allow header for unsupported methods", async () => {
    const response = await SELF.fetch(`${ORIGIN}/api/newsletter`, { method: "GET" });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("validates lead requests before delivery", async () => {
    const response = await SELF.fetch(`${ORIGIN}/api/lead`, {
      method: "POST",
      headers: {
        "CF-Connecting-IP": "203.0.113.20",
        "Content-Type": "application/json",
        Origin: ORIGIN,
      },
      body: JSON.stringify({ name: "Alex", email: "bad", message: "Hello" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Name, a valid email, and message are required.",
    });
  });
});

describe("reel media routing", () => {
  it("serves MP4 media from REELS_KV before static assets", async () => {
    const key = "reels/test-reel/test-reel.mp4";
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5]);
    await env.REELS_KV.put(key, bytes.buffer);

    const head = await SELF.fetch(`${ORIGIN}/${key}`, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-type")).toBe("video/mp4");
    expect(head.headers.get("content-length")).toBe("6");
    expect(head.headers.get("accept-ranges")).toBe("bytes");
    expect(head.headers.get("x-fused-media-source")).toBe("reels-kv");

    const ranged = await SELF.fetch(`${ORIGIN}/${key}`, {
      headers: { Range: "bytes=2-4" },
    });
    expect(ranged.status).toBe(206);
    expect(ranged.headers.get("content-range")).toBe("bytes 2-4/6");
    expect([...new Uint8Array(await ranged.arrayBuffer())]).toEqual([2, 3, 4]);
  });
});
