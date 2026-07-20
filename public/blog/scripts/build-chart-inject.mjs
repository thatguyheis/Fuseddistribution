#!/usr/bin/env node
// build-chart-inject.mjs — deterministic half of the chart stage.
// Validates chart.json values against the post's own sourced text (verified.md,
// research.json, index.html), renders the chart-wrap SVG, injects it into
// index.html, appends `## chart` to reel-data.md, and syncs hooks.json key_stat.
//
// Anti-fabrication gate: every bar value must appear verbatim (numeric token)
// in the post's source text or the chart is rejected. Exit codes:
//   0 = injected   3 = skipped (no chart.json / rejected)   1 = hard error
//
// Usage: node build-chart-inject.mjs --slug=<slug> [--dir=/abs/post/dir]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SD = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = dirname(SD);

// ── Validation ───────────────────────────────────────────────────────────────
export function numericToken(value) {
  const m = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? m[0] : null;
}

export function valueInText(value, text) {
  const tok = numericToken(value);
  if (tok === null) return false;
  const flat = text.replace(/,/g, "");
  // exact token with non-digit boundaries, so "6" doesn't match "60" or "3.6"
  const re = new RegExp(`(?<![\\d.])${tok.replace(".", "\\.")}(?![\\d])`);
  if (re.test(flat)) return true;
  // integer value may appear with decimals in prose (92 vs 92.0) and vice versa
  const n = parseFloat(tok);
  if (Number.isInteger(n)) return new RegExp(`(?<![\\d.])${n}\\.0+(?![\\d])`).test(flat);
  return false;
}

export function unitOf(value) {
  const v = String(value).trim();
  if (/%/.test(v)) return "%";
  if (/\$/.test(v)) return "$";
  if (/x\s*$/i.test(v)) return "x";
  return "plain";
}

export function validateChart(chart, sourceText) {
  const errs = [];
  const bars = Array.isArray(chart.bars) ? chart.bars : [];
  if (!chart.title || String(chart.title).length > 90) errs.push("title missing or >90 chars");
  if (bars.length < 3 || bars.length > 6) errs.push(`need 3-6 bars, got ${bars.length}`);
  const units = new Set(bars.map(b => unitOf(b.value)));
  if (units.size > 1) errs.push(`mixed units: ${[...units].join(",")}`);
  for (const b of bars) {
    if (!b.label || String(b.label).length > 42) errs.push(`bad label: ${JSON.stringify(b.label)}`);
    if (numericToken(b.value) === null) errs.push(`non-numeric value: ${JSON.stringify(b.value)}`);
    else if (!valueInText(b.value, sourceText)) errs.push(`value not found in post sources: ${b.label} = ${b.value}`);
  }
  return errs;
}

// ── SVG render (SOP §6 horizontal bar, word-of-mouth layout) ────────────────
const xml = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const displayText = value => String(value).replace(/[—–]/g, "-");

export function renderChartHtml(chart, slug) {
  const bars = [...chart.bars].map(b => ({ ...b, n: parseFloat(numericToken(b.value)) }))
    .sort((a, b) => b.n - a.n);
  const maxN = Math.max(...bars.map(b => Math.abs(b.n))) || 1;
  const OP = [1, 0.6, 0.4, 0.28, 0.22, 0.18];
  const rowH = 64, maxW = 447;
  const H = 40 + rowH * bars.length - 24;
  const gid = `ch-${slug.slice(0, 18)}`;
  const defs = bars.map((_, i) => `        <linearGradient id="${gid}-${i}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#58d6ff" stop-opacity="${OP[i]}"/>
          <stop offset="100%" stop-color="#4dffb8" stop-opacity="${OP[i]}"/>
        </linearGradient>`).join("\n");
  const rows = bars.map((b, i) => {
    const w = Math.max(6, Math.round(Math.abs(b.n) / maxN * maxW));
    const y = i * rowH;
    return `        <text x="0" y="${y + 24}" fill="#afc6cf" font-family="Trebuchet MS, sans-serif" font-size="12" font-weight="700">${xml(String(b.label).toUpperCase())}</text>
        <rect x="0" y="${y + 32}" width="${w}" height="22" rx="4" fill="url(#${gid}-${i})"/>
        <text x="${w + 6}" y="${y + 48}" fill="#58d6ff" font-family="Impact, sans-serif" font-size="15" font-weight="700">${xml(displayText(b.value))}</text>`;
  }).join("\n");
  const aria = "Horizontal bar chart: " + bars.map(b => `${b.label} ${displayText(b.value)}`).join(", ");
  const note = chart.source ? `\n              <div class="chart-note">Source: ${xml(chart.source)}</div>` : "";
  return `            <div class="chart-wrap">
              <div class="chart-title">${xml(chart.title)}</div>
              <svg viewBox="0 0 640 ${H}" width="100%" role="img" aria-label="${xml(aria)}">
                <defs>
${defs}
                </defs>
${rows}
              </svg>${note}
            </div>`;
}

// ── Injection point: end of 2nd H2 section, else before sources/faq/end ─────
export function injectIntoHtml(html, chartHtml) {
  if (html.includes('class="chart-wrap"')) return { html, where: "already-present" };
  const h2s = [...html.matchAll(/<h2\b/g)];
  if (h2s.length >= 3) {
    const idx = h2s[2].index;
    return { html: html.slice(0, idx) + chartHtml + "\n            " + html.slice(idx), where: "before-h2-3" };
  }
  for (const [marker, name] of [['<div class="sources-block"', "before-sources"], ['<div class="faq-block"', "before-faq"], ['<div class="article-cta"', "before-cta"]]) {
    const idx = html.indexOf(marker);
    if (idx !== -1) return { html: html.slice(0, idx) + chartHtml + "\n            " + html.slice(idx), where: name };
  }
  return { html, where: "no-anchor" };
}

// ── reel-data `## chart` section ─────────────────────────────────────────────
export function reelChartSection(chart) {
  const bars = [...chart.bars].map(b => ({ ...b, n: parseFloat(numericToken(b.value)) }))
    .sort((a, b) => b.n - a.n);
  const lines = bars.map(b => `  - ${b.label}: ${b.value}`).join("\n");
  const narration = chart.narration && String(chart.narration).trim()
    ? String(chart.narration).trim()
    : `The chart shows ${chart.title.toLowerCase()}. ${bars[0].label} leads at ${bars[0].value}, while ${bars[bars.length - 1].label} sits at ${bars[bars.length - 1].value}.`;
  return `## chart\ntitle: ${chart.title}\nbars:\n${lines}\nnarration: ${narration}\n`;
}

export function injectIntoReelData(reelMd, section) {
  if (/^## chart\b/m.test(reelMd)) return { md: reelMd, where: "already-present" };
  const qIdx = reelMd.search(/^## question\b/m);
  if (qIdx !== -1) return { md: reelMd.slice(0, qIdx) + section + "\n" + reelMd.slice(qIdx), where: "before-question" };
  return { md: reelMd.trimEnd() + "\n\n" + section, where: "appended" };
}

// ── Main ─────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = Object.fromEntries(process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a, true];
  }));
  const slug = args.slug;
  const dir = args.dir || (slug ? join(BLOG_DIR, slug) : null);
  if (!dir) { console.error("error: need --slug or --dir"); process.exit(1); }

  const chartPath = join(dir, "chart.json");
  if (!existsSync(chartPath)) { console.error("skip: no chart.json"); process.exit(3); }

  let chart;
  try { chart = JSON.parse(readFileSync(chartPath, "utf8")); }
  catch { console.error("skip: chart.json is not valid JSON"); process.exit(3); }

  if (chart.skipped) { console.error(`skip: brain declined (${chart.skip_reason || "no chartable data"})`); process.exit(3); }

  // Source text the numbers must trace to
  let sourceText = "";
  for (const f of ["verified.md", "research.json", "index.html"]) {
    const p = join(dir, f);
    if (existsSync(p)) sourceText += "\n" + readFileSync(p, "utf8");
  }
  if (!sourceText.trim()) { console.error("error: no source text (verified.md/index.html missing)"); process.exit(1); }

  const errs = validateChart(chart, sourceText);
  if (errs.length) {
    console.error("skip: chart rejected by validator:\n  - " + errs.join("\n  - "));
    process.exit(3);
  }

  // index.html
  const htmlPath = join(dir, "index.html");
  if (existsSync(htmlPath)) {
    const html = readFileSync(htmlPath, "utf8");
    const { html: out, where } = injectIntoHtml(html, renderChartHtml(chart, slug || "post"));
    if (where === "no-anchor") console.error("warn: no injection anchor in index.html — body chart skipped");
    else if (where === "already-present") console.error("info: index.html already has a chart-wrap — left as is");
    else { writeFileSync(htmlPath, out); console.log(`index.html: chart injected (${where})`); }
  } else console.error("warn: no index.html yet — body injection skipped");

  // reel-data.md
  const reelPath = join(dir, "reel-data.md");
  if (existsSync(reelPath)) {
    const { md, where } = injectIntoReelData(readFileSync(reelPath, "utf8"), reelChartSection(chart));
    if (where !== "already-present") { writeFileSync(reelPath, md); console.log(`reel-data.md: ## chart added (${where})`); }
    else console.error("info: reel-data.md already has ## chart");
  } else console.error("warn: no reel-data.md yet — reel chart section skipped");

  // hooks.json key_stat sync (fixes off-topic hero stats)
  if (chart.hero_stat?.value && chart.hero_stat?.label && valueInText(chart.hero_stat.value, sourceText)) {
    const hooksPath = join(dir, "hooks.json");
    if (existsSync(hooksPath)) {
      try {
        const hooks = JSON.parse(readFileSync(hooksPath, "utf8"));
        hooks.key_stat = { value: String(chart.hero_stat.value), label: String(chart.hero_stat.label).slice(0, 60) };
        writeFileSync(hooksPath, JSON.stringify(hooks, null, 2));
        console.log("hooks.json: key_stat synced to chart hero_stat");
      } catch { console.error("warn: hooks.json unreadable — key_stat not synced"); }
    }
  }
  console.log("chart stage: OK");
}
