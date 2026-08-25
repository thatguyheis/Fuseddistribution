import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHygieneReport,
  classifyProtocol,
  forbiddenArtifact,
  groupProtocolFiles,
  recommendedCommitTags,
} from '../scripts/worktree-hygiene.mjs';

test('tags blog, reel, and ADA files with the governing protocol', () => {
  assert.equal(classifyProtocol('public/blog/example/index.html'), 'blog');
  assert.equal(classifyProtocol('video/out/example/render-meta.json'), 'reel');
  assert.equal(classifyProtocol('ops/profit-system/evolution/generations/ADA-TEST.json'), 'ada');
});

test('blocks reproducible and local-only artifacts from Git', () => {
  assert.equal(forbiddenArtifact('video/public/videos/example/segment-1.mp4')?.reason, 'reel-media-cache');
  assert.equal(forbiddenArtifact('video/local/generated-backgrounds/catalog.json')?.reason, 'local-generated-library');
  assert.equal(forbiddenArtifact('video/.env.cron.example'), null);
  assert.equal(forbiddenArtifact('video/.env')?.reason, 'local-environment');
  assert.equal(forbiddenArtifact('public/blog/example/index.html'), null);
});

test('produces deterministic protocol tags for mixed work', () => {
  const groups = groupProtocolFiles([
    'video/scripts/render.mjs',
    'public/blog/example/index.html',
    'ops/profit-system/evolution/generations/ADA-TEST.json',
  ]);
  assert.deepEqual(recommendedCommitTags(groups), ['ada', 'blog', 'reel']);
});

test('blocks staged snapshots above the review limit', () => {
  const report = buildHygieneReport({
    files: ['public/blog/a/index.html', 'public/blog/b/index.html'],
    staged: true,
    maxFiles: 1,
  });
  assert.equal(report.approved, false);
  assert.match(report.issues[0], /review limit/);
});
