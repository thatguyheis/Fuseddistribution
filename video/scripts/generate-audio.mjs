import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Voice tiers, best first:
// 1. Chatterbox (voice clone, MPS) — scripts/chatterbox-tts.py in its own venv
// 2. Coqui XTTS v2 (voice clone)
// 3. macOS Zoe (Premium) built-in
const CHATTERBOX_PY = '/Users/nick/.venvs/chatterbox/bin/python3';
const CHATTERBOX_SCRIPT = join(__dirname, 'chatterbox-tts.py');
const TTS_BIN = '/Users/nick/.venvs/coqui/bin/tts';
const VOICE_SAMPLE = join(ROOT, 'voice-sample/voice-reference.wav');

const HAS_CHATTERBOX = existsSync(CHATTERBOX_PY) && existsSync(CHATTERBOX_SCRIPT) && existsSync(VOICE_SAMPLE);
const HAS_COQUI = existsSync(VOICE_SAMPLE) && existsSync(TTS_BIN);
const CHATTERBOX_BATCH_TIMEOUT_MS = Number(process.env.CHATTERBOX_BATCH_TIMEOUT_MS || 45 * 60 * 1000);

function sayToM4a(text, outPath) {
  const escaped = text.replace(/'/g, "'\\''");
  execSync(`say -v "Zoe (Premium)" --data-format=aac --file-format=m4af -o "${outPath}" '${escaped}'`);
}

function chatterboxBatchToM4a(slug, jobs) {
  const batchPath = `/tmp/chatterbox-${slug}-${process.pid}.json`;
  const batch = jobs.map(({ttsText, outPath}) => ({
    text: ttsText,
    out_path: outPath.replace(/\.m4a$/, '_tmp.wav'),
  }));
  writeFileSync(batchPath, JSON.stringify(batch));
  const result = spawnSync(CHATTERBOX_PY, [
    CHATTERBOX_SCRIPT,
    `--manifest=${batchPath}`,
    `--speaker_wav=${VOICE_SAMPLE}`,
  ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: CHATTERBOX_BATCH_TIMEOUT_MS });
  rmSync(batchPath, {force: true});

  if (result.signal === 'SIGTERM') {
    throw new Error(`Chatterbox TTS timed out after ${Math.round(CHATTERBOX_BATCH_TIMEOUT_MS / 1000)}s`);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString() || 'Chatterbox TTS failed');
  }

  for (const {outPath} of jobs) {
    const tmpWav = outPath.replace(/\.m4a$/, '_tmp.wav');
    execSync(`ffmpeg -y -i "${tmpWav}" -c:a aac "${outPath}" 2>/dev/null`);
    rmSync(tmpWav, {force: true});
  }
}

function coquiToM4a(text, outPath) {
  const tmpWav = outPath.replace(/\.m4a$/, '_tmp.wav');
  const result = spawnSync(TTS_BIN, [
    '--model_name', 'tts_models/multilingual/multi-dataset/xtts_v2',
    '--speaker_wav', VOICE_SAMPLE,
    '--language_idx', 'en',
    '--text', text,
    '--out_path', tmpWav,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  if (result.status !== 0) {
    throw new Error(result.stderr?.toString() || 'Coqui TTS failed');
  }

  // Convert WAV → M4A to match what Remotion expects (same as Zoe output)
  execSync(`ffmpeg -y -i "${tmpWav}" -c:a aac "${outPath}" 2>/dev/null`);
  execSync(`rm "${tmpWav}"`);
}

export function normalizeForTTS(text) {
  return text
    .replace(/\bUS\b/g, 'USA')           // "US" → "USA" so it's not read as the word "us"
    .replace(/(\d)%/g, '$1 percent')     // "42%" → "42 percent"
    .replace(/^%/g, 'percent ');         // leading % edge case
}

export function resolveVoice(requested, availability = {chatterbox: HAS_CHATTERBOX, coqui: HAS_COQUI}) {
  const voice = requested || 'chatterbox';
  if (voice === 'zoe') return voice;
  if (voice === 'chatterbox' && availability.chatterbox) return voice;
  if (voice === 'coqui' && availability.coqui) return voice;
  throw new Error(`Voice "${voice}" is unavailable. Install the requested local runtime; use Zoe only with Nick's approval.`);
}

export function audioCacheKey(text, voice) {
  return createHash('sha256').update(`${voice}\0${normalizeForTTS(text)}`).digest('hex');
}

function loadManifest(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {version: 1, segments: {}}; }
}

async function generateAudio(slug, requestedVoice = 'chatterbox', force = false) {
  const scriptPath = join(ROOT, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) {
    console.error(`script.json not found: ${scriptPath}`);
    console.error(`Run: node scripts/parse-script.mjs --post=${slug} first`);
    process.exit(1);
  }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const audioDir = join(ROOT, 'public/audio', slug);
  mkdirSync(audioDir, { recursive: true });
  const manifestPath = join(audioDir, 'audio-manifest.json');
  const manifest = loadManifest(manifestPath);
  const voice = resolveVoice(requestedVoice);

  console.log(
    voice === 'chatterbox' ? 'Voice: Chatterbox TTS (cloned voice)' :
    voice === 'coqui' ? 'Voice: Coqui XTTS v2 (cloned voice)' :
    'Voice: macOS Zoe (Premium)',
  );

  let generated = 0;
  let skipped = 0;
  let needed = 0;
  let failed = 0;
  const jobs = [];

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    if (!seg.narration) { skipped++; continue; }
    const outPath = join(audioDir, `segment-${i}.m4a`);
    const ttsText = normalizeForTTS(seg.narration);
    const hash = audioCacheKey(ttsText, voice);
    const cached = manifest.segments?.[i];
    if (!force && existsSync(outPath) && cached?.hash === hash && cached?.voice === voice) {
      console.log(`  ↷  segment-${i}.m4a cache valid — skipping`);
      skipped++;
      continue;
    }
    needed++;
    rmSync(outPath, {force: true});
    if (voice === 'chatterbox') {
      jobs.push({index: i, segmentType: seg.type, outPath, ttsText, hash});
      continue;
    }
    try {
      if (voice === 'coqui') {
        coquiToM4a(ttsText, outPath);
      } else {
        sayToM4a(ttsText, outPath);
      }
      manifest.segments ??= {};
      manifest.segments[i] = {hash, voice, text: ttsText};
      console.log(`  ✓ segment-${i}.m4a (${seg.type})`);
      generated++;
    } catch (err) {
      console.error(`  ✗ segment-${i} failed: ${err.message}`);
      failed++;
    }
  }

  if (voice === 'chatterbox' && jobs.length > 0) {
    try {
      for (const job of jobs) rmSync(job.outPath.replace(/\.m4a$/, '_tmp.wav'), {force: true});
      chatterboxBatchToM4a(slug, jobs);
      for (const job of jobs) {
        manifest.segments ??= {};
        manifest.segments[job.index] = {hash: job.hash, voice, text: job.ttsText};
        console.log(`  ✓ segment-${job.index}.m4a (${job.segmentType})`);
        generated++;
      }
    } catch (err) {
      for (const job of jobs) {
        rmSync(job.outPath, {force: true});
        rmSync(job.outPath.replace(/\.m4a$/, '_tmp.wav'), {force: true});
      }
      failed += jobs.length;
      console.error(`  ✗ Chatterbox batch failed: ${err.message}`);
    }
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Done. Generated: ${generated}, skipped: ${skipped}, failed: ${failed}`);
  if (failed > 0) {
    console.error(`ERROR: ${failed} of ${needed} required segments failed TTS — aborting render`);
    process.exit(1);
  }
}

const postArg = process.argv.find(a => a.startsWith('--post='));
const voiceArg = process.argv.find(a => a.startsWith('--voice='));
const force = process.argv.includes('--force');
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!postArg) {
    console.error('Usage: node generate-audio.mjs --post=<slug> [--voice=zoe|chatterbox|coqui] [--force]');
    process.exit(1);
  }
  generateAudio(postArg.replace('--post=', ''), voiceArg?.replace('--voice=', '') || 'chatterbox', force);
}
