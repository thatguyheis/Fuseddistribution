#!/usr/bin/env node
// Generates sitemap.xml from static pages + all entries in posts.json
// Run from repo root: node public/blog/scripts/generate-sitemap.mjs

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const POSTS_FILE = resolve(ROOT, 'blog/posts.json');
const SITEMAP_FILE = resolve(ROOT, 'sitemap.xml');
const BASE = 'https://fuseddistribution.com';
const TODAY = new Date().toISOString().slice(0, 10);

const staticPages = [
  { loc: '/',          lastmod: TODAY, changefreq: 'monthly',  priority: '1.0' },
  { loc: '/pricing/',  lastmod: TODAY, changefreq: 'monthly',  priority: '1.0' },
  { loc: '/process/',  lastmod: TODAY, changefreq: 'monthly',  priority: '0.9' },
  { loc: '/reserve/',  lastmod: TODAY, changefreq: 'monthly',  priority: '0.9' },
  { loc: '/blog/',     lastmod: TODAY, changefreq: 'daily',    priority: '0.9' },
];

const posts = JSON.parse(readFileSync(POSTS_FILE, 'utf8'));

const urlTag = ({ loc, lastmod, changefreq, priority }) =>
  `  <url>\n    <loc>${BASE}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

const staticXml = staticPages.map(urlTag).join('\n');

const postXml = posts.map(p => urlTag({
  loc: `/blog/${p.slug}/`,
  lastmod: p.date,
  changefreq: 'monthly',
  priority: '0.8',
})).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${postXml}
</urlset>
`;

writeFileSync(SITEMAP_FILE, sitemap);
console.log(`Sitemap written: ${staticPages.length} static + ${posts.length} posts = ${staticPages.length + posts.length} URLs`);
