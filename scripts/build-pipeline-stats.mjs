#!/usr/bin/env node
// Writes public/data/pipeline-stats.json with live post and reel counts.
// Usage: node scripts/build-pipeline-stats.mjs [--root <repo>] [--out <file>]
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const root = resolve(flag("--root") ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
const out = resolve(flag("--out") ?? join(root, "public/data/pipeline-stats.json"));

const posts = JSON.parse(readFileSync(join(root, "public/blog/posts.json"), "utf8"));
const reelsDir = join(root, "public/reels");
const reels = existsSync(reelsDir)
  ? readdirSync(reelsDir, { withFileTypes: true }).filter(
      (d) => d.isDirectory() && existsSync(join(reelsDir, d.name, `${d.name}.mp4`))
    ).length
  : 0;

const stats = {
  posts: Array.isArray(posts) ? posts.length : 0,
  reels,
  updated: new Date().toISOString(),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(stats, null, 2) + "\n");
console.log(`pipeline-stats: ${stats.posts} posts, ${stats.reels} reels -> ${out}`);
