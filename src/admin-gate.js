// Password gate for /admin/. The password is the ADMIN_PASSWORD Worker secret
// (set in the Cloudflare dashboard or with `wrangler secret put ADMIN_PASSWORD`).
// With no secret configured the admin area is hidden (404).

function isAdminPath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function timingSafeEqualText(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.byteLength !== y.byteLength) return false;
  return crypto.subtle.timingSafeEqual(x, y);
}

export function adminGate(request, env, url) {
  if (!isAdminPath(url.pathname)) return null;
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!env.ADMIN_PASSWORD) return new Response("Not found.", { status: 404, headers });
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(auth.slice(6));
    } catch {
      decoded = "";
    }
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (decoded.includes(":") && timingSafeEqualText(password, env.ADMIN_PASSWORD)) return null;
  }
  return new Response("Password required.", {
    status: 401,
    headers: { ...headers, "WWW-Authenticate": 'Basic realm="Fused admin", charset="UTF-8"' },
  });
}
