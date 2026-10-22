import test from 'node:test';
import assert from 'node:assert/strict';
import { statusRequestPlan, loadStatusPosts, retryAtFromMessage } from '../public/blog/scripts/lib/buffer-backlog-state.mjs';

test('capacity-only status excludes sent-history fetch', () => {
  assert.deepEqual(statusRequestPlan(true), { liveStatuses: ['scheduled', 'sending'], fetchSentHistory: false });
  assert.equal(statusRequestPlan(false).fetchSentHistory, true);
});

test('capacity-only production status calls live loader but skips sent loader', async () => {
  let live = 0; let sent = 0;
  const result = await loadStatusPosts({
    getLivePosts: async () => { live += 1; return ['live']; },
    getSentPosts: async () => { sent += 1; return ['sent']; },
    capacityOnly: true,
  });
  assert.deepEqual(result.posts, ['live']);
  assert.equal(live, 1);
  assert.equal(sent, 0);
});

test('retryAt parser retains valid date and safely falls back when malformed', () => {
  assert.equal(retryAtFromMessage('retryAt=2026-09-14T23:00:00.000Z', 0).toISOString(), '2026-09-14T23:00:00.000Z');
  assert.equal(retryAtFromMessage('retryAt=not-a-date', 100000).toISOString(), new Date(100000 + 3600 * 1000).toISOString());
});
