#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const title = 'How to Compare Silver Premiums Across Dealers Before You Buy';
const topic = 'silver dealer premiums';
const assignments = [
  ['research-brief', 'LFM', 'Create JSON only: {"angle":"...","questions":["..."],"source_types":["..."]}. For the topic "silver dealer premiums", give one cautious editorial angle, 3 questions that require current verification, and 3 authoritative source types. Do not invent current numbers.'],
  ['master-outline', 'LFM', `Create JSON only: {"sections":["..."]}. Build 8 distinct H2 topics for "${title}". Cover spot price, dealer premium, payment fees, shipping, taxes, product type, buyback terms, and a comparison checklist.`],
  ['article-draft', 'Gemma', `Write a useful answer-first draft for "${title}" in 450-550 words. Use 5 short H2 headings. Explain the comparison method without asserting current prices or named dealer rankings. Stay on silver dealer premiums throughout. No em dash, no placeholders, no invented statistics.`],
  ['article-repair', 'Gemma', 'Rewrite this paragraph into 70-90 clear words for the exact topic of comparing silver premiums: "A lot of people buy silver and there are many prices. It is good to look around and do research before buying because different sellers have different things." Stay on silver dealer premiums. No em dash or unsupported statistics.'],
  ['meta-description', 'Gemma', `Return only one 140-160 character SEO meta description for "${title}". Mention comparing premiums, fees, and final purchase cost. No quotes.`],
  ['alt-text', 'Gemma', 'Return exactly 6 words of alt text for a photo showing silver bars, a spot price screen, and a dealer invoice. No punctuation or preamble.'],
  ['chart-extraction', 'Gemma', 'Return JSON only: {"schema_version":2,"skipped":true,"skip_reason":"..."}. There are no sourced numeric observations in this brief, so do not invent a chart.'],
  ['reel-script', 'Gemma', `Return JSON only: {"segments":[{"type":"hook|overlay|stat|question","text":"..."}]}. Create exactly 6 short segments for "${title}": hook, spot-price explanation, premium explanation, fee check, comparison checklist, closing question. Every segment must stay about silver dealer premiums. No segment over 14 words.`],
  ['social-copy', 'Gemma', `Return JSON only: {"instagram":"...","x":"..."}. Write practical social copy for "${title}". Every sentence must stay about silver dealer premiums. Instagram 45-70 words, X 30-45 words, no hashtags, no invented current statistics, no em dash.`],
  ['final-qa', 'Gemma', 'Return JSON only: {"score":number,"pass":boolean,"blockers":["..."]}. QA this shadow draft: It explains how to compare spot price, premium, payment fee, shipping, tax, and buyback terms, but it contains no current sourced prices and is only 500 words. It is not ready for publication because it needs a full length article and source citations. Score below 85 and fail it.'],
];

async function call(model, prompt) {
  const started = performance.now();
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({model, messages: [{role: 'user', content: prompt}], stream: false, think: false, keep_alive: '10m', options: {temperature: 0, num_predict: 800}}),
      signal: AbortSignal.timeout(60000),
    });
    const body = await response.json();
    return {seconds: Number(((performance.now() - started) / 1000).toFixed(2)), raw: body.message?.content || '', error: body.error};
  } catch (error) {
    return {seconds: Number(((performance.now() - started) / 1000).toFixed(2)), raw: '', error: error.message};
  }
}

function parseJson(raw) {
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

function validate(name, raw) {
  const parsed = ['article-draft', 'article-repair', 'meta-description', 'alt-text'].includes(name) ? raw.trim() : parseJson(raw);
  if (name === 'research-brief') return Boolean(parsed?.angle && parsed.questions?.length === 3 && parsed.source_types?.length === 3);
  if (name === 'master-outline') return parsed?.sections?.length === 8 && new Set(parsed.sections).size === 8;
  const onTopic = !/\b(?:vehicle|vehicles|car|cars|automotive|mileage|sticker price|dealership)\b/i.test(raw);
  if (name === 'article-draft') return parsed.split(/\s+/).length >= 400 && !/[—–]/.test(parsed) && onTopic;
  if (name === 'article-repair') return parsed.split(/\s+/).length >= 60 && parsed.split(/\s+/).length <= 105 && !/[—–]/.test(parsed) && onTopic;
  if (name === 'meta-description') return parsed.length >= 130 && parsed.length <= 170 && /premium|fee|cost/i.test(parsed);
  if (name === 'alt-text') return parsed.split(/\s+/).length === 6 && !/[.,!?]/.test(parsed);
  if (name === 'chart-extraction') return parsed?.skipped === true;
  if (name === 'reel-script') return parsed?.segments?.length === 6 && parsed.segments.every((s) => s.text?.split(/\s+/).length <= 14) && parsed.segments.at(-1)?.type === 'question' && onTopic;
  if (name === 'social-copy') return parsed?.instagram && parsed?.x && parsed.instagram.split(/\s+/).length >= 40 && parsed.x.split(/\s+/).length >= 25 && onTopic;
  if (name === 'final-qa') return parsed?.pass === false && parsed.score < 85 && parsed.blockers?.length > 0;
  return false;
}

const transcript = [];
for (const [name, role, prompt] of assignments) {
  const model = role === 'LFM' ? 'hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF:Q4_K_M' : 'gemma3:4b-it-qat';
  const result = await call(model, prompt);
  transcript.push({stage: name, assignedRole: role, model, prompt, seconds: result.seconds, pass: validate(name, result.raw), output: result.raw, error: result.error || null});
}
const report = {
  version: 1,
  mode: 'shadow-only',
  title,
  topic,
  publishSideEffects: false,
  masterOutline: transcript.find((row) => row.stage === 'master-outline')?.output || '',
  assignmentRationale: {
    LFM: 'Fast local outlines, research transformations, hooks, and media queries with strict topic gates.',
    Gemma: 'Article generation and repair, structured extraction, exact-length metadata, reel/social copy, and final QA.',
    deterministic: 'No model should own length checks, schema validation, source verification, or publish authorization.',
  },
  summary: Object.fromEntries(['LFM', 'Gemma'].map((role) => {
    const rows = transcript.filter((row) => row.assignedRole === role);
    return [role, {stages: rows.map((row) => row.stage), passes: rows.filter((row) => row.pass).length, total: rows.length, avgSeconds: Number((rows.reduce((sum, row) => sum + row.seconds, 0) / rows.length).toFixed(2))}];
  })),
  transcript,
  conclusion: 'Shadow result only. No posts.json registration, deploy, or publication occurred.',
};
const out = resolve(process.env.SHADOW_WORKFLOW_OUT || 'ops/profit-system/model-benchmarks/shadow-blog-workflow-2026-09-03.json');
mkdirSync(resolve('ops/profit-system/model-benchmarks'), {recursive: true});
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
