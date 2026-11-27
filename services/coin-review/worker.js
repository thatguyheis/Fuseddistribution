import highlightForm from './highlight-form.html';
import highlightsClient from './highlights.client.js';
import { HighlightRequests, validRequestId } from './highlights.js';
import guide from './guide.html';
import workflowPanel from './workflow-panel.html';
import { checkPublisher, workflowArchive } from './publishing.js';
import page from './dashboard.html';
import css from './dashboard.css';
import client from './dashboard.client.js';
import { ShiftLog } from './shift-log.js';

export { ShiftLog, HighlightRequests };
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
const intake = root + 'highlights/';
const staffCookie = '__Secure-coin_highlights';
function cookieValue(request, name) {
  const prefix = name + '=';
  return (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(prefix))?.slice(prefix.length);
}
function validStaffKey(candidate, env) {
  return typeof env.HIGHLIGHT_INVITE === 'string' && /^[A-Za-z0-9_-]{43}$/.test(candidate || '') && candidate === env.HIGHLIGHT_INVITE;
}
async function highlightRoute(request, env, url, deskRole) {
  const path = url.pathname.slice(intake.length);
  if (path === 'app.js' && request.method === 'GET') return respond(highlightsClient,200,'text/javascript');
  if (path === 'session' && request.method === 'POST') {
    const token = request.headers.get('X-Invite');
    if (!validStaffKey(token,env)) return respond('Invalid staff invitation.',403);
    return respond(null,204,'text/plain',{'Set-Cookie':staffCookie+'='+token+'; Secure; HttpOnly; SameSite=Strict; Path='+intake+'; Max-Age=43200'});
  }
  const canSubmit = deskRole || validStaffKey(cookieValue(request,staffCookie),env);
  if (!path && request.method === 'GET') {
    const access = shell.replace('/coin-review/dashboard.js',intake+'app.js').replace('the review desk','the highlight request form');
    return respond(canSubmit ? highlightForm : access,200,'text/html; charset=utf-8');
  }
  if (!canSubmit) return respond('Open your staff request link to continue.',403);
  const segments = path.split('/');
  let target, internal;
  if (path === 'inbox' && request.method === 'GET' && deskRole) {
    target = 'inbox';
    internal = new Request('https://requests.internal/list'+url.search);
  } else if (segments[0] === 'requests' && validRequestId(segments[1])) {
    const id = segments[1];
    if (segments.length === 2 && request.method === 'POST') {
      target = id;
      // Forward only the multipart body and its transport headers.
      const contentHeaders = new Headers();
      for (const k of ['Content-Type','Content-Length']) if (request.headers.has(k)) contentHeaders.set(k,request.headers.get(k));
      internal = new Request('https://requests.internal/'+id,{method:'POST',headers:contentHeaders,body:request.body});
    } else if (segments.length === 3 && segments[2] === 'photo' && request.method === 'GET' && deskRole) {
      target = id; internal = new Request('https://requests.internal/'+id);
    }
  }
  if (!internal) return respond('Unavailable with this link.',403);
  try {
    const store = env.HIGHLIGHTS.get(env.HIGHLIGHTS.idFromName(target));
    const result = await store.fetch(internal);
    const output = new Response(result.body,result);
    for (const [key,value] of Object.entries(headers)) output.headers.set(key,value);
    return output;
  } catch { return respond('The highlight inbox is unavailable. Please retry.',503); }
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
    const role = await roleFor(cookieValue(request,cookieName),env);
    if (path.startsWith(intake)) return highlightRoute(request,env,url,role);
    if (method === 'GET' && path === root) {
      const invitation = /^[A-Za-z0-9_-]{43}$/.test(env.HIGHLIGHT_INVITE || '') ? intake+'#'+env.HIGHLIGHT_INVITE : intake;
      const deskPage = role && page.replace('<!-- workflow panel -->',role === 'worker' ? workflowPanel : '').replace('<!-- staff invitation -->',invitation);
      return respond(deskPage || shell,200,'text/html; charset=utf-8');
    }
    if (!role) return respond('Open your full invitation link to continue.', 403);
    if (path === root + 'workflow' || path === root + 'workflow/archive') {
      if (role !== 'worker') return respond('Sam’s submission link is required.', 403);
      try {
        let result;
        if (path.endsWith('/archive') && method === 'GET') {
          result = await workflowArchive(env, url.searchParams.get('version'));
        } else if (path === root + 'workflow' && ['GET','POST'].includes(method)) {
          const settings = env.DAYS.get(env.DAYS.idFromName('sam-workflow-settings'));
          result = await settings.fetch(new Request('https://desk.internal/workflow', {
            method, headers:{'If-Match':request.headers.get('If-Match') || ''}
          }));
        } else return respond('Method unavailable.', 405);
        const output = new Response(result.body, result);
        for (const [key,value] of Object.entries(headers)) output.headers.set(key,value);
        return output;
      } catch { return respond('Could not reach the workflow service. Check again shortly.', 503); }
    }
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
