import {approveGeneratedBackgroundsForReel} from './generated-background-library.mjs';
import {approveStockMediaForReel} from './stock-media-library.mjs';
import { engagementErrors } from './engagement-policy.mjs';
import {assertVisualReview} from './lib/visual-review.mjs';
import { assertApprovedSources } from './approved-sources.mjs';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { assertRenderedReelAudioCleared, repoRoot } from './audio-rights.mjs';
import { compositionFramesForSegments } from './transition-timing.mjs';
import { auditCaptionSync } from './auto-caption-review.mjs';

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

export function coinHistoryQuestionError(root, slug, script) {
  const approval = join(root, 'content', 'coin-history', slug, 'script-approval.json');
  if (!existsSync(approval)) return null;
  return script?.segments?.at(-1)?.type === 'question'
    ? null
    : 'coin-history reel must end with a spoken question card';
}

export function evaluateReelRelease(slug, options = {}) {
  const root = options.root ?? repoRoot;
  const outDir = join(root, 'video', 'out', slug);
  const errors = [];
  const warnings = [];
  try { assertApprovedSources(root, slug); } catch(error) { errors.push(error.message); }
  const visualReviewPath = join(outDir, 'visual-review.json');
  if (existsSync(visualReviewPath)) {
    const visualReview = readJson(visualReviewPath, errors, 'visual review');
    if (visualReview?.pass !== true) errors.push('owner visual review blocks distribution; repair and inspect the new rendered frames');
  }
  const script = readJson(join(outDir, 'script.json'), errors, 'render script');
  if (script) {
    const questionError = coinHistoryQuestionError(root, slug, script);
    if (questionError) errors.push(questionError);
  }
  const meta = readJson(join(outDir, 'render-meta.json'), errors, 'render metadata');
  if (meta?.renderPipelineVersion >= 2 || meta?.openingHero) {
    try {
      const articleDir = join(root, 'public/blog', slug);
      const props = JSON.parse(readFileSync(join(outDir, 'render-props.json'), 'utf8'));
      let expectedPath = join(articleDir, 'hero.jpg');
      let expectedSource = 'editorial-hero';
      const sourceManifestPath = join(articleDir, 'image-sources.json');
      if (['owner-coin-evidence', 'verified-coin-evidence'].includes(meta.openingHero?.role)) {
        const sources = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
        const asset = sources.assets?.find(item => item.role === 'coin evidence'
          && (meta.openingHero?.role === 'owner-coin-evidence'
            ? item.sourceType === 'owner-supplied'
            : item.sourceType === 'Wikimedia Commons'
              && item.page?.startsWith('https://commons.wikimedia.org/wiki/File:')
              && /public domain/i.test(item.license || '')));
        if (!asset) throw new Error('verified coin evidence is missing from image sources');
        expectedPath = join(articleDir, asset.path);
        if (createHash('sha256').update(readFileSync(expectedPath)).digest('hex') !== asset.sha256) {
          throw new Error('coin evidence hash does not match its source manifest');
        }
        expectedSource = meta.openingHero.role;
      }
      const heroHash = createHash('sha256').update(readFileSync(expectedPath)).digest('hex');
      const stagedName = ['owner-coin-evidence', 'verified-coin-evidence'].includes(meta.openingHero?.role)
        ? `${slug}-coin-evidence.jpg` : `${slug}.jpg`;
      const stagedHash = createHash('sha256').update(readFileSync(join(root, 'video/public/heroes', stagedName))).digest('hex');
      if (stagedHash !== heroHash || meta.openingHero?.sha256 !== heroHash || props.openingHero?.sha256 !== heroHash ||
          meta.openingHero?.role !== expectedSource || props.openingHero?.role !== expectedSource ||
          props.openingHero?.src !== `heroes/${stagedName}`) {
        errors.push('opening cover must use the current approved editorial hero or verified owner coin evidence');
      }
    } catch (error) { errors.push(`opening hero verification failed: ${error.message}`); }
  }
  const timing = readJson(join(outDir, 'audio-timing.json'), errors, 'audio timing');
  const captions = readJson(join(outDir, 'captions-meta.json'), errors, 'caption metadata');
  const videoPath = join(outDir, `${slug}.mp4`);
  if (!existsSync(videoPath)) errors.push(`missing rendered MP4: ${videoPath}`);
  else if (statSync(videoPath).size >= 50_000_000) errors.push('rendered MP4 must remain below the 50 MB upload limit');

  if (script) {
    errors.push(...engagementErrors(script));
    const expected = compositionFramesForSegments(script.segments, 30) / 30;
    const duration = mediaDuration(videoPath);
    if (!Number.isFinite(duration) || duration <= 0) errors.push('MP4 has an invalid duration');
    else if (Math.abs(duration - expected) > 1) errors.push(`MP4 duration ${duration.toFixed(2)}s does not match expected ${expected.toFixed(2)}s`);
    if (duration < 100 || duration > 135) errors.push(`rendered duration ${duration.toFixed(2)}s is outside the 100-135s distribution standard; preserve the complete narration and repair before release`);
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
  let narrationFirstApproval = null;
  if (meta?.musicTrack === 'none') {
    narrationFirstApproval = readJson(join(outDir, 'narration-first-approval.json'), errors, 'narration-first approval');
    if (narrationFirstApproval && (narrationFirstApproval.slug !== slug || narrationFirstApproval.approved !== true ||
        !Number.isFinite(Date.parse(narrationFirstApproval.approvedAt)) || !narrationFirstApproval.reason?.trim())) {
      errors.push('no-music distribution requires a recorded owner narration-first approval');
    }
  }
  if (meta?.musicTrack !== 'none' && meta?.musicMix?.relativeGain !== 0.2) {
    errors.push('render metadata does not record the approved 20% narration-relative music gain');
  }
  if (!captions?.mode || captions.mode === 'none') errors.push('captions are missing');
  if (captions?.mode === 'proportional' || captions?.mode === 'mixed') {
    warnings.push(`captions are ${captions.mode}; automated three-point sync coverage is required before posting`);
  }

  let visualReviewPassed=false;
  let ownerReviewed=false;
  try {
    const review=assertVisualReview(root,slug);
    visualReviewPassed=true;
    ownerReviewed=review.reviewer!=='automated-local-vision-v1';
  } catch {warnings.push('Distribution requires current hash-bound encoded visual review.');}
  return { slug, pass: errors.length === 0, automatedChecksPassed:errors.length===0, distributionReady:errors.length===0&&visualReviewPassed, visualReviewPassed, ownerReviewed, narrationFirstApproval, errors, warnings, generatedAt: new Date().toISOString() };
}

function main() {
  const post = process.argv.find((arg) => arg.startsWith('--post='));
  if (!post) throw new Error('Usage: node scripts/release-reel.mjs --post=<slug> [--manual-caption-review]');
  const slug = post.slice('--post='.length);
  const release = evaluateReelRelease(slug);
  const manualCaptionReview = process.argv.includes('--manual-caption-review');
  let captionReview = null;
  if (release.pass && !manualCaptionReview) {
    try { captionReview = auditCaptionSync(slug); } catch (error) { captionReview = { pass: false, errors: [error.message] }; }
  }
  if (captionReview) writeFileSync(join(repoRoot, 'video', 'out', slug, 'caption-review.json'), `${JSON.stringify(captionReview, null, 2)}\n`);
  const result = {
    ...release,
    manualCaptionReview,
    automatedCaptionReview: captionReview,
    readyForPosting: release.distributionReady && (manualCaptionReview || captionReview?.pass === true),
  };
  if (result.readyForPosting) {
    approveStockMediaForReel(repoRoot, slug);
    approveGeneratedBackgroundsForReel(repoRoot, slug);
  }
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
