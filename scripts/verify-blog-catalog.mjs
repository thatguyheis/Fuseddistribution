#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { newestFirst } from '../public/blog/scripts/lib/post-order.mjs';

// Same-day order can differ between scoped deployments and local registration.
// Require every complete entry and chronological order, not the first slug.
export function verifyBlogCatalog(expected, live) {
  function index(posts, label) {
    if (!Array.isArray(posts) || posts.length === 0) throw new Error(`${label}: empty or invalid catalog`);
    const sorted = newestFirst(posts);
    const entries = new Map();
    posts.forEach((post, i) => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug || '')) throw new Error(`${label}: invalid slug`);
      if (entries.has(post.slug)) throw new Error(`${label}: duplicate ${post.slug}`);
      if (post.date !== sorted[i].date) throw new Error(`${label}: publication dates out of order`);
      entries.set(post.slug, post);
    });
    return entries;
  }
  const wanted = index(expected, 'local');
  const actual = index(live, 'live');
  if (wanted.size !== actual.size) throw new Error(`catalog counts differ: local=${wanted.size} live=${actual.size}`);
  for (const [slug, entry] of wanted) {
    if (!actual.has(slug)) throw new Error(`live catalog missing ${slug}`);
    if (!isDeepStrictEqual(entry, actual.get(slug))) throw new Error(`live catalog entry differs: ${slug}`);
  }
  return { count: actual.size, newestDate: live[0].date };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const localPath = process.argv[2];
    if (!localPath) throw new Error('Usage: verify-blog-catalog.mjs <local-posts.json> < live-posts.json');
    const result = verifyBlogCatalog(JSON.parse(readFileSync(localPath, 'utf8')), JSON.parse(readFileSync(0, 'utf8')));
    console.log(`${result.count} matching entries; dates ordered; newest=${result.newestDate}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
