#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultModel = process.env.STRUCTURED_SUBAGENT_MODEL || 'granite4.1:3b';
const taskContracts = {
  'qa-triage': {
    instruction: 'Group deterministic QA findings into repair units. Do not repair files or weaken a gate.',
    schema: '{"summary":"short summary","repairs":[{"category":"content_repair|metadata_repair|reel_data_repair|manual_review","items":["finding"],"action":"bounded repair instruction"}]}',
    validate(value) {
      return typeof value?.summary === 'string'
        && Array.isArray(value?.repairs)
        && value.repairs.every((repair) => ['content_repair', 'metadata_repair', 'reel_data_repair', 'manual_review'].includes(repair?.category)
          && Array.isArray(repair?.items) && repair.items.length > 0 && typeof repair?.action === 'string');
    },
  },
  'fitness-mutation': {
    instruction: 'Propose controlled variants from the supplied survivor evidence. Change one named variable per variant and make no causal claim.',
    schema: '{"control":"existing control","variants":[{"variable":"hook|cta|caption_density|posting_window|reel_focus","change":"one change","hypothesis":"testable hypothesis"}],"evidenceLimits":["limit"]}',
    validate(value) {
      return typeof value?.control === 'string'
        && Array.isArray(value?.variants) && value.variants.length >= 1 && value.variants.length <= 2
        && value.variants.every((variant) => ['hook', 'cta', 'caption_density', 'posting_window', 'reel_focus'].includes(variant?.variable)
          && typeof variant?.change === 'string' && typeof variant?.hypothesis === 'string')
        && Array.isArray(value?.evidenceLimits);
    },
  },
  'cluster-summary': {
    instruction: 'Summarize the supplied small cluster without adding facts, recommendations, or source names.',
    schema: '{"topic":"short topic","summary":"two to four sentences","openQuestions":["question"]}',
    validate(value) {
      return typeof value?.topic === 'string' && typeof value?.summary === 'string' && Array.isArray(value?.openQuestions);
    },
  },
};

function parseArgs(argv) {
  const args = { task: '', input: '', out: '', model: defaultModel };
  for (const item of argv) {
    if (item.startsWith('--task=')) args.task = item.slice(7);
    else if (item.startsWith('--input=')) args.input = resolve(item.slice(8));
    else if (item.startsWith('--out=')) args.out = resolve(item.slice(6));
    else if (item.startsWith('--model=')) args.model = item.slice(8);
    else throw new Error(`unknown argument: ${item}`);
  }
  if (!taskContracts[args.task]) throw new Error(`task must be one of: ${Object.keys(taskContracts).join(', ')}`);
  if (!args.input || !args.out) throw new Error('--input and --out are required');
  return args;
}

export function extractObject(raw) {
  const match = String(raw || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function validateTaskOutput(task, value) {
  return Boolean(taskContracts[task]?.validate(value));
}

async function run(args) {
  if (!existsSync(args.input)) throw new Error(`input not found: ${args.input}`);
  const source = readFileSync(args.input, 'utf8');
  if (source.length > 16000) throw new Error('input exceeds the 16,000-character small-cluster limit');
  const contract = taskContracts[args.task];
  const prompt = `${contract.instruction}\nReturn one JSON object only, with no markdown or reasoning.\nSchema: ${contract.schema}\n\nAuthoritative input:\n${source}`;
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: args.model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      think: false,
      keep_alive: 0,
      options: { temperature: 0, num_predict: 500 },
    }),
    signal: AbortSignal.timeout(Number(process.env.STRUCTURED_SUBAGENT_TIMEOUT_MS || 120000)),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `model endpoint returned HTTP ${response.status}`);
  const value = extractObject(body.message?.content || '');
  if (!validateTaskOutput(args.task, value)) throw new Error(`${args.model} violated the ${args.task} output contract`);
  value._meta = {
    task: args.task,
    model: args.model,
    generatedAt: new Date().toISOString(),
    advisoryOnly: true,
  };
  writeFileSync(args.out, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`[local-subagent] wrote advisory ${args.task} output to ${args.out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await run(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`[local-subagent] ${error.message}`);
    process.exit(1);
  }
}
