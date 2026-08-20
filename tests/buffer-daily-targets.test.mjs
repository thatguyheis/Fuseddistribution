import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUFFER_CHANNELS,
  calculateDailyChannelTargets,
  evaluateDailyFloorEnforcement,
  evaluateDailyFloorReadinessCheckpoint,
  mergeBufferPosts,
} from '../public/blog/scripts/lib/buffer-daily-targets.mjs';

test('daily status preserves live posts when sent history is fetched separately', () => {
  const live = [{ id: 'live-x', channelId: BUFFER_CHANNELS.x, status: 'scheduled', dueAt: '2026-08-07T16:00:00.000Z' }];
  const sent = [{ id: 'sent-x', channelId: BUFFER_CHANNELS.x, status: 'sent', dueAt: '2026-08-07T08:00:00.000Z' }];
  const posts = mergeBufferPosts(live, sent);
  const result = calculateDailyChannelTargets(posts, { operatingDate: '2026-08-07' });
  assert.equal(result.channels.x.scheduledToday, 2);
  assert.equal(result.channels.x.deficit, 1);
});

test('daily targets allocate only to channels below three posts', () => {
  const posts = [
    ...Array.from({ length: 3 }, (_, index) => ({ id: `ig-${index}`, channelId: BUFFER_CHANNELS.instagram, status: 'scheduled', dueAt: `2026-08-04T${20 + index}:00:00.000Z` })),
  ];
  const result = calculateDailyChannelTargets(posts, { operatingDate: '2026-08-04' });
  assert.equal(result.channels.instagram.deficit, 0);
  assert.equal(result.channels.youtube.deficit, 3);
  assert.equal(result.channels.x.deficit, 3);
  assert.equal(result.deficitPlatformCount, 2);
  assert.equal(result.totalDeficit, 6);
});

test('daily targets count sent posts from today and ignore posts due on another Pacific date', () => {
  const posts = [
    { channelId: BUFFER_CHANNELS.youtube, status: 'sent', dueAt: '2026-08-04T20:00:00.000Z', sentAt: '2026-08-04T20:00:05.000Z' },
    { channelId: BUFFER_CHANNELS.youtube, status: 'scheduled', dueAt: '2026-08-05T20:00:00.000Z' },
  ];
  const result = calculateDailyChannelTargets(posts, { operatingDate: '2026-08-04' });
  assert.equal(result.channels.youtube.scheduledToday, 1);
  assert.equal(result.channels.youtube.deficit, 2);
});

test('Pacific operating date prevents UTC midnight rollover errors', () => {
  const posts = [{ channelId: BUFFER_CHANNELS.x, status: 'sending', dueAt: '2026-08-05T01:00:00.000Z' }];
  const result = calculateDailyChannelTargets(posts, { operatingDate: '2026-08-04' });
  assert.equal(result.channels.x.scheduledToday, 1);
});

test('expedited target raises deficits without changing the baseline minimum', () => {
  const result = calculateDailyChannelTargets([], { operatingDate: '2026-08-05', minimum: 6 });
  assert.equal(result.baselineMinimumPerChannel, 3);
  assert.equal(result.targetPerChannel, 6);
  assert.equal(result.channels.youtube.deficit, 6);
  assert.equal(result.totalDeficit, 18);
});

test('daily-floor readiness checkpoint is on time only before the four-hour cutoff', () => {
  const onTime = evaluateDailyFloorReadinessCheckpoint({
    operatingDate: '2026-08-10',
    now: new Date('2026-08-10T23:59:00.000Z'),
  });
  const late = evaluateDailyFloorReadinessCheckpoint({
    operatingDate: '2026-08-10',
    now: new Date('2026-08-11T00:00:00.000Z'),
  });

  assert.equal(onTime.status, 'on_time');
  assert.equal(onTime.deadlineHour, 17);
  assert.equal(late.status, 'late');
});

test('daily-floor enforcement fails closed only for a late checkpoint with a deficit', () => {
  const dailyTargets = calculateDailyChannelTargets([], { operatingDate: '2026-08-10' });
  const late = evaluateDailyFloorReadinessCheckpoint({
    operatingDate: '2026-08-10',
    now: new Date('2026-08-11T00:00:00.000Z'),
  });
  const failed = evaluateDailyFloorEnforcement({ dailyTargets, readinessCheckpoint: late });
  const passed = evaluateDailyFloorEnforcement({
    dailyTargets,
    readinessCheckpoint: { ...late, status: 'on_time' },
  });

  assert.deepEqual(failed, {
    status: 'failed',
    deficitChannels: ['youtube', 'x', 'instagram'],
    reason: 'late_checkpoint_with_daily_floor_deficit',
  });
  assert.deepEqual(passed, { status: 'passed', deficitChannels: ['youtube', 'x', 'instagram'], reason: null });
});
