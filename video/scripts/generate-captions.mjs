/**
 * Generates caption timestamps using ffprobe to measure actual audio duration.
 * Splits narration into sentence chunks and distributes them proportionally
 * across actual audio time — not estimated word rate or segment window time.
 * This eliminates subtitle drift caused by Zoe TTS speaking faster than estimates.
 *
 * Output: out/<slug>/captions.json — Record<segmentIdx, CaptionChunk[]>
 * Each chunk: { text, startSec, endSec } relative to segment audio start (0-based).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function getAudioDuration(m4aPath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${m4aPath}"`,
      { encoding: 'utf8' }
    ).trim();
    const d = parseFloat(out);
    return isNaN(d) ? null : d;
  } catch {
    return null;
  }
}

function splitIntoChunks(text, maxChars = 100) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const chunks = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) {
      chunks.push(trimmed);
    } else {
      const parts = trimmed.split(/,\s*/);
      let buf = '';
      for (const p of parts) {
        if (buf && (buf + ', ' + p).length > maxChars) {
          if (buf) chunks.push(buf.trim());
          buf = p;
        } else {
          buf = buf ? buf + ', ' + p : p;
        }
      }
      if (buf.trim()) chunks.push(buf.trim());
    }
  }
  return chunks.filter(Boolean);
}

export async function generateCaptions(slug) {
  const scriptPath = join(ROOT, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) return {};

  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const audioDir = join(ROOT, 'public/audio', slug);
  const outDir = join(ROOT, 'out', slug);
  mkdirSync(outDir, { recursive: true });

  const captions = {};

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    if (!seg.narration) continue;

    const m4aPath = join(audioDir, `segment-${i}.m4a`);
    if (!existsSync(m4aPath)) continue;

    const actualDuration = getAudioDuration(m4aPath);
    if (!actualDuration || actualDuration < 0.5) continue;

    const chunks = splitIntoChunks(seg.narration);
    if (!chunks.length) continue;

    const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
    const LEAD_SEC = 0.15;
    let cursor = -LEAD_SEC;

    captions[i] = chunks.map((text) => {
      const fraction = text.length / totalChars;
      const duration = fraction * actualDuration;
      const startSec = Math.max(0, cursor);
      const endSec = startSec + duration;
      cursor += duration;
      return { text, startSec, endSec };
    });

    if (captions[i].length) {
      captions[i][captions[i].length - 1].endSec = actualDuration;
    }

    console.log(`  ✓ captions segment-${i}: ${captions[i].length} chunk(s), audio ${actualDuration.toFixed(1)}s`);
  }

  writeFileSync(join(outDir, 'captions.json'), JSON.stringify(captions, null, 2));
  return captions;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const postArg = process.argv.find(a => a.startsWith('--post='));
  if (!postArg) { console.error('Usage: node generate-captions.mjs --post=<slug>'); process.exit(1); }
  const slug = postArg.replace('--post=', '');
  console.log(`\nGenerating captions for: ${slug}\n`);
  generateCaptions(slug).then(c => {
    console.log(`\nDone. ${Object.keys(c).length} segment(s) with captions.`);
  });
}
