#!/usr/bin/env node
// T7 html-build — deterministic, zero-LLM. Fills the BLOG-REF template from
// meta.json + a markdown body, writes public/blog/[slug]/index.html.
//
// Usage:
//   node scripts/build-html.mjs --slug=my-slug
//   node scripts/build-html.mjs --slug=my-slug --body=path/to/verified.md --out=path
//
// Reads (defaults relative to public/blog/[slug]/):
//   meta.json     required — see SCHEMA below
//   verified.md   body markdown (fallback: clean.md, then gemma_draft.md)
//
// meta.json SCHEMA:
// {
//   "title": "Post Title",
//   "slug": "my-slug",
//   "description": "140-160 char meta description",
//   "ogDescription": "<=100 char og description",   // optional, falls back to description
//   "alt": "hero image alt text",
//   "date": "2026-06-16",                            // ISO
//   "humanDate": "June 16, 2026",                    // optional, derived if absent
//   "tags": ["Tag One", "Tag Two"],
//   "brand": "silver",                                // "silver" | "tech"
//   "ctaLine": "One sentence inviting action."       // optional
// }
//
// Body markdown: ## -> h2, ### -> h3, -/* -> ul, 1. -> ol, **bold**, [t](u), `code`.
// A leading "# Title" line and gemma_draft HTML comments/banner are stripped.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  })
);

const BLOG_DIR = dirname(dirname(fileURLToPath(import.meta.url))); // .../public/blog
const slug = args.slug;
if (!slug) { console.error("error: --slug is required"); process.exit(1); }

const postDir = join(BLOG_DIR, slug);
const metaPath = args.meta || join(postDir, "meta.json");
const outPath = args.out || join(postDir, "index.html");

if (!existsSync(metaPath)) { console.error(`error: meta.json not found: ${metaPath}`); process.exit(1); }
const meta = JSON.parse(readFileSync(metaPath, "utf8"));

// Resolve body source
let bodyPath = args.body;
if (!bodyPath) {
  for (const f of ["verified.md", "clean.md", "gemma_draft.md"]) {
    const p = join(postDir, f);
    if (existsSync(p)) { bodyPath = p; break; }
  }
}
if (!bodyPath || !existsSync(bodyPath)) { console.error("error: no body markdown found (verified.md/clean.md/gemma_draft.md)"); process.exit(1); }
const rawBody = readFileSync(bodyPath, "utf8");

// ── validation ────────────────────────────────────────────────────────────
const required = ["title", "slug", "description", "alt", "date", "tags", "brand"];
for (const k of required) {
  if (meta[k] === undefined || meta[k] === "") { console.error(`error: meta.json missing "${k}"`); process.exit(1); }
}
if (meta.slug !== slug) console.error(`warn: meta.slug "${meta.slug}" != --slug "${slug}"`);
if (!["silver", "tech"].includes(meta.brand)) { console.error(`error: brand must be silver|tech`); process.exit(1); }
const [tag1, tag2] = meta.tags;

// ── helpers ───────────────────────────────────────────────────────────────
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const humanDate = meta.humanDate ||
  new Date(meta.date + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

function inline(text) {
  // escape first, then apply inline markdown (operating on escaped text)
  let t = esc(text);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, txt, url) => `<a href="${url}">${txt}</a>`);
  return t;
}

function mdToHtml(md) {
  // strip gemma banner: leading HTML comments, "# GEMMA DRAFT" / "> ..." lines
  const lines = md.replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;
  let firstH1Stripped = false;
  let list = null; // 'ul' | 'ol'
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  while (i < lines.length) {
    let line = lines[i];
    const t = line.trim();

    if (t.startsWith("<!--")) { i++; continue; }                 // drop HTML comments
    // Blockquotes: drop gemma/status banner lines, render content blockquotes
    if (/^>\s?/.test(t)) {
      const inner = t.replace(/^>\s?/, "");
      if (/^(Generated:|Model:|Claude:|Status:|GEMMA DRAFT)/.test(inner)) { i++; continue; } // drop banner
      // Gather consecutive blockquote lines
      closeList();
      const bqLines = [inner];
      i++;
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        bqLines.push(lines[i].trim().replace(/^>\s?/, "")); i++;
      }
      out.push(`<blockquote><p>${inline(bqLines.join(" "))}</p></blockquote>`);
      continue;
    }
    if (t === "---") { i++; continue; }                           // drop hr separators
    if (t === "") { closeList(); i++; continue; }

    if (t.startsWith("# ")) {
      // first H1 = title, already in template — drop it; later H1 -> h2
      if (!firstH1Stripped) { firstH1Stripped = true; i++; continue; }
      closeList(); out.push(`<h2>${inline(t.slice(2).trim())}</h2>`); i++; continue;
    }
    if (t.startsWith("### ")) { closeList(); out.push(`<h3>${inline(t.slice(4).trim())}</h3>`); i++; continue; }
    if (t.startsWith("## ")) { closeList(); out.push(`<h2>${inline(t.slice(3).trim())}</h2>`); i++; continue; }

    const ulm = t.match(/^[-*]\s+(.*)$/);
    const olm = t.match(/^\d+\.\s+(.*)$/);
    if (ulm) { if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(ulm[1])}</li>`); i++; continue; }
    if (olm) { if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(olm[1])}</li>`); i++; continue; }

    // paragraph: gather until blank
    closeList();
    const buf = [t];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(#|<!--|[-*]\s|\d+\.\s|---)/.test(lines[i].trim()) && !/^>/.test(lines[i].trim())) {
      buf.push(lines[i].trim()); i++;
    }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  closeList();
  return out.join("\n            ");
}

// ── brand routing ───────────────────────────────────────────────────────────
const B = meta.brand === "silver"
  ? { sub: "Distribution", navCta: '<a class="nav-cta" href="/reserve/">Reserve Silver</a>',
      artCta: '<a class="btn btn-primary" href="https://fuseddistribution.com/reserve/">See Fused Reserve Plans</a>',
      ctaLine: meta.ctaLine || "Start building your silver reserve today." }
  : { sub: "Technology Solutions", navCta: '<a class="nav-cta" href="/#contact">Get Started</a>',
      artCta: '<a class="btn btn-primary" href="/#contact">Talk to Fused</a>',
      ctaLine: meta.ctaLine || "Get a website that brings in local customers." };

const ogDesc = meta.ogDescription || meta.description;
const bodyHtml = mdToHtml(rawBody);

// ── CSS (BLOG-REF Section 2, verbatim) ──────────────────────────────────────
const CSS = `:root {
  --bg: #07131a;
  --panel: rgba(11, 24, 32, 0.82);
  --line: rgba(87, 219, 255, 0.16);
  --text: #ecf8fb;
  --muted: #afc6cf;
  --accent: #58d6ff;
  --accent-2: #4dffb8;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; min-height: 100vh; color: var(--text);
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at 10% 12%, rgba(88, 214, 255, 0.12), transparent 24%),
    radial-gradient(circle at 84% 14%, rgba(77, 255, 184, 0.08), transparent 18%),
    linear-gradient(180deg, #041018 0%, #07131a 48%, #040b10 100%);
}
body::before {
  content: ""; position: fixed; inset: 0;
  background:
    linear-gradient(120deg, rgba(88, 214, 255, 0.05), transparent 28%, transparent 68%, rgba(77, 255, 184, 0.05)),
    repeating-linear-gradient(90deg, transparent 0, transparent 94px, rgba(255, 255, 255, 0.02) 95px);
  pointer-events: none;
}
a { color: inherit; text-decoration: none; }
.shell {
  width: min(1220px, calc(100% - 32px)); margin: 18px auto 40px;
  border-radius: 28px; overflow: visible;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: linear-gradient(180deg, rgba(7, 17, 23, 0.96), rgba(5, 12, 17, 0.98));
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.42); position: relative;
}
.shell::after {
  content: ""; position: absolute; inset: 0;
  background:
    radial-gradient(circle at 72% 18%, rgba(88, 214, 255, 0.1), transparent 18%),
    radial-gradient(circle at 26% 54%, rgba(77, 255, 184, 0.06), transparent 24%);
  pointer-events: none;
}
.topbar, .main, .footer { position: relative; z-index: 1; }
.topbar {
  display: flex; align-items: center; justify-content: space-between; gap: 18px;
  padding: 20px 30px; background: rgba(7, 16, 22, 0.92);
  backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.brand { display: flex; flex-direction: column; line-height: 1; }
.brand-mark {
  color: var(--accent); font-size: 1.95rem; font-weight: 900;
  letter-spacing: 0.08em; text-transform: uppercase; text-shadow: 0 0 16px rgba(88, 214, 255, 0.3);
}
.brand-sub {
  margin-top: 4px; color: rgba(236, 248, 251, 0.72); font-size: 0.75rem;
  letter-spacing: 0.2em; text-transform: uppercase;
}
.nav { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.nav-pages, .nav-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.nav-pages {
  padding: 8px 10px; border-radius: 999px;
  border: 1px solid rgba(88, 214, 255, 0.18); background: rgba(7, 15, 23, 0.56);
}
.nav a { font-size: 0.95rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.nav-pages a { padding: 9px 14px; border-radius: 999px; }
.nav a:hover, .nav a:focus-visible, .nav a.active { color: var(--accent); }
.nav-cta {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 160px; padding: 12px 18px; border-radius: 14px;
  border: 1px solid rgba(88, 214, 255, 0.28); background: rgba(88, 214, 255, 0.08); color: var(--accent);
}
.main { padding: 52px 54px 60px; }
.article-wrap { max-width: 760px; margin: 0 auto; }
.back-link {
  display: inline-flex; align-items: center; gap: 6px; color: var(--muted);
  font-size: 0.85rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 32px;
}
.back-link:hover { color: var(--accent); }
.eyebrow {
  display: inline-block; padding: 8px 14px; border-radius: 999px;
  border: 1px solid var(--line); background: rgba(88, 214, 255, 0.08); color: var(--accent);
  font-size: 0.82rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
}
.article-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 18px 0 24px; }
.article-meta time { color: var(--muted); font-size: 0.88rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.pill {
  padding: 5px 10px; border-radius: 999px; border: 1px solid rgba(88, 214, 255, 0.18);
  background: rgba(88, 214, 255, 0.08); color: rgba(236, 248, 251, 0.88);
  font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
}
h1 {
  margin: 0 0 4px; font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
  font-size: clamp(2.2rem, 5vw, 3.6rem); letter-spacing: 0.03em; text-transform: uppercase; line-height: 1.05;
}
.article-hero { width: 100%; border-radius: 18px; overflow: hidden; margin: 28px 0 0; border: 1px solid rgba(255, 255, 255, 0.06); }
.article-hero img { display: block; width: 100%; height: auto; max-height: 420px; object-fit: cover; }
.article-hero figcaption { padding: 10px 14px; font-size: 0.78rem; color: rgba(175, 198, 207, 0.55); background: rgba(7, 15, 23, 0.6); letter-spacing: 0.04em; }
.article-hero figcaption a { color: rgba(175, 198, 207, 0.55); text-decoration: underline; }
.article-photo { margin: 32px 0; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.06); }
.article-photo img { display: block; width: 100%; height: auto; max-height: 480px; object-fit: cover; object-position: center; }
.article-photo figcaption { padding: 10px 16px; font-size: 0.78rem; color: rgba(175, 198, 207, 0.55); letter-spacing: 0.04em; background: rgba(7, 16, 22, 0.6); }
.article-divider { height: 1px; background: rgba(88, 214, 255, 0.12); margin: 32px 0; }
.article-body { color: var(--muted); font-size: 1.08rem; line-height: 1.82; }
.article-body h2 {
  font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
  font-size: 1.55rem; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text); margin: 40px 0 14px;
}
.article-body h3 { color: var(--text); font-size: 1.18rem; margin: 28px 0 10px; }
.article-body p { margin: 0 0 20px; }
.article-body ul, .article-body ol { margin: 0 0 20px; padding-left: 20px; }
.article-body li { margin-bottom: 8px; }
.article-body strong { color: var(--text); }
.article-body a { color: var(--accent); text-decoration: underline; }
.chart-wrap { background: rgba(7, 20, 28, 0.8); border: 1px solid rgba(88, 214, 255, 0.14); border-radius: 16px; padding: 28px 20px 18px; margin: 36px 0; }
.chart-title { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); text-align: center; margin-bottom: 18px; }
.chart-note { font-size: 0.72rem; color: rgba(175, 198, 207, 0.45); text-align: center; margin-top: 10px; letter-spacing: 0.04em; }
.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 32px 0; }
.stat-card { background: rgba(88, 214, 255, 0.04); border: 1px solid rgba(88, 214, 255, 0.14); border-radius: 14px; padding: 22px 18px; text-align: center; }
.stat-card .stat-number { font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif; font-size: 2.4rem; letter-spacing: 0.03em; color: var(--accent); line-height: 1; margin-bottom: 8px; }
.stat-card .stat-label { font-size: 0.82rem; color: var(--muted); line-height: 1.5; }
.sources-block { margin-top: 48px; padding: 24px; border-radius: 16px; border: 1px solid rgba(88, 214, 255, 0.1); background: rgba(7, 18, 26, 0.6); }
.sources-block h3 { font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif; font-size: 1rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 0 0 14px; }
.sources-block ol { margin: 0; padding-left: 20px; color: rgba(175, 198, 207, 0.5); font-size: 0.78rem; line-height: 1.7; }
.sources-block ol li { margin-bottom: 6px; }
.sources-block a { color: rgba(88, 214, 255, 0.6); text-decoration: underline; }
.faq-block { display: flex; flex-direction: column; gap: 12px; margin: 32px 0; }
.faq-item { padding: 20px 24px; border-radius: 14px; border: 1px solid rgba(88, 214, 255, 0.12); background: rgba(7, 18, 26, 0.6); }
.faq-q { font-weight: 700; color: var(--text); font-size: 1rem; margin-bottom: 8px; }
.faq-a { color: var(--muted); font-size: 0.95rem; line-height: 1.7; }
.article-cta { margin-top: 48px; padding: 28px; border-radius: 22px; border: 1px solid rgba(88, 214, 255, 0.2); background: rgba(88, 214, 255, 0.05); text-align: center; }
.article-cta p { margin: 0 0 18px; color: var(--muted); }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 14px 22px; border-radius: 16px; border: 1px solid transparent; font-size: 0.9rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.btn-primary { color: #041117; background: linear-gradient(135deg, var(--accent), var(--accent-2)); box-shadow: 0 0 34px rgba(88, 214, 255, 0.18); }
.footer { padding: 24px 28px 34px; color: rgba(175, 198, 207, 0.74); text-align: center; font-size: 0.92rem; }
.nav-item { position: relative; }
.nav-toggle { display: inline-flex; align-items: center; gap: 5px; padding: 9px 14px; border-radius: 999px; border: none; background: transparent; cursor: pointer; font-family: inherit; font-size: inherit; font-weight: 700; letter-spacing: 0.04em; color: rgba(239, 252, 255, 0.9); transition: color 0.15s; }
.nav-toggle:hover, .nav-toggle:focus-visible, .nav-toggle.active, .nav-item:hover .nav-toggle, .nav-item:focus-within .nav-toggle { color: var(--accent); outline: none; }
.nav-caret { font-size: 0.68rem; transition: transform 0.2s ease; display: inline-block; }
.nav-item:hover .nav-caret, .nav-item:focus-within .nav-caret { transform: rotate(180deg); }
.nav-dropdown { display: flex; flex-direction: column; position: absolute; top: calc(100% + 2px); left: 50%; transform: translateX(-50%) translateY(-6px); min-width: 210px; padding: 8px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(8, 16, 24, 0.97); backdrop-filter: blur(20px); box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55); z-index: 200; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 0.25s ease 0.35s, visibility 0.25s ease 0.35s, transform 0.25s ease 0.35s; }
.nav-item:hover .nav-dropdown, .nav-item:focus-within .nav-dropdown { transition: opacity 0.18s ease 0s, visibility 0.18s ease 0s, transform 0.18s ease 0s; opacity: 1; visibility: visible; pointer-events: auto; transform: translateX(-50%) translateY(0); }
.nav-dropdown a { padding: 9px 14px; border-radius: 10px; font-size: 0.88rem; letter-spacing: 0.04em; color: rgba(220, 240, 248, 0.78); transition: background 0.12s, color 0.12s; }
.nav-dropdown a:hover, .nav-dropdown a:focus-visible, .nav-dropdown a.active { background: rgba(97, 255, 215, 0.08); color: var(--accent); }
.nav-dropdown-divider { height: 1px; background: rgba(255, 255, 255, 0.07); margin: 4px 6px; }
@media (max-width: 1080px) { .topbar { flex-direction: column; align-items: flex-start; } .main { padding-left: 24px; padding-right: 24px; } }
@media (max-width: 900px) { .nav-dropdown { left: 0; transform: translateY(-6px); } .nav-item:hover .nav-dropdown, .nav-item:focus-within .nav-dropdown { transform: translateY(0); } }
@media (max-width: 680px) { .shell { width: calc(100% - 16px); margin: 8px auto 18px; border-radius: 22px; } .topbar { padding: 16px; } h1 { font-size: 2rem; } .stat-row { grid-template-columns: 1fr; } }`;

// ── assemble ──────────────────────────────────────────────────────────────
const html = render({
  title: meta.title, slug, sub: B.sub, description: meta.description, ogDesc,
  alt: meta.alt, date: meta.date, humanDate, tag1, tag2,
  navCta: B.navCta, artCta: B.artCta, ctaLine: B.ctaLine, bodyHtml,
});

writeFileSync(outPath, html);
console.log(`html-build: wrote ${outPath} (${html.length} bytes, body ${rawBody.length} chars)`);

// ── template (BLOG-REF Section 1 + Section 2 CSS, verbatim with slots) ───────
function render(d) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(d.title)} | Fused ${d.sub}</title>
    <meta name="description" content="${esc(d.description)}" />
    <meta property="og:type" content="article" />
    <meta property="article:published_time" content="${d.date}T00:00:00Z" />
    <meta property="article:author" content="https://fuseddistribution.com/about/" />
    <meta property="og:url" content="https://fuseddistribution.com/blog/${d.slug}/" />
    <meta property="og:title" content="${esc(d.title)}" />
    <meta property="og:description" content="${esc(d.ogDesc)}" />
    <meta property="og:image" content="https://fuseddistribution.com/blog/${d.slug}/hero.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://fuseddistribution.com/blog/${d.slug}/hero.jpg" />
    <link rel="canonical" href="https://fuseddistribution.com/blog/${d.slug}/" />
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": ${JSON.stringify(d.title)},
      "description": ${JSON.stringify(d.description)},
      "url": "https://fuseddistribution.com/blog/${d.slug}/",
      "datePublished": "${d.date}",
      "dateModified": "${d.date}",
      "author": {
        "@type": "Person",
        "name": "Nick",
        "url": "https://fuseddistribution.com/about/",
        "sameAs": [
          "https://www.facebook.com/fuseddistribution",
          "https://www.instagram.com/fuseddistribution"
        ],
        "knowsAbout": ["silver investing", "precious metals", "web design", "local business marketing", "inflation hedging"]
      },
      "publisher": {
        "@type": "Organization",
        "name": "Fused Distribution",
        "@id": "https://fuseddistribution.com/#organization",
        "logo": { "@type": "ImageObject", "url": "https://fuseddistribution.com/og-image.png" }
      },
      "image": "https://fuseddistribution.com/blog/${d.slug}/hero.jpg",
      "mainEntityOfPage": { "@type": "WebPage", "@id": "https://fuseddistribution.com/blog/${d.slug}/" }
    }
    </script>
    <style>
${CSS}
    </style>
  </head>
  <body>
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="/">
          <span class="brand-mark">Fused</span>
          <span class="brand-sub">${d.sub}</span>
        </a>
        <nav class="nav" aria-label="Primary">
          <div class="nav-pages">
            <a href="/">Home</a>
            <div class="nav-item" id="nav-tech">
              <button class="nav-toggle" aria-expanded="false" aria-controls="dropdown-tech">
                Technology Solutions <span class="nav-caret" aria-hidden="true">&#9662;</span>
              </button>
              <div class="nav-dropdown" id="dropdown-tech" role="menu">
                <a href="/projects/" role="menuitem">Overview</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/process/" role="menuitem">How It Works</a>
                <a href="/pricing/" role="menuitem">Pricing</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/projects/faq/" role="menuitem">FAQ</a>
              </div>
            </div>
            <div class="nav-item" id="nav-reserve">
              <button class="nav-toggle" aria-expanded="false" aria-controls="dropdown-reserve">
                Silver Reserve <span class="nav-caret" aria-hidden="true">&#9662;</span>
              </button>
              <div class="nav-dropdown" id="dropdown-reserve" role="menu">
                <a href="/reserve/" role="menuitem">Overview</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/reserve/#how-it-works" role="menuitem">How It Works</a>
                <a href="/reserve/#plans" role="menuitem">Plans</a>
                <a href="/reserve/#benefits" role="menuitem">Benefits</a>
                <a href="/reserve/#inventory" role="menuitem">Inventory</a>
                <a href="/reserve/#join" role="menuitem">Join</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/reserve/faq/" role="menuitem">FAQ</a>
              </div>
            </div>
            <div class="nav-item" id="nav-education">
              <button class="nav-toggle" aria-expanded="false" aria-controls="dropdown-education">
                Education <span class="nav-caret" aria-hidden="true">&#9662;</span>
              </button>
              <div class="nav-dropdown" id="dropdown-education" role="menu">
                <a href="/education/" role="menuitem">Overview</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/education/authority-assessment/" role="menuitem">Authority Assessment</a>
              </div>
            </div>
            <a href="/blog/" class="active">Blog</a>
          </div>
          <div class="nav-actions">
            ${d.navCta}
          </div>
        </nav>
      </header>

      <main class="main">
        <div class="article-wrap">
          <a class="back-link" href="/blog/">&larr; Back to Blog</a>

          <div class="eyebrow">${esc(d.tag1)} &middot; ${esc(d.tag2)}</div>

          <h1>${esc(d.title)}</h1>

          <div class="article-meta">
            <time datetime="${d.date}">${esc(d.humanDate)}</time>
            <span class="pill">${esc(d.tag1)}</span>
            <span class="pill">${esc(d.tag2)}</span>
          </div>

          <figure class="article-hero">
            <img src="hero.jpg" alt="${esc(d.alt)}" width="1200" height="630" fetchpriority="high" />
          </figure>

          <div class="article-divider"></div>

          <div class="article-body">
            ${d.bodyHtml}
          </div>

          <div class="article-cta">
            <p>${esc(d.ctaLine)}</p>
            ${d.artCta}
          </div>
        </div>
      </main>

      <footer class="footer">
        &copy; 2026 Fused ${d.sub}. All rights reserved.
        &nbsp;&middot;&nbsp;
        <a href="/privacy/" style="color:inherit;opacity:0.7;text-decoration:underline;">Privacy Policy</a>
      </footer>
    </div>
    <script>
      (function () {
        var toggles = document.querySelectorAll('.nav-toggle');
        function closeAll(except) {
          toggles.forEach(function (btn) { if (btn !== except) btn.setAttribute('aria-expanded', 'false'); });
        }
        toggles.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var expanded = btn.getAttribute('aria-expanded') === 'true';
            closeAll(btn);
            btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
          });
        });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(null); });
        document.addEventListener('click', function (e) { if (!e.target.closest('.nav-item')) closeAll(null); });
      })();
    </script>
  </body>
</html>
`;
}
