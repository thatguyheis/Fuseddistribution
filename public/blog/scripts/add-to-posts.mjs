#!/usr/bin/env node
// posts.json entry — prepend a newest-first entry from meta.json. Idempotent
// (skips if slug already present). image uses hero.jpg (SOP §2).
// Usage: node scripts/add-to-posts.mjs --slug=my-slug
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
}));
const BLOG_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const slug = args.slug;
if (!slug) { console.error("error: --slug required"); process.exit(1); }
const meta = JSON.parse(readFileSync(join(BLOG_DIR, slug, "meta.json"), "utf8"));
const postsPath = join(BLOG_DIR, "posts.json");
const posts = existsSync(postsPath) ? JSON.parse(readFileSync(postsPath, "utf8")) : [];

if (posts.some((p) => p.slug === slug)) { console.log(`add-to-posts: ${slug} already present — skipping`); process.exit(0); }

let excerpt = (meta.description || "").trim();
if (excerpt.length > 160) excerpt = excerpt.slice(0, 157).replace(/\s+\S*$/, "") + "...";

const entry = {
  slug, title: meta.title, date: meta.date, excerpt,
  tags: meta.tags || [], author: "Nick",
  image: `/blog/${slug}/hero.jpg`, imageAlt: meta.alt || meta.title,
};
posts.unshift(entry);
writeFileSync(postsPath, JSON.stringify(posts, null, 2) + "\n");
console.log(`add-to-posts: prepended ${slug} (${posts.length} total)`);
