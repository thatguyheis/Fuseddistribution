// Buffer can return either current X URLs or legacy Twitter URLs.
export function isPlatformUrl(platform, value) {
  if (typeof value !== 'string') return false;
  let url;
  try { url = new URL(value); } catch { return false; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname.replace(/^www\./, '');
  if (platform === 'x') {
    return ['x.com', 'twitter.com'].includes(host)
      && /^\/[A-Za-z0-9_]+\/status\/\d+\/?$/.test(url.pathname);
  }
  if (platform === 'instagram') return host === 'instagram.com' && /^\/reel\//.test(url.pathname);
  if (platform === 'youtube') return ['youtube.com', 'youtu.be'].includes(host);
  return false;
}
