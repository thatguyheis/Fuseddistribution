export const BUFFER_SCHEDULED_POST_LIMIT = 10;

export function calculatePlatformCapacity({ limit, currentScheduled, reserveSlots, platformCount }) {
  for (const [name, value] of Object.entries({ limit, currentScheduled, reserveSlots, platformCount })) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer.`);
  }
  if (platformCount < 1) throw new Error('platformCount must be at least 1.');
  if (reserveSlots > limit) throw new Error('reserveSlots cannot exceed limit.');
  const sharedCapacity = Math.max(0, limit - currentScheduled - reserveSlots);
  return {
    sharedCapacity,
    perPlatformCapacity: Math.floor(sharedCapacity / platformCount),
  };
}

export function assertScheduledCapacity(liveCount, limit = BUFFER_SCHEDULED_POST_LIMIT) {
  if (!Number.isInteger(liveCount) || liveCount < 0) throw new Error('liveCount must be a non-negative integer.');
  if (liveCount >= limit) {
    throw new Error(`Buffer scheduled/sending cap reached (${liveCount}/${limit}); no post was created.`);
  }
}
