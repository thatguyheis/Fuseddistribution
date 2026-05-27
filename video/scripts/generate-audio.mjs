import { readFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TTS_BIN = '/Users/nick/.venvs/coqui/bin/tts';
const VOICE_SAMPLE = join(ROOT, 'voice-sample/voice-reference.wav');
const USE_COQUI = existsSync(VOICE_SAMPLE) && existsSync(TTS_BIN);

if (USE_COQUI) {
  console.log('Voice: Coqui XTTS v2 (cloned voice)');
} else {
  console.log('Voice: macOS Zoe (Premium) — add voice-sample/voice-reference.wav to switch to cloned voice');
}

function sayToM4a(text, outPath) {
  const escaped = text.replace(/'/g, "'\\''");
  execSync(`say -v "Zoe (Premium)" --data-format=aac --file-format=m4af -o "${outPath}" '${escaped}'`);
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

async function generateAudio(slug) {
  const scriptPath = join(ROOT, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) {
    console.error(`script.json not found: ${scriptPath}`);
    console.error(`Run: node scripts/parse-script.mjs --post=${slug} first`);
    process.exit(1);
  }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const audioDir = join(ROOT, 'public/audio', slug);
  mkdirSync(audioDir, { recursive: true });

  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    if (!seg.narration) { skipped++; continue; }
    const outPath = join(audioDir, `segment-${i}.m4a`);
    try {
      if (USE_COQUI) {
        coquiToM4a(seg.narration, outPath);
      } else {
        sayToM4a(seg.narration, outPath);
      }
      console.log(`  ✓ segment-${i}.m4a (${seg.type})`);
      generated++;
    } catch (err) {
      console.error(`  ✗ segment-${i} failed: ${err.message}`);
    }
  }
  console.log(`Done. Generated: ${generated}, skipped (no narration): ${skipped}`);
}

const postArg = process.argv.find(a => a.startsWith('--post='));
if (!postArg) { console.error('Usage: node generate-audio.mjs --post=<slug>'); process.exit(1); }
generateAudio(postArg.replace('--post=', ''));
