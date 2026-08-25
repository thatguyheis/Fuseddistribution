#!/usr/bin/env node
// Adds a visible, idempotent status panel after reel artifacts exist but before
// a released video or authoritative social link has been synced.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const blogRoot = join(repoRoot, 'public', 'blog');
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, value = true] = arg.replace(/^--/, '').split('=');
  return [key, value];
}));
const slugs = args.slug ? String(args.slug).split(',').map((slug) => slug.trim()).filter(Boolean) : [];

const START = '<!-- SOCIAL_VIDEO_START -->';
const END = '<!-- SOCIAL_VIDEO_END -->';
const panel = `${START}\n            <style>.social-video-pending{padding:18px;border:1px dashed rgba(88,214,255,.32);border-radius:14px;color:#58d6ff;text-align:center;font-weight:800;letter-spacing:.04em}</style><aside class="social-video" aria-label="Reel publication status"><h2>Reel coming soon</h2><p>The reel for this article is being prepared and will be published here soon.</p><div class="social-video-pending" role="status" aria-live="polite">Pending publication</div></aside>\n            ${END}`;

function hasReleasedVideoOrLink(postDir) {
  const sourcePath = join(postDir, 'social-video.json');
  if (!existsSync(sourcePath)) return false;
  try {
    const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
    return Boolean(source.primaryVideo?.url || Object.keys(source.platforms || {}).length);
  } catch {
    return false;
  }
}

function syncSlug(slug) {
  const postDir = join(blogRoot, slug);
  const htmlPath = join(postDir, 'index.html');
  if (!existsSync(htmlPath)) return false;
  if (!existsSync(join(postDir, 'reel-data.md')) && !existsSync(join(postDir, 'reel-script.md'))) return false;
  if (hasReleasedVideoOrLink(postDir)) return false;

  const html = readFileSync(htmlPath, 'utf8');
  if (html.includes(START)) return false;
  const firstParagraphEnd = html.indexOf('</p>');
  if (firstParagraphEnd === -1) return false;
  const insertAt = firstParagraphEnd + '</p>'.length;
  const next = `${html.slice(0, insertAt)}\n            ${panel}${html.slice(insertAt)}`;
  writeFileSync(htmlPath, next);
  return true;
}

const targets = slugs.length ? slugs : [];
if (!targets.length) {
  console.error('Usage: node sync-pending-reel-slot.mjs --slug=<slug>[,<slug>...]');
  process.exit(2);
}
const updated = targets.filter(syncSlug);
console.log(`[reel-slot] added ${updated.length} pending panel${updated.length === 1 ? '' : 's'}.`);
