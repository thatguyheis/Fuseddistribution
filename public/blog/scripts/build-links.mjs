#!/usr/bin/env node
// Internal links — picks 2-3 related EXISTING posts by tag overlap, verifies each
// is live (curl 200), and appends a "Related" section to verified.md so T7 turns
// them into real internal links. No islands (SOP §9). Never links to same-run slugs.
//
// Usage: node scripts/build-links.mjs --slug=my-slug [--max=3] [--verified=path] [--no-verify]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
}));
const BLOG_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const slug = args.slug;
if (!slug) { console.error("error: --slug required"); process.exit(1); }
const dir = join(BLOG_DIR, slug);
const max = parseInt(args.max || "3", 10);
const verifiedPath = args.verified || join(dir, "verified.md");
const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
const postsPath = join(BLOG_DIR, "posts.json");
if (!existsSync(postsPath)) { console.error("error: posts.json not found"); process.exit(1); }
const posts = JSON.parse(readFileSync(postsPath, "utf8"));

const myTags = new Set((meta.tags || []).map((t) => t.toLowerCase()));
const ranked = posts
  .filter((p) => p.slug && p.slug !== slug)
  .map((p) => ({ p, overlap: (p.tags || []).filter((t) => myTags.has(String(t).toLowerCase())).length }))
  .sort((a, b) => b.overlap - a.overlap || 0)
  .map((x) => x.p);

async function isLive(s) {
  if (args["no-verify"]) return true;
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
    const r = await fetch(`https://fuseddistribution.com/blog/${s}/`, { method: "HEAD", signal: c.signal });
    clearTimeout(t); return r.status === 200;
  } catch { return false; }
}

const chosen = [];
for (const p of ranked) {
  if (chosen.length >= max) break;
  if (await isLive(p.slug)) chosen.push(p);
}

if (chosen.length === 0) { console.log("build-links: no live related posts found — skipping"); process.exit(0); }

let body = readFileSync(verifiedPath, "utf8");
if (/##\s*Related/i.test(body)) { console.log("build-links: Related section already present — skipping"); process.exit(0); }

const block = "\n\n## Related\n\n" +
  chosen.map((p) => `- [${p.title}](/blog/${p.slug}/)`).join("\n") +
  `\n\nRead next: [${chosen[0].title}](/blog/${chosen[0].slug}/)\n`;
writeFileSync(verifiedPath, body.replace(/\s*$/, "") + block + "\n");
console.log(`build-links: added ${chosen.length} internal links (${chosen.map((p) => p.slug).join(", ")})`);
