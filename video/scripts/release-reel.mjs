import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertRenderedReelAudioCleared, repoRoot } from './audio-rights.mjs';
import { compositionFramesForSegments } from './transition-timing.mjs';

function readJson(path, errors, label) {
  if (!existsSync(path)) {
    errors.push(`missing ${label}: ${path}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`invalid ${label}: ${error.message}`);
    return null;
  }
}

function mediaDuration(path) {
  try {
    return Number(execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path],
      { encoding: 'utf8' },
    ).trim());
  } catch {
    return NaN;
  }
}

export function evaluateReelRelease(slug, options = {}) {
  const root = options.root ?? repoRoot;
  const outDir = join(root, 'video', 'out', slug);
  const errors = [];
  const warnings = [];
  const script = readJson(join(outDir, 'script.json'), errors, 'render script');
  const meta = readJson(join(outDir, 'render-meta.json'), errors, 'render metadata');
  const timing = readJson(join(outDir, 'audio-timing.json'), errors, 'audio timing');
  const captions = readJson(join(outDir, 'captions-meta.json'), errors, 'caption metadata');
  const videoPath = join(outDir, `${slug}.mp4`);
  if (!existsSync(videoPath)) errors.push(`missing rendered MP4: ${videoPath}`);

  if (script) {
    const expected = compositionFramesForSegments(script.segments, 30) / 30;
    const duration = mediaDuration(videoPath);
    if (!Number.isFinite(duration) || duration <= 0) errors.push('MP4 has an invalid duration');
    else if (Math.abs(duration - expected) > 1) errors.push(`MP4 duration ${duration.toFixed(2)}s does not match expected ${expected.toFixed(2)}s`);
    if (duration < 100 || duration > 240) errors.push(`rendered duration ${duration.toFixed(2)}s is outside the 100-240s long-form standard`);
  }

  if (script && timing) {
    const spoken = Number(timing.totalNarrationSeconds);
    const expectedNonSpeech = (script.segments.length - 1) * Number(timing.dialogueGapSeconds) + Number(timing.finalCardPadSeconds);
    const renderedDuration = compositionFramesForSegments(script.segments, 30) / 30;
    if (!Number.isFinite(spoken)) errors.push('audio timing has no total narration duration');
    else if (Math.abs((renderedDuration - spoken) - expectedNonSpeech) > 0.35) {
      errors.push('rendered timeline contains more non-speech time than the approved dialogue gaps allow');
    }
  }

  try {
    assertRenderedReelAudioCleared(slug, { repoRoot: root });
  } catch (error) {
    errors.push(error.message);
  }
  if (meta?.musicTrack !== 'none' && meta?.musicMix?.relativeGain !== 0.2) {
    errors.push('render metadata does not record the approved 20% narration-relative music gain');
  }
  if (!captions?.mode || captions.mode === 'none') errors.push('captions are missing');
  if (captions?.mode === 'proportional' || captions?.mode === 'mixed') {
    warnings.push(`captions are ${captions.mode}; a three-point manual sync review is required before posting`);
  }

  return { slug, pass: errors.length === 0, errors, warnings, generatedAt: new Date().toISOString() };
}

function main() {
  const post = process.argv.find((arg) => arg.startsWith('--post='));
  if (!post) throw new Error('Usage: node scripts/release-reel.mjs --post=<slug> [--manual-caption-review]');
  const slug = post.slice('--post='.length);
  const release = evaluateReelRelease(slug);
  const manualCaptionReview = process.argv.includes('--manual-caption-review');
  const result = {
    ...release,
    manualCaptionReview,
    readyForPosting: release.pass && manualCaptionReview,
  };
  const outPath = join(repoRoot, 'video', 'out', slug, 'release-qa.json');
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
  for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
  for (const error of result.errors) console.error(`ERROR: ${error}`);
  console.log(`[reel-release] ${result.readyForPosting ? 'READY' : result.pass ? 'REVIEW REQUIRED' : 'BLOCKED'}: ${resolve(outPath)}`);
  process.exit(result.pass ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`[reel-release] ${error.message}`); process.exit(1); }
}
