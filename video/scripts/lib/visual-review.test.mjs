import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertVisualReview} from './visual-review.mjs';

const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'visual-review-'));
  const slug = 'sample-reel';
  const dir = join(root, 'video/out', slug);
  mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, `${slug}.mp4`), 'encoded-video');
  writeFileSync(join(dir, 'visual-review-contact-sheet.jpg'), 'contact-sheet');
  const contactSheetSha256 = digest(join(dir, 'visual-review-contact-sheet.jpg'));
  const videoSha256 = digest(join(dir, `${slug}.mp4`));
  const review = {
    slug, pass: true, reviewer: 'automated-local-vision-v1',
    policy: 'encoded-contact-sheet-visual-qa-v1', model: 'gemma3:4b',
    reviewedAt: new Date().toISOString(), videoSha256, contactSheetSha256,
    issues: [], frames: Array.from({length: 6}, (_, index) => ({
      sampleSeconds: index * 20, pass: true, contactSheetSha256,
    })),
  };
  writeFileSync(join(dir, 'visual-review.json'), JSON.stringify(review));
  return {root, dir, slug, review};
}

test('accepts local visual QA only when the sampled frames and encoded reel hashes match', () => {
  const value = fixture();
  try {
    assert.doesNotThrow(() => assertVisualReview(value.root, value.slug));
    writeFileSync(join(value.dir, 'visual-review-contact-sheet.jpg'), 'changed contact sheet');
    assert.throws(() => assertVisualReview(value.root, value.slug), /visual review is missing, blocked or stale/);
  } finally {
    rmSync(value.root, {recursive: true, force: true});
  }
});

test('accepts six individually reviewed full resolution frames from the local visual model', () => {
  const value = fixture();
  try {
    value.review.policy = 'encoded-full-resolution-frame-visual-qa-v2';
    value.review.frames = Array.from({length: 6}, (_, index) => ({
      sampleSeconds: index * 10, pass: true, issues: [], summary: 'No defects visible',
    }));
    writeFileSync(join(value.dir, 'visual-review.json'), JSON.stringify(value.review));
    assert.doesNotThrow(() => assertVisualReview(value.root, value.slug));
  } finally {
    rmSync(value.root, {recursive: true, force: true});
  }
});

test('rejects a failed automated visual review', () => {
  const value = fixture();
  try {
    value.review.pass = false;
    value.review.issues = ['Text is clipped'];
    writeFileSync(join(value.dir, 'visual-review.json'), JSON.stringify(value.review));
    assert.throws(() => assertVisualReview(value.root, value.slug), /visual review is missing, blocked or stale/);
  } finally {
    rmSync(value.root, {recursive: true, force: true});
  }
});

test('continues to accept current legacy owner reviews', () => {
  const value = fixture();
  try {
    writeFileSync(join(value.dir, 'visual-review.json'), JSON.stringify({
      slug: value.slug, pass: true, reviewedAt: new Date().toISOString(),
      videoSha256: value.review.videoSha256, frames: [{}, {}, {}],
    }));
    assert.doesNotThrow(() => assertVisualReview(value.root, value.slug));
  } finally {
    rmSync(value.root, {recursive: true, force: true});
  }
});
