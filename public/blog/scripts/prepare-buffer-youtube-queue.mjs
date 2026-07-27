#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isHttpsUrl, verifyPublicMp4Url } from './lib/buffer-media-verification.mjs';
import { assertRenderedReelAudioCleared } from '../../../video/scripts/audio-rights.mjs';
import { assertSocialCopyQuality } from './lib/social-copy-quality.mjs';
import { calculatePlatformCapacity } from './lib/buffer-capacity.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const blogRoot = join(repoRoot, 'public', 'blog');
const videoRoot = join(repoRoot, 'video', 'out');
const postingPackScript = join(repoRoot, 'public', 'blog', 'scripts', 'prepare-posting-pack.mjs');

const BUFFER_ORGANIZATION_ID = '6a3e62cb6adcaa97fe293a7d';
const BUFFER_CHANNEL_ID = '6a3e63375ab6d2f1067461b2';
const BUFFER_CHANNEL_NAME = 'Nick';
const DEFAULT_LIMIT = 10;
const DEFAULT_PLATFORM_COUNT = 3;
const DEFAULT_RESERVE_SLOTS = 1;
const DEFAULT_CATEGORY_ID = '27';
const SCHEDULE_TIME_ZONE = 'America/Los_Angeles';
const DEFAULT_SCHEDULE_WINDOW_START = '13:00';
const DEFAULT_SCHEDULE_WINDOW_END = '19:00';
const DEFAULT_SCHEDULE_INTERVAL_MINUTES = 105;
const MIN_SCHEDULE_LEAD_MINUTES = 15;
const QUEUE_EXPIRES_MINUTES = 30;
const MAX_YOUTUBE_BUFFER_SECONDS = 179;
const MAX_CLOUDFLARE_ASSET_BYTES = 25 * 1024 * 1024;
const STALE_SCHEDULED_GRACE_MINUTES = 60;

function usage() {
  console.error(`Usage: node public/blog/scripts/prepare-buffer-youtube-queue.mjs [options]

Plans the next YouTube posts for Buffer without exceeding the scheduled-post limit.

Options:
  --current-scheduled=N          Current scheduled/sending posts in Buffer. Required for production runs.
  --limit=N                      Buffer scheduled post limit. Default: 10.
  --reserve-slots=N              Slots left as organization-wide safety headroom. Default: 1.
  --platform-count=N             Platforms sharing capacity. Default: 3.
  --slugs=a,b,c                  Optional explicit backlog order. Default: newest rendered posts from posts.json.
  --media-map=path               JSON map of slug to public MP4 URL.
  --scheduled-log=path           JSON log of already scheduled slugs. Default: .buffer-youtube-scheduled.json.
  --media-base-url=https://...   Derive MP4 URLs as <base>/<slug>/<slug>.mp4.
  --media-url-template=https://cdn/{slug}.mp4
                                Derive MP4 URLs with {slug} replacement.
  --skip-media-url-verification  Offline planning only. Production runs verify URLs by default.
  --max-duration-seconds=N       Maximum local MP4 duration for Buffer YouTube Shorts. Default: 179.
  --max-bytes=N                  Maximum local MP4 size for Cloudflare assets. Default: 26214400.
  --schedule-window-start=HH:MM  Earliest local Buffer due time. Default: 13:00.
  --schedule-window-end=HH:MM    Latest local Buffer due time. Default: 19:00.
  --schedule-interval-minutes=N  Minutes between selected posts. Default: 105.
  --category-id=ID               YouTube category ID. Default: 27.
  --out=path                     Output queue JSON. Default: .buffer-youtube-queue.json.
  --write-packs                  Write posting-pack files for ready jobs.
  --dry-run                      Plan only. This is the default behavior.

Examples:
  npm run social:buffer:plan -- --current-scheduled=0 --media-map=.buffer-media-urls.json --write-packs
  npm run social:buffer:plan -- --current-scheduled=3 --media-base-url=https://cdn.example.com/reels
`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = {
    currentScheduled: null,
    limit: DEFAULT_LIMIT,
    reserveSlots: DEFAULT_RESERVE_SLOTS,
    platformCount: DEFAULT_PLATFORM_COUNT,
    slugs: [],
    mediaMap: '',
    scheduledLog: join(repoRoot, '.buffer-youtube-scheduled.json'),
    mediaBaseUrl: '',
    mediaUrlTemplate: '',
    verifyMediaUrls: true,
    maxDurationSeconds: MAX_YOUTUBE_BUFFER_SECONDS,
    maxBytes: MAX_CLOUDFLARE_ASSET_BYTES,
    scheduleWindowStart: DEFAULT_SCHEDULE_WINDOW_START,
    scheduleWindowEnd: DEFAULT_SCHEDULE_WINDOW_END,
    scheduleIntervalMinutes: DEFAULT_SCHEDULE_INTERVAL_MINUTES,
    categoryId: DEFAULT_CATEGORY_ID,
    out: join(repoRoot, '.buffer-youtube-queue.json'),
    writePacks: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') continue;
    if (arg === '--write-packs') args.writePacks = true;
    else if (arg.startsWith('--current-scheduled=')) args.currentScheduled = parseNonNegativeInt(arg, '--current-scheduled');
    else if (arg.startsWith('--limit=')) args.limit = parseNonNegativeInt(arg, '--limit');
    else if (arg.startsWith('--reserve-slots=')) args.reserveSlots = parseNonNegativeInt(arg, '--reserve-slots');
    else if (arg.startsWith('--platform-count=')) args.platformCount = parsePositiveInt(arg, '--platform-count');
    else if (arg.startsWith('--slugs=')) args.slugs = arg.slice('--slugs='.length).split(',').map((slug) => slug.trim()).filter(Boolean);
    else if (arg.startsWith('--media-map=')) args.mediaMap = resolve(arg.slice('--media-map='.length));
    else if (arg.startsWith('--scheduled-log=')) args.scheduledLog = resolve(arg.slice('--scheduled-log='.length));
    else if (arg.startsWith('--media-base-url=')) args.mediaBaseUrl = trimTrailingSlash(arg.slice('--media-base-url='.length).trim());
    else if (arg.startsWith('--media-url-template=')) args.mediaUrlTemplate = arg.slice('--media-url-template='.length).trim();
    else if (arg === '--verify-media-urls') args.verifyMediaUrls = true;
    else if (arg === '--skip-media-url-verification') args.verifyMediaUrls = false;
    else if (arg.startsWith('--max-duration-seconds=')) args.maxDurationSeconds = parsePositiveNumber(arg, '--max-duration-seconds');
    else if (arg.startsWith('--max-bytes=')) args.maxBytes = parsePositiveInt(arg, '--max-bytes');
    else if (arg.startsWith('--schedule-window-start=')) args.scheduleWindowStart = arg.slice('--schedule-window-start='.length).trim();
    else if (arg.startsWith('--schedule-window-end=')) args.scheduleWindowEnd = arg.slice('--schedule-window-end='.length).trim();
    else if (arg.startsWith('--schedule-interval-minutes=')) args.scheduleIntervalMinutes = parsePositiveInt(arg, '--schedule-interval-minutes');
    else if (arg.startsWith('--category-id=')) args.categoryId = arg.slice('--category-id='.length).trim();
    else if (arg.startsWith('--out=')) args.out = resolve(arg.slice('--out='.length));
    else usage();
  }

  if (args.currentScheduled === null) {
    throw new Error('Missing --current-scheduled. Query Buffer first, then pass the scheduled/sending count.');
  }
  if (args.reserveSlots > args.limit) {
    throw new Error('--reserve-slots cannot be greater than --limit.');
  }
  args.scheduleWindowStart = parseClock(args.scheduleWindowStart, '--schedule-window-start');
  args.scheduleWindowEnd = parseClock(args.scheduleWindowEnd, '--schedule-window-end');
  if (minutesOfDay(args.scheduleWindowStart) >= minutesOfDay(args.scheduleWindowEnd)) {
    throw new Error('--schedule-window-start must be earlier than --schedule-window-end.');
  }
  if (!args.categoryId) throw new Error('Missing --category-id.');
  return args;
}

function parseNonNegativeInt(arg, name) {
  const raw = arg.slice(`${name}=`.length);
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a non-negative integer.`);
  return Number(raw);
}

function parsePositiveInt(arg, name) {
  const raw = arg.slice(`${name}=`.length);
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) throw new Error(`${name} must be a positive integer.`);
  return Number(raw);
}

function parsePositiveNumber(arg, name) {
  const raw = arg.slice(`${name}=`.length);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
  return value;
}

function parseClock(value, name) {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new Error(`${name} must use HH:MM in 24-hour time.`);
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function minutesOfDay(clock) {
  return clock.hour * 60 + clock.minute;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse JSON at ${path}: ${error.message}`);
  }
}

function cleanText(value) {
  return String(value || '')
    .replace(/[—–]/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstSentence(text) {
  const match = cleanText(text).match(/^(.+?[.!?])(\s|$)/);
  return match ? match[1].trim() : cleanText(text).slice(0, 90).trim();
}

function truncate(text, max) {
  const clean = cleanText(text);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}...`;
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildYouTubeTitle(copy, slug) {
  const caption = copy?.reel?.youtube || copy?.reel?.instagram || copy?.reel?.facebook || '';
  return truncate(firstSentence(caption) || titleFromSlug(slug), 95);
}

function canonicalBlogUrl(slug) {
  return `https://fuseddistribution.com/blog/${slug}/`;
}

function buildYouTubeDescription(copy, slug) {
  const base = copy?.reel?.youtube || copy?.reel?.instagram || copy?.reel?.facebook || '';
  const blogUrl = canonicalBlogUrl(slug);
  const parts = [
    cleanText(base).replace(/\n+#/g, '\n\n#'),
    `Read the full post: ${blogUrl}`,
    copy.disclaimer || '',
  ].filter(Boolean);
  return cleanText(parts.join('\n\n'));
}

function readMediaMap(path) {
  if (!path) return {};
  if (!existsSync(path)) return {};
  const json = readJson(path);
  return json.videos || json.media || json;
}

function readScheduledState(path) {
  const state = {
    activeSlugs: new Set(),
    staleBySlug: new Map(),
  };
  if (!path || !existsSync(path)) return state;
  const json = readJson(path);
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

    state.activeSlugs.add(slug);
  }

  return state;
}

function mediaUrlForSlug(slug, args, mediaMap) {
  const mapped = mediaMap[slug];
  if (typeof mapped === 'string' && mapped.trim()) return mapped.trim();
  if (mapped?.url) return String(mapped.url).trim();
  if (mapped?.public_media_url) return String(mapped.public_media_url).trim();
  if (args.mediaUrlTemplate) return args.mediaUrlTemplate.replaceAll('{slug}', slug);
  if (args.mediaBaseUrl) return `${args.mediaBaseUrl}/${slug}/${slug}.mp4`;
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

function nextScheduleDates(count, args) {
  const results = [];
  let dayParts = zonedParts(new Date());
  let windowStart = scheduledDateForLocalDay(dayParts, args.scheduleWindowStart);
  let windowEnd = scheduledDateForLocalDay(dayParts, args.scheduleWindowEnd);
  const intervalMs = args.scheduleIntervalMinutes * 60_000;
  const earliest = new Date(Date.now() + MIN_SCHEDULE_LEAD_MINUTES * 60_000);
  let next = windowStart;

  if (earliest > windowStart) {
    const intervalsAfterStart = Math.ceil((earliest.getTime() - windowStart.getTime()) / intervalMs);
    next = new Date(windowStart.getTime() + intervalsAfterStart * intervalMs);
  }

  while (results.length < count) {
    if (next > windowEnd) {
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

function localVideoPath(slug) {
  return join(videoRoot, slug, `${slug}.mp4`);
}

function publicReelPath(slug) {
  return join(repoRoot, 'public', 'reels', slug, `${slug}.mp4`);
}

function bufferVideoPath(slug) {
  const publicPath = publicReelPath(slug);
  return existsSync(publicPath) ? publicPath : localVideoPath(slug);
}

function stalePublicReelCopy(slug) {
  const sourcePath = localVideoPath(slug);
  const publicPath = publicReelPath(slug);
  if (!existsSync(sourcePath) || !existsSync(publicPath)) return null;
  const sourceStat = statSync(sourcePath);
  const publicStat = statSync(publicPath);
  if (publicStat.mtimeMs + 1000 >= sourceStat.mtimeMs) return null;
  return {
    sourcePath,
    publicPath,
    sourceMtime: sourceStat.mtime.toISOString(),
    publicMtime: publicStat.mtime.toISOString(),
  };
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
  return join(videoRoot, slug, 'release-qa.json');
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
  const postsPath = join(blogRoot, 'posts.json');
  const posts = readJson(postsPath);
  return posts
    .filter((post) => post?.slug)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map((post) => post.slug);
}

function unique(values) {
  return [...new Set(values)];
}

function buildJob(slug, copy, mediaUrl, categoryId) {
  const title = buildYouTubeTitle(copy, slug);
  const blogUrl = canonicalBlogUrl(slug);
  const description = buildYouTubeDescription(copy, slug);
  return {
    slug,
    channelId: BUFFER_CHANNEL_ID,
    channelName: BUFFER_CHANNEL_NAME,
    publicMediaUrl: mediaUrl,
    blogUrl,
    title,
    description,
    createPostPayload: {
      channelId: BUFFER_CHANNEL_ID,
      mode: 'customScheduled',
      schedulingType: 'automatic',
      text: description,
      assets: [
        {
          video: {
            url: mediaUrl,
          },
        },
      ],
      metadata: {
        youtube: {
          title,
          categoryId,
          privacy: 'public',
          madeForKids: false,
          notifySubscribers: false,
          embeddable: true,
          license: 'youtube',
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

function writePostingPack(slug, mediaUrl) {
  const result = spawnSync(process.execPath, [postingPackScript, slug, `--media-url=${mediaUrl}`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`Could not write posting pack for ${slug}: ${result.stderr || result.stdout}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { sharedCapacity, perPlatformCapacity: capacity } = calculatePlatformCapacity(args);
  const mediaMap = readMediaMap(args.mediaMap);
  const scheduledState = readScheduledState(args.scheduledLog);
  const scheduledSlugs = scheduledState.activeSlugs;
  const candidates = unique(args.slugs.length ? args.slugs : renderedBacklogFromPosts());
  const ready = [];
  const blocked = [];
  const skipped = [];

  for (const slug of candidates) {
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
      skipped.push({ slug, reason: 'already_scheduled_log', path: args.scheduledLog });
      continue;
    }

    const videoPath = localVideoPath(slug);
    const publicVideoPath = bufferVideoPath(slug);
    const copyPath = socialCopyPath(slug);
    if (!existsSync(videoPath)) {
      skipped.push({ slug, reason: 'missing_local_video', path: videoPath });
      continue;
    }
    if (!existsSync(publicVideoPath)) {
      skipped.push({ slug, reason: 'missing_buffer_video', path: publicVideoPath });
      continue;
    }
    if (!existsSync(copyPath)) {
      skipped.push({ slug, reason: 'missing_social_copy', path: copyPath });
      continue;
    }

    const releaseBlocker = releaseQaBlocker(slug);
    if (releaseBlocker) {
      blocked.push({ slug, ...releaseBlocker });
      continue;
    }

    try {
      assertRenderedReelAudioCleared(slug, { repoRoot });
    } catch (error) {
      blocked.push({ slug, reason: 'source_render_audio_rights_blocked', detail: error.message, localVideo: videoPath });
      continue;
    }

    const stalePublicCopy = stalePublicReelCopy(slug);
    if (stalePublicCopy) {
      blocked.push({
        slug,
        reason: 'stale_public_reel_copy_older_than_source_render',
        action: `Regenerate with npm run social:buffer:youtube:media -- --slugs=${slug}`,
        ...stalePublicCopy,
      });
      continue;
    }

    const duration = durationSeconds(publicVideoPath);
    if (duration === null) {
      blocked.push({ slug, reason: 'duration_unavailable', localVideo: publicVideoPath });
      continue;
    }
    if (duration > args.maxDurationSeconds) {
      blocked.push({
        slug,
        reason: 'youtube_video_too_long',
        durationSeconds: Number(duration.toFixed(3)),
        maxDurationSeconds: args.maxDurationSeconds,
        localVideo: publicVideoPath,
      });
      continue;
    }

    const bytes = fileSizeBytes(publicVideoPath);
    if (bytes === null) {
      blocked.push({ slug, reason: 'size_unavailable', localVideo: publicVideoPath });
      continue;
    }
    if (bytes > args.maxBytes) {
      blocked.push({
        slug,
        reason: 'media_too_large_for_cloudflare_assets',
        bytes,
        maxBytes: args.maxBytes,
        localVideo: publicVideoPath,
      });
      continue;
    }

    const mediaUrl = mediaUrlForSlug(slug, args, mediaMap);
    if (!isHttpsUrl(mediaUrl)) {
      blocked.push({
        slug,
        reason: 'missing_https_public_media_url',
        localVideo: videoPath,
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
    }

    const copy = readJson(copyPath);
    try {
      assertSocialCopyQuality(copy, slug);
    } catch (error) {
      blocked.push({ slug, reason: 'social_copy_quality_failed', detail: error.message, path: copyPath });
      continue;
    }
    ready.push(buildJob(slug, copy, mediaUrl, args.categoryId));
  }

  const selectedCount = Math.min(ready.length, capacity);
  const selectedDueAtDates = nextScheduleDates(selectedCount, args);
  const selected = ready
    .slice(0, capacity)
    .map((job, index) => applyDueAt(job, selectedDueAtDates[index]));
  if (args.writePacks) {
    for (const job of selected) writePostingPack(job.slug, job.publicMediaUrl);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + QUEUE_EXPIRES_MINUTES * 60_000).toISOString(),
    buffer: {
      organizationId: BUFFER_ORGANIZATION_ID,
      channelId: BUFFER_CHANNEL_ID,
      channelName: BUFFER_CHANNEL_NAME,
      currentScheduled: args.currentScheduled,
      limit: args.limit,
      reserveSlots: args.reserveSlots,
      platformCount: args.platformCount,
      sharedCapacity,
      capacity,
      mediaUrlVerification: args.verifyMediaUrls ? 'required' : 'not_run',
    },
    youtube: {
      categoryId: args.categoryId,
      schedulingMode: 'customScheduled',
      schedulingType: 'automatic',
      scheduleTimeZone: SCHEDULE_TIME_ZONE,
      scheduleWindowStart: `${String(args.scheduleWindowStart.hour).padStart(2, '0')}:${String(args.scheduleWindowStart.minute).padStart(2, '0')}`,
      scheduleWindowEnd: `${String(args.scheduleWindowEnd.hour).padStart(2, '0')}:${String(args.scheduleWindowEnd.minute).padStart(2, '0')}`,
      scheduleIntervalMinutes: args.scheduleIntervalMinutes,
      maxDurationSeconds: args.maxDurationSeconds,
      maxBytes: args.maxBytes,
    },
    summary: {
      candidates: candidates.length,
      ready: ready.length,
      selected: selected.length,
      blocked: blocked.length,
      skipped: skipped.length,
      alreadyScheduled: scheduledSlugs.size,
      staleScheduledNeedsReconcile: scheduledState.staleBySlug.size,
    },
    selected,
    readyOverflow: ready.slice(capacity),
    blocked,
    skipped,
  };

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`[buffer-youtube] Buffer scheduled/sending: ${args.currentScheduled}/${args.limit}`);
  console.log(`[buffer-youtube] Reserved slots: ${args.reserveSlots}`);
  console.log(`[buffer-youtube] Capacity available after reserve: ${capacity}`);
  console.log(`[buffer-youtube] Ready: ${ready.length}; selected: ${selected.length}; blocked: ${blocked.length}; skipped: ${skipped.length}`);
  if (scheduledState.staleBySlug.size > 0) {
    console.log(`[buffer-youtube] Stale scheduled-log entries need Buffer reconciliation: ${scheduledState.staleBySlug.size}`);
  }
  console.log(`[buffer-youtube] Wrote ${args.out}`);
  if (selected.length === 0 && blocked.length > 0) {
    console.log('[buffer-youtube] No posts selected because one or more candidates are blocked. Check blocked[].reason in the queue JSON.');
  }
}

try {
  await main();
} catch (error) {
  console.error(`[buffer-youtube] ${error.message}`);
  process.exit(1);
}
