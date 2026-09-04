import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(new URL('.', import.meta.url).pathname, '..', '..');
const outRoot = join(root, 'video', 'out');
const blogRoot = join(root, 'public', 'blog');

function textRepair(value, narration = false) {
  let result = String(value ?? '').replace(/[—–]/g, ', ');
  if (narration) result = result.replace(/%/g, ' percent').replace(/\bUS\b/g, 'USA');
  // Preserve Markdown line breaks. Collapsing all whitespace here turns the
  // structured reel source into one line and makes the parser emit zero beats.
  return result.replace(/,\s*,/g, ',').replace(/[ \t]{2,}/g, ' ').trim();
}

function figures(value) {
  return [...String(value ?? '').toLowerCase().matchAll(/\d[\d,]*(?:\.\d+)?/g)]
    .map((m) => Number(m[0].replace(/,/g, '')))
    .filter((number) => Number.isFinite(number) && !(Number.isInteger(number) && number >= 1900 && number <= 2100));
}

function words(value) { return String(value ?? '').trim().split(/\s+/).filter(Boolean).length; }

function repairNested(value, narration = false) {
  if (typeof value === 'string') return textRepair(value, narration);
  if (Array.isArray(value)) return value.map((item) => repairNested(item, narration));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairNested(item, key === 'narration')]));
}

function repairScript(script) {
  const repaired = structuredClone(script);
  let changes = 0;
  const normalized = repairNested(repaired);
  if (JSON.stringify(normalized) !== JSON.stringify(repaired)) changes++;
  for (const key of Object.keys(repaired)) delete repaired[key];
  Object.assign(repaired, normalized);
  let cursor = 0;
  for (const segment of repaired.segments ?? []) {
    for (const key of ['text', 'title', 'subtext']) {
      if (typeof segment[key] === 'string') {
        const next = textRepair(segment[key]);
        if (next !== segment[key]) { segment[key] = next; changes++; }
      }
    }
    if (typeof segment.narration === 'string') {
      const next = textRepair(segment.narration, true);
      if (next !== segment.narration) { segment.narration = next; changes++; }
    }
    if (segment.type === 'stat' && (figures(segment.text).length === 0
      || (figures(segment.narration).length > 0
        && !figures(segment.text).some((figure) => figures(segment.narration).includes(figure))))) {
      segment.type = 'overlay';
      changes++;
    }
    if (segment.type === 'question' && typeof segment.text === 'string' && !/[?]$/.test(segment.text.trim())) {
      segment.text = `${segment.text.trim()}?`;
      changes++;
    }
    const minimum = segment.narration ? Math.ceil(words(segment.narration) / 3.25 + 0.65) : 0;
    const start = Math.round(Math.max(cursor, Number(segment.startSec) || 0) * 1000) / 1000;
    const end = Number(segment.endSec) || start;
    const nextEnd = Math.round(Math.max(end, start + minimum + 0.2) * 1000) / 1000;
    if (start !== segment.startSec || nextEnd !== segment.endSec) changes++;
    segment.startSec = start;
    segment.endSec = nextEnd;
    cursor = nextEnd;
  }
  if (repaired.segments?.length) {
    const total = repaired.segments.at(-1).endSec;
    if (repaired.totalDuration !== total) { repaired.totalDuration = total; changes++; }
  }
  return { repaired, changes };
}

function repairMarkdown(path) {
  const original = readFileSync(path, 'utf8');
  const next = textRepair(original);
  if (next !== original) writeFileSync(path, next);
  return next !== original;
}

function main() {
  const requested = process.argv.find((arg) => arg.startsWith('--slug='))?.slice('--slug='.length) || '';
  const changed = [];
  for (const slug of readdirSync(outRoot)) {
    if (requested && slug !== requested) continue;
    const path = join(outRoot, slug, 'script.json');
    if (!existsSync(path)) continue;
    const original = JSON.parse(readFileSync(path, 'utf8'));
    const { repaired, changes } = repairScript(original);
    if (changes) { writeFileSync(path, `${JSON.stringify(repaired, null, 2)}\n`); changed.push({ slug, changes }); }
  }
  for (const slug of readdirSync(blogRoot)) {
    if (requested && slug !== requested) continue;
    for (const name of ['reel-script.md', 'reel-data.md']) {
      const path = join(blogRoot, slug, name);
      if (existsSync(path) && repairMarkdown(path)) changed.push({ slug, file: name });
    }
  }
  console.log(JSON.stringify({ repaired: changed.length, files: changed }, null, 2));
}

main();
