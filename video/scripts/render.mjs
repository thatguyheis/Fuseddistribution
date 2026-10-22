import {processIsAlive} from './process-liveness.mjs';
import {stagePresentation} from './presentation-plan.mjs';
import {stageSupportingCutaways} from './owned-media.mjs';
import { assertApprovedSources } from './approved-sources.mjs';
import { stageOpeningHero } from './opening-hero.mjs';
import { repairScript } from './repair-reel-scripts.mjs';
import { execSync, spawnSync } from 'node:child_process';
import { audioCacheKey } from './generate-audio.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchMedia } from './fetch-media.mjs';
import { generateCaptions, assertWhisperRuntime } from './generate-captions.mjs';
import { formatValidationResult, validateReelScript } from './validate-reel.mjs';
import { createHash } from 'node:crypto';
import { compositionFramesForSegments } from './transition-timing.mjs';
import { assertMusicTrackCleared, normalizeMusicTrack, selectTrustedCycleTrack } from './audio-rights.mjs';
import { collectAudioDurations, retimeScriptToAudio, writeAudioTiming } from './audio-timing.mjs';
import { musicMixForTrack } from './music-mix.mjs';
import { loadOrBuildProductionStoryboard } from './production-storyboard.mjs';
import { applyCaptionCorrections } from './lib/caption-corrections.mjs';
import { fitUploadSize } from './fit-upload-size.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = join(__dirname, '..');
const renderLockDir = '/tmp/fused-remotion-render.lock';

function acquireRenderLock() {
  if (existsSync(renderLockDir)) {
    let ownerPid = null;
    try { ownerPid = Number(readFileSync(join(renderLockDir, 'pid'), 'utf8').trim()); } catch {}
    const ownerAlive = processIsAlive(ownerPid);
    if (ownerAlive) {
      throw new Error(`Another Remotion render is active (pid ${ownerPid}). Wait for it to finish.`);
    }
    rmSync(renderLockDir, {recursive: true, force: true});
  }
  mkdirSync(renderLockDir);
  writeFileSync(join(renderLockDir, 'pid'), String(process.pid));
  const release = () => {
    let ownerPid = null;
    try { ownerPid = Number(readFileSync(join(renderLockDir, 'pid'), 'utf8').trim()); } catch {}
    if (ownerPid === process.pid) rmSync(renderLockDir, {recursive: true, force: true});
  };
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

function summarizeMedia(media) {
  const entries = Object.values(media);
  const sourceCounts = {};
  for (const entry of entries) {
    sourceCounts[entry.source ?? 'unknown'] = (sourceCounts[entry.source ?? 'unknown'] ?? 0) + 1;
  }
  return {
    mediaUsed: entries.length,
    photoCount: entries.filter((entry) => entry.type === 'photo').length,
    videoCount: entries.filter((entry) => entry.type === 'video').length,
    mediaSources: sourceCounts,
  };
}

async function renderPost(slug, musicTrack = 'none', reelN = null, voice = 'chatterbox') {
  assertWhisperRuntime(process.env.WHISPER_RUNTIME_CONFIG);
  // Production defaults apply to manual renders too; explicit incident overrides win.
  process.env.GENERATIVE_MEDIA_ENABLED ??= '1';
  process.env.GENERATIVE_MEDIA_MODE ??= 'production';
  process.env.GENERATIVE_MEDIA_PRODUCTION_APPROVED ??= '1';
  const approvedSourceHashes = assertApprovedSources(join(videoDir, '..'), slug);
  const openingHero = stageOpeningHero(join(videoDir, '..'), slug, approvedSourceHashes['hero.jpg']);
  const startedAt = performance.now();
  musicTrack = musicTrack === 'cycle' ? selectTrustedCycleTrack(slug) : normalizeMusicTrack(musicTrack);
  const reelLabel = reelN ? ` (reel ${reelN})` : '';
  console.log(`\n=== Blog Reel Renderer: ${slug}${reelLabel} ===\n`);
  assertFdHeadroom();
  const musicRights = assertMusicTrackCleared(musicTrack);

  // 1. Parse
  const reelFlag = reelN ? ` --reel=${reelN}` : '';
  run(`node scripts/parse-script.mjs --post=${slug}${reelFlag}`);
  const scriptPath = join(videoDir, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) {
    console.error('Parse failed — script.json not found.'); process.exit(1);
  }
  let script = repairScript(JSON.parse(readFileSync(scriptPath, 'utf8'))).repaired;
  writeFileSync(scriptPath, JSON.stringify(script, null, 2) + '\n');

  const validation = validateReelScript(script);
  const validationOutput = formatValidationResult(validation);
  if (validationOutput) console.log(`\n${validationOutput}`);
  if (validation.errors.length > 0) {
    console.error('\nReel validation failed — fix reel-script.md before audio/render.');
    process.exit(1);
  }

  const presentationPackage = process.argv.includes('--quality=presentation') ? stagePresentation(join(videoDir,'..'),slug,script.segments.length) : null;

  // Gate every entry point, including manual/one-shot renders. Fully cached
  // narration can still be used while the synthesis runtime is held.
  const audioDirectory = join(videoDir, 'public/audio', slug);
  let audioManifest = {};
  try { audioManifest = JSON.parse(readFileSync(join(audioDirectory,'audio-manifest.json'))); } catch {}
  const needsSynthesis = script.segments.some((segment,index) => segment.narration &&
    (!existsSync(join(audioDirectory,`segment-${index}.m4a`)) ||
     audioManifest.segments?.[index]?.hash !== audioCacheKey(segment.narration,voice)));
  const circuit = action => spawnSync('python3',[join(videoDir,'../scripts/tts-circuit.py'),action,`--voice=${voice}`],{stdio:'inherit'}).status;
  if (needsSynthesis && circuit('check') !== 0 && !process.argv.includes('--supervised-tts-recovery')) throw new Error('TTS runtime is held; supervised recovery required');
  try {
    if (needsSynthesis) run(`node scripts/generate-audio.mjs --post=${slug} --voice=${voice} --preflight-only`);
    run(`node scripts/generate-audio.mjs --post=${slug} --voice=${voice}`);
    if (needsSynthesis) circuit('success');
  } catch(error) {
    if (needsSynthesis) circuit('failure');
    throw new Error(`TTS_PREFLIGHT_FAILED: ${error.message}`);
  }

  const presentationAudio = {};
  if (presentationPackage) {
    for (const [index, segment] of script.segments.entries()) {
      if (!segment.narration) continue;
      const metadata = JSON.parse(readFileSync(join(audioDirectory,`segment-${index}.m4a.source.json`),'utf8'));
      const bytes = readFileSync(metadata.losslessMaster);
      if (createHash('sha256').update(bytes).digest('hex') !== metadata.sha256) throw new Error('Lossless narration master changed');
      copyFileSync(metadata.losslessMaster,join(audioDirectory,`segment-${index}.wav`));
      presentationAudio[index] = {sha256:metadata.sha256,format:'lossless-wav',nativeRatePreserved:true};
    }
  }

  // 2b. The written script contains only a pre-TTS estimate. Chatterbox pace
  // varies by sentence, so production timing is rebuilt from the actual audio
  // files before captions, media, or Remotion see the timeline.
  const audioDurations = collectAudioDurations(videoDir, slug, script.segments.length);
  const retimed = retimeScriptToAudio(script, audioDurations);
  script = retimed.script;
  writeFileSync(scriptPath, `${JSON.stringify(script, null, 2)}\n`);
  writeAudioTiming(join(videoDir, 'out', slug, 'audio-timing.json'), retimed.timing);
  const timedValidation = validateReelScript(script, { audioDurations });
  const timedValidationOutput = formatValidationResult(timedValidation);
  if (timedValidationOutput) console.log(`\n${timedValidationOutput}`);
  if (timedValidation.errors.length > 0) {
    console.error('\nMeasured audio timing failed validation.');
    process.exit(1);
  }


  // 3. Media. Stock APIs are best-effort; local copied blog images are the
  // required fallback. Rendering without media is a production failure.
  console.log('\n→ fetch-media.mjs');
  const media = presentationPackage?.media ?? stageSupportingCutaways(join(videoDir, '..'), slug, await fetchMedia(slug));
  const missingMedia = script.segments
    .map((_, index) => index)
    .filter((index) => !media[index]);
  if (missingMedia.length > 0) {
    throw new Error(`Missing media for segment(s): ${missingMedia.join(', ')}`);
  }
  const mediaSummary = summarizeMedia(media);

  // 3b. Local Whisper failures stop production; no silent estimated timing.
  console.log('\n→ generate-captions.mjs');
  const captionResult = await generateCaptions(slug,{runtimeConfig:process.env.WHISPER_RUNTIME_CONFIG});
  let captions = captionResult.captions;
  let captionTextReview = null;
  const correctionPath = join(videoDir, '..', 'public/blog', slug, 'caption-corrections.json');
  if (existsSync(correctionPath)) {
    const manifest = JSON.parse(readFileSync(correctionPath, 'utf8'));
    const corrected = applyCaptionCorrections(captions, manifest);
    captions = corrected.captions;
    captionTextReview = corrected.review;
    writeFileSync(join(videoDir, 'out', slug, 'captions.json'), `${JSON.stringify(captions, null, 2)}\n`);
    const reviewedMeta = { ...captionResult.meta, textReviewRequired: false, manualTextReview: captionTextReview };
    writeFileSync(join(videoDir, 'out', slug, 'captions-meta.json'), `${JSON.stringify(reviewedMeta, null, 2)}\n`);
    console.log(`Applied ${captionTextReview.applied.length} transcript-checked caption corrections.`);
  }

  // 4. Music rights were checked before any expensive audio/render work.
  if (musicTrack === 'none') {
    console.log('\n→ music: none (audio-rights policy approved)\n');
  } else {
    console.log(`\n→ music: ${musicTrack} (${musicRights.rights.license}, ${musicRights.rights.sourceName})\n`);
  }
  const musicMix = musicMixForTrack(musicTrack);
  const storyboard = loadOrBuildProductionStoryboard(slug, script, media);

  // 5. Prepare metadata; write it only after the MP4 passes duration checks.
  const hookText = script.segments.find(s => s.type === 'hook')?.text ?? '';

  // 6. Render — write props to file to avoid shell escaping issues
  const outDir = join(videoDir, 'out', slug);
  mkdirSync(outDir, { recursive: true });
  const outFileName = reelN ? `${slug}-reel${reelN}.mp4` : `${slug}.mp4`;
  const outFile = join(outDir, outFileName);
  const propsFile = join(outDir, 'render-props.json');
  writeFileSync(propsFile, JSON.stringify({ script, musicTrack, musicGain: musicMix.gain, media, captions, storyboard, openingHero, presentation: presentationPackage?.presentation }));
  writeFileSync(join(outDir, 'storyboard.json'), `${JSON.stringify(storyboard, null, 2)}\n`);
  if (process.argv.includes('--prepare-only')) { console.log('Prepared narration, captions and render props for review.'); return; }
  const qualityFlags = presentationPackage ? ' --image-format=png --crf=20 --x264-preset=slow --audio-bitrate=192k --pixel-format=yuv420p' : '';
  run(`npx remotion render src/Root.tsx BlogReel --concurrency=1 --props="${propsFile}" "${outFile}"${qualityFlags}`);
  if (statSync(outFile).size >= 45_000_000) {
    console.log('\n→ fitting rendered MP4 to the upload budget');
    const fit = fitUploadSize({input: outFile});
    console.log(`Size fit: ${fit.sourceBytes} → ${fit.outputBytes} bytes; original preserved at ${fit.preservedOriginal}`);
  }

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
    renderPipelineVersion: 2,
    presentationPlanSha256: presentationPackage?.planSha256,
    qualityProfile: presentationPackage ? 'presentation-720p-crf20-slow' : 'standard',
    presentationAudio,
    productionMeasurement: {
      wallSeconds: (performance.now() - startedAt) / 1000,
      nodePeakRssKiB: process.resourceUsage().maxRSS,
      memoryScope: 'Node renderer only; excludes child processes and GPU memory',
    },
    renderedAt: new Date().toISOString(),
    hookType: detectHookType(hookText),
    segmentCount: script.segments.length,
    scriptDuration: script.totalDuration,
    renderedDuration,
    approvedSourceHashes,
    openingHero,
    scriptHash: createHash('sha256').update(JSON.stringify(script)).digest('hex'),
    voice,
    captionMode: captionResult.meta.mode,
    captionTextReview,
    musicTrack,
    musicMix,
    audioTiming: retimed.timing,
    musicRights: {
      status: musicRights.status,
      license: musicRights.rights?.license ?? 'not_applicable',
      sourceName: musicRights.rights?.sourceName ?? 'not_applicable',
      sourceUrl: musicRights.rights?.sourceUrl ?? '',
    },
    photosUsed: mediaSummary.mediaUsed,
    ...mediaSummary,
    storyboardRoute: storyboard.route,
    mediaFeatureSegments: storyboard.segments.filter(segment => segment.visual === 'media-feature').map(segment => segment.segmentIndex),
    paperCollageSegments: storyboard.segments.filter((segment) => segment.visual === 'paper-collage' && !['fused-owned-coin-library', 'fused-verified-coin-evidence'].includes(media[segment.segmentIndex]?.source)).map((segment) => segment.segmentIndex),
    ownedLayoutSegments: Object.entries(media).filter(([, entry]) => ['fused-owned-coin-library', 'fused-verified-coin-evidence'].includes(entry.source)).map(([index]) => Number(index)),
  };
  if (JSON.stringify(assertApprovedSources(join(videoDir, '..'), slug)) !== JSON.stringify(approvedSourceHashes)) throw new Error('Approved inputs changed during rendering');
  writeFileSync(join(videoDir, 'out', slug, 'render-meta.json'), JSON.stringify(meta, null, 2));

  console.log(`\n✓ Render complete: ${outFile}\n`);
}

const postArg = process.argv.find(a => a.startsWith('--post='));
const musicArg = process.argv.find(a => a.startsWith('--music='));
const reelArg = process.argv.find(a => a.startsWith('--reel='));
const voiceArg = process.argv.find(a => a.startsWith('--voice='));
if (!postArg) { console.error('Usage: node render.mjs --post=<slug> [--reel=N] [--music=cycle|none|approved-track.mp3] [--voice=chatterbox|chatterbox-standard|zoe|coqui]'); process.exit(1); }
acquireRenderLock();
renderPost(
  postArg.replace('--post=', ''),
  musicArg?.replace('--music=', '') || 'cycle',
  reelArg?.replace('--reel=', '') ?? null,
  voiceArg?.replace('--voice=', '') || 'chatterbox',
);
