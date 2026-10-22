import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(new URL('.', import.meta.url).pathname, '..', '..');
const POINTS = [0.15, 0.5, 0.85];
export const CAPTION_GAP_TOLERANCE_SECONDS = 0.9;
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }

export function captionNearPoint(chunks, target, tolerance = CAPTION_GAP_TOLERANCE_SECONDS) {
  return chunks
    .map((chunk) => ({
      chunk,
      distance: target < Number(chunk.startSec)
        ? Number(chunk.startSec) - target
        : target > Number(chunk.endSec) ? target - Number(chunk.endSec) : 0,
    }))
    .filter(({distance}) => Number.isFinite(distance) && distance <= tolerance)
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
}

export function auditCaptionSync(slug, options = {}) {
  const base = options.root ?? root;
  const dir = join(base, 'video', 'out', slug);
  const files = ['captions-meta.json', 'captions.json', 'script.json'].map((name) => join(dir, name));
  if (!files.every(existsSync)) throw new Error(`${slug}: caption audit inputs are incomplete`);
  const meta = readJson(files[0]);
  const captions = readJson(files[1]);
  const script = readJson(files[2]);
  const points = [];
  const errors = [];
  for (let i = 0; i < script.segments.length; i++) {
    const segment = script.segments[i];
    const chunks = Array.isArray(captions[i]) ? captions[i] : [];
    if (segment.narration && chunks.length === 0) errors.push(`segment ${i}: no caption chunks`);
    if (!chunks.length) continue;
    const duration = Math.max(...chunks.map((chunk) => Number(chunk.endSec)), 0);
    for (const ratio of POINTS) {
      const target = duration * ratio;
      const match = captionNearPoint(chunks, target);
      if (!match) errors.push(`segment ${i}: no caption near ${Math.round(ratio * 100)}% point`);
      points.push({ segment: i, ratio, caption: match?.chunk.text ?? null, distanceSeconds: match ? Number(match.distance.toFixed(3)) : null });
    }
  }
  return { slug, mode: meta.mode, method: 'automated-three-point-caption-coverage', points, errors, pass: errors.length === 0 };
}

function main() {
  const arg = process.argv.find((value) => value.startsWith('--post='));
  if (!arg) throw new Error('Usage: node scripts/auto-caption-review.mjs --post=<slug>');
  const slug = arg.slice('--post='.length);
  const review = auditCaptionSync(slug);
  writeFileSync(join(root, 'video', 'out', slug, 'caption-review.json'), `${JSON.stringify(review, null, 2)}\n`);
  console.log(`[caption-review] ${review.pass ? 'PASS' : 'BLOCKED'}: ${slug}`);
  if (!review.pass) process.exitCode = 1;
}

if (process.argv[1] === new URL(import.meta.url).pathname) main();
