#!/usr/bin/env node
// Reconciles rendered reels, blog panels, release QA, and Buffer handoff maps.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const blogRoot = join(repoRoot, 'public', 'blog');
const reelRoot = join(repoRoot, 'video', 'out');

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}

function isDirectory(path) {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

function audit() {
  const rendered = [];
  const missingPanels = [];
  const pendingPanels = [];
  const releasedPanels = [];
  const releaseBlocked = [];
  const missingReleaseQa = [];
  const missingBlog = [];
  const mediaMap = readJson(join(repoRoot, '.buffer-media-urls.json'), {}) || {};
  const xMediaMap = readJson(join(repoRoot, '.buffer-x-media-urls.json'), {}) || {};

  for (const slug of readdirSync(reelRoot).sort()) {
    const reelDir = join(reelRoot, slug);
    const videoPath = join(reelDir, `${slug}.mp4`);
    if (!isDirectory(reelDir) || !existsSync(videoPath)) continue;
    rendered.push(slug);

    const blogDir = join(blogRoot, slug);
    const htmlPath = join(blogDir, 'index.html');
    if (!existsSync(htmlPath)) {
      missingBlog.push(slug);
      continue;
    }

    const html = readFileSync(htmlPath, 'utf8');
    if (!html.includes('SOCIAL_VIDEO_START')) missingPanels.push(slug);
    else if (html.includes('Pending publication')) pendingPanels.push(slug);
    else releasedPanels.push(slug);

    const release = readJson(join(reelDir, 'release-qa.json'));
    if (!release) missingReleaseQa.push(slug);
    else if (!release.pass) releaseBlocked.push({ slug, errors: release.errors || [] });
  }

  const result = {
    renderedReels: rendered.length,
    matchingBlogPosts: rendered.length - missingBlog.length,
    missingBlogPosts: missingBlog.length,
    missingPanels: missingPanels.length,
    pendingPanels: pendingPanels.length,
    releasedPanels: releasedPanels.length,
    missingReleaseQa: missingReleaseQa.length,
    releaseBlocked: releaseBlocked.length,
    bufferMediaMapEntries: Object.keys(mediaMap).length,
    xMediaMapEntries: Object.keys(xMediaMap).length,
    missingBlog,
    missingPanels,
    missingReleaseQa,
    releaseBlocked,
  };
  return result;
}

const result = audit();
const json = process.argv.includes('--json');
if (json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`[reel-blog-audit] rendered=${result.renderedReels} blog=${result.matchingBlogPosts} panels=${result.releasedPanels} pending=${result.pendingPanels}`);
  console.log(`[reel-blog-audit] missing-panels=${result.missingPanels} missing-release-qa=${result.missingReleaseQa} release-blocked=${result.releaseBlocked}`);
  console.log(`[reel-blog-audit] buffer-map=${result.bufferMediaMapEntries} x-map=${result.xMediaMapEntries}`);
  for (const item of result.releaseBlocked) console.log(`[reel-blog-audit] BLOCKED ${item.slug}: ${item.errors.join(' | ')}`);
}

if (result.missingBlogPosts || result.missingPanels || result.missingReleaseQa || result.releaseBlocked) process.exitCode = 1;
