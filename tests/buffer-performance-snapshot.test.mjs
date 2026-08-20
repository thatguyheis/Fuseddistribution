import test from 'node:test';
import assert from 'node:assert/strict';
import { derivePerformance, retryTransient, summarizeSnapshot } from '../scripts/buffer-performance-snapshot.mjs';

test('derives average view duration from total watched minutes and views', () => {
  const post = derivePerformance({
    id: 'post-1',
    text: 'Read https://fuseddistribution.com/blog/useful-guide/',
    channelService: 'youtube',
    channelId: 'channel-1',
    sentAt: '2026-07-24T12:00:00.000Z',
    metricsUpdatedAt: '2026-07-27T00:00:00.000Z',
    metrics: [
      { type: 'views', value: 120 },
      { type: 'impressions', value: 240 },
      { type: 'totalTimeWatched', value: 60 },
    ],
  }, '2026-07-27T12:00:00.000Z');
  assert.equal(post.slug, 'useful-guide');
  assert.equal(post.ageBucket, 'd3');
  assert.equal(post.averageViewDurationSeconds, 30);
  assert.equal(post.impressionsPerHour, 3.3333);
});

test('does not invent view duration when Buffer omits watch time', () => {
  const post = derivePerformance({
    id: 'post-2', text: 'No link', channelService: 'twitter', channelId: 'channel-2',
    sentAt: '2026-07-27T11:00:00.000Z', metrics: [{ type: 'views', value: 12 }],
  }, '2026-07-27T12:00:00.000Z');
  assert.equal(post.averageViewDurationSeconds, null);
  assert.equal(summarizeSnapshot([post]).metricsAvailable, 1);
});

test('retries transient Buffer failures before accepting a snapshot failure', async () => {
  let attempts = 0;
  const result = await retryTransient(async () => {
    attempts += 1;
    if (attempts < 3) throw new TypeError('fetch failed');
    return 'snapshot';
  });
  assert.equal(result, 'snapshot');
  assert.equal(attempts, 3);
});

test('does not retry a non-transient Buffer failure', async () => {
  let attempts = 0;
  await assert.rejects(
    retryTransient(async () => {
      attempts += 1;
      throw new Error('Buffer HTTP 401');
    }),
    /Buffer HTTP 401/,
  );
  assert.equal(attempts, 1);
});
