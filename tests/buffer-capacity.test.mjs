import test from 'node:test';
import assert from 'node:assert/strict';
import { assertScheduledCapacity, calculatePlatformCapacity, channelScheduledCount, BUFFER_CHANNEL_QUEUE_TARGET } from '../public/blog/scripts/lib/buffer-capacity.mjs';
import { nextScheduleDates } from '../public/blog/scripts/prepare-buffer-youtube-queue.mjs';
import { validateCutdownDuration } from '../public/blog/scripts/lib/buffer-video-integrity.mjs';

test('each channel has nine usable slots regardless of other platform count', () => {
  const allocation = calculatePlatformCapacity({
    limit: 10,
    currentScheduled: 0,
    reserveSlots: 1,
    platformCount: 3,
  });
  assert.equal(allocation.perPlatformCapacity, 9);
});

test('existing posts reduce only the target channel allocation', () => {
  const allocation = calculatePlatformCapacity({
    limit: 10,
    currentScheduled: 4,
    reserveSlots: 1,
    platformCount: 3,
  });
  assert.equal(allocation.perPlatformCapacity, 5);
});

test('provider cap permits the tenth post but blocks an eleventh', () => {
  assert.doesNotThrow(() => assertScheduledCapacity(9));
  assert.throws(() => assertScheduledCapacity(10), /cap reached \(10\/10\)/);
});

test('same-day rolling schedule never moves excess jobs into tomorrow', () => {
  const args = {
    scheduleWindowStart: { hour: 17, minute: 0 },
    scheduleWindowEnd: { hour: 23, minute: 59 },
    scheduleIntervalMinutes: 240,
    sameDayOnly: true,
  };
  const dates = nextScheduleDates(3, args, new Date('2026-08-05T16:30:00-07:00'));
  assert.deepEqual(dates.map((date) => date.toISOString()), [
    '2026-08-06T00:00:00.000Z',
    '2026-08-06T04:00:00.000Z',
  ]);
});

test('X media integrity rejects a decodable but truncated cutdown', () => {
  const result = validateCutdownDuration({
    sourceDuration: 182.485,
    outputDuration: 0.333,
    maximumDuration: 135,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'output_truncated');
  assert.equal(result.minimumDuration, 134);
});

test('X queue integrity separates the 135-second cut target from the 140-second eligibility ceiling', () => {
  const result = validateCutdownDuration({
    sourceDuration: 182.485,
    outputDuration: 135,
    targetDuration: 135,
    maximumDuration: 140,
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, null);
  assert.equal(result.minimumDuration, 134);
});

 test('a full channel does not block another, and policy allows ten slots per user instruction', () => {
  const posts = [
    ...Array.from({length: 10}, () => ({channelId: 'youtube', status: 'scheduled'})),
    {channelId: 'instagram', status: 'sending'},
    {channelId: 'instagram', status: 'sent'},
  ];
  assert.equal(channelScheduledCount(posts, 'instagram'), 1);
  assert.doesNotThrow(() => assertScheduledCapacity(channelScheduledCount(posts, 'instagram'), BUFFER_CHANNEL_QUEUE_TARGET));
  assert.throws(() => assertScheduledCapacity(channelScheduledCount(posts, 'youtube'), BUFFER_CHANNEL_QUEUE_TARGET));
  assert.doesNotThrow(() => assertScheduledCapacity(8, BUFFER_CHANNEL_QUEUE_TARGET));
  assert.doesNotThrow(() => assertScheduledCapacity(9, BUFFER_CHANNEL_QUEUE_TARGET));
  assert.throws(() => assertScheduledCapacity(10, BUFFER_CHANNEL_QUEUE_TARGET));
});
