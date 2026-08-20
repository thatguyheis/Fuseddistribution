#!/usr/bin/env node
// Syncs authoritative Buffer post URLs into each blog article's social-video.json
// and its rendered social video panel. Only sent posts with an external URL qualify.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(new URL('../../..', import.meta.url).pathname);
const blogRoot = join(repoRoot, 'public', 'blog');
const logs = [
  ['youtube', join(repoRoot, '.buffer-youtube-scheduled.json')],
  ['x', join(repoRoot, '.buffer-x-scheduled.json')],
  ['instagram', join(repoRoot, '.buffer-instagram-scheduled.json')],
];
const mediaMapPath = join(repoRoot, '.buffer-media-urls.json');
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, value = true] = arg.replace(/^--/, '').split('=');
  return [key, value];
}));
const requestedSlugs = new Set(String(args.slug || '').split(',').map((value) => value.trim()).filter(Boolean));
const dryRun = args['dry-run'] === true;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isPlatformUrl(platform, url) {
  const patterns = {
    youtube: /^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i,
    instagram: /^https:\/\/(?:www\.)?instagram\.com\/reel\//i,
    x: /^https:\/\/x\.com\/[^/]+\/status\/\d+/i,
  };
  return typeof url === 'string' && patterns[platform].test(url);
}

function collectPublishedLinks() {
  const collected = new Map();
  for (const [platform, path] of logs) {
    if (!existsSync(path)) continue;
    for (const entry of readJson(path).scheduled || []) {
      if (entry?.status !== 'sent' || !entry.slug || !isPlatformUrl(platform, entry.viewPostUrl)) continue;
      if (requestedSlugs.size && !requestedSlugs.has(entry.slug)) continue;
      const links = collected.get(entry.slug) || {};
      links[platform] = { url: entry.viewPostUrl, sentAt: entry.sentAt || null };
      collected.set(entry.slug, links);
    }
  }
  return collected;
}

function mediaUrl(value) {
  const url = typeof value === 'string' ? value : value?.url;
  return typeof url === 'string' && /^https:\/\/fuseddistribution\.luxraycoco\.workers\.dev\/reels\/[a-z0-9-]+\/[a-z0-9-]+\.mp4$/i.test(url)
    ? url
    : null;
}

function collectMatchedVideos() {
  const matched = new Map();
  if (!existsSync(mediaMapPath)) return matched;
  for (const [slug, record] of Object.entries(readJson(mediaMapPath))) {
    if (requestedSlugs.size && !requestedSlugs.has(slug)) continue;
    const url = mediaUrl(record);
    if (url && existsSync(join(blogRoot, slug, 'index.html'))) matched.set(slug, { url });
  }
  return matched;
}

function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function youtubeEmbedUrl(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:shorts\/|watch\?v=))([A-Za-z0-9_-]{11})/i);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&playsinline=1` : null;
}

function sameOriginVideoUrl(url) {
  const match = url.match(
    /^https:\/\/fuseddistribution\.luxraycoco\.workers\.dev\/reels\/([a-z0-9-]+)\/([a-z0-9-]+\.mp4)$/i,
  );
  if (!match) return url;

  const [, slug, filename] = match;
  const publishedReelsXPath = join(repoRoot, 'public', 'reels-x', slug, filename);
  const prefix = existsSync(publishedReelsXPath) ? '/reels-x/' : '/reels/';
  return `https://fuseddistribution.com${prefix}${slug}/${filename}`;
}

function panelHtml(links, primaryVideo, title, slug, heroFilename) {
  const ordered = ['youtube', 'instagram', 'x'].filter((platform) => links[platform]);
  const buttons = ordered.map((platform) => `<li><a href="${esc(links[platform].url)}" target="_blank" rel="noopener noreferrer">Watch on ${platform === 'x' ? 'X' : platform[0].toUpperCase() + platform.slice(1)}</a></li>`).join('');
  const intro = primaryVideo?.url
    ? buttons ? 'Play the Fused reel here, or choose a social platform.' : 'Play the Fused reel here.'
    : 'Choose a platform to watch this video and follow Fused.';
  const youtubeUrl = links.youtube?.url ? youtubeEmbedUrl(links.youtube.url) : null;
  const player = youtubeUrl
    ? `<div class="social-video-player"><iframe src="${youtubeUrl}" title="${esc(title)} on YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`
    : primaryVideo?.url ? `<div class="social-video-player"><video controls playsinline preload="metadata" poster="/blog/${esc(slug)}/${esc(heroFilename)}"><source src="${esc(sameOriginVideoUrl(primaryVideo.url))}" type="video/mp4" />Your browser does not support embedded video. Use the links below to watch.</video></div>` : '';
  const style = '<style>.social-video{margin:42px 0 0;padding:24px;border:1px solid rgba(88,214,255,.2);border-radius:20px;background:linear-gradient(145deg,rgba(88,214,255,.11),rgba(7,20,28,.9) 44%)}.social-video h2{margin:0 0 8px;color:#ecf8fb;font-size:1.5rem;text-transform:uppercase}.social-video>p{margin:0 0 18px}.social-video-player{position:relative;aspect-ratio:9/16;width:min(100%,360px);margin:0 auto 20px;overflow:hidden;border-radius:14px;background:#020608;box-shadow:0 16px 40px rgba(0,0,0,.36)}.social-video-player iframe,.social-video-player video{position:absolute;inset:0;width:100%;height:100%;border:0;object-fit:cover}.social-video-links{display:flex;flex-wrap:wrap;gap:10px;list-style:none;margin:0;padding:0}.social-video-links a{display:inline-flex;align-items:center;min-height:42px;padding:10px 14px;border:1px solid rgba(88,214,255,.25);border-radius:12px;color:#58d6ff;font-weight:800;text-decoration:none}</style>';
  return `<!-- SOCIAL_VIDEO_START -->\n${style}<aside class="social-video" aria-label="Watch this reel on social media"><h2>Watch the reel</h2><p>${intro}</p>${player}${buttons ? `<ul class="social-video-links">${buttons}</ul>` : ''}</aside>\n<!-- SOCIAL_VIDEO_END -->`;
}

function addPanelToHtml(html, panel) {
  const marker = /<!-- SOCIAL_VIDEO_START -->[\s\S]*?<!-- SOCIAL_VIDEO_END -->/;
  const withoutExistingPanel = html.replace(marker, '');
  const articleBodyStart = withoutExistingPanel.indexOf('<div class="article-body">');

  if (articleBodyStart !== -1) {
    const firstParagraphEnd = withoutExistingPanel.indexOf('</p>', articleBodyStart);
    if (firstParagraphEnd !== -1) {
      const insertAt = firstParagraphEnd + '</p>'.length;
      return `${withoutExistingPanel.slice(0, insertAt)}\n            ${panel}${withoutExistingPanel.slice(insertAt)}`;
    }
  }

  return withoutExistingPanel.replace(/\n\s*<div class="article-cta">/, `\n          ${panel}\n\n          <div class="article-cta">`);
}

const publishedLinks = collectPublishedLinks();
const matchedVideos = collectMatchedVideos();
const slugs = new Set([...publishedLinks.keys(), ...matchedVideos.keys()]);
let updated = 0;
for (const slug of slugs) {
  const platforms = publishedLinks.get(slug) || {};
  const primaryVideo = matchedVideos.get(slug) || null;
  const postDir = join(blogRoot, slug);
  const htmlPath = join(postDir, 'index.html');
  if (!existsSync(htmlPath)) continue;
  const sourcePath = join(postDir, 'social-video.json');
  const currentSource = existsSync(sourcePath) ? readJson(sourcePath) : null;
  const sourceCore = { version: 1, primaryVideo, platforms };
  const sourceUnchanged = currentSource
    && JSON.stringify({ version: currentSource.version, primaryVideo: currentSource.primaryVideo || null, platforms: currentSource.platforms || {} }) === JSON.stringify(sourceCore);
  const title = existsSync(join(postDir, 'meta.json')) ? readJson(join(postDir, 'meta.json')).title : slug;
  const currentHtml = readFileSync(htmlPath, 'utf8');
  const heroFilename = existsSync(join(postDir, 'hero.jpg')) ? 'hero.jpg' : 'hero.svg';
  const nextHtml = addPanelToHtml(currentHtml, panelHtml(platforms, primaryVideo, title, slug, heroFilename));
  if (sourceUnchanged && nextHtml === currentHtml) continue;
  const source = { ...sourceCore, updatedAt: sourceUnchanged ? currentSource.updatedAt : new Date().toISOString() };
  if (!dryRun) {
    writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`);
    writeFileSync(htmlPath, nextHtml);
  }
  updated += 1;
  console.log(`${dryRun ? 'would sync' : 'synced'} ${slug}: video=${primaryVideo ? 'yes' : 'no'} socials=${Object.keys(platforms).join(', ') || 'none'}`);
}

console.log(`${dryRun ? 'would update' : 'updated'} ${updated} blog social-video panel${updated === 1 ? '' : 's'}.`);
