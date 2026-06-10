import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchMedia } from './fetch-media.mjs';
import { generateCaptions } from './generate-captions.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = join(__dirname, '..');

function run(cmd) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: videoDir });
}

function detectHookType(text) {
  if (/\?/.test(text)) return 'question';
  if (/^\d|[\d,]+%/.test(text)) return 'stat';
  return 'statement';
}

async function renderPost(slug, musicTrack = 'ambient-01.mp3', reelN = null) {
  const reelLabel = reelN ? ` (reel ${reelN})` : '';
  console.log(`\n=== Blog Reel Renderer: ${slug}${reelLabel} ===\n`);

  // 1. Parse
  const reelFlag = reelN ? ` --reel=${reelN}` : '';
  run(`node scripts/parse-script.mjs --post=${slug}${reelFlag}`);
  const scriptPath = join(videoDir, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) {
    console.error('Parse failed — script.json not found.'); process.exit(1);
  }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));

  // 2. Audio
  run(`node scripts/generate-audio.mjs --post=${slug}`);

  // 3. Media (requires PEXELS_API_KEY env var; skips silently if not set)
  console.log('\n→ fetch-media.mjs');
  const media = await fetchMedia(slug);

  // 3b. Captions — whisper-verified timestamps (runs after audio; skips segments with no audio)
  console.log('\n→ generate-captions.mjs');
  const captions = await generateCaptions(slug);

  // 4. Music check
  const musicPath = join(videoDir, 'public', 'music', musicTrack);
  if (!existsSync(musicPath)) {
    console.warn(`\n⚠  Music not found: public/music/${musicTrack}`);
    console.warn('   See public/music/README.md. Rendering without music.\n');
  }

  // 5. Write render-meta (for performance feedback)
  const hookText = script.segments.find(s => s.type === 'hook')?.text ?? '';
  const meta = {
    slug, renderedAt: new Date().toISOString(),
    hookType: detectHookType(hookText),
    segmentCount: script.segments.length,
    totalDuration: script.totalDuration,
    musicTrack,
    photosUsed: Object.keys(media).length,
  };
  writeFileSync(join(videoDir, 'out', slug, 'render-meta.json'), JSON.stringify(meta, null, 2));

  // 6. Render — write props to file to avoid shell escaping issues
  const outDir = join(videoDir, 'out', slug);
  mkdirSync(outDir, { recursive: true });
  const outFileName = reelN ? `${slug}-reel${reelN}.mp4` : `${slug}.mp4`;
  const outFile = join(outDir, outFileName);
  const propsFile = join(outDir, 'render-props.json');
  writeFileSync(propsFile, JSON.stringify({ script, musicTrack, media, captions }));
  run(`npx remotion render src/Root.tsx BlogReel --props="${propsFile}" "${outFile}"`);

  console.log(`\n✓ Render complete: ${outFile}\n`);
}

const postArg = process.argv.find(a => a.startsWith('--post='));
const musicArg = process.argv.find(a => a.startsWith('--music='));
const reelArg = process.argv.find(a => a.startsWith('--reel='));
if (!postArg) { console.error('Usage: node render.mjs --post=<slug> [--reel=N] [--music=ambient-02.mp3]'); process.exit(1); }
renderPost(postArg.replace('--post=', ''), musicArg?.replace('--music=', '') || undefined, reelArg?.replace('--reel=', '') ?? null);
