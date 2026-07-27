import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInstagramJob } from '../public/blog/scripts/prepare-buffer-instagram-queue.mjs';

test('Instagram job is an automatic feed-sharing Reel on the verified channel', () => {
  const source = {
    slug: 'useful-guide',
    publicMediaUrl: 'https://cdn.example.com/useful-guide.mp4',
    dueAt: '2026-07-28T13:00:00-07:00',
  };
  const job = buildInstagramJob(source, 'Useful caption #SmallBusiness');
  assert.equal(job.channelId, '6a67c5d64b2d03035f4f0228');
  assert.deepEqual(job.createPostPayload.metadata.instagram, {
    type: 'reel',
    shouldShareToFeed: true,
    isAiGenerated: true,
  });
  assert.equal(job.createPostPayload.assets[0].video.url, source.publicMediaUrl);
  assert.equal(job.createPostPayload.dueAt, source.dueAt);
});
