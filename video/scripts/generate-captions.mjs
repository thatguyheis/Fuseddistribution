/**
 * Generates caption timestamps using whisper-node (whisper.cpp) for frame-accurate
 * word-level timestamps. Falls back to ffprobe-based proportional timing if whisper
 * fails for a segment.
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

const WHISPER_MAIN = join(ROOT, 'node_modules/whisper-node/lib/whisper.cpp/main');
const WHISPER_MODEL = join(ROOT, 'node_modules/whisper-node/lib/whisper.cpp/models/ggml-base.en.bin');

function runWhisper(wavPath) {
  if (!existsSync(WHISPER_MAIN) || !existsSync(WHISPER_MODEL)) return null;
  try {
    const out = execSync(
      `"${WHISPER_MAIN}" -ml 40 -m "${WHISPER_MODEL}" -f "${wavPath}"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const lines = out.match(/\[[0-9:.]+\s-->\s[0-9:.]+\]\s+\S.*/g);
    if (!lines?.length) return null;
    return lines.map(line => {
      const [ts, ...rest] = line.split(']  ');
      const [start, end] = ts.slice(1).split(' --> ');
      return { start, end, speech: rest.join(']  ').trim() };
    }).filter(r => r.speech);
  } catch {
    return null;
  }
}

function tsToSec(ts) {
  const [hms, ms] = ts.split('.');
  const parts = hms.split(':').map(Number);
  const [h, m, s] = parts.length === 3 ? parts : [0, ...parts];
  return h * 3600 + m * 60 + s + (ms ? parseInt(ms) / 1000 : 0);
}

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
    const trimmed = s.trim().replace(/^["']+|["']+$/g, '').trim();
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

function proportionalFallback(narration, actualDuration) {
  const chunks = splitIntoChunks(narration);
  if (!chunks.length) return [];
  const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
  const LEAD_SEC = 0.15;
  let cursor = -LEAD_SEC;
  const result = chunks.map((text) => {
    const duration = (text.length / totalChars) * actualDuration;
    const startSec = Math.max(0, cursor);
    const endSec = startSec + duration;
    cursor += duration;
    return { text, startSec, endSec };
  });
  if (result.length) result[result.length - 1].endSec = actualDuration;
  return result;
}

export async function generateCaptions(slug) {
  const scriptPath = join(ROOT, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) return {captions: {}, meta: {mode: 'none', whisperSegments: 0, proportionalSegments: 0}};

  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const audioDir = join(ROOT, 'public/audio', slug);
  const outDir = join(ROOT, 'out', slug);
  mkdirSync(outDir, { recursive: true });

  const captions = {};
  const whisperAvailable = existsSync(WHISPER_MAIN) && existsSync(WHISPER_MODEL);
  let whisperSegments = 0;
  let proportionalSegments = 0;
  let missingAudioSegments = 0;

  if (!whisperAvailable) {
    console.warn('  ⚠  whisper runtime/model unavailable — captions will use proportional timing');
  }

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    if (!seg.narration) continue;

    const m4aPath = join(audioDir, `segment-${i}.m4a`);
    if (!existsSync(m4aPath)) { missingAudioSegments++; continue; }

    const actualDuration = getAudioDuration(m4aPath);

    // Convert m4a → wav 16kHz mono (whisper.cpp requires this format)
    const wavPath = join(outDir, `caption-tmp-${i}.wav`);
    try {
      execSync(`ffmpeg -y -i "${m4aPath}" -ar 16000 -ac 1 "${wavPath}" 2>/dev/null`);
    } catch {
      console.warn(`  ⚠  caption segment-${i}: ffmpeg wav conversion failed — using proportional fallback`);
      if (actualDuration) {
        captions[i] = proportionalFallback(seg.narration, actualDuration);
        proportionalSegments++;
      }
      continue;
    }

    const result = runWhisper(wavPath);
    try { execSync(`rm -f "${wavPath}"`); } catch {}

    if (result?.length) {
      captions[i] = result.map(r => ({
        text: r.speech.trim(),
        startSec: tsToSec(r.start),
        endSec: tsToSec(r.end),
      })).filter(c => c.text);
      whisperSegments++;
      console.log(`  ✓ captions segment-${i}: ${captions[i].length} chunk(s) [whisper]`);
    } else {
      if (whisperAvailable) console.warn(`  ⚠  caption segment-${i}: whisper failed — using proportional fallback`);
      if (actualDuration) {
        captions[i] = proportionalFallback(seg.narration, actualDuration);
        proportionalSegments++;
      }
    }
  }

  writeFileSync(join(outDir, 'captions.json'), JSON.stringify(captions, null, 2));
  const mode = whisperSegments > 0
    ? (proportionalSegments > 0 ? 'mixed' : 'whisper')
    : (proportionalSegments > 0 ? 'proportional' : 'none');
  const meta = {mode, whisperAvailable, whisperSegments, proportionalSegments, missingAudioSegments};
  writeFileSync(join(outDir, 'captions-meta.json'), JSON.stringify(meta, null, 2));
  return {captions, meta};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const postArg = process.argv.find(a => a.startsWith('--post='));
  if (!postArg) { console.error('Usage: node generate-captions.mjs --post=<slug>'); process.exit(1); }
  const slug = postArg.replace('--post=', '');
  console.log(`\nGenerating captions for: ${slug}\n`);
  generateCaptions(slug).then(({captions, meta}) => {
    console.log(`\nDone. ${Object.keys(captions).length} segment(s) with captions (${meta.mode}).`);
  });
}
