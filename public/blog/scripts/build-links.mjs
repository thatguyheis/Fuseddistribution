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

// ── Linkify bare internal paths (gate check 4: no bare paths in prose) ───
// The local writer emits literal "/reserve/" and "/blog/x/" as plain text.
// Wrap them as markdown links; already-linked occurrences ("](/reserve/)")
// are preceded by "(" so the leading \s|^ guard skips them.
body = body.replace(/(^|\s)\/reserve\/(?=$|[\s.,;:!?)])/gm, "$1[our reserve page](/reserve/)");
body = body.replace(/(^|\s)\/blog\/([a-z0-9-]+)\/(?=$|[\s.,;:!?)])/gm,
  (_, pre, s) => `${pre}[${s.replace(/-/g, " ")}](/blog/${s}/)`);

// ── Inline injection (SOP §9: 2-3 links INSIDE body paragraphs) ──────────
// For each of the first two chosen posts, find a body paragraph containing a
// significant word from that post's title and wrap the first occurrence in a
// markdown link. Fallback: append a pointer sentence to a mid-article paragraph.
const STOP = new Set(["about","after","best","business","businesses","complete",
  "does","explained","from","getting","guide","into","local","more","need",
  "needs","small","that","their","them","they","this","what","when","where",
  "which","while","with","without","your","silver","how","why","for","and",
  "the","you"]);

function titleAnchors(title) {
  return (title.toLowerCase().match(/[a-z][a-z'-]{4,}/g) || [])
    .filter((w) => !STOP.has(w));
}

function injectInline(body, post) {
  const lines = body.split("\n");
  // paragraph line indexes: non-empty, not heading, not list, not image/table
  const paraIdx = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.trim() && !/^#|^[-*>]|^\d+\.|^!\[|^\|/.test(l.trim()))
    .map(({ i }) => i);
  if (paraIdx.length === 0) return { body, how: "none" };

  for (const anchor of titleAnchors(post.title)) {
    const re = new RegExp(`\\b(${anchor})\\b`, "i");
    for (const i of paraIdx.slice(1)) { // slice(1): keep the very first paragraph clean for the hook
      const line = lines[i];
      if (line.includes(`](/blog/`)) continue;          // one inline link per paragraph
      const m = line.match(re);
      if (!m) continue;
      // never wrap text that is already inside a markdown link
      const before = line.slice(0, m.index);
      const opens = (before.match(/\[/g) || []).length;
      const closes = (before.match(/\]/g) || []).length;
      if (opens > closes) continue;
      lines[i] = line.slice(0, m.index) +
        `[${m[0]}](/blog/${post.slug}/)` + line.slice(m.index + m[0].length);
      return { body: lines.join("\n"), how: `anchor "${m[0]}" para ${i}` };
    }
  }
  // fallback: append a pointer sentence to a middle paragraph without links
  const mid = paraIdx.filter((i) => !lines[i].includes(`](/blog/`));
  if (mid.length) {
    const i = mid[Math.floor(mid.length / 2)];
    lines[i] = lines[i].replace(/\s*$/, "") +
      ` For more on this, see [${post.title}](/blog/${post.slug}/).`;
    return { body: lines.join("\n"), how: `fallback sentence para ${i}` };
  }
  return { body, how: "none" };
}

let inlineCount = 0;
for (const p of chosen.slice(0, 2)) {
  const r = injectInline(body, p);
  if (r.how !== "none") { body = r.body; inlineCount += 1; console.log(`build-links: inline -> ${p.slug} (${r.how})`); }
}
if (inlineCount < 2) console.error(`build-links: WARNING only ${inlineCount} inline links injected`);

const block = "\n\n## Related\n\n" +
  chosen.map((p) => `- [${p.title}](/blog/${p.slug}/)`).join("\n") +
  `\n\nRead next: [${chosen[0].title}](/blog/${chosen[0].slug}/)\n`;
writeFileSync(verifiedPath, body.replace(/\s*$/, "") + block + "\n");
console.log(`build-links: added ${chosen.length} internal links (${chosen.map((p) => p.slug).join(", ")})`);
