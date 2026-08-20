#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isHttpsUrl, verifyPublicMp4Url } from './lib/buffer-media-verification.mjs';
import { assertSocialCopyQuality } from './lib/social-copy-quality.mjs';
import { calculatePlatformCapacity } from './lib/buffer-capacity.mjs';
import { scheduledEntryBlocksPlanning } from './lib/buffer-repost-policy.mjs';
import { validateCutdownDuration } from './lib/buffer-video-integrity.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const blogRoot = join(repoRoot, 'public', 'blog');
const publicReelsRoot = join(repoRoot, 'public', 'reels');
const publicXReelsRoot = join(repoRoot, 'public', 'reels-x');
const videoOutRoot = join(repoRoot, 'video', 'out');

const BUFFER_ORGANIZATION_ID = '6a3e62cb6adcaa97fe293a7d';
const X_CHANNEL_ID = '6a3e73fb5ab6d2f10674b516';
const X_CHANNEL_NAME = 'thatguyheis';
const DEFAULT_LIMIT = 10;
const DEFAULT_RESERVE_SLOTS = 1;
const DEFAULT_PLATFORM_COUNT = 3;
const DEFAULT_MAX_DURATION_SECONDS = 140;
const DEFAULT_TARGET_CUTDOWN_SECONDS = 135;
const MAX_CLOUDFLARE_ASSET_BYTES = 25 * 1024 * 1024;
const MAX_X_CHARS = 280;
const SCHEDULE_TIME_ZONE = 'America/Los_Angeles';
const DEFAULT_SCHEDULE_WINDOW_START = '13:00';
const DEFAULT_SCHEDULE_WINDOW_END = '19:00';
const DEFAULT_SCHEDULE_INTERVAL_MINUTES = 105;
const MIN_SCHEDULE_LEAD_MINUTES = 15;
const QUEUE_EXPIRES_MINUTES = 30;
const STALE_SCHEDULED_GRACE_MINUTES = 60;

function usage() {
  console.error(`Usage: node public/blog/scripts/prepare-buffer-x-queue.mjs --current-scheduled=N [options]

Plans X video posts for Buffer API scheduling.

Options:
  --current-scheduled=N          Current scheduled/sending posts across the Buffer org. Required.
  --limit=N                      Buffer scheduled post limit. Default: 10.
  --reserve-slots=N              Slots left as organization-wide safety headroom. Default: 1.
  --platform-count=N             Platforms sharing capacity. Default: 3.
  --max-posts=N                  Cap selected jobs at this channel's daily deficit.
  --max-duration-seconds=N       Maximum X video duration. Default: 140.
  --target-cutdown-seconds=N     Expected generated cutdown duration. Default: 135.
  --max-bytes=N                  Maximum local MP4 size for Cloudflare assets. Default: 26214400.
  --slugs=a,b,c                  Optional explicit backlog order. Default: newest rendered posts from posts.json.
  --media-map=path               JSON map of slug to hosted MP4 URL. Default: .buffer-x-media-urls.json.
  --scheduled-log=path           JSON log of already scheduled X slugs. Default: .buffer-x-scheduled.json.
  --repost-after-days=N          Allow sent, release-approved reels to rotate after N days. Default: 0 (never).
  --skip-media-url-verification  Offline planning only. Production runs verify URLs by default.
  --schedule-window-start=HH:MM  Earliest local Buffer due time. Default: 13:00.
  --schedule-window-end=HH:MM    Latest local Buffer due time. Default: 19:00.
  --schedule-interval-minutes=N  Minutes between selected posts. Default: 105.
  --same-day-only               Do not roll excess selected jobs into tomorrow.
  --out=path                     Output queue JSON. Default: .buffer-x-queue.json.
  --dry-run                      Plan only. This is the default behavior.

Examples:
  npm run social:buffer:x:plan -- --current-scheduled=2
  npm run social:buffer:x:plan -- --current-scheduled=2 --slugs=slug-one,slug-two
`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = {
    currentScheduled: null,
    limit: DEFAULT_LIMIT,
    reserveSlots: DEFAULT_RESERVE_SLOTS,
    platformCount: DEFAULT_PLATFORM_COUNT,
    maxPosts: null,
    maxDurationSeconds: DEFAULT_MAX_DURATION_SECONDS,
    targetCutdownSeconds: DEFAULT_TARGET_CUTDOWN_SECONDS,
    maxBytes: MAX_CLOUDFLARE_ASSET_BYTES,
    slugs: [],
    mediaMap: join(repoRoot, '.buffer-x-media-urls.json'),
    scheduledLog: join(repoRoot, '.buffer-x-scheduled.json'),
    repostAfterDays: 0,
    verifyMediaUrls: true,
    scheduleWindowStart: DEFAULT_SCHEDULE_WINDOW_START,
    scheduleWindowEnd: DEFAULT_SCHEDULE_WINDOW_END,
    scheduleIntervalMinutes: DEFAULT_SCHEDULE_INTERVAL_MINUTES,
    sameDayOnly: false,
    out: join(repoRoot, '.buffer-x-queue.json'),
  };

  for (const arg of argv) {
    if (arg === '--dry-run') continue;
    else if (arg.startsWith('--current-scheduled=')) args.currentScheduled = parseNonNegativeInt(arg, '--current-scheduled');
    else if (arg.startsWith('--limit=')) args.limit = parseNonNegativeInt(arg, '--limit');
    else if (arg.startsWith('--reserve-slots=')) args.reserveSlots = parseNonNegativeInt(arg, '--reserve-slots');
    else if (arg.startsWith('--platform-count=')) args.platformCount = parsePositiveInt(arg, '--platform-count');
    else if (arg.startsWith('--max-posts=')) args.maxPosts = parsePositiveInt(arg, '--max-posts');
    else if (arg.startsWith('--max-duration-seconds=')) args.maxDurationSeconds = parsePositiveNumber(arg, '--max-duration-seconds');
    else if (arg.startsWith('--target-cutdown-seconds=')) args.targetCutdownSeconds = parsePositiveNumber(arg, '--target-cutdown-seconds');
    else if (arg.startsWith('--max-bytes=')) args.maxBytes = parsePositiveInt(arg, '--max-bytes');
    else if (arg.startsWith('--slugs=')) args.slugs = parseSlugList(arg.slice('--slugs='.length));
    else if (arg.startsWith('--media-map=')) args.mediaMap = resolve(arg.slice('--media-map='.length));
    else if (arg.startsWith('--scheduled-log=')) args.scheduledLog = resolve(arg.slice('--scheduled-log='.length));
    else if (arg.startsWith('--repost-after-days=')) args.repostAfterDays = parseNonNegativeInt(arg, '--repost-after-days');
    else if (arg === '--verify-media-urls') args.verifyMediaUrls = true;
    else if (arg === '--skip-media-url-verification') args.verifyMediaUrls = false;
    else if (arg.startsWith('--schedule-window-start=')) args.scheduleWindowStart = arg.slice('--schedule-window-start='.length).trim();
    else if (arg.startsWith('--schedule-window-end=')) args.scheduleWindowEnd = arg.slice('--schedule-window-end='.length).trim();
    else if (arg.startsWith('--schedule-interval-minutes=')) args.scheduleIntervalMinutes = parsePositiveInt(arg, '--schedule-interval-minutes');
    else if (arg === '--same-day-only') args.sameDayOnly = true;
    else if (arg.startsWith('--out=')) args.out = resolve(arg.slice('--out='.length));
    else usage();
  }

  if (args.currentScheduled === null) {
    throw new Error('Missing --current-scheduled. Query Buffer scheduled/sending count first.');
  }
  if (args.reserveSlots > args.limit) throw new Error('--reserve-slots cannot be greater than --limit.');
  if (args.targetCutdownSeconds > args.maxDurationSeconds) {
    throw new Error('--target-cutdown-seconds cannot exceed --max-duration-seconds.');
  }
  args.scheduleWindowStart = parseClock(args.scheduleWindowStart, '--schedule-window-start');
  args.scheduleWindowEnd = parseClock(args.scheduleWindowEnd, '--schedule-window-end');
  if (minutesOfDay(args.scheduleWindowStart) >= minutesOfDay(args.scheduleWindowEnd)) {
    throw new Error('--schedule-window-start must be earlier than --schedule-window-end.');
  }
  return args;
}

function parseNonNegativeInt(arg, name) {
  const raw = arg.slice(`${name}=`.length);
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a non-negative integer.`);
  return Number(raw);
}

function parsePositiveNumber(arg, name) {
  const raw = arg.slice(`${name}=`.length);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
  return value;
}

function parsePositiveInt(arg, name) {
  const raw = arg.slice(`${name}=`.length);
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) throw new Error(`${name} must be a positive integer.`);
  return Number(raw);
}

function parseClock(value, name) {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new Error(`${name} must use HH:MM in 24-hour time.`);
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function minutesOfDay(clock) {
  return clock.hour * 60 + clock.minute;
}

function parseSlugList(raw) {
  return raw
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse JSON at ${path}: ${error.message}`);
  }
}

function readJsonIfExists(path, fallback) {
  if (!path || !existsSync(path)) return fallback;
  return readJson(path);
}

function cleanText(value) {
  return String(value || '')
    .replace(/[—–]/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function readMediaMap(path) {
  const json = readJsonIfExists(path, {});
  return json.videos || json.media || json;
}

function readScheduledState(path, repostAfterDays) {
  const state = {
    activeSlugs: new Set(),
    staleBySlug: new Map(),
  };
  const json = readJsonIfExists(path, []);
  const entries = Array.isArray(json) ? json : json.scheduled || json.posts || [];
  const staleCutoff = Date.now() - STALE_SCHEDULED_GRACE_MINUTES * 60_000;

  for (const entry of entries) {
    if (typeof entry === 'string') {
      state.activeSlugs.add(entry);
      continue;
    }

    const slug = entry?.slug;
    if (!slug) continue;
    const status = String(entry?.status || '').toLowerCase();
    if (['error', 'failed', 'blocked', 'deleted'].includes(status)) continue;

    const dueTime = Date.parse(entry?.dueAt || '');
    if (status === 'scheduled' && Number.isFinite(dueTime) && dueTime < staleCutoff) {
      state.staleBySlug.set(slug, entry);
      continue;
    }

    if (scheduledEntryBlocksPlanning(entry, { repostAfterDays })) state.activeSlugs.add(slug);
  }

  return state;
}

function mediaUrlForSlug(slug, mediaMap) {
  const mapped = mediaMap[slug];
  if (typeof mapped === 'string' && mapped.trim()) return mapped.trim();
  if (mapped?.url) return String(mapped.url).trim();
  if (mapped?.public_media_url) return String(mapped.public_media_url).trim();
  return '';
}

const localDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SCHEDULE_TIME_ZONE,
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
  const earliest = new Date(now.getTime() + MIN_SCHEDULE_LEAD_MINUTES * 60_000);
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

function publicReelPath(slug) {
  return join(publicReelsRoot, slug, `${slug}.mp4`);
}

function publicXReelPath(slug) {
  return join(publicXReelsRoot, slug, `${slug}.mp4`);
}

function videoOutPath(slug) {
  return join(videoOutRoot, slug, `${slug}.mp4`);
}

function localVideoPath(slug) {
  const publicXPath = publicXReelPath(slug);
  if (existsSync(publicXPath)) return publicXPath;
  const publicPath = publicReelPath(slug);
  if (existsSync(publicPath)) return publicPath;
  return videoOutPath(slug);
}

function requiredPublicVideoPath(slug, mediaUrl) {
  return mediaUrl.includes('/reels-x/') ? publicXReelPath(slug) : publicReelPath(slug);
}

function durationSeconds(path) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  const duration = Number(result.stdout.trim());
  return Number.isFinite(duration) ? duration : null;
}

function fileSizeBytes(path) {
  try {
    return statSync(path).size;
  } catch {
    return null;
  }
}

function socialCopyPath(slug) {
  return join(blogRoot, slug, 'social-copy.json');
}

function releaseQaPath(slug) {
  return join(videoOutRoot, slug, 'release-qa.json');
}

function releaseQaBlocker(slug) {
  const path = releaseQaPath(slug);
  if (!existsSync(path)) return { reason: 'missing_release_qa', path };
  let releaseQa;
  try {
    releaseQa = readJson(path);
  } catch (error) {
    return { reason: 'invalid_release_qa', path, detail: error.message };
  }
  if (releaseQa.readyForPosting) return null;
  return {
    reason: 'release_qa_not_ready_for_posting',
    path,
    pass: Boolean(releaseQa.pass),
    manualCaptionReview: Boolean(releaseQa.manualCaptionReview),
    errors: releaseQa.errors || [],
    warnings: releaseQa.warnings || [],
  };
}

function renderedBacklogFromPosts() {
  const posts = readJson(join(blogRoot, 'posts.json'));
  return posts
    .filter((post) => post?.slug)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map((post) => post.slug);
}

function buildJob(slug, text, mediaUrl, duration) {
  return {
    slug,
    channelId: X_CHANNEL_ID,
    channelName: X_CHANNEL_NAME,
    publicMediaUrl: mediaUrl,
    durationSeconds: Number(duration.toFixed(3)),
    text,
    textLength: text.length,
    createPostPayload: {
      channelId: X_CHANNEL_ID,
      mode: 'customScheduled',
      schedulingType: 'automatic',
      text,
      assets: [
        {
          video: {
            url: mediaUrl,
          },
        },
      ],
      metadata: {
        twitter: {
          isAiGenerated: true,
        },
      },
    },
  };
}

function applyDueAt(job, dueAtDate) {
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
  const { sharedCapacity, perPlatformCapacity } = calculatePlatformCapacity(args);
  const capacity = args.maxPosts === null ? perPlatformCapacity : Math.min(perPlatformCapacity, args.maxPosts);
  const mediaMap = readMediaMap(args.mediaMap);
  const scheduledState = readScheduledState(args.scheduledLog, args.repostAfterDays);
  const scheduledSlugs = scheduledState.activeSlugs;
  const slugs = args.slugs.length ? args.slugs : renderedBacklogFromPosts();

  const ready = [];
  const blocked = [];
  const skipped = [];

  for (const slug of [...new Set(slugs)]) {
    const staleEntry = scheduledState.staleBySlug.get(slug);
    if (staleEntry) {
      blocked.push({
        slug,
        reason: 'stale_scheduled_log_needs_buffer_reconcile',
        path: args.scheduledLog,
        postId: staleEntry.postId,
        dueAt: staleEntry.dueAt,
        status: staleEntry.status,
      });
      continue;
    }

    if (scheduledSlugs.has(slug)) {
      skipped.push({ slug, reason: 'already_scheduled' });
      continue;
    }

    const mediaUrl = mediaUrlForSlug(slug, mediaMap);
    if (!isHttpsUrl(mediaUrl)) {
      blocked.push({ slug, reason: 'missing_https_media_url' });
      continue;
    }

    const copyPath = socialCopyPath(slug);
    if (!existsSync(copyPath)) {
      skipped.push({ slug, reason: 'missing_social_copy', path: copyPath });
      continue;
    }

    const releaseBlocker = releaseQaBlocker(slug);
    if (releaseBlocker) {
      blocked.push({ slug, ...releaseBlocker });
      continue;
    }

    const videoPath = localVideoPath(slug);
    if (!existsSync(videoPath)) {
      skipped.push({ slug, reason: 'missing_local_video', path: videoPath });
      continue;
    }
    const publicPath = requiredPublicVideoPath(slug, mediaUrl);
    if (!existsSync(publicPath)) {
      blocked.push({
        slug,
        reason: 'missing_public_reel_for_deploy',
        path: publicPath,
        sourceVideo: videoPath,
      });
      continue;
    }

    if (args.verifyMediaUrls) {
      const verification = await verifyPublicMp4Url(mediaUrl, { maxBytes: args.maxBytes });
      if (!verification.ok) {
        blocked.push({
          slug,
          reason: verification.reason,
          mediaUrl,
          localVideo: videoPath,
          method: verification.method,
          status: verification.status,
          contentType: verification.contentType,
          bytes: verification.bytes,
          maxBytes: verification.maxBytes,
          detail: verification.detail,
        });
        continue;
      }
      const localPublicBytes = fileSizeBytes(publicPath);
      if (Number.isFinite(verification.bytes) && Number.isFinite(localPublicBytes)
        && verification.bytes !== localPublicBytes) {
        blocked.push({
          slug,
          reason: 'public_media_size_mismatch',
          mediaUrl,
          hostedBytes: verification.bytes,
          localBytes: localPublicBytes,
          path: publicPath,
        });
        continue;
      }
    }

    const duration = durationSeconds(videoPath);
    if (duration === null) {
      blocked.push({ slug, reason: 'duration_unavailable', path: videoPath });
      continue;
    }
    const sourcePath = videoOutPath(slug);
    const sourceDuration = durationSeconds(sourcePath);
    if (sourceDuration === null) {
      blocked.push({ slug, reason: 'source_duration_unavailable', path: sourcePath });
      continue;
    }
    const durationIntegrity = validateCutdownDuration({
      sourceDuration,
      outputDuration: duration,
      maximumDuration: args.maxDurationSeconds,
      targetDuration: args.targetCutdownSeconds,
    });
    if (durationIntegrity.reason === 'output_truncated') {
      blocked.push({
        slug,
        reason: 'x_video_truncated',
        durationSeconds: Number(duration.toFixed(3)),
        minimumDurationSeconds: Number(durationIntegrity.minimumDuration.toFixed(3)),
        sourceDurationSeconds: Number(sourceDuration.toFixed(3)),
        path: videoPath,
      });
      continue;
    }
    if (durationIntegrity.reason === 'output_too_long') {
      blocked.push({
        slug,
        reason: 'x_video_too_long',
        durationSeconds: Number(duration.toFixed(3)),
        maxDurationSeconds: args.maxDurationSeconds,
        path: videoPath,
      });
      continue;
    }
    if (!durationIntegrity.ok) {
      blocked.push({ slug, reason: 'x_video_duration_invalid', durationSeconds: duration, path: videoPath });
      continue;
    }

    const bytes = fileSizeBytes(videoPath);
    if (bytes === null) {
      blocked.push({ slug, reason: 'size_unavailable', path: videoPath });
      continue;
    }
    if (bytes > args.maxBytes) {
      blocked.push({
        slug,
        reason: 'media_too_large_for_cloudflare_assets',
        bytes,
        maxBytes: args.maxBytes,
        path: videoPath,
      });
      continue;
    }

    const copy = readJson(copyPath);
    try {
      assertSocialCopyQuality(copy, slug);
    } catch (error) {
      blocked.push({ slug, reason: 'social_copy_quality_failed', detail: error.message, path: copyPath });
      continue;
    }
    const text = cleanText(copy?.reel?.x);
    if (!text) {
      blocked.push({ slug, reason: 'missing_reel_x_copy', path: copyPath });
      continue;
    }
    if (text.length > MAX_X_CHARS) {
      blocked.push({ slug, reason: 'x_text_too_long', textLength: text.length, maxLength: MAX_X_CHARS });
      continue;
    }

    ready.push(buildJob(slug, text, mediaUrl, duration));
  }

  const selectedCount = Math.min(ready.length, capacity);
  const selectedDueAtDates = nextScheduleDates(selectedCount, args);
  const selected = ready
    .slice(0, selectedDueAtDates.length)
    .map((job, index) => applyDueAt(job, selectedDueAtDates[index]));
  const readyOverflow = ready.slice(selected.length);
  const queue = {
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + QUEUE_EXPIRES_MINUTES * 60_000).toISOString(),
    buffer: {
      organizationId: BUFFER_ORGANIZATION_ID,
      channelId: X_CHANNEL_ID,
      channelName: X_CHANNEL_NAME,
      currentScheduled: args.currentScheduled,
      limit: args.limit,
      reserveSlots: args.reserveSlots,
      platformCount: args.platformCount,
      maxPosts: args.maxPosts,
      sharedCapacity,
      capacity,
    },
    x: {
      maxDurationSeconds: args.maxDurationSeconds,
      targetCutdownSeconds: args.targetCutdownSeconds,
      maxTextLength: MAX_X_CHARS,
      schedulingMode: 'customScheduled',
      schedulingType: 'automatic',
      scheduleTimeZone: SCHEDULE_TIME_ZONE,
      scheduleWindowStart: `${String(args.scheduleWindowStart.hour).padStart(2, '0')}:${String(args.scheduleWindowStart.minute).padStart(2, '0')}`,
      scheduleWindowEnd: `${String(args.scheduleWindowEnd.hour).padStart(2, '0')}:${String(args.scheduleWindowEnd.minute).padStart(2, '0')}`,
      scheduleIntervalMinutes: args.scheduleIntervalMinutes,
      sameDayOnly: args.sameDayOnly,
      mediaUrlVerification: args.verifyMediaUrls ? 'required' : 'not_run',
      repostAfterDays: args.repostAfterDays,
      maxBytes: args.maxBytes,
      verificationRequired: 'After create_post, call get_post and confirm assets[0].type is video before logging the slug.',
    },
    summary: {
      candidates: new Set(slugs).size,
      ready: ready.length,
      selected: selected.length,
      readyOverflow: readyOverflow.length,
      blocked: blocked.length,
      skipped: skipped.length,
      alreadyScheduled: scheduledSlugs.size,
      staleScheduledNeedsReconcile: scheduledState.staleBySlug.size,
    },
    selected,
    readyOverflow,
    blocked,
    skipped,
  };

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(queue, null, 2)}\n`);

  console.log(`[buffer-x] Buffer scheduled/sending: ${args.currentScheduled}/${args.limit}`);
  console.log(`[buffer-x] Reserved slots: ${args.reserveSlots}`);
  console.log(`[buffer-x] Capacity available after reserve: ${capacity}`);
  console.log(`[buffer-x] Ready: ${ready.length}; selected: ${selected.length}; blocked: ${blocked.length}; skipped: ${skipped.length}`);
  if (scheduledState.staleBySlug.size > 0) {
    console.log(`[buffer-x] Stale scheduled-log entries need Buffer reconciliation: ${scheduledState.staleBySlug.size}`);
  }
  console.log(`[buffer-x] Wrote ${args.out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`[buffer-x] ${error.message}`);
    process.exit(1);
  }
}
