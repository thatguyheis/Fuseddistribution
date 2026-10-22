#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const models = (process.env.BENCHMARK_MODELS || 'gemma3:4b-it-qat,qwen3:4b,hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF:Q4_K_M').split(',');
const tasks = [
  ['article-outline', 'Return JSON only: {"sections":["..."]}. Create 8 distinct H2 topics for an article titled "Buying Silver From a Local Coin Shop vs Online". Stay exactly on that comparison.', (v) => Array.isArray(v?.sections) && v.sections.length === 8 && new Set(v.sections.map(String)).size === 8],
  ['section-writing', 'Write one markdown section only, 130-160 words, heading "## Comparing Total Purchase Cost". Explain premiums, shipping, payment fees, and local tax when comparing local and online silver purchases. No bullets, no preamble, no em dash.', (v) => typeof v === 'string' && v.split(/\s+/).length >= 100 && v.split(/\s+/).length <= 190 && !/[—–]/.test(v) && /premium|shipping|fee/i.test(v)],
  ['article-repair', 'Rewrite this into one clean 45-65 word paragraph answering the exact question: "How do I avoid silver dealer scams?" Remove filler and keep practical checks: identity, pricing, payment protection, and delivery policy. Text: "Buying silver is important and there are many things to think about. You should be careful and do research because some sellers may not be good."', (v) => typeof v === 'string' && v.split(/\s+/).length >= 35 && v.split(/\s+/).length <= 80 && /identity|license|price|payment|delivery/i.test(v)],
  ['meta-description', 'Return only one SEO meta description, 140-160 characters, for: "Contact Page Tips For Local Business". Mention clear contact options and faster lead response. No quotes.', (v) => typeof v === 'string' && v.length >= 130 && v.length <= 170 && !/["“”]/.test(v) && /contact|lead/i.test(v)],
  ['alt-text', 'Return only 6 words of alt text for a photo showing silver bars beside a coin shop counter. No punctuation, no preamble.', (v) => typeof v === 'string' && v.split(/\s+/).length === 6 && !/[.!?,:;]/.test(v)],
  ['chart-json', 'Return JSON only: {"title":"...","labels":[...],"values":[...],"unit":"...","source":"..."}. From this sourced data, make a 3-point chart: solar silver demand was 50 million ounces in 2014, 161 million in 2020, and 232 million in 2024. Do not invent values.', (v) => Array.isArray(v?.labels) && Array.isArray(v?.values) && v.labels.length === 3 && v.values.join(',') === '50,161,232' && typeof v?.source === 'string'],
  ['reel-script', 'Return JSON only: {"segments":[{"type":"hook|overlay|stat|question","text":"..."}]}. Create exactly 6 segments for "Buying Silver From a Local Coin Shop vs Online": hook, two practical comparisons, one verification step, one cost point, and a closing question. No segment may exceed 16 words.', (v) => Array.isArray(v?.segments) && v.segments.length === 6 && v.segments.every((s) => typeof s.text === 'string' && s.text.split(/\s+/).length <= 16) && v.segments.at(-1)?.type === 'question'],
  ['social-copy', 'Return JSON only: {"instagram":"...","x":"..."}. Write a useful, non-hype caption about comparing local coin shops and online silver dealers. Instagram 60-90 words with 3 hashtags; X 35-55 words. No fake statistics.', (v) => typeof v?.instagram === 'string' && typeof v?.x === 'string' && v.instagram.split(/\s+/).length >= 50 && v.instagram.split(/\s+/).length <= 110 && (v.instagram.match(/#/g) || []).length === 3 && v.x.split(/\s+/).length >= 30 && v.x.split(/\s+/).length <= 65],
  ['qa-json', 'Return JSON only: {"score":number,"pass":boolean,"blockers":string[]}. QA this draft: "Buy silver online or locally. Both have pros and cons. Compare the final price, verify the dealer identity, check payment protection, and understand delivery timing." Fail it because it is far below a full article requirement and lacks sources. Score must be below 85.', (v) => Number.isFinite(v?.score) && v.score < 85 && v.pass === false && Array.isArray(v.blockers) && v.blockers.length > 0],
  ['research-brief', 'Return JSON only: {"claim":"...","what_to_verify":["..."],"source_types":["..."]}. For the topic "silver dealer scams", give one cautious claim, 3 verification items, and 2 authoritative source types. Do not assert current facts without sources.', (v) => typeof v?.claim === 'string' && v.what_to_verify?.length === 3 && v.source_types?.length === 2 && /verify|source|current/i.test(JSON.stringify(v))],
];

function parseJson(raw) {
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function run(model, task) {
  const started = performance.now();
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({model, messages: [{role: 'user', content: task[1]}], stream: false, think: false, keep_alive: 0, options: {temperature: 0, num_predict: 700}}),
      signal: AbortSignal.timeout(Number(process.env.MODEL_BENCHMARK_TIMEOUT_MS || 180000)),
    });
    const body = await response.json();
    const raw = body.message?.content || '';
    const parsed = task[0] === 'section-writing' || task[0] === 'article-repair' || task[0] === 'meta-description' || task[0] === 'alt-text' ? raw.trim() : parseJson(raw);
    const contractPass = task[2](parsed);
    return {task: task[0], model, seconds: Number(((performance.now() - started) / 1000).toFixed(2)), contractPass, raw, parsed};
  } catch (error) {
    return {task: task[0], model, seconds: Number(((performance.now() - started) / 1000).toFixed(2)), contractPass: false, error: error.message};
  }
}

const results = [];
for (const model of models) {
  console.error(`[pipeline-benchmark] ${model}`);
  for (const task of tasks) results.push(await run(model.trim(), task));
}
const summary = Object.fromEntries(models.map((model) => {
  const rows = results.filter((row) => row.model === model.trim());
  const passes = rows.filter((row) => row.contractPass).length;
  return [model.trim(), {passes, total: rows.length, passRate: Number((passes / rows.length).toFixed(3)), avgSeconds: Number((rows.reduce((sum, row) => sum + row.seconds, 0) / rows.length).toFixed(2)), byTask: Object.fromEntries(rows.map((row) => [row.task, {pass: row.contractPass, seconds: row.seconds}]))}];
}));
const report = {version: 1, generatedAt: new Date().toISOString(), tasks: tasks.map(([name, prompt]) => ({name, prompt})), summary, results, guardrail: 'Benchmark results are advisory and do not authorize production promotion.'};
const out = resolve(process.env.BENCHMARK_OUT || 'ops/profit-system/model-benchmarks/pipeline-model-comparison.json');
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
