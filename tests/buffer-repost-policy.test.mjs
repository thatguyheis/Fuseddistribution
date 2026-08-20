import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledEntryBlocksPlanning } from '../public/blog/scripts/lib/buffer-repost-policy.mjs';

const now = Date.parse('2026-08-04T18:00:00.000Z');

test('scheduled and sending posts always block duplicate planning', () => {
  assert.equal(scheduledEntryBlocksPlanning({ status: 'scheduled', dueAt: '2026-07-01T00:00:00Z' }, { repostAfterDays: 7, now }), true);
  assert.equal(scheduledEntryBlocksPlanning({ status: 'sending' }, { repostAfterDays: 7, now }), true);
});

test('sent posts remain blocked when rotation is disabled or still cooling down', () => {
  assert.equal(scheduledEntryBlocksPlanning({ status: 'sent', sentAt: '2026-06-01T00:00:00Z' }, { now }), true);
  assert.equal(scheduledEntryBlocksPlanning({ status: 'sent', sentAt: '2026-08-01T00:00:00Z' }, { repostAfterDays: 7, now }), true);
});

test('sent posts become eligible after the configured rotation cooldown', () => {
  assert.equal(scheduledEntryBlocksPlanning({ status: 'sent', sentAt: '2026-07-27T00:00:00Z' }, { repostAfterDays: 7, now }), false);
});

test('failed posts do not block a corrected retry', () => {
  assert.equal(scheduledEntryBlocksPlanning({ status: 'error' }, { repostAfterDays: 7, now }), false);
});
