import { SELF, env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://fuseddistribution.com";

describe("Project phone previews", () => {
  it("allows same-origin samples without allowing arbitrary external frames", async () => {
    // The test asset binding serves the reserve fixture at the root.
    const response = await SELF.fetch(`${ORIGIN}/`);
    expect(response.status).toBe(200);
    const directives = response.headers.get("content-security-policy").split(";").map(value => value.trim());
    expect(directives).toContain("frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com");
    expect(directives).toContain("frame-ancestors 'self'");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    await response.text();

  });
});

describe("Google Analytics", () => {
  it("persists consent through a native redirect fallback", async () => {
    const response = await SELF.fetch(`${ORIGIN}/?analytics_consent=granted`, {
      redirect: "manual",
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/`);
    expect(response.headers.get("set-cookie")).toContain("fused_analytics_consent=granted");
  });

  it("injects the configured tag into HTML responses with a matching CSP", async () => {
    const response = await SELF.fetch(`${ORIGIN}/`, {
      headers: { Cookie: "fused_analytics_consent=granted" },
    });
    const html = await response.text();
    const csp = response.headers.get("content-security-policy");

    expect(response.status).toBe(200);
    expect(html).toContain("https://www.googletagmanager.com/gtag/js?id=G-3J56X9V708");
    expect(html).toContain("gtag('config', 'G-3J56X9V708')");
    expect(html).toContain('"analytics_storage":"granted"');
    expect(html).not.toContain("fused-analytics-consent");
    expect(csp).toContain("https://www.googletagmanager.com");
    expect(csp).toContain("https://www.google-analytics.com");
  });
});

describe("Google Consent Mode", () => {
  it("loads GA with consent denied by default and shows the banner", async () => {
    const response = await SELF.fetch(`${ORIGIN}/`);
    const html = await response.text();
    expect(html).toContain("gtag/js?id=G-3J56X9V708");
    expect(html).toContain("gtag('consent', 'default', {\"ad_storage\":\"denied\",\"ad_user_data\":\"denied\",\"ad_personalization\":\"denied\",\"analytics_storage\":\"denied\"})");
    expect(html).toContain('id="fused-analytics-consent"');
  });

  it("grants analytics storage after the visitor accepts", async () => {
    const html = await (await SELF.fetch(`${ORIGIN}/`, { headers: { Cookie: "fused_analytics_consent=granted" } })).text();
    expect(html).toContain('"analytics_storage":"granted"');
    expect(html).toContain('"ad_storage":"denied"');
    expect(html).not.toContain('id="fused-analytics-consent"');
  });

  it("keeps cookieless measurement after the visitor declines", async () => {
    const html = await (await SELF.fetch(`${ORIGIN}/`, { headers: { Cookie: "fused_analytics_consent=denied" } })).text();
    expect(html).toContain('"analytics_storage":"denied"');
    expect(html).not.toContain('id="fused-analytics-consent"');
  });
});

describe("admin lock", () => {
  it("hides /admin/ when no password is configured", async () => {
    const response = await SELF.fetch(`${ORIGIN}/admin/data.json`);
    expect(response.status).toBe(404);
    await response.text();
  });

  it("asks for a password and checks it", async () => {
    const { adminGate } = await import("../src/admin-gate.js");
    const env = { ADMIN_PASSWORD: "correct horse" };
    const url = new URL(`${ORIGIN}/admin/`);
    expect(adminGate(new Request(url), env, url).status).toBe(401);
    expect(adminGate(new Request(url), env, url).headers.get("www-authenticate")).toContain("Basic");
    const bad = new Request(url, { headers: { Authorization: "Basic " + btoa("nick:wrong") } });
    expect(adminGate(bad, env, url).status).toBe(401);
    const good = new Request(url, { headers: { Authorization: "Basic " + btoa("nick:correct horse") } });
    expect(adminGate(good, env, url)).toBeNull();
    const other = new URL(`${ORIGIN}/administer/`);
    expect(adminGate(new Request(other), env, other)).toBeNull();
  });
});

describe("SEO routing and head tags", () => {
  it("redirects the www host to the apex domain with a 301", async () => {
    const response = await SELF.fetch("https://www.fuseddistribution.com/pricing/?a=1", { redirect: "manual" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/pricing/?a=1`);
  });

  it.each([
    "/blog/google-business-profile-messaging/",
    "/blog/google-business-profile-messaging-setup-and-tips/",
    "/blog/google-business-profile-q-and-a-how-to-use-it/",
    "/blog/google-business-profile-messaging",
  ])("permanently redirects retired post %s", async (path) => {
    const response = await SELF.fetch(`${ORIGIN}${path}`, { redirect: "manual" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/blog/google-business-profile-setup/`);
  });

  it.each([
    "/blog/dollar-cost-averaging-silver/",
    "/blog/dollar-cost-averaging-silver-strategy-explained/",
    "/blog/silver-as-a-percentage-of-net-worth-how-much/",
  ])("routes unsupported silver advice directly to the Reserve page: %s", async (path) => {
    const response = await SELF.fetch(`${ORIGIN}${path}`, { redirect: "manual" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/reserve/`);
  });

  it.each([
    ["/blog/silver-numismatic-coins-vs-bullion-coins/", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
    ["/blog/how-to-store-silver-at-home-safely/", "/blog/silver-storage-vault-vs-home-storage/"],
    ["/blog/silver-premiums-explained/", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
    ["/blog/silver-premium-over-spot-explained/", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
  ])("routes unsafe silver guidance to a sourced guide: %s", async (path, destination) => {
    const response = await SELF.fetch(`${ORIGIN}${path}`, { redirect: "manual" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${ORIGIN}${destination}`);
  });

  it.each([
    ["/blog/silver-industrial-uses-explained-for-investors/", "/reserve/"],
    ["/blog/selling-junk-silver-coins-where-and-how/", "/blog/how-to-compare-silver-buyback-quotes-fairly/"],
    ["/blog/silver-reserve-plan-what-it-is-and-how-it-works/", "/reserve/"],
    ["/blog/best-silver-storage-options-for-investors/", "/blog/silver-storage-vault-vs-home-storage/"],
  ])("routes unsupported silver claims to a reviewed page: %s", async (path, destination) => {
    const response = await SELF.fetch(`${ORIGIN}${path}`, { redirect: "manual" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${ORIGIN}${destination}`);
  });

  it.each([
    ["/blog/how-inflation-erodes-purchasing-power-and-silver-protec/", "/reserve/"],
    ["/blog/how-to-buy-silver-coins-at-spot-price/", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
    ["/blog/silver-ira-how-to-set-one-up-step-by-step/", "/blog/"],
    ["/blog/silver-panda-coins-from-china-complete-guide/", "/reserve/"],
  ])("routes stale or incorrect silver guidance to a safer page: %s", async (path, destination) => {
    const response = await SELF.fetch(`${ORIGIN}${path}`, { redirect: "manual" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${ORIGIN}${destination}`);
  });

  it.each([
    ["/blog/how-to-build-a-silver-inventory-spreadsheet/", "/blog/silver-bar-serial-numbers-and-inventory-records/"],
    ["/blog/silver-ira-vs-physical-silver-at-home-which-is-better/", "/blog/"],
    ["/blog/how-to-calculate-your-average-cost-per-ounce-silver/", "/blog/silver-bar-serial-numbers-and-inventory-records/"],
    ["/blog/silver-vs-cash-which-holds-value-better/", "/reserve/"],
  ])("routes incorrect silver math or tax claims away from readers: %s", async (path, destination) => {
    const response = await SELF.fetch(`${ORIGIN}${path}`, { redirect: "manual" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${ORIGIN}${destination}`);
  });

  it("redirects the orphaned folder page to the projects overview", async () => {
    const response = await SELF.fetch(`${ORIGIN}/Fused%20Technology%20Solutions/`, { redirect: "manual" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/projects/`);
  });

  it("allows Google Fonts stylesheets and font files in the CSP", async () => {
    const response = await SELF.fetch(`${ORIGIN}/`);
    const directives = response.headers.get("content-security-policy").split(";").map(value => value.trim());
    expect(directives.find(d => d.startsWith("style-src"))).toContain("https://fonts.googleapis.com");
    expect(directives).toContain("font-src 'self' https://fonts.gstatic.com");
    await response.text();
  });

  it("injects favicon and manifest links into HTML pages", async () => {
    const response = await SELF.fetch(`${ORIGIN}/`);
    const html = await response.text();
    expect(html).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
    expect(html).toContain('<link rel="manifest" href="/site.webmanifest">');
    expect(html.indexOf('rel="icon"')).toBeLessThan(html.indexOf("</head>"));
  });
});

describe("blog archive for crawlers", () => {
  it("renders every post as a plain link after the post grid", async () => {
    const { renderBlogArchive } = await import("../src/blog-archive.js");
    const page = '<html><body><main><div id="post-list" class="post-grid"><article>x</article></div></main></body></html>';
    const posts = [
      { slug: "b-post", title: "B & <Post>", date: "2026-11-02" },
      { slug: "a-post", title: "A Post", date: "2026-11-03" },
      { slug: "Bad Slug!", title: "bad", date: "2026-01-01" },
    ];
    const html = await renderBlogArchive(new Response(page, { headers: { "content-type": "text/html" } }), posts).text();
    expect(html).toContain('<a href="/blog/a-post/">A Post</a>');
    expect(html).toContain("B &amp; &lt;Post&gt;");
    expect(html).not.toContain("Bad Slug!");
    expect(html).toContain("Browse all 2 articles");
    expect(html.indexOf("a-post")).toBeLessThan(html.indexOf("b-post"));
    expect(html.indexOf('id="post-list"')).toBeLessThan(html.indexOf("fx-archive"));
  });
});

describe("shared site navigation", () => {
  const page = `<!doctype html><html><head><title>t</title></head><body>
    <header class="topbar"><a class="brand" href="/">Fused</a>
      <nav class="nav" aria-label="Primary"><div class="nav-pages"><a href="/old-page/">Old</a></div>
      <div class="nav-actions"><a class="nav-cta" href="/reserve/#join">Reserve Silver</a></div></nav>
    </header><main>body</main></body></html>`;

  async function render(path) {
    const { renderSharedNav } = await import("../src/site-nav.js");
    const response = renderSharedNav(new Response(page, { headers: { "content-type": "text/html" } }), path);
    return response.text();
  }

  it("replaces page-specific menu items with the canonical menu", async () => {
    const html = await render("/blog/some-post/");
    expect(html).not.toContain('href="/old-page/"');
    for (const href of ["/", "/projects/", "/process/", "/pricing/", "/reserve/", "/education/", "/photos/", "/about/", "/blog/"]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('<a class="nav-cta" href="/reserve/#join">Reserve Silver</a>');
  });

  it("adds a mobile menu button and the shared nav assets", async () => {
    const html = await render("/");
    expect(html).toContain('class="fx-burger"');
    expect(html).toContain('aria-controls="fx-primary-nav"');
    expect(html).toContain('id="fx-primary-nav"');
    expect(html).toContain('<link rel="stylesheet" href="/assets/site-nav.css">');
    expect(html).toContain('<script src="/assets/site-nav.js" defer></script>');
    expect(html.indexOf('class="fx-burger"')).toBeLessThan(html.indexOf("<nav"));
  });

  it("marks the current section active", async () => {
    const html = await render("/pricing/");
    expect(html).toMatch(/<a href="\/pricing\/"[^>]*class="active"[^>]*aria-current="page"/);
    expect(html).toMatch(/class="nav-toggle active"[^>]*aria-controls="dropdown-tech"/);
  });

  it("leaves pages without the shared header untouched", async () => {
    const { renderSharedNav } = await import("../src/site-nav.js");
    const plain = "<html><head></head><body><nav><a href='/x'>x</a></nav></body></html>";
    const html = await renderSharedNav(new Response(plain, { headers: { "content-type": "text/html" } }), "/").text();
    expect(html).toBe(plain);
  });
});

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

  describe("static asset fallback", () => {
    const path = "/reels/asset-reel/asset-reel.mp4";
    const bytes = new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17]);

    afterEach(() => vi.restoreAllMocks());

    function mockAsset() {
      const original = env.ASSETS.fetch.bind(env.ASSETS);
      return vi.spyOn(env.ASSETS, "fetch").mockImplementation(async (input, init) => {
        const request = new Request(input, init);
        if (new URL(request.url).pathname !== path) return original(request);
        return new Response(request.method === "HEAD" ? null : bytes, {
          headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.length) },
        });
      });
    }

    it("returns 206 partial content for Range requests", async () => {
      mockAsset();
      const ranged = await SELF.fetch(`${ORIGIN}${path}`, { headers: { Range: "bytes=0-1" } });
      expect(ranged.status).toBe(206);
      expect(ranged.headers.get("content-range")).toBe("bytes 0-1/8");
      expect(ranged.headers.get("content-length")).toBe("2");
      expect(ranged.headers.get("accept-ranges")).toBe("bytes");
      expect(ranged.headers.get("content-type")).toBe("video/mp4");
      expect([...new Uint8Array(await ranged.arrayBuffer())]).toEqual([10, 11]);

      const suffix = await SELF.fetch(`${ORIGIN}${path}`, { headers: { Range: "bytes=-3" } });
      expect(suffix.status).toBe(206);
      expect([...new Uint8Array(await suffix.arrayBuffer())]).toEqual([15, 16, 17]);
    });

    it("returns 416 for unsatisfiable ranges", async () => {
      mockAsset();
      const bad = await SELF.fetch(`${ORIGIN}${path}`, { headers: { Range: "bytes=50-60" } });
      expect(bad.status).toBe(416);
      expect(bad.headers.get("content-range")).toBe("bytes */8");
    });

    it("advertises byte ranges on full responses", async () => {
      mockAsset();
      const full = await SELF.fetch(`${ORIGIN}${path}`);
      expect(full.status).toBe(200);
      expect(full.headers.get("accept-ranges")).toBe("bytes");
      expect((await full.arrayBuffer()).byteLength).toBe(8);
    });
  });
});

describe("GET /api/spot", () => {
  function utcDate(offsetDays = 0) {
    return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
  }

  it("serves today's KV snapshot without calling the upstream API", async () => {
    await env.SPOT_KV.put(`spot:${utcDate()}`, JSON.stringify({ silver: 64.85, gold: 4155.6 }));
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await SELF.fetch(`${ORIGIN}/api/spot`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.silver).toBe(64.85);
    expect(body.gold).toBe(4155.6);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("includes prev from an earlier snapshot", async () => {
    await env.SPOT_KV.put(`spot:${utcDate()}`, JSON.stringify({ silver: 64.85, gold: 4155.6 }));
    await env.SPOT_KV.put(`spot:${utcDate(-1)}`, JSON.stringify({ silver: 63.1, gold: 4100.2 }));
    vi.stubGlobal("fetch", vi.fn());

    const response = await SELF.fetch(`${ORIGIN}/api/spot`);

    expect(response.status).toBe(200);
    expect((await response.json()).prev).toEqual({ silver: 63.1, gold: 4100.2, date: utcDate(-1) });
  });

  it("falls back to the upstream API on KV miss and stores the snapshot", async () => {
    await env.SPOT_KV.delete(`spot:${utcDate()}`);
    // Plain object instead of Response: workerd forbids reading a body stream
    // created in the test's I/O context from inside the handler.
    const upstreamFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rates: { USDXAG: 65.2, USDXAU: 4200.1 } }),
    });
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await SELF.fetch(`${ORIGIN}/api/spot`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.silver).toBe(65.2);
    expect(body.gold).toBe(4200.1);
    expect(upstreamFetch).toHaveBeenCalledOnce();

    const stored = JSON.parse(await env.SPOT_KV.get(`spot:${utcDate()}`));
    expect(stored).toEqual({ silver: 65.2, gold: 4200.1 });
  });
});
