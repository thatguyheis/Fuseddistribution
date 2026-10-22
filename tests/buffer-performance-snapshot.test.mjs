import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  classifySnapshotFailure,
  activeBufferRateLimit,
  derivePerformance,
  postSlugIndex,
  retryTransient,
  summarizeSnapshot,
  writeUnavailableCheckpoint,
} from '../scripts/buffer-performance-snapshot.mjs';

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

test('writes a dated unavailable checkpoint without inventing performance values', () => {
  const { checkpoint, path } = writeUnavailableCheckpoint({
    date: '2099-01-01',
    capturedAt: '2099-01-01T12:00:00.000Z',
    directory: mkdtempSync(join(tmpdir(), 'buffer-metrics-test-')),
  });
  assert.match(path, /2099-01-01\.unavailable\.json$/);
  assert.equal(checkpoint.status, 'unavailable');
  assert.equal(checkpoint.reason, 'snapshot_fetch_failed');
  assert.equal(checkpoint.failureClass, 'unknown');
  assert.match(checkpoint.evidencePolicy, /not treat this checkpoint as zero/i);
});

test('honors an active Buffer rate-limit checkpoint without exposing its reason', () => {
  const directory = mkdtempSync(join(tmpdir(), 'buffer-rate-limit-test-'));
  const checkpointPath = join(directory, 'buffer-live-unavailable.json');
  writeFileSync(checkpointPath, JSON.stringify({
    status: 'unavailable',
    provider: 'buffer',
    reason: 'Buffer HTTP 429 token=secret',
    retryAt: '2099-01-01T01:00:00.000Z',
  }));
  assert.equal(activeBufferRateLimit({
    checkpointPath,
    now: new Date('2099-01-01T00:00:00.000Z'),
  }), '2099-01-01T01:00:00.000Z');
  assert.equal(activeBufferRateLimit({
    checkpointPath,
    now: new Date('2099-01-01T02:00:00.000Z'),
  }), null);
});

test('classifies snapshot failures without retaining sensitive error details', () => {
  assert.equal(classifySnapshotFailure(new TypeError('fetch failed')), 'transient_network');
  assert.equal(classifySnapshotFailure(new Error('Buffer HTTP 401')), 'authentication_or_authorization');
  assert.equal(classifySnapshotFailure(new Error('BUFFER_ACCESS_TOKEN is not configured.')), 'configuration');
  assert.equal(classifySnapshotFailure(new Error('unexpected proxy response with token=secret')), 'unknown');
});

test('exact post IDs attribute linkless captions without fuzzy guesses or ambiguous matches', () => {
  const index = postSlugIndex([{scheduled:[{postId:'one',slug:'known-topic'},{postId:'two',slug:'first-topic'}]}, {scheduled:[{postId:'two',slug:'second-topic'}]}]);
  assert.equal(index.get('one'),'known-topic'); assert.equal(index.has('two'),false);
  const row = derivePerformance({id:'one',text:'Link in profile',metrics:[]},'2026-10-05T12:00:00Z',index);
  assert.equal(row.slug,'known-topic'); assert.equal(row.slugSource,'exact_buffer_post_id');
});
