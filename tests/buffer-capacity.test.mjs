import test from 'node:test';
import assert from 'node:assert/strict';
import { assertScheduledCapacity, calculatePlatformCapacity } from '../public/blog/scripts/lib/buffer-capacity.mjs';

test('three-platform allocation cannot exceed the ten-post organization cap', () => {
  const allocation = calculatePlatformCapacity({
    limit: 10,
    currentScheduled: 0,
    reserveSlots: 1,
    platformCount: 3,
  });
  assert.equal(allocation.perPlatformCapacity, 3);
  assert.ok(allocation.perPlatformCapacity * 3 + 1 <= 10);
});

test('existing posts reduce all platform allocations from the same snapshot', () => {
  const allocation = calculatePlatformCapacity({
    limit: 10,
    currentScheduled: 4,
    reserveSlots: 1,
    platformCount: 3,
  });
  assert.equal(allocation.perPlatformCapacity, 1);
});

test('live executor blocks the tenth create attempt', () => {
  assert.doesNotThrow(() => assertScheduledCapacity(9));
  assert.throws(() => assertScheduledCapacity(10), /cap reached \(10\/10\)/);
});
