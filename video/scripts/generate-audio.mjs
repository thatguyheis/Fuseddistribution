import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { readFileSync, mkdirSync, existsSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateAudio(slug) {
  const scriptPath = join(__dirname, '../out', slug, 'script.json');
  if (!existsSync(scriptPath)) {
    console.error(`script.json not found: ${scriptPath}`);
    console.error(`Run: node scripts/parse-script.mjs --post=${slug} first`);
    process.exit(1);
  }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const audioDir = join(__dirname, '../public/audio', slug);
  mkdirSync(audioDir, { recursive: true });

  const tts = new MsEdgeTTS();
  await tts.setMetadata('en-US-GuyNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    if (!seg.narration) { skipped++; continue; }
    const outPath = join(audioDir, `segment-${i}.mp3`);
    try {
      const audioStream = tts.toStream(seg.narration);
      await pipeline(audioStream, createWriteStream(outPath));
      console.log(`  ✓ segment-${i}.mp3 (${seg.type})`);
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
