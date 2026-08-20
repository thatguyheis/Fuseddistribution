#!/usr/bin/env node
// Removes the legacy Watch 1/2/3 fallback only when a page already has an inline reel.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(new URL('../../..', import.meta.url).pathname);
const blogRoot = join(repoRoot, 'public', 'blog');
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, value = true] = arg.replace(/^--/, '').split('=');
  return [key, value];
}));
const dryRun = args['dry-run'] === true;
const requestedSlug = typeof args.slug === 'string' ? args.slug : null;

if (requestedSlug && !/^[a-z0-9-]+$/.test(requestedSlug)) {
  throw new Error('--slug must contain only lowercase letters, digits, and hyphens.');
}

function watchListEnd(html, start) {
  const tagPattern = /<\/?div\b[^>]*>/gi;
  tagPattern.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tagPattern.exec(html))) {
    if (match[0].startsWith('</')) depth -= 1;
    else depth += 1;
    if (depth === 0) return tagPattern.lastIndex;
  }
  return -1;
}

function removeGenericWatchLists(html) {
  if (!html.includes('SOCIAL_VIDEO_START')) return html;
  const pattern = /<div class="watch-list"(?=[\s>])[^>]*>/gi;
  let cursor = 0;
  let result = '';
  let changed = false;
  let match;

  while ((match = pattern.exec(html))) {
    const end = watchListEnd(html, match.index);
    if (end === -1) break;
    const block = html.slice(match.index, end);
    if (!/<strong>Watch\s+\d+<\/strong>/i.test(block)) continue;
    result += html.slice(cursor, match.index);
    cursor = end;
    pattern.lastIndex = end;
    changed = true;
  }

  return changed ? `${result}${html.slice(cursor)}` : html;
}

const slugs = requestedSlug
  ? [requestedSlug]
  : readdirSync(blogRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);

let updated = 0;
for (const slug of slugs) {
  const htmlPath = join(blogRoot, slug, 'index.html');
  if (!existsSync(htmlPath)) continue;
  const current = readFileSync(htmlPath, 'utf8');
  const next = removeGenericWatchLists(current);
  if (next === current) continue;
  if (!dryRun) writeFileSync(htmlPath, next);
  updated += 1;
  console.log(`${dryRun ? 'would clean' : 'cleaned'} ${slug}`);
}

console.log(`${dryRun ? 'would update' : 'updated'} ${updated} reel page${updated === 1 ? '' : 's'}.`);
