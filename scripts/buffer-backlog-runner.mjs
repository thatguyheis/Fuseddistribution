#!/usr/bin/env node
import { channelScheduledCount } from '../public/blog/scripts/lib/buffer-capacity.mjs';
import {nextFreeSlots, repairCadence} from '../public/blog/scripts/lib/buffer-cadence.mjs';
import {confirmedCtaHistory} from '../public/blog/scripts/lib/cta-rotation.mjs';
import { channelPriority } from '../public/blog/scripts/lib/buffer-scheduling-policy.mjs';

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { retryAtFromMessage } from '../public/blog/scripts/lib/buffer-backlog-state.mjs';
import { scopedSlugs } from './lib/content-scope.mjs';

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
const targetPerChannel = limit - reserveSlots;
const channelIds = {
  youtube: '6a3e63375ab6d2f1067461b2',
  x: '6a3e73fb5ab6d2f10674b516',
  instagram: '6a67c5d64b2d03035f4f0228',
};
const perChannelBatch = Number(process.env.BUFFER_RECOVERY_BATCH || 3);
if (!Number.isInteger(perChannelBatch) || perChannelBatch < 1 || perChannelBatch > 10) throw new Error('Invalid Buffer recovery batch');
const repostAfterDays = 7;
const scheduleWindowStart = process.env.BUFFER_SCHEDULE_WINDOW_START || '13:00';
const scheduleWindowEnd = process.env.BUFFER_SCHEDULE_WINDOW_END || '23:59';
const scheduleIntervalMinutes = process.env.BUFFER_SCHEDULE_INTERVAL_MINUTES || '20';
const unavailablePath = join(repoRoot, '.buffer-live-unavailable.json');
const ownerLock = '/tmp/fused-buffer-publisher.lock';

function acquireOwnerLock() {
  try { mkdirSync(ownerLock); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    // The shared PID probe preserves unknown and permission-denied owners.
    const probe = spawnSync('python3', [join(repoRoot, 'scripts/lock-owner-alive.py'), ownerLock]);
    if (probe.status !== 1) return false;
    try {
      renameSync(ownerLock, `${ownerLock}.stale.${Date.now()}.${process.pid}`);
      mkdirSync(ownerLock);
    } catch { return false; }
  }
  writeFileSync(join(ownerLock, 'pid'), String(process.pid));
  process.once('exit', () => {
    try {
      if (readFileSync(join(ownerLock, 'pid'), 'utf8') === String(process.pid)) {
        renameSync(ownerLock, `${ownerLock}.finished.${Date.now()}.${process.pid}`);
      }
    } catch { /* Preserve the lock for an owner probe on the next run. */ }
  });
  return true;
}

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
      if (Number.isInteger(parsed.count) && (parsed.dailyTargets || parsed.mode === 'capacity-only')) return parsed;
    } catch {
      // Earlier log lines may contain braces. Continue at the next candidate.
    }
  }
  throw new Error('Buffer status did not contain a parseable live snapshot.');
}

function liveStatus() {
  return parseStatus(run([liveScript, 'status', '--target-per-channel=3']));
}

function capacityStatus() {
  return parseStatus(run([liveScript, 'status', '--capacity-only']));
}

function plannerArgs(platform, currentScheduled, maxPosts) {
  const shared = [
    `--current-scheduled=${currentScheduled}`,
    `--limit=${limit}`,
    `--reserve-slots=${reserveSlots}`,
    // Capacity belongs to this channel; other channels do not consume its slots.
    '--platform-count=1',
    `--max-posts=${maxPosts}`,
    `--repost-after-days=${repostAfterDays}`,
    `--schedule-window-start=${scheduleWindowStart}`,
    `--schedule-window-end=${scheduleWindowEnd}`,
    `--schedule-interval-minutes=${scheduleIntervalMinutes}`,
    ...(process.env.BUFFER_ALLOW_FUTURE_DAYS === '1' ? [] : ['--same-day-only']),
  ];
  // ops/content-scope.json limits scheduling to in-scope posts. Instagram
  // reads the YouTube queue, so it inherits the same limit. An empty scope
  // passes a slug that matches nothing rather than falling back to all posts.
  const scoped = scopedSlugs(repoRoot);
  if (scoped && platform !== 'instagram') shared.push(`--slugs=${scoped.length ? scoped.join(',') : '__no-scoped-posts__'}`);
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

function publish(platform, queuePath, status) {
  const queue=JSON.parse(readFileSync(queuePath,'utf8'));
  const occupancy=[...status.posts.filter(p=>p.status!=='sent'),...confirmedCtaHistory(repoRoot).filter(p=>p.status==='sent')];
  const slots=nextFreeSlots(occupancy,channelIds[platform],queue.selected.length);
  queue.selected.forEach((job,i)=>{job.dueAt=slots[i];job.createPostPayload.dueAt=slots[i];});
  writeFileSync(queuePath,JSON.stringify(queue,null,2)+'\n');
  const selected = selectedCount(queuePath);
  if (!selected) {
    console.log(`[buffer-backlog] ${platform}: planner selected 0 jobs`);
    return false;
  }
  const ctaSnapshot = join(repoRoot, '.workflow-state/cta-live-snapshot.json');
  writeFileSync(ctaSnapshot, JSON.stringify(status));
  run([join(repoRoot, 'scripts/rotate-buffer-ctas.mjs'), queuePath, ctaSnapshot]);
  run([validateScript, `--queue=${queuePath}`]);
  console.log(`[buffer-backlog] ${platform}: publishing ${selected} verified job(s)`);
  run([liveScript, 'publish', `--queue=${queuePath}`]);
  return true;
}

function recordUnavailable(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/Buffer HTTP 429|fetch failed|budget exhausted/i.test(message)) return false;
  const retryAfterMatch = message.match(/retryAfter=(\d+)/i);
  const retryAfterSeconds = retryAfterMatch ? Number(retryAfterMatch[1]) : 3600;
  const retryAt = retryAtFromMessage(message);
  const window = message.match(/window=([^ ]+)/i)?.[1] || (message.includes('budget exhausted') ? 'local-request-budget' : 'unknown');
  writeFileSync(unavailablePath, `${JSON.stringify({
    status: 'unavailable',
    provider: 'buffer',
    reason: message,
    checkedAt: new Date().toISOString(),
    window,
    retryAfterSeconds,
    retryAt: retryAt.toISOString(),
    retryPolicy: 'skip API calls until retryAt; retry on the next eligible scheduled launch',
  }, null, 2)}\n`);
  console.warn(`[buffer-backlog] Buffer unavailable (${window}); retry after ${retryAt.toISOString()}. Further submissions deferred; confirmed checkpoints preserved.`);
  return true;
}

function respectCooldown() {
  try {
    const state = JSON.parse(readFileSync(unavailablePath, 'utf8'));
    const retryAt = Date.parse(state.retryAt || '');
    if (state.status === 'unavailable' && Number.isFinite(retryAt) && retryAt > Date.now()) {
      console.log(`[buffer-backlog] cooldown active until ${new Date(retryAt).toISOString()}; no API call made`);
      return true;
    }
  } catch {
    // No cooldown state or malformed runtime state: make one normal attempt.
  }
  return false;
}

function main() {
  console.log(`[buffer-backlog] start targetPerChannel=${targetPerChannel} reserve=${reserveSlots} repostAfterDays=${repostAfterDays}`);
  if (respectCooldown()) return;
  if (!acquireOwnerLock()) {
    console.log('[buffer-backlog] another scheduling owner is active; no API call made');
    return;
  }
  run([join(repoRoot,'scripts/reel-backlog.mjs'),'--write','--summary']);
  let status = liveStatus();
  if(repairCadence(status.posts).length) throw Error('Existing Buffer cadence collisions require repair before refill');
  const order = channelPriority(status.dailyTargets);
  console.log(`[buffer-backlog] channel priority: ${order.join(', ')}`);
  // Instagram can consume the independent prepared source list before YouTube submits.
  if (order.indexOf('instagram') < order.indexOf('youtube') &&
      channelScheduledCount(status.posts, channelIds.instagram) < targetPerChannel &&
      channelScheduledCount(status.posts, channelIds.youtube) < targetPerChannel) {
    const youtubeCount = channelScheduledCount(status.posts, channelIds.youtube);
    run(plannerArgs('youtube', youtubeCount, Math.min(perChannelBatch, Math.max(0, targetPerChannel - youtubeCount))));
  }
  for (const platform of order) {
    const current = channelScheduledCount(status.posts, channelIds[platform]);
    const remaining = Math.max(0, targetPerChannel - current);
    if (!remaining) {
      console.log(`[buffer-backlog] ${platform} capacity full at ${current}/${targetPerChannel}; continuing`);
      continue;
    }
    const batch = Math.min(perChannelBatch, remaining);
    console.log(`[buffer-backlog] ${platform}: live=${current}/${limit}, planning up to ${batch}`);
    run(plannerArgs(platform, current, batch));
    if (publish(platform, queuePaths[platform], status)) status = capacityStatus();
  }
  const checkedAt = new Date().toISOString();
  writeFileSync(join(repoRoot,'.workflow-state/buffer-latest-status.json'), JSON.stringify({...status,checkedAt,source:'normal-owner-live-readback'},null,2)+'\n');
  try {
    const prior = JSON.parse(readFileSync(unavailablePath,'utf8'));
    if (prior.status === 'unavailable') {
      const archive = join(repoRoot,`.workflow-state/buffer-cooldown-resolved-${Date.now()}.json`);
      writeFileSync(archive,JSON.stringify(prior,null,2)+'\n');
      writeFileSync(unavailablePath,JSON.stringify({status:'available',checkedAt,previousIncident:archive},null,2)+'\n');
    }
  } catch(error) { if (error.code !== 'ENOENT') console.warn(`[buffer-backlog] status checkpoint: ${error.message}`); }
  run([join(repoRoot,'scripts/reel-backlog.mjs'),'--write','--summary']);
  console.log(`[buffer-backlog] complete total live scheduled/sending=${status.count}; target=${targetPerChannel} per channel`);
}

try {
  main();
} catch (error) {
  console.error(`[buffer-backlog] FAILED: ${error.message}`);
  if (recordUnavailable(error)) process.exit(0);
  process.exit(1);
}
