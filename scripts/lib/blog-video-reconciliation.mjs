import { createHash } from 'node:crypto';
export const panelPattern = /<!-- SOCIAL_VIDEO_START -->[\s\S]*?<!-- SOCIAL_VIDEO_END -->/;
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const validSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export function youtubeId(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    const host = u.hostname.replace(/^www\./, '');
    const id = host === 'youtu.be' ? u.pathname.slice(1) : host === 'youtube.com'
      ? u.pathname === '/watch' ? u.searchParams.get('v') : u.pathname.match(/^\/shorts\/([^/]+)\/?$/)?.[1] : null;
    return /^[\w-]{11}$/.test(id || '') ? id : null;
  } catch { return null; }
}
export function selectPublishedVideos(snapshot, logs, now = Date.now()) {
  const map = new Map();
  const accept = (slug, url, sentAt, provenance) => {
    const id = youtubeId(url), sent = Date.parse(sentAt);
    if (!validSlug(slug) || !id || !Number.isFinite(sent) || sent > now) return;
    if (!map.has(slug) || sent > Date.parse(map.get(slug).sentAt)) map.set(slug, { kind: 'youtube', id, url, sentAt, provenance });
  };
  for (const row of logs.scheduled || []) if (row.status === 'sent') accept(row.slug, row.viewPostUrl, row.sentAt, 'confirmed_sent_log');
  // The collector queries only sent posts. Require its explicit source and a fresh snapshot.
  const age = now - Date.parse(snapshot.capturedAt);
  if (snapshot.source === 'buffer_api' && age >= 0 && age <= 48 * 3600_000) {
    for (const row of snapshot.posts || []) if (row.platform === 'youtube') accept(row.slug, row.externalLink, row.sentAt, 'buffer_sent_metrics');
  }
  return map;
}
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function videoPanel(slug, title, video) {
  if(video.kind === 'unavailable') return '<!-- SOCIAL_VIDEO_START -->\n<aside class="social-video" aria-label="Companion video status"><h2>Companion video</h2><p>The companion video is temporarily unavailable. The complete written guide is below.</p></aside>\n<!-- SOCIAL_VIDEO_END -->';
  const player = video.kind === 'youtube'
    ? `<iframe src="https://www.youtube-nocookie.com/embed/${video.id}?rel=0&amp;playsinline=1" title="${esc(title)} on YouTube" loading="lazy" allow="encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>`
    : `<video controls playsinline preload="none" poster="/blog/${slug}/hero.jpg"><source src="${esc(video.url)}" type="video/mp4">Your browser does not support this video.</video>`;
  return `<!-- SOCIAL_VIDEO_START -->\n<style>.social-video{margin:24px 0;padding:24px;border:1px solid rgba(88,214,255,.25);border-radius:16px}.social-video-player{position:relative;aspect-ratio:9/16;width:min(100%,360px);margin:16px auto;background:#020608;border-radius:14px;overflow:hidden}.social-video-player iframe,.social-video-player video{position:absolute;inset:0;width:100%;height:100%;border:0;object-fit:contain}</style><aside class="social-video" aria-label="Companion video"><h2>Watch the reel</h2><p>Watch the companion video, then use the guide below.</p><div class="social-video-player">${player}</div></aside>\n<!-- SOCIAL_VIDEO_END -->`;
}
export function patchVideoPanel(html, panel) {
  if ((html.match(/<!-- SOCIAL_VIDEO_START -->/g) || []).length > 1) throw new Error('Duplicate video panels require review');
  if (panelPattern.test(html)) return html.replace(panelPattern, () => panel);
  const start = html.indexOf('<div class="article-body">');
  const end = start < 0 ? -1 : html.indexOf('</p>', start);
  if (end < 0) throw new Error('Article insertion point missing');
  return html.slice(0,end+4) + panel + html.slice(end+4);
}
export function hasPlayer(html) { return /(?:youtube-nocookie\.com\/embed\/|<video\b)/.test(html.match(panelPattern)?.[0] || ''); }
