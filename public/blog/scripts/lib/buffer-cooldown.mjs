import { readFileSync, writeFileSync } from 'node:fs';

export function cooldownUntil(path, now = Date.now()) {
  try {
    const state = JSON.parse(readFileSync(path, 'utf8'));
    const due = Date.parse(state.retryAt);
    return state.status === 'unavailable' && due > now ? due : null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`Cannot read Buffer cooldown: ${error.message}`);
  }
}

export function saveCooldown(path, seconds, window, now = Date.now()) {
  const delay = Number.isFinite(seconds) && seconds > 0 ? seconds : 3600;
  const due = Math.max(now + delay * 1000, cooldownUntil(path, now) || 0);
  writeFileSync(path, JSON.stringify({ status: 'unavailable', provider: 'buffer',
    reason: 'Buffer HTTP 429', window, checkedAt: new Date(now).toISOString(),
    retryAt: new Date(due).toISOString(), retryAfterSeconds: Math.ceil((due - now) / 1000),
    retryPolicy: 'All callers must skip API calls until retryAt.' }, null, 2) + '\n');
}
