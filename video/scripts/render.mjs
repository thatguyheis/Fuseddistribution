import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchMedia } from './fetch-media.mjs';
import { generateCaptions } from './generate-captions.mjs';
import { formatValidationResult, validateReelScript } from './validate-reel.mjs';
import { createHash } from 'node:crypto';
import { compositionFramesForSegments } from './transition-timing.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = join(__dirname, '..');
const renderLockDir = '/tmp/fused-remotion-render.lock';

function acquireRenderLock() {
  if (existsSync(renderLockDir)) {
    let ownerPid = null;
    try { ownerPid = Number(readFileSync(join(renderLockDir, 'pid'), 'utf8').trim()); } catch {}
    let ownerAlive = false;
    if (Number.isInteger(ownerPid) && ownerPid > 0) {
      try { process.kill(ownerPid, 0); ownerAlive = true; } catch {}
    }
    if (ownerAlive) {
      throw new Error(`Another Remotion render is active (pid ${ownerPid}). Wait for it to finish.`);
    }
    rmSync(renderLockDir, {recursive: true, force: true});
  }
  mkdirSync(renderLockDir);
  writeFileSync(join(renderLockDir, 'pid'), String(process.pid));
  const release = () => rmSync(renderLockDir, {recursive: true, force: true});
  process.once('exit', release);
  process.once('SIGINT', () => { release(); process.exit(130); });
  process.once('SIGTERM', () => { release(); process.exit(143); });
}

function run(cmd) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: videoDir });
}

// FD-exhaustion guard. Node >= 24 raises its own per-process soft limit to the
// hard max, so per-process ulimit is not the failure mode — the SYSTEM-WIDE
// kernel file table (kern.num_files vs kern.maxfiles) is. When stale
// chrome-headless-shell / workerd processes fill it, renders die mid-encode
// (signature: render-meta.json written, no MP4 — happened 2026-06-10 18:46).
// Fail fast with the fix instead of wasting a 20-minute render.
function assertFdHeadroom() {
  try {
    const used = parseInt(execSync('sysctl -n kern.num_files').toString().trim(), 10);
    const max = parseInt(execSync('sysctl -n kern.maxfiles').toString().trim(), 10);
    if (Number.isFinite(used) && Number.isFinite(max) && used / max > 0.8) {
      console.error(`✗ System file table at ${used}/${max} (>80%) — render will crash mid-encode.`);
      console.error('  Fix: pkill -f chrome-headless-shell; pkill -x workerd; then retry. Reboot if still high.');
      process.exit(1);
    }
  } catch { /* sysctl unavailable — proceed */ }
}

function detectHookType(text) {
  if (/\?/.test(text)) return 'question';
  if (/^\d|[\d,]+%/.test(text)) return 'stat';
  return 'statement';
}

async function renderPost(slug, musicTrack = 'ambient-01.mp3', reelN = null, voice = 'chatterbox') {
  const reelLabel = reelN ? ` (reel ${reelN})` : '';
  console.log(`\n=== Blog Reel Renderer: ${slug}${reelLabel} ===\n`);
  assertFdHeadroom();

  // 1. Parse
  const reelFlag = reelN ? ` --reel=${reelN}` : '';
  run(`node scripts/parse-script.mjs --post=${slug}${reelFlag}`);
  const scriptPath = join(videoDir, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) {
    console.error('Parse failed — script.json not found.'); process.exit(1);
  }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));

  const validation = validateReelScript(script);
  const validationOutput = formatValidationResult(validation);
  if (validationOutput) console.log(`\n${validationOutput}`);
  if (validation.errors.length > 0) {
    console.error('\nReel validation failed — fix reel-script.md before audio/render.');
    process.exit(1);
  }

  // 2. Audio
  run(`node scripts/generate-audio.mjs --post=${slug} --voice=${voice}`);

  // 3. Media (requires PEXELS_API_KEY env var; skips silently if not set)
  console.log('\n→ fetch-media.mjs');
  const media = await fetchMedia(slug);

  // 3b. Captions. Uses Whisper when installed, otherwise records proportional fallback mode.
  console.log('\n→ generate-captions.mjs');
  const captionResult = await generateCaptions(slug);
  const captions = captionResult.captions;

  // 4. Music check
  const musicPath = join(videoDir, 'public', 'music', musicTrack);
  if (!existsSync(musicPath)) {
    console.warn(`\n⚠  Music not found: public/music/${musicTrack}`);
    console.warn('   See public/music/README.md. Rendering without music.\n');
  }

  // 5. Prepare metadata; write it only after the MP4 passes duration checks.
  const hookText = script.segments.find(s => s.type === 'hook')?.text ?? '';

  // 6. Render — write props to file to avoid shell escaping issues
  const outDir = join(videoDir, 'out', slug);
  mkdirSync(outDir, { recursive: true });
  const outFileName = reelN ? `${slug}-reel${reelN}.mp4` : `${slug}.mp4`;
  const outFile = join(outDir, outFileName);
  const propsFile = join(outDir, 'render-props.json');
  writeFileSync(propsFile, JSON.stringify({ script, musicTrack, media, captions }));
  run(`npx remotion render src/Root.tsx BlogReel --concurrency=1 --props="${propsFile}" "${outFile}"`);

  const renderedDuration = parseFloat(execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outFile}"`,
    {encoding: 'utf8'},
  ).trim());
  const expectedDuration = compositionFramesForSegments(script.segments, 30) / 30;
  if (!Number.isFinite(renderedDuration) || renderedDuration <= 0) {
    throw new Error(`Rendered MP4 has invalid duration: ${renderedDuration}`);
  }
  if (Math.abs(renderedDuration - expectedDuration) > 1) {
    throw new Error(`Rendered duration ${renderedDuration.toFixed(2)}s does not match expected ${expectedDuration.toFixed(2)}s`);
  }

  const meta = {
    slug,
    renderedAt: new Date().toISOString(),
    hookType: detectHookType(hookText),
    segmentCount: script.segments.length,
    scriptDuration: script.totalDuration,
    renderedDuration,
    scriptHash: createHash('sha256').update(JSON.stringify(script)).digest('hex'),
    voice,
    captionMode: captionResult.meta.mode,
    musicTrack,
    photosUsed: Object.keys(media).length,
  };
  writeFileSync(join(videoDir, 'out', slug, 'render-meta.json'), JSON.stringify(meta, null, 2));

  console.log(`\n✓ Render complete: ${outFile}\n`);
}

const postArg = process.argv.find(a => a.startsWith('--post='));
const musicArg = process.argv.find(a => a.startsWith('--music='));
const reelArg = process.argv.find(a => a.startsWith('--reel='));
const voiceArg = process.argv.find(a => a.startsWith('--voice='));
if (!postArg) { console.error('Usage: node render.mjs --post=<slug> [--reel=N] [--music=ambient-02.mp3] [--voice=chatterbox|zoe|coqui]'); process.exit(1); }
acquireRenderLock();
renderPost(
  postArg.replace('--post=', ''),
  musicArg?.replace('--music=', '') || undefined,
  reelArg?.replace('--reel=', '') ?? null,
  voiceArg?.replace('--voice=', '') || 'chatterbox',
);
