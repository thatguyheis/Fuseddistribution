#!/usr/bin/env node
// T8 svg-build — deterministic, zero-LLM. Parametric hero.svg (1200x630) and
// photo-post.svg (1200x1200) from meta.json (title) + hooks.json (key_stat).
// Brand dark theme. Numeric XML entities only (SOP §7/§13). No named entities.
//
// Usage: node scripts/build-svg.mjs --slug=my-slug
//        node scripts/build-svg.mjs --title="..." --stat="76%" --statLabel="of buyers" --dir=/path
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
}));
const BLOG_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

let title = args.title, stat = args.stat, statLabel = args.statLabel, dir = args.dir;
if (args.slug) {
  dir = dir || join(BLOG_DIR, args.slug);
  const mp = join(dir, "meta.json"), hp = join(dir, "hooks.json");
  if (existsSync(mp)) title = title || JSON.parse(readFileSync(mp, "utf8")).title;
  if (existsSync(hp)) { const h = JSON.parse(readFileSync(hp, "utf8")); stat = stat ?? h.key_stat?.value; statLabel = statLabel ?? h.key_stat?.label; }
}
if (!title || !dir) { console.error("error: need --slug or (--title and --dir)"); process.exit(1); }
stat = stat || ""; statLabel = statLabel || "";

// XML-safe: escape & < > " and force ASCII (numeric entities for non-ASCII)
const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  .replace(/[-￿]/g, (c) => `&#${c.charCodeAt(0)};`);

function wrap(text, max) {
  const words = String(text).toUpperCase().split(/\s+/); const lines = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) lines.push(cur); return lines;
}

const C = { bg: "#041018", cyan: "#58d6ff", green: "#4dffb8", text: "#ecf8fb", muted: "rgba(175,198,207,0.75)" };

function bgLayer(w, h) {
  const cx = w / 2, cy = h / 2;
  let dots = "";
  for (let i = 0; i < 10; i++) {
    const x = 60 + ((i * 9301 + 49297) % (w - 120)), y = 40 + ((i * 233280 + 12345) % (h - 80));
    const col = i % 2 ? C.green : C.cyan, op = (0.15 + (i % 4) * 0.04).toFixed(2);
    dots += `<circle cx="${x}" cy="${y}" r="${1 + (i % 2) * 0.5}" fill="${col}" opacity="${op}"/>`;
  }
  return `<rect width="${w}" height="${h}" fill="${C.bg}"/>
  <radialGradient id="g1" cx="50%" cy="45%" r="60%"><stop offset="0%" stop-color="${C.cyan}" stop-opacity="0.12"/><stop offset="100%" stop-color="${C.cyan}" stop-opacity="0"/></radialGradient>
  <radialGradient id="g2" cx="12%" cy="10%" r="40%"><stop offset="0%" stop-color="${C.green}" stop-opacity="0.10"/><stop offset="100%" stop-color="${C.green}" stop-opacity="0"/></radialGradient>
  <rect width="${w}" height="${h}" fill="url(#g1)"/><rect width="${w}" height="${h}" fill="url(#g2)"/>
  <circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.4}" fill="none" stroke="${C.cyan}" stroke-opacity="0.07"/>
  <circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.27}" fill="none" stroke="${C.cyan}" stroke-opacity="0.11"/>
  ${dots}`;
}

// ── hero.svg 1200x630 ──
function hero() {
  const lines = wrap(title, 22).slice(0, 3);
  const fs = lines.length >= 3 ? 64 : 76;
  const startY = 300 - ((lines.length - 1) * fs) / 2;
  const titleT = lines.map((l, i) => `<text x="600" y="${startY + i * (fs + 8)}" font-family="Impact, Haettenschweiler, sans-serif" font-size="${fs}" fill="${C.text}" text-anchor="middle" letter-spacing="2">${xml(l)}</text>`).join("\n  ");
  const statT = stat ? `<text x="600" y="470" font-family="Impact, sans-serif" font-size="84" fill="${C.cyan}" text-anchor="middle">${xml(stat)}</text>
  <text x="600" y="510" font-family="Arial, sans-serif" font-size="24" fill="${C.muted}" text-anchor="middle">${xml(statLabel.toUpperCase())}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${bgLayer(1200, 630)}
  <text x="600" y="120" font-family="Arial, sans-serif" font-size="22" fill="${C.cyan}" text-anchor="middle" letter-spacing="6">FUSED DISTRIBUTION</text>
  ${titleT}
  ${statT}
</svg>
`;
}

// ── photo-post.svg 1200x1200 ──
function photo() {
  const lines = wrap(title, 18).slice(0, 4);
  const fs = 72;
  const startY = 380 - ((lines.length - 1) * fs) / 2;
  const titleT = lines.map((l, i) => `<text x="600" y="${startY + i * (fs + 10)}" font-family="Impact, sans-serif" font-size="${fs}" fill="${C.text}" text-anchor="middle" letter-spacing="2">${xml(l)}</text>`).join("\n  ");
  const statT = stat ? `<text x="600" y="760" font-family="Impact, sans-serif" font-size="180" fill="${C.cyan}" text-anchor="middle">${xml(stat)}</text>
  <text x="600" y="810" font-family="Arial, sans-serif" font-size="26" fill="${C.muted}" text-anchor="middle">${xml(statLabel.toUpperCase())}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  ${bgLayer(1200, 1200)}
  <text x="600" y="140" font-family="Arial, sans-serif" font-size="26" fill="${C.cyan}" text-anchor="middle" letter-spacing="8">FUSED</text>
  ${titleT}
  ${statT}
  <rect x="350" y="1020" width="500" height="68" rx="16" fill="none" stroke="${C.cyan}" stroke-opacity="0.5"/>
  <text x="600" y="1063" font-family="Arial, sans-serif" font-size="22" fill="${C.text}" text-anchor="middle">Full breakdown at fuseddistribution.com</text>
</svg>
`;
}

const heroPath = join(dir, "hero.svg"), photoPath = join(dir, "photo-post.svg");
writeFileSync(heroPath, hero());
writeFileSync(photoPath, photo());

// self-check: no named entities
for (const p of [heroPath, photoPath]) {
  const bad = readFileSync(p, "utf8").match(/&[a-zA-Z]+;/g);
  if (bad) { console.error(`error: named entity in ${p}: ${[...new Set(bad)].join(",")}`); process.exit(1); }
}
console.log(`svg-build: wrote ${heroPath} + ${photoPath} (entity-clean)`);
