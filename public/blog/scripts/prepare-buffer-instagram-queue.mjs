#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculatePlatformCapacity } from './lib/buffer-capacity.mjs';
import { isHttpsUrl, verifyPublicMp4Url } from './lib/buffer-media-verification.mjs';
import { assertSocialCopyQuality } from './lib/social-copy-quality.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const blogRoot = join(repoRoot, 'public', 'blog');
const organizationId = '6a3e62cb6adcaa97fe293a7d';
const instagramChannelId = '6a67c5d64b2d03035f4f0228';
const instagramChannelName = 'ahueman303';
const maximumCaptionLength = 2_200;
const maximumAssetBytes = 25 * 1024 * 1024;
const queueExpiryMinutes = 30;

function usage() {
  console.error(`Usage: node public/blog/scripts/prepare-buffer-instagram-queue.mjs --current-scheduled=N [options]

Builds Instagram Reel jobs from the already verified YouTube queue so every
Instagram post uses the same release-QA-cleared hosted video.

Options:
  --current-scheduled=N   Scheduled/sending count from one shared Buffer snapshot. Required.
  --limit=N               Organization-wide scheduled-post cap. Default: 10.
  --reserve-slots=N       Safety headroom across all channels. Default: 1.
  --platform-count=N      Platforms sharing capacity. Default: 3.
  --source-queue=path     Verified YouTube queue. Default: .buffer-youtube-queue.json.
  --scheduled-log=path    Instagram checkpoint log. Default: .buffer-instagram-scheduled.json.
  --out=path              Output queue. Default: .buffer-instagram-queue.json.
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

function parseArgs(argv) {
  const args = {
    currentScheduled: null,
    limit: 10,
    reserveSlots: 1,
    platformCount: 3,
    sourceQueue: join(repoRoot, '.buffer-youtube-queue.json'),
    scheduledLog: join(repoRoot, '.buffer-instagram-scheduled.json'),
    out: join(repoRoot, '.buffer-instagram-queue.json'),
    verifyMediaUrls: true,
  };
  for (const arg of argv) {
    const [name, value] = arg.split('=', 2);
    if (name === '--current-scheduled') args.currentScheduled = integerArg(value, name);
    else if (name === '--limit') args.limit = integerArg(value, name);
    else if (name === '--reserve-slots') args.reserveSlots = integerArg(value, name);
    else if (name === '--platform-count') args.platformCount = integerArg(value, name, { positive: true });
    else if (name === '--source-queue') args.sourceQueue = resolve(value);
    else if (name === '--scheduled-log') args.scheduledLog = resolve(value);
    else if (name === '--out') args.out = resolve(value);
    else if (arg === '--skip-media-url-verification') args.verifyMediaUrls = false;
    else if (arg === '--dry-run') continue;
    else usage();
  }
  if (args.currentScheduled === null) throw new Error('Missing --current-scheduled. Query Buffer once before planning all three platforms.');
  return args;
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { throw new Error(`Could not read ${path}: ${error.message}`); }
}

function scheduledSlugs(path) {
  if (!existsSync(path)) return new Set();
  const value = readJson(path);
  const entries = Array.isArray(value) ? value : value.scheduled || [];
  return new Set(entries
    .filter((entry) => !['error', 'deleted'].includes(entry.status))
    .map((entry) => entry.slug));
}

function cleanCaption(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

export function buildInstagramJob(source, caption) {
  return {
    slug: source.slug,
    channelId: instagramChannelId,
    channelName: instagramChannelName,
    publicMediaUrl: source.publicMediaUrl,
    text: caption,
    textLength: caption.length,
    dueAt: source.dueAt,
    createPostPayload: {
      channelId: instagramChannelId,
      mode: 'customScheduled',
      schedulingType: 'automatic',
      dueAt: source.dueAt,
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceQueue = readJson(args.sourceQueue);
  if (Date.parse(sourceQueue.expiresAt) <= Date.now()) throw new Error(`Source queue expired at ${sourceQueue.expiresAt}; regenerate it.`);
  const sourceJobs = Array.isArray(sourceQueue.selected) ? sourceQueue.selected : [];
  if (!sourceJobs.length) throw new Error('Verified source queue has no selected jobs.');
  const priorSlugs = scheduledSlugs(args.scheduledLog);
  const { sharedCapacity, perPlatformCapacity: capacity } = calculatePlatformCapacity(args);
  const ready = [];
  const blocked = [];
  const skipped = [];

  for (const source of sourceJobs) {
    if (priorSlugs.has(source.slug)) {
      skipped.push({ slug: source.slug, reason: 'already_scheduled' });
      continue;
    }
    if (!source.dueAt || Date.parse(source.dueAt) <= Date.now()) {
      blocked.push({ slug: source.slug, reason: 'missing_or_past_due_at', dueAt: source.dueAt || null });
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
    try { assertSocialCopyQuality(copy, source.slug); }
    catch (error) {
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

  const selected = ready.slice(0, capacity);
  const queue = {
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + queueExpiryMinutes * 60_000).toISOString(),
    buffer: {
      organizationId,
      channelId: instagramChannelId,
      channelName: instagramChannelName,
      currentScheduled: args.currentScheduled,
      limit: args.limit,
      reserveSlots: args.reserveSlots,
      platformCount: args.platformCount,
      sharedCapacity,
      capacity,
    },
    instagram: {
      postType: 'reel',
      shouldShareToFeed: true,
      schedulingType: 'automatic',
      maximumCaptionLength,
      mediaUrlVerification: args.verifyMediaUrls ? 'required' : 'not_run',
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
    readyOverflow: ready.slice(capacity),
    blocked,
    skipped,
  };
  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(queue, null, 2)}\n`);
  console.log(`[buffer-instagram] shared scheduled/sending snapshot: ${args.currentScheduled}/${args.limit}`);
  console.log(`[buffer-instagram] selected: ${selected.length}; blocked: ${blocked.length}; skipped: ${skipped.length}`);
  console.log(`[buffer-instagram] wrote ${args.out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[buffer-instagram] ${error.message}`);
    process.exit(1);
  });
}
