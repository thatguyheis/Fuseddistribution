import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function renderPost(slug, musicTrack = 'ambient-01.mp3') {
  console.log(`\n=== Blog Reel Renderer: ${slug} ===\n`);

  // 1. Parse
  run(`node scripts/parse-script.mjs --post=${slug}`);
  const scriptPath = join(videoDir, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) {
    console.error('Parse failed — script.json not found.'); process.exit(1);
  }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));

  // 2. Audio
  run(`node scripts/generate-audio.mjs --post=${slug}`);

  // 3. Music check
  const musicPath = join(videoDir, 'public', 'music', musicTrack);
  if (!existsSync(musicPath)) {
    console.warn(`\n⚠  Music not found: public/music/${musicTrack}`);
    console.warn('   See public/music/README.md. Rendering without music.\n');
  }

  // 4. Write render-meta (for performance feedback)
  const hookText = script.segments.find(s => s.type === 'hook')?.text ?? '';
  const meta = {
    slug, renderedAt: new Date().toISOString(),
    hookType: detectHookType(hookText),
    segmentCount: script.segments.length,
    totalDuration: script.totalDuration,
    musicTrack,
  };
  writeFileSync(join(videoDir, 'out', slug, 'render-meta.json'), JSON.stringify(meta, null, 2));

  // 5. Render — write props to file to avoid shell escaping issues
  const outDir = join(videoDir, 'out', slug);
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${slug}.mp4`);
  const propsFile = join(outDir, 'render-props.json');
  writeFileSync(propsFile, JSON.stringify({ script, musicTrack }));
  run(`npx remotion render src/Root.tsx BlogReel --props="${propsFile}" "${outFile}"`);

  console.log(`\n✓ Render complete: ${outFile}\n`);
}

const postArg = process.argv.find(a => a.startsWith('--post='));
const musicArg = process.argv.find(a => a.startsWith('--music='));
if (!postArg) { console.error('Usage: node render.mjs --post=<slug> [--music=ambient-02.mp3]'); process.exit(1); }
renderPost(postArg.replace('--post=', ''), musicArg?.replace('--music=', ''));
