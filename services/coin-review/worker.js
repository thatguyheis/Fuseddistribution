import guide from './guide.html';
import { checkPublisher } from './publishing.js';
import page from './dashboard.html';
import css from './dashboard.css';
import client from './dashboard.client.js';
import { ShiftLog } from './shift-log.js';

export { ShiftLog };
const root = '/coin-review/';
const cookieName = '__Secure-coin_review';
const encoder = new TextEncoder();
const headers = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
};
const shell = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Private link access</title><link rel="stylesheet" href="/coin-review/dashboard.css"><main class="entry"><h1>Private link access</h1><p id="message">Open your full invitation link to access the review desk.</p></main><script type="module" src="/coin-review/dashboard.js"></script></html>';
function respond(body, status, type = 'text/plain; charset=utf-8', extra = {}) {
  return new Response(body, { status, headers: { ...headers, 'Content-Type': type, ...extra } });
}
async function roleFor(token, env) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token || '')) return null;
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
  const hash = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  if (hash === env.REVIEW_LINK_HASH) return 'reviewer';
  if (hash === env.SAM_LINK_HASH) return 'worker';
  return null;
}
function validDay(day) {
  const parsed = new Date(day + 'T12:00:00Z');
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === day;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method !== 'GET' && request.headers.get('Origin') !== url.origin) return respond('Forbidden', 403);
    if (method === 'GET' && path === root + 'dashboard.css') return respond(css, 200, 'text/css');
    if (method === 'GET' && path === root + 'dashboard.js') return respond(client, 200, 'text/javascript');
    if (path === root + 'session' && method === 'POST') {
      const token = request.headers.get('X-Invite');
      if (!await roleFor(token, env)) return respond('This invitation is invalid or has expired.', 403);
      return respond(null, 204, 'text/plain', { 'Set-Cookie': cookieName + '=' + token + '; Secure; HttpOnly; SameSite=Strict; Path=' + root + '; Max-Age=43200' });
    }
    const cookie = (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='));
    const role = await roleFor(cookie?.slice(cookieName.length + 1), env);
    if (method === 'GET' && path === root) return respond(role ? page : shell, 200, 'text/html; charset=utf-8');
    if (!role) return respond('Open your full invitation link to continue.', 403);
    if (path === root + 'project-guide' && method === 'GET') return respond(guide, 200, 'text/html; charset=utf-8');
    if (path === root + 'publisher' && method === 'GET' && role === 'reviewer') {
      try { await checkPublisher(env); return respond('Buffer publisher connected', 200); }
      catch { return respond('Buffer publisher unavailable', 503); }
    }
    const route = /^\/coin-review\/days\/(\d{4}-\d{2}-\d{2})(?:\/([1-8])(?:\/(media|decision|publish|submit))?)?$/.exec(path);
    if (!route || !validDay(route[1])) return respond('Not found', 404);
    const trusted = new Request(request);
    trusted.headers.set('X-Desk-Role', role);
    try {
      const day = env.DAYS.get(env.DAYS.idFromName(route[1]));
      const result = await day.fetch(trusted);
      const output = new Response(result.body, result);
      for (const [key, value] of Object.entries(headers)) output.headers.set(key, value);
      return output;
    } catch (error) {
      console.error('Shift log unavailable', error.name);
      return respond('Storage is unavailable. Refresh the log before retrying.', 503);
    }
  }
};
