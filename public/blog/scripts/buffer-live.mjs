#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertScheduledCapacity, BUFFER_SCHEDULED_POST_LIMIT } from './lib/buffer-capacity.mjs';
import { normalizeScheduledLog, reconcileScheduledLog } from './lib/buffer-log-reconciliation.mjs';
import { calculateDailyChannelTargets, evaluateDailyFloorEnforcement, evaluateDailyFloorReadinessCheckpoint, mergeBufferPosts } from './lib/buffer-daily-targets.mjs';
import { collectBufferPostPages } from './lib/buffer-post-pagination.mjs';
import { preflightBufferMedia } from './lib/buffer-publish-preflight.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const apiUrl = 'https://api.buffer.com';
const organizationId = '6a3e62cb6adcaa97fe293a7d';
const supportedChannelIds = new Set([
  '6a3e63375ab6d2f1067461b2',
  '6a3e73fb5ab6d2f10674b516',
  '6a67c5d64b2d03035f4f0228',
]);

function usage() {
  console.error(`Usage:
  node public/blog/scripts/buffer-live.mjs status [--target-per-channel=N] [--require-on-time-floor]
  node public/blog/scripts/buffer-live.mjs channels
  node public/blog/scripts/buffer-live.mjs publish --queue=path [--log=path] [--dry-run]
  node public/blog/scripts/buffer-live.mjs edit --post-id=id --text-file=path

The publish command is resumable. It persists each Buffer-confirmed post ID after
the create mutation and verifies that the post is scheduled/sending with a video.
It also re-checks the public MP4 immediately before create; failed media is a hard stop.`);
  process.exit(2);
}

function parseArgs(argv) {
  const [command, ...options] = argv;
  const args = { command, queue: '', log: '', dryRun: false, postId: '', textFile: '', targetPerChannel: 3, requireOnTimeFloor: false };
  for (const option of options) {
    if (option.startsWith('--queue=')) args.queue = resolve(option.slice('--queue='.length));
    else if (option.startsWith('--log=')) args.log = resolve(option.slice('--log='.length));
    else if (option.startsWith('--post-id=')) args.postId = option.slice('--post-id='.length).trim();
    else if (option.startsWith('--text-file=')) args.textFile = resolve(option.slice('--text-file='.length));
    else if (option.startsWith('--target-per-channel=')) {
      const value = option.slice('--target-per-channel='.length);
      if (!/^\d+$/.test(value) || Number(value) < 3) throw new Error('--target-per-channel must be an integer of at least 3.');
      args.targetPerChannel = Number(value);
    }
    else if (option === '--require-on-time-floor') args.requireOnTimeFloor = true;
    else if (option === '--dry-run') args.dryRun = true;
    else usage();
  }
  if (!['status', 'channels', 'publish', 'edit'].includes(command)) usage();
  if (command === 'publish' && !args.queue) usage();
  if (command === 'edit' && (!args.postId || !args.textFile)) usage();
  return args;
}

function loadAccessToken() {
  if (process.env.BUFFER_ACCESS_TOKEN) return process.env.BUFFER_ACCESS_TOKEN;
  const envPath = join(repoRoot, '.env.local');
  if (!existsSync(envPath)) throw new Error(`Missing ${envPath}`);
  const line = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith('BUFFER_ACCESS_TOKEN='));
  if (!line) throw new Error('BUFFER_ACCESS_TOKEN is not configured.');
  const raw = line.slice('BUFFER_ACCESS_TOKEN='.length).trim();
  return raw.replace(/^(['"])(.*)\1$/, '$2');
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read ${path}: ${error.message}`);
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function graphql(token, query, variables = {}) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after') || 0);
      const rateLimit = response.headers.get('ratelimit') || '';
      const window = body?.errors?.[0]?.extensions?.window || 'unknown';
      throw new Error(`Buffer HTTP 429 retryAfter=${Number.isFinite(retryAfter) ? retryAfter : 0} window=${window} rateLimit=${rateLimit || 'unknown'}`);
    }
    throw new Error(`Buffer HTTP ${response.status}`);
  }
  if (!body) throw new Error('Buffer returned a non-JSON response.');
  if (body.errors?.length) {
    throw new Error(`Buffer GraphQL error: ${body.errors.map((error) => error.message).join('; ')}`);
  }
  return body.data;
}

const livePostsQuery = `
  query LivePosts($input: PostsInput!, $after: String) {
    posts(first: 100, after: $after, input: $input) {
      edges {
        node {
          id
          text
          status
          dueAt
          sentAt
          channelId
          externalLink
          assets { id mimeType }
        }
      }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

const channelsQuery = `
  query ConnectedChannels($input: ChannelsInput!) {
    channels(input: $input) {
      id name displayName descriptor service type externalLink timezone
      isDisconnected isLocked isQueuePaused
    }
  }
`;

async function getChannels(token) {
  const data = await graphql(token, channelsQuery, { input: { organizationId } });
  return data.channels;
}

async function getPosts(token, statuses) {
  return collectBufferPostPages(async (after) => {
    const data = await graphql(token, livePostsQuery, {
      after,
      input: {
        organizationId,
        filter: {
          status: statuses,
          channelIds: [...supportedChannelIds],
        },
        sort: [{ field: 'dueAt', direction: 'asc' }],
      },
    });
    return {
      posts: data.posts.edges.map(({ node }) => node),
      pageInfo: data.posts.pageInfo,
    };
  });
}

async function getLivePosts(token) {
  return getPosts(token, ['scheduled', 'sending']);
}

function assertConfirmedPost(post, job) {
  if (!post) throw new Error(`${job.slug}: created post was not found in Buffer's live queue.`);
  if (!['scheduled', 'sending'].includes(post.status)) {
    throw new Error(`${job.slug}: unexpected Buffer status ${post.status}.`);
  }
  if (post.channelId !== job.channelId) throw new Error(`${job.slug}: Buffer channel mismatch.`);
  if (!post.assets?.some((asset) => asset.mimeType?.startsWith('video/'))) {
    throw new Error(`${job.slug}: Buffer readback has no video asset.`);
  }
}

const createPostMutation = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess {
        post { id text status dueAt channelId assets { id mimeType } }
      }
      ... on MutationError { message }
    }
  }
`;

async function createPost(token, input) {
  const result = (await graphql(token, createPostMutation, { input })).createPost;
  if (result.message) throw new Error(`Buffer rejected post: ${result.message}`);
  if (!result.post?.id) throw new Error('Buffer createPost returned no post ID.');
  return result.post;
}

const editPostMutation = `
  mutation EditPost($input: EditPostInput!) {
    editPost(input: $input) {
      ... on PostActionSuccess {
        post { id text status dueAt channelId assets { id mimeType } }
      }
      ... on MutationError { message }
    }
  }
`;

async function editPost(token, args) {
  if (!existsSync(args.textFile)) throw new Error(`Missing text file: ${args.textFile}`);
  const text = readFileSync(args.textFile, 'utf8').trim();
  if (!text) throw new Error('Replacement text is empty.');
  const visibleStatuses = ['scheduled', 'sending', 'sent'];
  const existing = (await getPosts(token, visibleStatuses)).find((post) => post.id === args.postId);
  if (!existing) throw new Error(`Buffer post not found: ${args.postId}`);
  const result = (await graphql(token, editPostMutation, {
    input: {
      id: args.postId,
      text,
      mode: 'customScheduled',
      schedulingType: 'automatic',
      dueAt: existing.dueAt,
    },
  })).editPost;
  if (result.message) throw new Error(`Buffer rejected edit: ${result.message}`);
  const live = (await getPosts(token, visibleStatuses)).find((post) => post.id === args.postId);
  if (!live) throw new Error(`Edited post disappeared from Buffer: ${args.postId}`);
  if (live.text !== text) throw new Error(`Edited post text did not persist: ${args.postId}`);
  if (!live.assets?.some((asset) => asset.mimeType?.startsWith('video/'))) {
    throw new Error(`Edited post lost its video asset: ${args.postId}`);
  }
  console.log(`[buffer-live] edited ${live.id}: ${live.status} ${live.dueAt} video=confirmed`);
}

function defaultLogPath(queuePath) {
  if (queuePath.includes('-instagram-')) return join(repoRoot, '.buffer-instagram-scheduled.json');
  if (queuePath.includes('-x-')) return join(repoRoot, '.buffer-x-scheduled.json');
  return join(repoRoot, '.buffer-youtube-scheduled.json');
}

function loadLog(path) {
  if (!existsSync(path)) return { scheduled: [] };
  return normalizeScheduledLog(readJson(path));
}

function mediaManifestForUrl(url) {
  const path = join(repoRoot, '.buffer-media-urls.json');
  if (!existsSync(path)) return null;
  const manifest = readJson(path);
  return Object.values(manifest).find((value) => value?.url === url) || null;
}

function reconcileLogPath(logPath, visiblePosts, reconciledAt) {
  if (!existsSync(logPath)) return null;
  const current = loadLog(logPath);
  const result = reconcileScheduledLog(current, visiblePosts, reconciledAt);
  if (result.changed > 0) writeJson(logPath, result.log);
  return {
    path: logPath,
    changed: result.changed,
  };
}

function reconcileDefaultLogs(visiblePosts, reconciledAt = new Date().toISOString()) {
  const logPaths = [
    join(repoRoot, '.buffer-youtube-scheduled.json'),
    join(repoRoot, '.buffer-x-scheduled.json'),
    join(repoRoot, '.buffer-instagram-scheduled.json'),
  ];
  return logPaths
    .map((logPath) => reconcileLogPath(logPath, visiblePosts, reconciledAt))
    .filter(Boolean);
}

function syncPublishedSocialVideoLinks() {
  const script = join(repoRoot, 'public', 'blog', 'scripts', 'sync-social-video-links.mjs');
  const result = spawnSync(process.execPath, [script], { cwd: repoRoot, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    console.warn(`[buffer-live] social video link sync skipped: ${result.error?.message || result.stderr.trim() || `exit ${result.status}`}`);
    return;
  }
  if (result.stdout.trim()) console.log(result.stdout.trim());
}

function checkpointConfirmedPost(log, logPath, job, live) {
  const record = {
    slug: job.slug,
    postId: live.id,
    channelId: live.channelId,
    status: live.status,
    dueAt: live.dueAt,
    dueAtLocal: job.dueAt,
    publicMediaUrl: job.publicMediaUrl,
    scheduledAt: new Date().toISOString(),
    verifiedVideoAsset: true,
  };
  const existingIndex = log.scheduled.findIndex((post) => post.slug === job.slug);
  if (existingIndex >= 0) log.scheduled[existingIndex] = record;
  else log.scheduled.push(record);
  writeJson(logPath, log);
  return record;
}

function isSameScheduledPost(post, job) {
  return post.channelId === job.channelId
    && post.text === job.createPostPayload.text
    && Date.parse(post.dueAt) === Date.parse(job.dueAt);
}

async function publish(token, args) {
  const queue = readJson(args.queue);
  const selected = Array.isArray(queue.selected) ? queue.selected : [];
  if (!selected.length) throw new Error('Queue has no selected posts.');
  const logPath = args.log || defaultLogPath(args.queue);
  const log = loadLog(logPath);
  const confirmedBySlug = new Map(log.scheduled.map((post) => [post.slug, post]));

  for (const job of selected) {
    if (!job.slug || !supportedChannelIds.has(job.channelId)) {
      throw new Error('Queue contains an invalid slug or unsupported channel.');
    }
    const previous = confirmedBySlug.get(job.slug);
    const livePosts = await getLivePosts(token);
    if (previous?.postId) {
      const live = livePosts.find((post) => post.id === previous.postId);
      if (live) {
        assertConfirmedPost(live, job);
        console.log(`[buffer-live] resume ${job.slug}: already confirmed ${live.id}`);
        continue;
      }
    }
    const recovered = livePosts.find((post) => isSameScheduledPost(post, job));
    if (recovered) {
      assertConfirmedPost(recovered, job);
      const record = checkpointConfirmedPost(log, logPath, job, recovered);
      confirmedBySlug.set(job.slug, record);
      console.log(`[buffer-live] recovered ${job.slug}: confirmed live post ${recovered.id}`);
      continue;
    }
    try {
      assertScheduledCapacity(livePosts.length, BUFFER_SCHEDULED_POST_LIMIT);
    } catch (error) {
      throw new Error(`${job.slug}: ${error.message}`);
    }

    const mediaManifest = mediaManifestForUrl(job.publicMediaUrl);
    const mediaVerification = await preflightBufferMedia({
      ...job,
      publicMediaDurationSeconds: job.publicMediaDurationSeconds ?? mediaManifest?.outputDurationSeconds,
      publicMediaBytes: job.publicMediaBytes ?? mediaManifest?.outputBytes,
    });
    console.log(`[buffer-live] media preflight ${job.slug}: ${mediaVerification.url} ${mediaVerification.bytes ?? 'unknown'} bytes`);
    if (args.dryRun) {
      console.log(`[buffer-live] dry-run ${job.slug}: ${job.dueAt}`);
      continue;
    }
    const created = await createPost(token, job.createPostPayload);
    const live = (await getLivePosts(token)).find((post) => post.id === created.id);
    assertConfirmedPost(live, job);
    const record = checkpointConfirmedPost(log, logPath, job, live);
    confirmedBySlug.set(job.slug, record);
    console.log(`[buffer-live] confirmed ${job.slug}: ${live.id} ${live.status} ${live.dueAt}`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  const token = loadAccessToken();
  if (!token) throw new Error('BUFFER_ACCESS_TOKEN is empty.');
  if (args.command === 'status') {
    const posts = await getLivePosts(token);
    const sentPosts = await getPosts(token, ['sent']);
    const visiblePosts = mergeBufferPosts(posts, sentPosts);
    const reconciledLogs = reconcileDefaultLogs(visiblePosts);
    syncPublishedSocialVideoLinks();
    const dailyTargets = calculateDailyChannelTargets(visiblePosts, { minimum: args.targetPerChannel });
    const readinessCheckpoint = evaluateDailyFloorReadinessCheckpoint({ operatingDate: dailyTargets.operatingDate });
    const dailyFloorEnforcement = evaluateDailyFloorEnforcement({ dailyTargets, readinessCheckpoint });
    console.log(JSON.stringify({ count: posts.length, dailyTargets, readinessCheckpoint, dailyFloorEnforcement, posts, reconciledLogs }, null, 2));
    if (args.requireOnTimeFloor && dailyFloorEnforcement.status === 'failed') {
      throw new Error(`Daily Buffer floor checkpoint failed: ${dailyFloorEnforcement.reason} (${dailyFloorEnforcement.deficitChannels.join(', ')}).`);
    }
  } else if (args.command === 'channels') {
    const channels = await getChannels(token);
    console.log(JSON.stringify({ count: channels.length, channels }, null, 2));
  } else if (args.command === 'publish') {
    await publish(token, args);
  } else {
    await editPost(token, args);
  }
} catch (error) {
  console.error(`[buffer-live] ${error.message}`);
  process.exit(1);
}
