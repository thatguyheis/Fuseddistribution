#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = 'https://fuseddistribution.com';

export function sitemapLocations(xml, label = 'sitemap') {
  if (typeof xml !== 'string') throw new Error(`${label}: expected XML text`);
  const locations = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1]);
  if (locations.length === 0) throw new Error(`${label}: no <loc> entries`);
  const set = new Set(locations);
  if (set.size !== locations.length) throw new Error(`${label}: duplicate <loc> entries`);
  return set;
}

export function verifySitemaps({ localXml, liveXml, posts, base = BASE }) {
  if (!Array.isArray(posts) || posts.length === 0) throw new Error('posts: empty or invalid catalog');
  const expected = new Set(posts.map((post) => `${base}/blog/${post.slug}/`));
  if ([...expected].some((url) => !url.includes('/blog/') || url.endsWith('/undefined/'))) {
    throw new Error('posts: invalid slug');
  }
  const local = sitemapLocations(localXml, 'local sitemap');
  const live = sitemapLocations(liveXml, 'live sitemap');
  const missingLocalCatalog = [...expected].filter((url) => !local.has(url));
  const missingLiveCatalog = [...expected].filter((url) => !live.has(url));
  const localOnly = [...local].filter((url) => !live.has(url));
  const liveOnly = [...live].filter((url) => !local.has(url));
  const missing = [...new Set([...missingLocalCatalog, ...missingLiveCatalog])].sort();
  const extras = [...new Set([...localOnly, ...liveOnly])].sort();
  if (missing.length > 0) {
    throw new Error(`sitemap mismatch: local=${local.size} live=${live.size}; missing URL(s): ${missing.join(', ')}`);
  }
  if (extras.length) throw new Error(`sitemap location sets differ: local-only=${localOnly.join(', ') || 'none'}; live-only=${liveOnly.join(', ') || 'none'}`);
  return {
    localCount: local.size,
    liveCount: live.size,
    catalogCount: expected.size,
    missing: [],
    extras,
    summary: `sitemap ${local.size} local = ${live.size} live; ${expected.size} catalog URLs present${extras.length ? `; ${extras.length} unknown set difference(s) reported` : ''}`,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [localPath, postsPath] = process.argv.slice(2);
    if (!localPath || !postsPath) throw new Error('Usage: verify-sitemap.mjs <local-sitemap.xml> <posts.json> < live-sitemap.xml');
    const result = verifySitemaps({
      localXml: readFileSync(localPath, 'utf8'),
      liveXml: readFileSync(0, 'utf8'),
      posts: JSON.parse(readFileSync(postsPath, 'utf8')),
    });
    console.log(result.summary);
    if (result.extras.length) console.log(`unknown set difference(s): ${result.extras.join(', ')}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
