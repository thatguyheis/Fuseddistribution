import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { applyDueAt, buildInstagramJob } from '../public/blog/scripts/prepare-buffer-instagram-queue.mjs';

test('Instagram job is an automatic feed-sharing Reel on the verified channel', () => {
  const source = {
    slug: 'useful-guide',
    publicMediaUrl: 'https://cdn.example.com/useful-guide.mp4',
    dueAt: '2026-07-28T13:00:00-07:00',
  };
  const job = buildInstagramJob(source, 'Useful caption #SmallBusiness');
  assert.equal(job.channelId, '6a67c5d64b2d03035f4f0228');
  assert.equal(job.sourceDueAt, source.dueAt);
  assert.deepEqual(job.createPostPayload.metadata.instagram, {
    type: 'reel',
    shouldShareToFeed: true,
    isAiGenerated: true,
  });
  assert.equal(job.createPostPayload.assets[0].video.url, source.publicMediaUrl);
  assert.equal(job.createPostPayload.dueAt, undefined);
});

test('Instagram jobs get a fresh scheduled dueAt when applied', () => {
  const job = buildInstagramJob({
    slug: 'useful-guide',
    publicMediaUrl: 'https://cdn.example.com/useful-guide.mp4',
    dueAt: '2026-07-28T13:00:00-07:00',
  }, 'Useful caption #SmallBusiness');
  const scheduled = applyDueAt(job, new Date('2026-08-04T20:00:00.000Z'));
  assert.equal(scheduled.dueAt, '2026-08-04T13:00:00-07:00');
  assert.equal(scheduled.createPostPayload.dueAt, scheduled.dueAt);
});

test('Instagram planner falls back to verified YouTube checkpoints for catch-up scheduling', () => {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const tempDir = mkdtempSync(join(tmpdir(), 'buffer-instagram-queue-'));
  const sourceQueuePath = join(tempDir, 'source-queue.json');
  const sourceScheduledLogPath = join(tempDir, 'source-scheduled.json');
  const instagramScheduledLogPath = join(tempDir, 'instagram-scheduled.json');
  const outPath = join(tempDir, 'instagram-queue.json');

  writeFileSync(sourceQueuePath, JSON.stringify({
    generatedAt: '2026-08-03T21:34:38.032Z',
    expiresAt: '2026-08-03T22:04:38.032Z',
    selected: [],
  }, null, 2));
  writeFileSync(sourceScheduledLogPath, JSON.stringify({
    scheduled: [
      {
        slug: 'ai-tools-for-small-business-marketing-in-2026',
        postId: 'source-post-1',
        publicMediaUrl: 'https://fuseddistribution.luxraycoco.workers.dev/reels/ai-tools-for-small-business-marketing-in-2026/ai-tools-for-small-business-marketing-in-2026.mp4',
        dueAt: '2026-07-27T21:45:00.000Z',
        status: 'sent',
        verifiedVideoAsset: true,
      },
    ],
  }, null, 2));
  writeFileSync(instagramScheduledLogPath, JSON.stringify({ scheduled: [] }, null, 2));

  const result = spawnSync(process.execPath, [
    'public/blog/scripts/prepare-buffer-instagram-queue.mjs',
    '--current-scheduled=0',
    `--source-queue=${sourceQueuePath}`,
    `--source-scheduled-log=${sourceScheduledLogPath}`,
    `--scheduled-log=${instagramScheduledLogPath}`,
    `--out=${outPath}`,
    '--skip-media-url-verification',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  try {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const queue = JSON.parse(readFileSync(outPath, 'utf8'));
    assert.equal(queue.source.type, 'youtube_scheduled_log');
    assert.equal(queue.selected.length, 1);
    assert.equal(queue.selected[0].slug, 'ai-tools-for-small-business-marketing-in-2026');
    assert.ok(Date.parse(queue.selected[0].dueAt) > Date.now());
    assert.equal(queue.selected[0].createPostPayload.dueAt, queue.selected[0].dueAt);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Instagram planner merges fresh YouTube candidates with deduplicated verified history', () => {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const tempDir = mkdtempSync(join(tmpdir(), 'buffer-instagram-merge-'));
  const sourceQueuePath = join(tempDir, 'source-queue.json');
  const sourceScheduledLogPath = join(tempDir, 'source-scheduled.json');
  const instagramScheduledLogPath = join(tempDir, 'instagram-scheduled.json');
  const outPath = join(tempDir, 'instagram-queue.json');
  const queuedSlug = 'ai-tools-for-small-business-marketing-in-2026';
  const historySlug = 'call-to-action-best-practices-for-small-business-websit';
  const mediaUrl = (slug) => `https://cdn.example.com/${slug}.mp4`;

  writeFileSync(sourceQueuePath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    selected: [{ slug: queuedSlug, publicMediaUrl: mediaUrl(queuedSlug) }],
  }, null, 2));
  writeFileSync(sourceScheduledLogPath, JSON.stringify({
    scheduled: [
      { slug: queuedSlug, publicMediaUrl: mediaUrl(queuedSlug), status: 'sent', verifiedVideoAsset: true },
      { slug: historySlug, publicMediaUrl: mediaUrl(historySlug), status: 'sent', verifiedVideoAsset: true },
    ],
  }, null, 2));
  writeFileSync(instagramScheduledLogPath, JSON.stringify({ scheduled: [] }, null, 2));

  const result = spawnSync(process.execPath, [
    'public/blog/scripts/prepare-buffer-instagram-queue.mjs',
    '--current-scheduled=0',
    '--platform-count=1',
    '--max-posts=2',
    `--source-queue=${sourceQueuePath}`,
    `--source-scheduled-log=${sourceScheduledLogPath}`,
    `--scheduled-log=${instagramScheduledLogPath}`,
    `--out=${outPath}`,
    '--skip-media-url-verification',
  ], { cwd: repoRoot, encoding: 'utf8' });

  try {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const queue = JSON.parse(readFileSync(outPath, 'utf8'));
    assert.equal(queue.source.type, 'youtube_queue_plus_scheduled_log');
    assert.deepEqual(queue.selected.map((job) => job.slug), [queuedSlug, historySlug]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
