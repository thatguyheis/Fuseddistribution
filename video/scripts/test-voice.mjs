import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHATTERBOX_PY = '/Users/nick/.venvs/chatterbox/bin/python3';
const CHATTERBOX_SCRIPT = join(__dirname, 'chatterbox-tts.py');
const TTS_BIN = '/Users/nick/.venvs/coqui/bin/tts';
const SAMPLE = join(ROOT, 'voice-sample/voice-reference.wav');
const OUT = '/tmp/voice-test.wav';
const TEXT = 'This is a test of your cloned voice. If you can hear yourself speaking these words, the setup is working.';

if (!existsSync(SAMPLE)) {
  console.error('No voice sample found.');
  console.error(`Record your voice and save to: ${SAMPLE}`);
  console.error('See voice-sample/README.md for instructions.');
  process.exit(1);
}

let result;
if (existsSync(CHATTERBOX_PY) && existsSync(CHATTERBOX_SCRIPT)) {
  console.log('Running Chatterbox voice clone test...');
  result = spawnSync(CHATTERBOX_PY, [
    CHATTERBOX_SCRIPT,
    `--text=${TEXT}`,
    `--out_path=${OUT}`,
    `--speaker_wav=${SAMPLE}`,
  ], { stdio: 'inherit' });
} else {
  console.log('Chatterbox not found — running Coqui XTTS v2 voice clone test...');
  console.log('(First run downloads ~1.8 GB model — takes a few minutes)');
  result = spawnSync(TTS_BIN, [
    '--model_name', 'tts_models/multilingual/multi-dataset/xtts_v2',
    '--speaker_wav', SAMPLE,
    '--language_idx', 'en',
    '--text', TEXT,
    '--out_path', OUT,
  ], { stdio: 'inherit' });
}

if (result.status !== 0) {
  console.error('TTS failed. Check output above.');
  process.exit(1);
}

console.log(`\nSuccess! Playing: ${OUT}`);
execSync(`afplay "${OUT}"`);
