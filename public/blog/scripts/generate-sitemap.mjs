#!/usr/bin/env node
// Generates sitemap.xml from posts.json (blog) + auto-discovered static pages.
// Static pages are found by walking public/ for index.html, so new marketing,
// photo, and portfolio pages are picked up automatically.
// Run from repo root: node public/blog/scripts/generate-sitemap.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..'); // -> public/
const POSTS_FILE = resolve(ROOT, 'blog/posts.json');
const SITEMAP_FILE = resolve(ROOT, 'sitemap.xml');
const BASE = 'https://fuseddistribution.com';
const TODAY = new Date().toISOString().slice(0, 10);

// Directories under public/ to skip entirely when discovering static pages.
const SKIP_DIRS = new Set([
  'blog',              // handled via posts.json (canonical set)
  'api',               // disallowed in robots.txt
  '.wrangler',
  'cloudflare-upload',
  'node_modules',
]);

const isoDate = (path) => statSync(path).mtime.toISOString().slice(0, 10);

// Route metadata. Most specific prefix wins; falls back to default.
const meta = (route) => {
  if (route === '/') return { changefreq: 'monthly', priority: '1.0' };
  if (route.startsWith('/photos/images/')) return { changefreq: 'yearly', priority: '0.4' };
  if (route.startsWith('/photos/')) return { changefreq: 'monthly', priority: '0.6' };
  const topLevel = route.split('/').filter(Boolean).length === 1;
  return { changefreq: 'monthly', priority: topLevel ? '0.9' : '0.7' };
};

// Recursively collect routes that have an index.html and are safe to index.
function discover(dir, urlPrefix, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const hasIndex = entries.some((e) => e.isFile() && e.name === 'index.html');
  if (hasIndex) {
    const route = urlPrefix === '' ? '/' : `${urlPrefix}/`;
    // Drop routes that need URL-encoding (spaces / odd chars) — malformed dirs.
    if (route === encodeURI(route)) {
      const indexPath = join(dir, 'index.html');
      const html = readFileSync(indexPath, 'utf8');
      if (!/<meta[^>]+noindex/i.test(html)) {
        out.push({ loc: route, lastmod: isoDate(indexPath), ...meta(route) });
      }
    }
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    if (e.name.startsWith('.')) continue;
    discover(join(dir, e.name), `${urlPrefix}/${e.name}`, out);
  }
}

const staticPages = [];
discover(ROOT, '', staticPages);
staticPages.sort((a, b) => a.loc.localeCompare(b.loc));

// Blog index is inside public/blog/, which we skip above — add it explicitly.
staticPages.push({ loc: '/blog/', lastmod: TODAY, changefreq: 'daily', priority: '0.9' });

const posts = JSON.parse(readFileSync(POSTS_FILE, 'utf8'));
const postPages = posts.map((p) => ({
  loc: `/blog/${p.slug}/`,
  lastmod: p.date,
  changefreq: 'monthly',
  priority: '0.8',
}));

const urlTag = ({ loc, lastmod, changefreq, priority }) =>
  `  <url>\n    <loc>${BASE}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

const all = [...staticPages, ...postPages];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(urlTag).join('\n')}
</urlset>
`;

writeFileSync(SITEMAP_FILE, sitemap);
console.log(`Sitemap written: ${staticPages.length} static + ${postPages.length} posts = ${all.length} URLs`);
