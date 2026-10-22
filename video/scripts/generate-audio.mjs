import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { audioDurationSeconds } from './audio-timing.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Voice tiers, best first:
// 1. Chatterbox (voice clone, CPU by default; MPS opt-in) — scripts/chatterbox-tts.py in its own venv
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

export function boundedTtsTimeout(requested, preflight = false) {
  if (!Number.isFinite(requested) || requested < 1) throw new Error('Invalid TTS timeout');
  // Preflight must synthesize changed Chatterbox segments to validate the
  // actual runtime and decoded audio. Standard-quality segments can take
  // several minutes locally, so they share the normal bounded ceiling.
  return Math.min(requested, 2_700_000);
}

export function chatterboxRuntime(voice = 'chatterbox') {
  const path = join(ROOT, 'tts-runtime.json');
  const configured = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {variant: 'standard'};
  const variant = voice === 'chatterbox-standard' ? 'standard' : configured.variant;
  return {
    ...configured,
    variant,
    modelPath: variant === 'standard'
      ? process.env.CHATTERBOX_STANDARD_MODEL_PATH || configured.modelPath
      : configured.modelPath,
    modelRevision: variant === 'standard'
      ? process.env.CHATTERBOX_STANDARD_MODEL_REVISION || configured.modelRevision
      : configured.modelRevision,
    generation: {
      ...configured.generation,
      ...(variant === 'standard' ? {
        exaggeration: Number(process.env.CHATTERBOX_TTS_EXAGGERATION || configured.generation?.exaggeration || 0.4),
        cfgWeight: Number(process.env.CHATTERBOX_TTS_CFG_WEIGHT || configured.generation?.cfgWeight || 0.5),
        chunkCharacters: Number(process.env.CHATTERBOX_TTS_CHUNK_CHARS || configured.generation?.chunkCharacters || 280),
        maxSpeechTokens: Number(process.env.CHATTERBOX_TTS_MAX_SPEECH_TOKENS || configured.generation?.maxSpeechTokens || 600),
      } : {}),
    },
  };
}

// Preserve a content-addressed lossless master before encoding narration for Remotion.
export function encodeChatterboxAudio(wavPath, outPath) {
  const digest = createHash('sha256').update(readFileSync(wavPath)).digest('hex');
  const masters = join(dirname(outPath), 'masters');
  mkdirSync(masters, {recursive: true});
  const masterPath = join(masters, `${digest}.wav`);
  if (!existsSync(masterPath)) copyFileSync(wavPath, masterPath);
  const result = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', masterPath,
    '-c:a', 'aac', '-b:a', '192k', outPath], {encoding: 'utf8'});
  if (result.error || result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Narration encoding failed');
  writeFileSync(`${outPath}.source.json`, JSON.stringify({losslessMaster: masterPath, sha256: digest, aacBitrateTarget: 192000, nativeRatePreserved: true}, null, 2) + '\n');
  return masterPath;
}

function chatterboxBatchToM4a(slug, jobs, voice) {
  const batchPath = `/tmp/chatterbox-${slug}-${process.pid}.json`;
  const batch = jobs.map(({ttsText, outPath}) => ({
    text: ttsText,
    out_path: outPath.replace(/\.m4a$/, '_tmp.wav'),
  }));
  writeFileSync(batchPath, JSON.stringify(batch));
  const timeout = boundedTtsTimeout(CHATTERBOX_BATCH_TIMEOUT_MS, process.argv.includes('--preflight-only'));
  const started = performance.now();
  const result = spawnSync(CHATTERBOX_PY, [
    CHATTERBOX_SCRIPT,
    `--manifest=${batchPath}`,
    `--speaker_wav=${VOICE_SAMPLE}`,
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout,
    killSignal: 'SIGKILL',
    env: {
      ...process.env,
      CHATTERBOX_TTS_VARIANT: chatterboxRuntime(voice).variant,
      CHATTERBOX_MODEL_PATH: chatterboxRuntime(voice).modelPath,
      CHATTERBOX_STANDARD_MODEL_PATH: chatterboxRuntime(voice).modelPath,
      CHATTERBOX_TTS_CHUNK_CHARS: String(chatterboxRuntime(voice).generation?.chunkCharacters || 280),
      CHATTERBOX_TTS_MAX_SPEECH_TOKENS: String(chatterboxRuntime(voice).generation?.maxSpeechTokens || 600),
      CHATTERBOX_TTS_EXAGGERATION: String(chatterboxRuntime(voice).generation?.exaggeration || 0.4),
      CHATTERBOX_TTS_CFG_WEIGHT: String(chatterboxRuntime(voice).generation?.cfgWeight || 0.5),
      HF_HUB_OFFLINE: process.env.HF_HUB_OFFLINE || '1',
      TRANSFORMERS_OFFLINE: process.env.TRANSFORMERS_OFFLINE || '1',
    },
  });
  const measurements = join(ROOT, '..', '.workflow-state', 'tts-runs');
  mkdirSync(measurements, {recursive: true});
  writeFileSync(join(measurements, `${slug}-${process.pid}-${jobs[0].index}.json`), JSON.stringify({
    runtime: chatterboxRuntime(voice), elapsedSeconds: (performance.now() - started) / 1000,
    exitCode: result.status, signal: result.signal, error: result.error?.code ?? null,
    segments: jobs.map(job => job.index), progress: result.stdout?.toString().trim(),
  }, null, 2));
  rmSync(batchPath, {force: true});

  if (result.error || result.status !== 0) {
    const folder = join(ROOT, '..', '.workflow-state', 'tts-failures');
    mkdirSync(folder, {recursive:true});
    const evidence = join(folder, `${slug}-${process.pid}.log`);
    writeFileSync(evidence, result.stderr?.toString() || result.error?.message || 'TTS process failed');
    const reason = result.error?.code === 'ETIMEDOUT' ? `timed out after ${timeout / 1000}s` : `failed (${result.signal || result.status})`;
    throw new Error(`Chatterbox TTS ${reason}; evidence: ${evidence}`);
  }

  for (const {outPath} of jobs) {
    const tmpWav = outPath.replace(/\.m4a$/, '_tmp.wav');
    encodeChatterboxAudio(tmpWav, outPath);
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
  if (['chatterbox', 'chatterbox-standard'].includes(voice) && availability.chatterbox) return voice;
  if (voice === 'coqui' && availability.coqui) return voice;
  throw new Error(`Voice "${voice}" is unavailable. Install the requested local runtime; use Zoe only with Nick's approval.`);
}

export function audioCacheKey(text, voice) {
  const profile = voice.startsWith('chatterbox') ? chatterboxRuntime(voice) : null;
  return createHash('sha256').update(`${voice}\0${JSON.stringify(profile)}\0${normalizeForTTS(text)}`).digest('hex');
}

function loadManifest(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {version: 1, segments: {}}; }
}

function recoverChatterboxCheckpoints(jobs, manifest, manifestPath, voice) {
  const remaining = [];
  for (const job of jobs) {
    const tmpWav = job.outPath.replace(/\.m4a$/, '_tmp.wav');
    if (!existsSync(tmpWav)) {
      remaining.push(job);
      continue;
    }
    try {
      const duration = audioDurationSeconds(tmpWav);
      if (!Number.isFinite(duration) || duration <= 0.1) throw new Error('invalid WAV duration');
      encodeChatterboxAudio(tmpWav, job.outPath);
      rmSync(tmpWav, {force: true});
      manifest.segments ??= {};
      manifest.segments[job.index] = {hash: job.hash, voice, text: job.ttsText};
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`  ↻ segment-${job.index}.m4a recovered from durable WAV checkpoint`);
    } catch {
      rmSync(tmpWav, {force: true});
      remaining.push(job);
    }
  }
  return remaining;
}

async function generateAudio(slug, requestedVoice = 'chatterbox', force = false, preflightOnly = false) {
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
    voice === 'chatterbox-standard' ? 'Voice: Chatterbox Standard (cloned voice)' :
    voice === 'chatterbox' ? `Voice: Chatterbox ${(chatterboxRuntime().variant || 'standard').toUpperCase()} (cloned voice)` :
    voice === 'coqui' ? 'Voice: Coqui XTTS v2 (cloned voice)' :
    'Voice: macOS Zoe (Premium)',
  );

  let generated = 0;
  let skipped = 0;
  let needed = 0;
  let failed = 0;
  let jobs = [];

  let probeSelected = false;
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
    if (preflightOnly && probeSelected) continue;
    probeSelected = true;
    needed++;
    rmSync(outPath, {force: true});
    if (voice === 'chatterbox' || voice === 'chatterbox-standard') {
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

  if ((voice === 'chatterbox' || voice === 'chatterbox-standard') && jobs.length > 0) {
    jobs = recoverChatterboxCheckpoints(jobs, manifest, manifestPath, voice);
    for (const job of jobs) {
      try {
        // Process one segment at a time so a slow TTS segment cannot hide
        // completed audio or discard the whole reel's progress.
        chatterboxBatchToM4a(slug, [job], voice);
        manifest.segments ??= {};
        manifest.segments[job.index] = {hash: job.hash, voice, text: job.ttsText, runtime: chatterboxRuntime(voice)};
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`  ✓ segment-${job.index}.m4a (${job.segmentType})`);
        generated++;
      } catch (err) {
        rmSync(job.outPath, {force: true});
        const tmpWav = job.outPath.replace(/\.m4a$/, '_tmp.wav');
        try {
          const duration = audioDurationSeconds(tmpWav);
          if (!Number.isFinite(duration) || duration <= 0.1) rmSync(tmpWav, {force: true});
        } catch {
          rmSync(tmpWav, {force: true});
        }
        failed++;
        console.error(`  ✗ Chatterbox segment-${job.index} failed: ${err.message}`);
        break; // A runtime failure must not repeat for every segment.
      }
    }
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  if (preflightOnly) {
    if (failed) throw new Error('TTS_PREFLIGHT_FAILED: runtime repair required');
    for (const job of jobs) {
      if (!(audioDurationSeconds(job.outPath) > 0.1)) throw new Error('TTS_PREFLIGHT_FAILED: invalid audio');
      execSync(`ffmpeg -v error -xerror -i "${job.outPath}" -f null -`);
    }
    console.log(JSON.stringify({ preflight: true, pass: true, generated, cached: skipped }));
    return;
  }
  const audioDurations = {};
  if (failed === 0) {
    for (let i = 0; i < script.segments.length; i++) {
      if (!script.segments[i].narration) continue;
      const path = join(audioDir, `segment-${i}.m4a`);
      try {
        audioDurations[i] = audioDurationSeconds(path);
      } catch (error) {
        console.error(`  ✗ segment-${i} duration check failed: ${error.message}`);
        failed++;
      }
    }
  }
  writeFileSync(join(audioDir, 'audio-durations.json'), `${JSON.stringify(audioDurations, null, 2)}\n`);
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
  generateAudio(postArg.replace('--post=', ''), voiceArg?.replace('--voice=', '') || 'chatterbox', force, process.argv.includes('--preflight-only'));
}
