#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultModels = ['gemma3:4b-it-qat', 'qwen3:4b', 'granite4.1:3b'];
const prompt = `Return one JSON object only, with no markdown or reasoning. Use exactly these keys:
{"category":"content_repair","action":"...","reel_hook":"...","section_plan":["...","...","..."]}

Issue: A local-business blog has no inline links and its Reel should focus narrowly on the first practical fix.
Rules: category must be content_repair; action must mention adding an internal link; reel_hook must be 12 words or fewer; section_plan must contain exactly three distinct short section topics.`;

function parseArgs(argv) {
  const args = { models: defaultModels, out: '' };
  for (const item of argv) {
    if (item.startsWith('--models=')) args.models = item.slice(9).split(',').map((value) => value.trim()).filter(Boolean);
    else if (item.startsWith('--out=')) args.out = resolve(item.slice(6));
    else throw new Error(`unknown argument: ${item}`);
  }
  return args;
}

export function extractJson(raw) {
  const match = String(raw || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function scoreResponse(raw, latencySeconds) {
  const value = extractJson(raw);
  const checks = {
    validJson: Boolean(value),
    correctCategory: value?.category === 'content_repair',
    actionableLinkRepair: /(?:internal|inline).{0,30}link|link.{0,30}(?:internal|inline)/i.test(value?.action || ''),
    conciseHook: typeof value?.reel_hook === 'string' && value.reel_hook.trim().split(/\s+/).length <= 12,
    threeDistinctSections: Array.isArray(value?.section_plan)
      && value.section_plan.length === 3
      && new Set(value.section_plan.map((item) => String(item).trim().toLowerCase())).size === 3,
    noMarkdownFence: !String(raw || '').includes('```'),
    responsive: latencySeconds <= 30,
  };
  const weights = {
    validJson: 25,
    correctCategory: 15,
    actionableLinkRepair: 15,
    conciseHook: 10,
    threeDistinctSections: 15,
    noMarkdownFence: 10,
    responsive: 10,
  };
  const score = Object.entries(checks).reduce((sum, [name, pass]) => sum + (pass ? weights[name] : 0), 0);
  return { score, checks, parsed: value };
}

async function runModel(model) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.MODEL_BENCHMARK_TIMEOUT_MS || 180000));
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        think: false,
        keep_alive: 0,
        options: { temperature: 0, num_predict: 220 },
      }),
      signal: controller.signal,
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    const latencySeconds = Number(((performance.now() - started) / 1000).toFixed(2));
    const raw = body.message?.content || '';
    return { model, latencySeconds, ...scoreResponse(raw, latencySeconds), raw };
  } catch (error) {
    return { model, latencySeconds: Number(((performance.now() - started) / 1000).toFixed(2)), score: 0, error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = [];
  for (const model of args.models) {
    console.error(`[model-benchmark] testing ${model}`);
    results.push(await runModel(model));
  }
  results.sort((a, b) => b.score - a.score || a.latencySeconds - b.latencySeconds);
  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    task: 'structured leaf-worker compliance',
    prompt,
    results,
    winner: results[0]?.score > 0 ? results[0].model : null,
    guardrail: 'This microbenchmark selects candidates for a shadow trial. It does not authorize production promotion.',
  };
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, output);
  } else {
    process.stdout.write(output);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[model-benchmark] ${error.message}`);
    process.exit(1);
  });
}
