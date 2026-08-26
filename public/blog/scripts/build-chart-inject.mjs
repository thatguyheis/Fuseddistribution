#!/usr/bin/env node
// build-chart-inject.mjs — deterministic half of the numeric-visual stage.
// Validates schema v2 evidence against verified.md/research.json, enforces the
// semantic rules for each visual type, renders accessible HTML/SVG, injects it
// into index.html, and syncs eligible percent bars to reel-data.md.
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

function normalizedWhitespace(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

export function evidenceInText(evidence, sourceText) {
  const needle = normalizedWhitespace(evidence);
  return needle.length >= 12 && normalizedWhitespace(sourceText).includes(needle);
}

export function chartData(chart) {
  if (Array.isArray(chart.data)) return chart.data;
  if (Array.isArray(chart.bars)) return chart.bars;
  return [];
}

function validHttpsUrl(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && Boolean(parsed.hostname);
  }
  catch { return false; }
}

export function validateChart(chart, sourceText) {
  const errs = [];
  const type = chart.visual_type || "bar";
  const data = chartData(chart);
  if (!chart.title || String(chart.title).length > 90) errs.push("title missing or >90 chars");
  if (!new Set(["bar", "before_after", "timeline", "stat_cards"]).has(type)) errs.push(`unsupported visual_type: ${type}`);

  if (chart.schema_version === 2) {
    if (!chart.source || !validHttpsUrl(chart.source_url)) errs.push("schema v2 requires source and valid HTTPS source_url");
    const expected = type === "before_after" ? [2, 2] : type === "stat_cards" ? [2, 4] : [3, 6];
    if (data.length < expected[0] || data.length > expected[1]) errs.push(`${type} needs ${expected[0]}-${expected[1]} data items, got ${data.length}`);
  } else {
    if (type !== "bar") errs.push("non-bar visuals require schema_version 2");
    if (data.length < 3 || data.length > 6) errs.push(`need 3-6 bars, got ${data.length}`);
  }

  for (const item of data) {
    if (!item.label || String(item.label).length > 42) errs.push(`bad label: ${JSON.stringify(item.label)}`);
    if (numericToken(item.value) === null) errs.push(`non-numeric value: ${JSON.stringify(item.value)}`);
    else if (!valueInText(item.value, sourceText)) errs.push(`value not found in post sources: ${item.label} = ${item.value}`);
    if (chart.schema_version === 2) {
      if (!item.metric || !item.unit || !item.period) errs.push(`${item.label || "item"}: metric, unit, and period are required`);
      if (!item.evidence || !evidenceInText(item.evidence, sourceText)) errs.push(`${item.label || "item"}: evidence not found verbatim in sources`);
      else if (!valueInText(item.value, item.evidence)) errs.push(`${item.label || "item"}: evidence does not contain value`);
    }
  }

  if (["bar", "before_after", "timeline"].includes(type) && data.length) {
    const units = new Set(data.map(item => item.unit || unitOf(item.value)));
    const metrics = new Set(data.map(item => normalizedWhitespace(item.metric || "").toLowerCase()));
    if (units.size > 1) errs.push(`mixed units invalid for ${type}: ${[...units].join(",")}`);
    if (chart.schema_version === 2 && metrics.size > 1) errs.push(`mixed metrics invalid for ${type}: ${[...metrics].join(",")}`);
  }
  if (type === "bar" && chart.schema_version === 2 && data.length) {
    const periods = new Set(data.map(item => normalizedWhitespace(item.period).toLowerCase()));
    if (periods.size > 1) errs.push(`bar requires one shared period, got: ${[...periods].join(",")}`);
  }
  if (type === "before_after" && data.length === 2 && normalizedWhitespace(data[0].period) === normalizedWhitespace(data[1].period)) {
    errs.push("before_after requires two distinct periods");
  }
  if (type === "timeline" && data.length) {
    const dates = data.map(item => String(item.date || ""));
    if (dates.some(date => !/^\d{4}-\d{2}-\d{2}$/.test(date))) errs.push("timeline requires an ISO date on every item");
    else if (dates.some((date, index) => index > 0 && date <= dates[index - 1])) errs.push("timeline dates must be unique and chronological");
  }
  if (chart.schema_version === 2 && chart.hero_stat?.value) {
    if (!data.some(item => String(item.value) === String(chart.hero_stat.value))) errs.push("hero_stat must exactly match a data item value");
  }
  return errs;
}

// ── SVG render (SOP §6 horizontal bar, word-of-mouth layout) ────────────────
const xml = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const displayText = value => String(value).replace(/[—–]/g, "-");

export function renderChartHtml(chart, slug) {
  const bars = [...chartData(chart)].map(b => ({ ...b, n: parseFloat(numericToken(b.value)) }))
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
  const sourceText = chart.source_url
    ? `<a href="${xml(chart.source_url)}" target="_blank" rel="noreferrer noopener">${xml(chart.source)}</a>`
    : xml(chart.source);
  const note = chart.source ? `\n              <div class="chart-note">Source: ${sourceText}</div>` : "";
  return `            <div id="article-visual" class="chart-wrap visual-type-bar" data-visual-schema="${chart.schema_version || 1}">
              <div class="chart-title">${xml(chart.title)}</div>
              <svg viewBox="0 0 640 ${H}" width="100%" role="img" aria-label="${xml(aria)}">
                <defs>
${defs}
                </defs>
${rows}
              </svg>${note}
            </div>`;
}

export function renderBeforeAfterHtml(chart) {
  const [start, end] = chartData(chart);
  const aria = `${chart.title}: ${start.label} ${displayText(start.value)}, ${end.label} ${displayText(end.value)}`;
  return `            <div id="article-visual" class="chart-wrap visual-type-before-after" data-visual-schema="2">
              <div class="chart-title">${xml(chart.title)}</div>
              <div role="img" aria-label="${xml(aria)}" style="display:grid;grid-template-columns:1fr auto 1fr;gap:18px;align-items:center;text-align:center">
                <div class="stat-card"><div class="stat-number">${xml(displayText(start.value))}</div><div class="stat-label">${xml(start.label)}<br>${xml(start.period)}</div></div>
                <div aria-hidden="true" style="font-size:2rem;color:#58d6ff">&#8594;</div>
                <div class="stat-card"><div class="stat-number">${xml(displayText(end.value))}</div><div class="stat-label">${xml(end.label)}<br>${xml(end.period)}</div></div>
              </div>
              <p style="margin:18px 0 0;text-align:center;color:#afc6cf">${xml(chart.takeaway)}</p>
              <div class="chart-note">Source: <a href="${xml(chart.source_url)}" target="_blank" rel="noreferrer noopener">${xml(chart.source)}</a></div>
            </div>`;
}

export function renderStatCardsHtml(chart) {
  const items = chartData(chart);
  const aria = `${chart.title}: ${items.map(item => `${item.label} ${displayText(item.value)}`).join(", ")}`;
  const cards = items.map(item => `                <div class="stat-card"><div class="stat-number">${xml(displayText(item.value))}</div><div class="stat-label">${xml(item.label)}<br>${xml(item.period)}</div></div>`).join("\n");
  return `            <div id="article-visual" class="chart-wrap visual-type-stat-cards" data-visual-schema="2">
              <div class="chart-title">${xml(chart.title)}</div>
              <div class="stat-row" role="img" aria-label="${xml(aria)}" style="grid-template-columns:repeat(${Math.min(items.length, 4)},1fr)">
${cards}
              </div>
              <p style="margin:0;text-align:center;color:#afc6cf">${xml(chart.takeaway)}</p>
              <div class="chart-note">Source: <a href="${xml(chart.source_url)}" target="_blank" rel="noreferrer noopener">${xml(chart.source)}</a></div>
            </div>`;
}

export function renderTimelineHtml(chart) {
  const items = chartData(chart);
  const aria = `${chart.title}: ${items.map(item => `${item.period} ${displayText(item.value)}`).join(", ")}`;
  const rows = items.map((item, index) => `                <div style="display:grid;grid-template-columns:110px 18px 1fr;gap:12px;align-items:center;margin:12px 0"><strong>${xml(item.period)}</strong><span aria-hidden="true" style="color:#58d6ff">${index === items.length - 1 ? "&#9679;" : "&#9675;"}</span><span>${xml(item.label)}: <strong>${xml(displayText(item.value))}</strong></span></div>`).join("\n");
  return `            <div id="article-visual" class="chart-wrap visual-type-timeline" data-visual-schema="2">
              <div class="chart-title">${xml(chart.title)}</div>
              <div role="img" aria-label="${xml(aria)}">
${rows}
              </div>
              <p style="margin:18px 0 0;text-align:center;color:#afc6cf">${xml(chart.takeaway)}</p>
              <div class="chart-note">Source: <a href="${xml(chart.source_url)}" target="_blank" rel="noreferrer noopener">${xml(chart.source)}</a></div>
            </div>`;
}

export function renderVisualHtml(chart, slug) {
  if (chart.visual_type === "before_after") return renderBeforeAfterHtml(chart);
  if (chart.visual_type === "timeline") return renderTimelineHtml(chart);
  if (chart.visual_type === "stat_cards") return renderStatCardsHtml(chart);
  return renderChartHtml(chart, slug);
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
  if ((chart.visual_type || "bar") !== "bar" || chartData(chart).some(item => unitOf(item.value) !== "%")) return "";
  const bars = [...chartData(chart)].map(b => ({ ...b, n: parseFloat(numericToken(b.value)) }))
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
  for (const f of ["verified.md", "research.json"]) {
    const p = join(dir, f);
    if (existsSync(p)) sourceText += "\n" + readFileSync(p, "utf8");
  }
  if (!sourceText.trim()) { console.error("error: no source text (verified.md/research.json missing)"); process.exit(1); }

  const errs = validateChart(chart, sourceText);
  if (errs.length) {
    console.error("skip: chart rejected by validator:\n  - " + errs.join("\n  - "));
    process.exit(3);
  }

  // index.html
  const htmlPath = join(dir, "index.html");
  if (existsSync(htmlPath)) {
    const html = readFileSync(htmlPath, "utf8");
    const { html: out, where } = injectIntoHtml(html, renderVisualHtml(chart, slug || "post"));
    if (where === "no-anchor") console.error("warn: no injection anchor in index.html — body chart skipped");
    else if (where === "already-present") console.error("info: index.html already has a chart-wrap — left as is");
    else { writeFileSync(htmlPath, out); console.log(`index.html: chart injected (${where})`); }
  } else console.error("warn: no index.html yet — body injection skipped");

  // reel-data.md
  const reelPath = join(dir, "reel-data.md");
  if (existsSync(reelPath)) {
    const section = reelChartSection(chart);
    if (section) {
      const { md, where } = injectIntoReelData(readFileSync(reelPath, "utf8"), section);
      if (where !== "already-present") { writeFileSync(reelPath, md); console.log(`reel-data.md: ## chart added (${where})`); }
      else console.error("info: reel-data.md already has ## chart");
    } else console.error("info: visual is not a percent bar chart; reel chart sync skipped");
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
