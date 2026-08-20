#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculatePlatformCapacity } from './lib/buffer-capacity.mjs';
import { isHttpsUrl, verifyPublicMp4Url } from './lib/buffer-media-verification.mjs';
import { assertSocialCopyQuality } from './lib/social-copy-quality.mjs';
import { scheduledEntryBlocksPlanning } from './lib/buffer-repost-policy.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const blogRoot = join(repoRoot, 'public', 'blog');
const organizationId = '6a3e62cb6adcaa97fe293a7d';
const instagramChannelId = '6a67c5d64b2d03035f4f0228';
const instagramChannelName = 'ahueman303';
const defaultLimit = 10;
const defaultReserveSlots = 1;
const defaultPlatformCount = 3;
const scheduleTimeZone = 'America/Los_Angeles';
const defaultScheduleWindowStart = '13:00';
const defaultScheduleWindowEnd = '19:00';
const defaultScheduleIntervalMinutes = 105;
const minimumScheduleLeadMinutes = 15;
const maximumCaptionLength = 2_200;
const maximumAssetBytes = 25 * 1024 * 1024;
const queueExpiryMinutes = 30;

function usage() {
  console.error(`Usage: node public/blog/scripts/prepare-buffer-instagram-queue.mjs --current-scheduled=N [options]

Builds Instagram Reel jobs from verified YouTube scheduling proof so every
Instagram post uses the same release-QA-cleared hosted video.

Options:
  --current-scheduled=N   Scheduled/sending count from one shared Buffer snapshot. Required.
  --limit=N               Organization-wide scheduled-post cap. Default: 10.
  --reserve-slots=N       Safety headroom across all channels. Default: 1.
  --platform-count=N      Platforms sharing capacity. Default: 3.
  --max-posts=N           Cap selected jobs at this channel's daily deficit.
  --source-queue=path     Verified YouTube queue. Default: .buffer-youtube-queue.json.
  --source-scheduled-log=path
                          Verified YouTube checkpoint log used for Instagram catch-up.
                          Default: .buffer-youtube-scheduled.json.
  --scheduled-log=path    Instagram checkpoint log. Default: .buffer-instagram-scheduled.json.
  --repost-after-days=N   Allow sent, release-approved reels to rotate after N days. Default: 0 (never).
  --out=path              Output queue. Default: .buffer-instagram-queue.json.
  --schedule-window-start=HH:MM
                          Earliest local Buffer due time. Default: 13:00.
  --schedule-window-end=HH:MM
                          Latest local Buffer due time. Default: 19:00.
  --schedule-interval-minutes=N
                          Minutes between selected posts. Default: 105.
  --same-day-only         Do not roll excess selected jobs into tomorrow.
  --skip-media-url-verification  Offline planning only; never use for production publishing.
`);
  process.exit(2);
}

function integerArg(value, name, { positive = false } = {}) {
  if (!/^\d+$/.test(value) || (positive && Number(value) < 1)) {
    throw new Error(`${name} must be ${positive ? 'a positive' : 'a non-negative'} integer.`);
  }
  return Number(value);
}

function parseClock(value, name) {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new Error(`${name} must use HH:MM in 24-hour time.`);
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function minutesOfDay(clock) {
  return clock.hour * 60 + clock.minute;
}

function parseArgs(argv) {
  const args = {
    currentScheduled: null,
    limit: defaultLimit,
    reserveSlots: defaultReserveSlots,
    platformCount: defaultPlatformCount,
    maxPosts: null,
    sourceQueue: join(repoRoot, '.buffer-youtube-queue.json'),
    sourceScheduledLog: join(repoRoot, '.buffer-youtube-scheduled.json'),
    scheduledLog: join(repoRoot, '.buffer-instagram-scheduled.json'),
    repostAfterDays: 0,
    out: join(repoRoot, '.buffer-instagram-queue.json'),
    verifyMediaUrls: true,
    scheduleWindowStart: defaultScheduleWindowStart,
    scheduleWindowEnd: defaultScheduleWindowEnd,
    scheduleIntervalMinutes: defaultScheduleIntervalMinutes,
    sameDayOnly: false,
  };
  for (const arg of argv) {
    const [name, value] = arg.split('=', 2);
    if (name === '--current-scheduled') args.currentScheduled = integerArg(value, name);
    else if (name === '--limit') args.limit = integerArg(value, name);
    else if (name === '--reserve-slots') args.reserveSlots = integerArg(value, name);
    else if (name === '--platform-count') args.platformCount = integerArg(value, name, { positive: true });
    else if (name === '--max-posts') args.maxPosts = integerArg(value, name, { positive: true });
    else if (name === '--source-queue') args.sourceQueue = resolve(value);
    else if (name === '--source-scheduled-log') args.sourceScheduledLog = resolve(value);
    else if (name === '--scheduled-log') args.scheduledLog = resolve(value);
    else if (name === '--repost-after-days') args.repostAfterDays = integerArg(value, name);
    else if (name === '--out') args.out = resolve(value);
    else if (name === '--schedule-window-start') args.scheduleWindowStart = value;
    else if (name === '--schedule-window-end') args.scheduleWindowEnd = value;
    else if (name === '--schedule-interval-minutes') args.scheduleIntervalMinutes = integerArg(value, name, { positive: true });
    else if (arg === '--same-day-only') args.sameDayOnly = true;
    else if (arg === '--skip-media-url-verification') args.verifyMediaUrls = false;
    else if (arg === '--dry-run') continue;
    else usage();
  }
  if (args.currentScheduled === null) {
    throw new Error('Missing --current-scheduled. Query Buffer once before planning all three platforms.');
  }
  args.scheduleWindowStart = parseClock(args.scheduleWindowStart, '--schedule-window-start');
  args.scheduleWindowEnd = parseClock(args.scheduleWindowEnd, '--schedule-window-end');
  if (minutesOfDay(args.scheduleWindowStart) >= minutesOfDay(args.scheduleWindowEnd)) {
    throw new Error('--schedule-window-start must be earlier than --schedule-window-end.');
  }
  return args;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read ${path}: ${error.message}`);
  }
}

function scheduledSlugs(path, repostAfterDays) {
  if (!existsSync(path)) return new Set();
  const value = readJson(path);
  const entries = Array.isArray(value) ? value : value.scheduled || [];
  return new Set(entries
    .filter((entry) => scheduledEntryBlocksPlanning(entry, { repostAfterDays }))
    .map((entry) => entry.slug));
}

function cleanCaption(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function sourceQueueJobs(path) {
  if (!existsSync(path)) return [];
  const sourceQueue = readJson(path);
  const expiresAt = Date.parse(sourceQueue?.expiresAt || '');
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return [];
  return Array.isArray(sourceQueue.selected) ? sourceQueue.selected : [];
}

function sourceScheduledLogJobs(path) {
  if (!existsSync(path)) return [];
  const value = readJson(path);
  const entries = Array.isArray(value) ? value : value.scheduled || [];
  const seen = new Set();
  const jobs = [];
  for (const entry of entries) {
    const slug = entry?.slug;
    const status = String(entry?.status || '').toLowerCase();
    if (!slug || seen.has(slug)) continue;
    if (['error', 'deleted', 'failed', 'blocked'].includes(status)) continue;
    if (!entry?.verifiedVideoAsset) continue;
    seen.add(slug);
    jobs.push({
      slug,
      publicMediaUrl: entry.publicMediaUrl || '',
      dueAt: entry.dueAt || null,
      sourcePostId: entry.postId || null,
      sourceStatus: entry.status || null,
    });
  }
  return jobs;
}

const localDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: scheduleTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function zonedParts(date) {
  const parts = Object.fromEntries(localDateFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function utcDateForZonedTime({ year, month, day, hour, minute, second = 0 }) {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let index = 0; index < 2; index += 1) {
    const actual = zonedParts(new Date(utcMs));
    const desiredMs = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualMs = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    utcMs += desiredMs - actualMs;
  }
  return new Date(utcMs);
}

function addLocalDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  const next = zonedParts(date);
  return { year: next.year, month: next.month, day: next.day };
}

function scheduledDateForLocalDay(dayParts, clock) {
  return utcDateForZonedTime({
    year: dayParts.year,
    month: dayParts.month,
    day: dayParts.day,
    hour: clock.hour,
    minute: clock.minute,
  });
}

function formatOffset(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const mins = String(absolute % 60).padStart(2, '0');
  return `${sign}${hours}:${mins}`;
}

function formatDueAt(date) {
  const parts = zonedParts(date);
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMinutes = Math.round((localAsUtc - date.getTime()) / 60_000);
  const year = String(parts.year).padStart(4, '0');
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  const hour = String(parts.hour).padStart(2, '0');
  const minute = String(parts.minute).padStart(2, '0');
  const second = String(parts.second).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${formatOffset(offsetMinutes)}`;
}

export function nextScheduleDates(count, args, now = new Date()) {
  const results = [];
  let dayParts = zonedParts(now);
  let windowStart = scheduledDateForLocalDay(dayParts, args.scheduleWindowStart);
  let windowEnd = scheduledDateForLocalDay(dayParts, args.scheduleWindowEnd);
  const intervalMs = args.scheduleIntervalMinutes * 60_000;
  const earliest = new Date(now.getTime() + minimumScheduleLeadMinutes * 60_000);
  let next = windowStart;

  if (earliest > windowStart) {
    const intervalsAfterStart = Math.ceil((earliest.getTime() - windowStart.getTime()) / intervalMs);
    next = new Date(windowStart.getTime() + intervalsAfterStart * intervalMs);
  }

  while (results.length < count) {
    if (next > windowEnd) {
      if (args.sameDayOnly) break;
      dayParts = addLocalDays(dayParts, 1);
      windowStart = scheduledDateForLocalDay(dayParts, args.scheduleWindowStart);
      windowEnd = scheduledDateForLocalDay(dayParts, args.scheduleWindowEnd);
      next = windowStart;
    }
    results.push(next);
    next = new Date(next.getTime() + intervalMs);
  }

  return results;
}

export function buildInstagramJob(source, caption) {
  return {
    slug: source.slug,
    channelId: instagramChannelId,
    channelName: instagramChannelName,
    publicMediaUrl: source.publicMediaUrl,
    sourceDueAt: source.dueAt || null,
    text: caption,
    textLength: caption.length,
    createPostPayload: {
      channelId: instagramChannelId,
      mode: 'customScheduled',
      schedulingType: 'automatic',
      text: caption,
      assets: [{ video: { url: source.publicMediaUrl } }],
      metadata: {
        instagram: {
          type: 'reel',
          shouldShareToFeed: true,
          isAiGenerated: true,
        },
      },
    },
  };
}

export function applyDueAt(job, dueAtDate) {
  const dueAt = formatDueAt(dueAtDate);
  return {
    ...job,
    dueAt,
    createPostPayload: {
      ...job.createPostPayload,
      dueAt,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const queueJobs = sourceQueueJobs(args.sourceQueue);
  const scheduledLogJobs = sourceScheduledLogJobs(args.sourceScheduledLog);
  const queuedSlugs = new Set(queueJobs.map((job) => job.slug));
  const sourceJobs = [
    ...queueJobs,
    ...scheduledLogJobs.filter((job) => !queuedSlugs.has(job.slug)),
  ];
  const sourceType = queueJobs.length
    ? 'youtube_queue_plus_scheduled_log'
    : 'youtube_scheduled_log';
  if (!sourceJobs.length) {
    throw new Error('No verified source jobs are available from the YouTube queue or YouTube scheduled log.');
  }

  const priorSlugs = scheduledSlugs(args.scheduledLog, args.repostAfterDays);
  const { sharedCapacity, perPlatformCapacity } = calculatePlatformCapacity(args);
  const capacity = args.maxPosts === null ? perPlatformCapacity : Math.min(perPlatformCapacity, args.maxPosts);
  const ready = [];
  const blocked = [];
  const skipped = [];

  for (const source of sourceJobs) {
    if (priorSlugs.has(source.slug)) {
      skipped.push({ slug: source.slug, reason: 'already_scheduled' });
      continue;
    }
    if (!isHttpsUrl(source.publicMediaUrl)) {
      blocked.push({ slug: source.slug, reason: 'missing_https_media_url' });
      continue;
    }
    const copyPath = join(blogRoot, source.slug, 'social-copy.json');
    if (!existsSync(copyPath)) {
      blocked.push({ slug: source.slug, reason: 'missing_social_copy', path: copyPath });
      continue;
    }
    const copy = readJson(copyPath);
    try {
      assertSocialCopyQuality(copy, source.slug);
    } catch (error) {
      blocked.push({ slug: source.slug, reason: 'social_copy_quality_failed', detail: error.message });
      continue;
    }
    const caption = cleanCaption(copy?.reel?.instagram);
    if (!caption) {
      blocked.push({ slug: source.slug, reason: 'missing_reel_instagram_copy' });
      continue;
    }
    if (caption.length > maximumCaptionLength) {
      blocked.push({ slug: source.slug, reason: 'instagram_caption_too_long', textLength: caption.length, maximumCaptionLength });
      continue;
    }
    if (args.verifyMediaUrls) {
      const verification = await verifyPublicMp4Url(source.publicMediaUrl, { maxBytes: maximumAssetBytes });
      if (!verification.ok) {
        blocked.push({ slug: source.slug, reason: verification.reason, detail: verification.detail, status: verification.status });
        continue;
      }
    }
    ready.push(buildInstagramJob(source, caption));
  }

  const selectedCount = Math.min(ready.length, capacity);
  const selectedDueAtDates = nextScheduleDates(selectedCount, args);
  const selected = ready
    .slice(0, selectedDueAtDates.length)
    .map((job, index) => applyDueAt(job, selectedDueAtDates[index]));

  const queue = {
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + queueExpiryMinutes * 60_000).toISOString(),
    source: {
      type: sourceType,
      queuePath: args.sourceQueue,
      scheduledLogPath: args.sourceScheduledLog,
    },
    buffer: {
      organizationId,
      channelId: instagramChannelId,
      channelName: instagramChannelName,
      currentScheduled: args.currentScheduled,
      limit: args.limit,
      reserveSlots: args.reserveSlots,
      platformCount: args.platformCount,
      maxPosts: args.maxPosts,
      sharedCapacity,
      capacity,
    },
    instagram: {
      postType: 'reel',
      shouldShareToFeed: true,
      schedulingType: 'automatic',
      maximumCaptionLength,
      scheduleTimeZone,
      scheduleWindowStart: `${String(args.scheduleWindowStart.hour).padStart(2, '0')}:${String(args.scheduleWindowStart.minute).padStart(2, '0')}`,
      scheduleWindowEnd: `${String(args.scheduleWindowEnd.hour).padStart(2, '0')}:${String(args.scheduleWindowEnd.minute).padStart(2, '0')}`,
      scheduleIntervalMinutes: args.scheduleIntervalMinutes,
      sameDayOnly: args.sameDayOnly,
      mediaUrlVerification: args.verifyMediaUrls ? 'required' : 'not_run',
      repostAfterDays: args.repostAfterDays,
    },
    summary: {
      candidates: sourceJobs.length,
      ready: ready.length,
      selected: selected.length,
      readyOverflow: Math.max(0, ready.length - selected.length),
      blocked: blocked.length,
      skipped: skipped.length,
    },
    selected,
    readyOverflow: ready.slice(selected.length),
    blocked,
    skipped,
  };
  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(queue, null, 2)}\n`);
  console.log(`[buffer-instagram] shared scheduled/sending snapshot: ${args.currentScheduled}/${args.limit}`);
  console.log(`[buffer-instagram] source: ${sourceType}`);
  console.log(`[buffer-instagram] selected: ${selected.length}; blocked: ${blocked.length}; skipped: ${skipped.length}`);
  console.log(`[buffer-instagram] wrote ${args.out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[buffer-instagram] ${error.message}`);
    process.exit(1);
  });
}
