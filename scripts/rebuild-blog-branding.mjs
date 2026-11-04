#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBlogPosting, rebuildExistingBlogBranding } from '../public/blog/scripts/lib/existing-blog-branding.mjs';
import { isRetiredBlogSlug } from './lib/retired-blog-slugs.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const blogRoot = join(root, 'public/blog');
const postsPath = join(blogRoot, 'posts.json');
const silverListPath = join(root, 'docs/audits/2026-11-04-site-seo-audit/silver_posts_for_reserve_brand.txt');
const write = process.argv.includes('--write');
if (process.argv.slice(2).some(arg => arg !== '--write')) throw new Error('Usage: node scripts/rebuild-blog-branding.mjs [--write]');

const silverList = readFileSync(silverListPath, 'utf8').split(/\r?\n/).filter(Boolean);
if (silverList.length !== 172 || new Set(silverList).size !== silverList.length) {
  throw new Error('Expected 172 unique silver slugs in the reviewed audit list');
}
const silverSlugs = new Set(silverList);
const posts = JSON.parse(readFileSync(postsPath, 'utf8'));
const registeredSlugs = new Set(posts.map(post => post.slug));
for (const slug of silverSlugs) {
  if (!registeredSlugs.has(slug) || isRetiredBlogSlug(slug)) {
    throw new Error(`${slug}: silver audit list contains an unregistered or retired post`);
  }
}

const changes = [];
let silverCount = 0;
let newMetaCount = 0;
for (const post of posts) {
  const slug = post.slug;
  if (isRetiredBlogSlug(slug)) throw new Error(`${slug}: retired post is still registered`);
  const postDir = join(blogRoot, slug);
  const htmlPath = join(postDir, 'index.html');
  const oldHtml = readFileSync(htmlPath, 'utf8');
  const schema = readBlogPosting(oldHtml).value;
  const metaPath = join(postDir, 'meta.json');
  const hasMeta = existsSync(metaPath);
  const originalMeta = hasMeta ? readFileSync(metaPath, 'utf8') : null;
  const meta = originalMeta ? JSON.parse(originalMeta) : null;
  const silver = silverSlugs.has(slug) || post.brand === 'silver' || meta?.brand === 'silver';
  const brand = silver ? 'silver' : 'tech';
  if (silver) {
    silverCount++;
    post.brand = 'silver';
  }
  if (silverSlugs.has(slug)) {
    if (meta) {
      if (meta.brand !== 'silver') {
        meta.brand = 'silver';
        changes.push([metaPath, JSON.stringify(meta, null, 2) + '\n']);
      }
    } else {
      if (!schema.headline || !schema.description || !post.imageAlt || !Array.isArray(post.tags)) {
        throw new Error(`${slug}: insufficient approved metadata for legacy post`);
      }
      const restored = {
        title: schema.headline,
        slug,
        description: schema.description,
        alt: post.imageAlt,
        date: schema.datePublished,
        tags: post.tags,
        brand: 'silver',
      };
      if (schema.dateModified !== schema.datePublished) restored.modifiedDate = schema.dateModified;
      changes.push([metaPath, JSON.stringify(restored, null, 2) + '\n']);
      newMetaCount++;
    }
  }
  const rebuiltHtml = rebuildExistingBlogBranding(oldHtml, brand);
  if (rebuiltHtml !== oldHtml) changes.push([htmlPath, rebuiltHtml]);
}

const updatedPosts = JSON.stringify(posts, null, 2) + '\n';
if (updatedPosts !== readFileSync(postsPath, 'utf8')) changes.push([postsPath, updatedPosts]);
if (write) {
  for (const [path, content] of changes) writeFileSync(path, content);
}
console.log(JSON.stringify({ mode: write ? 'write' : 'preview', registeredPosts: posts.length,
  reviewedSilverPosts: silverSlugs.size, totalSilverPosts: silverCount, restoredLegacyMeta: newMetaCount,
  changedFiles: changes.length }, null, 2));
