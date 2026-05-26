import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VOICE = 'Zoe (Premium)';

function sayToM4a(text, outPath) {
  const escaped = text.replace(/'/g, "'\\''");
  execSync(`say -v "${VOICE}" --data-format=aac --file-format=m4af -o "${outPath}" '${escaped}'`);
}

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

  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    if (!seg.narration) { skipped++; continue; }
    const outPath = join(audioDir, `segment-${i}.m4a`);
    try {
      sayToM4a(seg.narration, outPath);
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
