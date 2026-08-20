import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileScheduledLog } from '../public/blog/scripts/lib/buffer-log-reconciliation.mjs';

test('reconciles scheduled log entries to sent using authoritative Buffer readback', () => {
  const scheduledLog = {
    scheduled: [
      {
        slug: 'largest-silver-producing-countries-in-the-world',
        postId: 'yt-1',
        channelId: 'youtube-channel',
        status: 'scheduled',
        dueAt: '2026-07-27T20:00:00.000Z',
        publicMediaUrl: 'https://example.com/reels/largest.mp4',
      },
      {
        slug: 'ai-tools-for-small-business-marketing-in-2026',
        postId: 'yt-2',
        channelId: 'youtube-channel',
        status: 'scheduled',
        dueAt: '2026-07-27T21:45:00.000Z',
        publicMediaUrl: 'https://example.com/reels/ai-tools.mp4',
      },
    ],
  };

  const visiblePosts = [
    {
      id: 'yt-1',
      slug: 'largest-silver-producing-countries-in-the-world',
      channelId: 'youtube-channel',
      status: 'sent',
      dueAt: '2026-07-27T20:00:00.000Z',
      sentAt: '2026-07-27T20:00:59.181Z',
      externalLink: 'https://www.youtube.com/shorts/P2j4GGN6C3Y',
    },
    {
      id: 'yt-2',
      slug: 'ai-tools-for-small-business-marketing-in-2026',
      channelId: 'youtube-channel',
      status: 'scheduled',
      dueAt: '2026-07-27T21:45:00.000Z',
    },
  ];

  const result = reconcileScheduledLog(scheduledLog, visiblePosts, '2026-07-28T03:34:00.000Z');
  assert.equal(result.changed, 1);
  assert.equal(result.log.scheduled[0].status, 'sent');
  assert.equal(result.log.scheduled[0].sentAt, '2026-07-27T20:00:59.181Z');
  assert.equal(result.log.scheduled[0].viewPostUrl, 'https://www.youtube.com/shorts/P2j4GGN6C3Y');
  assert.equal(result.log.scheduled[0].reconciledAt, '2026-07-28T03:34:00.000Z');
  assert.equal(result.log.scheduled[1].status, 'scheduled');
});
