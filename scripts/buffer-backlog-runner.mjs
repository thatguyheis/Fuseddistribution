#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const liveScript = join(repoRoot, 'public', 'blog', 'scripts', 'buffer-live.mjs');
const validateScript = join(repoRoot, 'public', 'blog', 'scripts', 'validate-buffer-queue.mjs');
const queuePaths = {
  youtube: join(repoRoot, '.buffer-youtube-queue.json'),
  x: join(repoRoot, '.buffer-x-queue.json'),
  instagram: join(repoRoot, '.buffer-instagram-queue.json'),
};

const limit = 10;
const reserveSlots = 1;
const targetTotal = limit - reserveSlots;
const perChannelBatch = 3;
const repostAfterDays = 7;
const scheduleWindowStart = process.env.BUFFER_SCHEDULE_WINDOW_START || '13:00';
const scheduleWindowEnd = process.env.BUFFER_SCHEDULE_WINDOW_END || '23:59';
const scheduleIntervalMinutes = process.env.BUFFER_SCHEDULE_INTERVAL_MINUTES || '20';
const unavailablePath = join(repoRoot, '.buffer-live-unavailable.json');

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (result.status !== 0) throw new Error(output || `command failed with exit ${result.status}`);
  return output;
}

function parseStatus(output) {
  for (let offset = output.indexOf('{'); offset >= 0; offset = output.indexOf('{', offset + 1)) {
    try {
      const parsed = JSON.parse(output.slice(offset));
      if (Number.isInteger(parsed.count) && parsed.dailyTargets) return parsed;
    } catch {
      // Earlier log lines may contain braces. Continue at the next candidate.
    }
  }
  throw new Error('Buffer status did not contain a parseable live snapshot.');
}

function liveStatus() {
  return parseStatus(run([liveScript, 'status', '--target-per-channel=3']));
}

function plannerArgs(platform, currentScheduled, maxPosts) {
  const shared = [
    `--current-scheduled=${currentScheduled}`,
    `--limit=${limit}`,
    `--reserve-slots=${reserveSlots}`,
    // This runner fills one channel at a time, then re-reads the shared count.
    // It therefore reserves capacity safely without incorrectly dividing the
    // remaining nine slots three ways on every sequential planner invocation.
    '--platform-count=1',
    `--max-posts=${maxPosts}`,
    `--repost-after-days=${repostAfterDays}`,
    `--schedule-window-start=${scheduleWindowStart}`,
    `--schedule-window-end=${scheduleWindowEnd}`,
    `--schedule-interval-minutes=${scheduleIntervalMinutes}`,
    '--same-day-only',
  ];
  if (platform === 'youtube') {
    return [
      join(repoRoot, 'public', 'blog', 'scripts', 'prepare-buffer-youtube-queue.mjs'),
      ...shared,
      '--media-map=.buffer-media-urls.json',
      '--verify-media-urls',
      '--write-packs',
    ];
  }
  if (platform === 'x') {
    return [
      join(repoRoot, 'public', 'blog', 'scripts', 'prepare-buffer-x-queue.mjs'),
      ...shared,
      // Existing X-safe cutdowns are retained in this map until the shared
      // 135-second production assets have been regenerated and deployed.
      '--media-map=.buffer-x-media-urls.json',
      '--verify-media-urls',
    ];
  }
  return [
    join(repoRoot, 'public', 'blog', 'scripts', 'prepare-buffer-instagram-queue.mjs'),
    ...shared,
    '--source-queue=.buffer-youtube-queue.json',
  ];
}

function selectedCount(queuePath) {
  const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
  return Array.isArray(queue.selected) ? queue.selected.length : 0;
}

function publish(platform, queuePath) {
  const selected = selectedCount(queuePath);
  if (!selected) {
    console.log(`[buffer-backlog] ${platform}: planner selected 0 jobs`);
    return;
  }
  run([validateScript, `--queue=${queuePath}`]);
  console.log(`[buffer-backlog] ${platform}: publishing ${selected} verified job(s)`);
  run([liveScript, 'publish', `--queue=${queuePath}`]);
}

function recordUnavailable(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/Buffer HTTP 429|fetch failed/i.test(message)) return false;
  writeFileSync(unavailablePath, `${JSON.stringify({
    status: 'unavailable',
    provider: 'buffer',
    reason: message,
    checkedAt: new Date().toISOString(),
    retryPolicy: 'next scheduled launch; no publish attempted while status is unavailable',
  }, null, 2)}\n`);
  console.warn(`[buffer-backlog] Buffer unavailable; recorded ${unavailablePath}. The next scheduled run will retry.`);
  return true;
}

function main() {
  console.log(`[buffer-backlog] start target=${targetTotal} reserve=${reserveSlots} repostAfterDays=${repostAfterDays}`);
  for (const platform of ['youtube', 'x', 'instagram']) {
    const status = liveStatus();
    const current = status.count;
    const remaining = Math.max(0, targetTotal - current);
    if (!remaining) {
      console.log(`[buffer-backlog] capacity full at ${current}/${limit}; stopping`);
      break;
    }
    const batch = Math.min(perChannelBatch, remaining);
    console.log(`[buffer-backlog] ${platform}: live=${current}/${limit}, planning up to ${batch}`);
    run(plannerArgs(platform, current, batch));
    publish(platform, queuePaths[platform]);
  }
  const final = liveStatus();
  console.log(`[buffer-backlog] complete live scheduled/sending=${final.count}/${limit}`);
}

try {
  main();
} catch (error) {
  console.error(`[buffer-backlog] FAILED: ${error.message}`);
  if (recordUnavailable(error)) process.exit(0);
  process.exit(1);
}
