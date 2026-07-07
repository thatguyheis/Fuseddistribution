#!/usr/bin/env node
// T4 lint — deterministic §9 style check. Zero-LLM. Scans a markdown/text file
// for em dashes, banned AI words/phrases, hedging, filler. Emits JSON report.
//
// Usage:
//   node scripts/lint-draft.mjs path/to/draft.md            # prints JSON
//   node scripts/lint-draft.mjs path/to/draft.md --out=lint.json
//   node scripts/lint-draft.mjs path/to/draft.md --quiet    # exit code only
//
// Exit code: 0 = pass (no violations), 1 = violations found, 2 = usage error.

import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--"));
const outArg = argv.find((a) => a.startsWith("--out="));
const quiet = argv.includes("--quiet");
if (!file) { console.error("usage: lint-draft.mjs <file> [--out=lint.json] [--quiet]"); process.exit(2); }

let text;
try { text = readFileSync(file, "utf8"); }
catch (e) { console.error(`error: cannot read ${file}: ${e.message}`); process.exit(2); }

// §9 banned sets (BLOG-SOP.md). Single words/phrases, matched case-insensitive.
const BANNED = [
  // inflated verbs
  "leverage","utilize","streamline","facilitate","foster","harness","empower","elevate",
  "revolutionize","embark","spearhead","capitalize on","pave the way","lay the groundwork","drive synergies",
  // dramatic nouns
  "tapestry","landscape","realm","beacon","cornerstone","catalyst","ecosystem","synergy","paradigm",
  "testament","watershed","nexus",
  // corporate filler
  "robust","seamlessly","cutting-edge","game-changing","best-in-class","unparalleled","scalable",
  "holistic","end-to-end","value-add","best practices",
  // significance inflation
  "paramount","transformative","groundbreaking",
  // specific banned phrases
  "dive in","delve into","delve deeper","unlock the power","unleash the potential",
  "take it to the next level","push the boundaries","bridge the gap","a testament to",
  "embark on a journey","master the art of","in this article","in this blog post","in this guide",
];
const HEDGING = [
  "it's important to note","it is important to note","it's worth noting","it is worth noting",
  "it should be mentioned","it's worth mentioning","one might argue","it could be suggested",
  "it is important to understand","needless to say","as a matter of fact","in light of the fact that",
];
const FILLER_TRANSITIONS = [
  "moreover","furthermore","additionally","consequently","subsequently","accordingly",
  "notably","thus","indeed","undoubtedly","in conclusion","to summarize","to recap",
  "first and foremost","last but not least",
];
const OPENERS = [
  "in today's digital landscape","in an era of","in the modern era","when it comes to",
  "at the end of the day","in today's world","as we navigate","in recent years","in today's landscape",
];

const lower = text.toLowerCase();

function countPhrase(p) {
  // word-boundary-ish: phrases with non-word chars use plain indexOf scan
  const needle = p.toLowerCase();
  let n = 0, i = 0;
  while ((i = lower.indexOf(needle, i)) !== -1) {
    const before = lower[i - 1], after = lower[i + needle.length];
    const okB = before === undefined || /[^a-z0-9]/.test(before);
    const okA = after === undefined || /[^a-z0-9]/.test(after);
    if (okB && okA) n++;
    i += needle.length;
  }
  return n;
}

function collect(list) {
  const hits = [];
  for (const w of list) { const c = countPhrase(w); if (c) hits.push({ term: w, count: c }); }
  return hits;
}

// em dash + en dash (SOP: no em dashes)
const emDash = (text.match(/—/g) || []).length;
const enDash = (text.match(/–/g) || []).length;
const verifyTags = (text.match(/\[VERIFY\]/gi) || []).length;

const banned = collect(BANNED);
const hedging = collect(HEDGING);
const filler = collect(FILLER_TRANSITIONS);
const openers = collect(OPENERS);

const totalViolations =
  emDash + enDash + banned.length + hedging.length + filler.length + openers.length;

const report = {
  file,
  pass: totalViolations === 0,
  em_dash: emDash,
  en_dash: enDash,
  verify_tags: verifyTags,
  banned: banned,
  hedging: hedging,
  filler_transitions: filler,
  openers: openers,
  total_violations: totalViolations,
};

const json = JSON.stringify(report, null, 2);
if (outArg) writeFileSync(outArg.slice("--out=".length), json);
if (!quiet) console.log(json);
process.exit(report.pass ? 0 : 1);
