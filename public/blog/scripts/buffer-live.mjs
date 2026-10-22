#!/usr/bin/env node
import {assertCtaOrder, confirmedCtaHistory} from './lib/cta-rotation.mjs';
import { boundedSentHistory } from './lib/buffer-scheduling-policy.mjs';
import {assertFreeSlot, repairCadence} from './lib/buffer-cadence.mjs';
import {assertVisualReview} from '../../../video/scripts/lib/visual-review.mjs';
import { remainingBufferRequests, requireBufferRequestCapacity } from './lib/buffer-request-budget.mjs';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertScheduledCapacity, channelScheduledCount, BUFFER_CHANNEL_QUEUE_TARGET } from './lib/buffer-capacity.mjs';
import { normalizeScheduledLog, reconcileScheduledLog } from './lib/buffer-log-reconciliation.mjs';
import { calculateDailyChannelTargets, evaluateDailyFloorEnforcement, evaluateDailyFloorReadinessCheckpoint, mergeBufferPosts } from './lib/buffer-daily-targets.mjs';
import { collectBufferPostPages } from './lib/buffer-post-pagination.mjs';
import { preflightBufferMedia } from './lib/buffer-publish-preflight.mjs';
import { assertRenderedReelAudioCleared } from '../../../video/scripts/audio-rights.mjs';
import { loadStatusPosts } from './lib/buffer-backlog-state.mjs';

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
  node public/blog/scripts/buffer-live.mjs repair-cadence [--dry-run]
  node public/blog/scripts/buffer-live.mjs publish --queue=path [--log=path] [--dry-run]
  node public/blog/scripts/buffer-live.mjs edit --post-id=id --text-file=path
  node public/blog/scripts/buffer-live.mjs replace-media --slug=slug --post-ids=id1,id2 --media-url=https://...

The publish command is resumable. It persists each Buffer-confirmed post ID after
the create mutation and verifies that the post is scheduled/sending with a video.
It also re-checks the public MP4 immediately before create; failed media is a hard stop.`);
  process.exit(2);
}

function parseArgs(argv) {
  const [command, ...options] = argv;
  const args = { command, queue: '', log: '', dryRun: false, postId: '', postIds: [], slug: '', mediaUrl: '', textFile: '', targetPerChannel: 3, requireOnTimeFloor: false, capacityOnly: false };
  for (const option of options) {
    if (option.startsWith('--queue=')) args.queue = resolve(option.slice('--queue='.length));
    else if (option.startsWith('--log=')) args.log = resolve(option.slice('--log='.length));
    else if (option.startsWith('--post-id=')) args.postId = option.slice('--post-id='.length).trim();
    else if (option.startsWith('--post-ids=')) args.postIds = option.slice('--post-ids='.length).split(',').map(value => value.trim()).filter(Boolean);
    else if (option.startsWith('--slug=')) args.slug = option.slice('--slug='.length).trim();
    else if (option.startsWith('--media-url=')) args.mediaUrl = option.slice('--media-url='.length).trim();
    else if (option.startsWith('--text-file=')) args.textFile = resolve(option.slice('--text-file='.length));
    else if (option.startsWith('--target-per-channel=')) {
      const value = option.slice('--target-per-channel='.length);
      if (!/^\d+$/.test(value) || Number(value) < 3) throw new Error('--target-per-channel must be an integer of at least 3.');
      args.targetPerChannel = Number(value);
    }
    else if (option === '--require-on-time-floor') args.requireOnTimeFloor = true;
    else if (option === '--capacity-only') args.capacityOnly = true;
    else if (option === '--dry-run') args.dryRun = true;
    else usage();
  }
  if (!['status', 'channels', 'publish', 'edit', 'replace-media', 'repair-cadence'].includes(command)) usage();
  if (command === 'publish' && !args.queue) usage();
  if (command === 'edit' && (!args.postId || !args.textFile)) usage();
  if (command === 'replace-media' && (!args.slug || !args.postIds.length || !args.mediaUrl)) usage();
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
  const cooldownPath = join(repoRoot, '.buffer-live-unavailable.json');
  const { cooldownUntil, saveCooldown } = await import('./lib/buffer-cooldown.mjs');
  const due = cooldownUntil(cooldownPath);
  if (due) throw new Error(`Buffer cooldown active until ${new Date(due).toISOString()}; no API call made`);
  const { reserveBufferRequest } = await import('./lib/buffer-request-budget.mjs');
  reserveBufferRequest(join(repoRoot, '.workflow-state/buffer-request-budget.json'), {reserve: variables.input?.filter?.status?.every(status => status === 'sent') ? 12 : 0});
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
      saveCooldown(cooldownPath, retryAfter, window);
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
          metadata { __typename ... on InstagramPostMetadata { type shouldShareToFeed isAiGenerated firstComment link geolocation { id text } } ... on YoutubePostMetadata { title category { categoryId } privacy madeForKids notifySubscribers embeddable license isAiGenerated } }
          assets { id mimeType source }
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

async function fetchPostPage(token, statuses, after, direction = 'asc') {
  const data = await graphql(token, livePostsQuery, {after, input: {
    organizationId, filter: {status: statuses, channelIds: [...supportedChannelIds]},
    sort: [{field:'dueAt', direction}],
  }});
  return {posts:data.posts.edges.map(({node})=>node),pageInfo:data.posts.pageInfo};
}
async function getPosts(token, statuses) {
  return collectBufferPostPages(after => fetchPostPage(token,statuses,after));
}
let historyEvidence = null;
async function recentSentPosts(token) {
  const cachePath = join(repoRoot,'.workflow-state/buffer-sent-cache.json');
  let cached = null;
  if (existsSync(cachePath)) cached = readJson(cachePath);
  if (cached && Date.now() - Date.parse(cached.observedAt) < 300_000) {
    historyEvidence = {...cached, posts:undefined, reused:true};return cached.posts;
  }
  const result = await boundedSentHistory(after => fetchPostPage(token,['sent'],after,'desc'),
    () => remainingBufferRequests(join(repoRoot,'.workflow-state/buffer-request-budget.json')));
  const known = ['youtube','x','instagram'].flatMap(platform => loadLog(join(repoRoot,`.buffer-${platform}-scheduled.json`)).scheduled
    .filter(p => p.status === 'sent').map(p => ({...p,id:p.postId,channelId:p.channelId || ({youtube:'6a3e63375ab6d2f1067461b2',x:'6a3e73fb5ab6d2f10674b516',instagram:'6a67c5d64b2d03035f4f0228'})[platform]})));
  const posts = mergeBufferPosts(known,cached?.posts || [],result.posts);
  const record = {...result,posts,observedAt:new Date().toISOString(),note:'Recent pages plus saved confirmed sends; unobserved delivery remains unverified.'};
  writeJson(cachePath,record);historyEvidence={...record,posts:undefined};return posts;
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
        post { id text status dueAt channelId assets { id mimeType source } }
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
        post { id text status dueAt channelId assets { id mimeType source } }
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

async function replaceScheduledMedia(token, args) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.slug)) throw new Error('Invalid reel slug.');
  const url = new URL(args.mediaUrl);
  const mediaPath = new RegExp(`^/reels(?:-x)?/${args.slug}/[a-z0-9-]+\\.mp4$`, 'i');
  if (url.protocol !== 'https:' || url.hostname !== 'fuseddistribution.luxraycoco.workers.dev' || !mediaPath.test(url.pathname)) {
    throw new Error('Replacement media must be a hosted Fused MP4 for the requested reel.');
  }
  assertRenderedReelAudioCleared(args.slug);
  const preflight = await preflightBufferMedia({ slug: args.slug, publicMediaUrl: url.href });
  console.log(`[buffer-live] replacement media preflight ${args.slug}: ${preflight.bytes} bytes`);
  const posts = await getPosts(token, ['scheduled']);
  const selected = args.postIds.map(id => {
    const post = posts.find(row => row.id === id);
    if (!post || post.status !== 'scheduled') throw new Error(`Expected scheduled Buffer post not found: ${id}`);
    if (!post.assets?.some(asset => asset.mimeType?.startsWith('video/') && asset.source?.includes(`/${args.slug}/`))) {
      throw new Error(`${id}: scheduled post does not contain the requested reel.`);
    }
    return post;
  });
  if (new Set(args.postIds).size !== args.postIds.length) throw new Error('Duplicate Buffer post IDs.');
  const metadataFor = post => post.metadata?.__typename === 'InstagramPostMetadata'
    ? { instagram: Object.fromEntries(Object.entries(post.metadata).filter(([key]) => key !== '__typename')) }
    : post.metadata?.__typename === 'YoutubePostMetadata'
      ? { youtube: { ...Object.fromEntries(Object.entries(post.metadata).filter(([key]) => !['__typename', 'category'].includes(key))), categoryId: post.metadata.category?.categoryId } }
      : undefined;
  for (const original of selected) {
    const input = {
      id: original.id,
      text: original.text,
      assets: [{ video: { url: url.href } }],
      metadata: metadataFor(original),
      mode: 'customScheduled',
      dueAt: original.dueAt,
    };
    const result = (await graphql(token, editPostMutation, { input })).editPost;
    if (result.message) throw new Error(`Buffer rejected media replacement for ${original.id}: ${result.message}`);
    const updated = result.post;
    if (!updated || updated.id !== original.id || updated.text !== original.text || updated.channelId !== original.channelId ||
        updated.status !== 'scheduled' || Date.parse(updated.dueAt) !== Date.parse(original.dueAt) ||
        !updated.assets?.some(asset => asset.mimeType?.startsWith('video/') && asset.source === url.href)) {
      throw new Error(`Buffer media replacement readback mismatch: ${original.id}`);
    }
    console.log(`[buffer-live] replaced media ${args.slug}: ${updated.id} schedule preserved`);
  }
  const after = await getPosts(token, ['scheduled']);
  const verified = args.postIds.map(id => after.find(post => post.id === id));
  for (const post of verified) {
    const original = selected.find(row => row.id === post?.id);
    if (!post || post.status !== 'scheduled' || post.text !== original.text || post.channelId !== original.channelId ||
        Date.parse(post.dueAt) !== Date.parse(original.dueAt) ||
        !post.assets?.some(asset => asset.mimeType?.startsWith('video/') && asset.source === url.href)) {
      throw new Error(`Final Buffer replacement verification failed: ${original?.id || 'unknown post'}`);
    }
  }
  writeJson(join(repoRoot, '.workflow-state/buffer-media-replacement-latest.json'), {
    slug: args.slug, mediaUrl: url.href, verifiedAt: new Date().toISOString(), posts: verified,
  });
}

async function repairSchedule(token,args) {
  const lock='/tmp/fused-buffer-publisher.lock';
  if(existsSync(lock)) {
    const check=spawnSync('python3',[join(repoRoot,'scripts/lock-owner-alive.py'),lock]);
    if(check.status!==1) throw Error('Buffer publisher lock is active or indeterminate');
    renameSync(lock,`${lock}.stale.${Date.now()}`);
  }
  mkdirSync(lock);writeFileSync(join(lock,'pid'),String(process.pid));
  process.once('exit',()=>{if(readFileSync(join(lock,'pid'),'utf8')===String(process.pid))renameSync(lock,`${lock}.finished.${Date.now()}`);});
  const before=await getLivePosts(token);
  const changes=repairCadence(before.filter(p=>supportedChannelIds.has(p.channelId)));
  const path=join(repoRoot,'.workflow-state/buffer-cadence-repair.json');
  const record={checkedAt:new Date().toISOString(),before,changes,confirmed:[],dryRun:args.dryRun};
  writeJson(path,record);
  if(args.dryRun) {console.log(JSON.stringify(changes,null,2));return;}
  requireBufferRequestCapacity(join(repoRoot,'.workflow-state/buffer-request-budget.json'),changes.length+2);
  for(const change of changes) {
    const original=before.find(p=>p.id===change.id);
    const metadata=original.metadata?.__typename==='InstagramPostMetadata'?{instagram:Object.fromEntries(Object.entries(original.metadata).filter(([k])=>k!=='__typename'))}:original.metadata?.__typename==='YoutubePostMetadata'?{youtube:{...Object.fromEntries(Object.entries(original.metadata).filter(([k])=>!['__typename','category'].includes(k))),categoryId:original.metadata.category?.categoryId}}:undefined;
    if(!original.assets?.length || original.assets.some(a=>!a.mimeType?.startsWith('video/') || !a.source?.startsWith('https://'))) throw Error('Cannot preserve original video source');
    const result=(await graphql(token,editPostMutation,{input:{id:change.id,text:original.text,assets:original.assets.map(a=>({video:{url:a.source}})),metadata,mode:'customScheduled',dueAt:change.dueAt}})).editPost;
    if(result.message) throw Error(result.message);
    const p=result.post;
    if(!p || p.id!==change.id || p.text!==original.text || p.channelId!==original.channelId || p.status!=='scheduled' || Date.parse(p.dueAt)!==Date.parse(change.dueAt) || !p.assets?.some(a=>a.mimeType?.startsWith('video/'))) throw Error('Reschedule readback mismatch: '+change.id);
    record.confirmed.push(change);writeJson(path,record);
  }
  const after=await getLivePosts(token);
  if(repairCadence(after).length) throw Error('Buffer cadence still has collisions');
  for(const change of changes) if(!after.some(p=>p.id===change.id&&Date.parse(p.dueAt)===Date.parse(change.dueAt))) throw Error('Final schedule readback mismatch');
  for(const original of before) {
    const p=after.find(row=>row.id===original.id);
    if(!p || p.text!==original.text || JSON.stringify(p.assets)!==JSON.stringify(original.assets)) throw Error('Post content changed during schedule repair: '+original.id);
  }
  reconcileDefaultLogs(after);
  writeJson(join(repoRoot,'.workflow-state/buffer-latest-status.json'),{count:after.length,posts:after,checkedAt:new Date().toISOString(),source:'cadence-repair-live-readback'});
  record.verifiedAt=new Date().toISOString();record.after=after;writeJson(path,record);
  console.log(JSON.stringify({moved:changes.length,scheduled:after.length,verified:true}));
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
    cta_slot: job.cta_slot,
    text: job.createPostPayload.text,
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

  let livePosts = await getLivePosts(token);
  for (const job of selected) {
    if (!job.slug || !supportedChannelIds.has(job.channelId)) {
      throw new Error('Queue contains an invalid slug or unsupported channel.');
    }
    const previous = confirmedBySlug.get(job.slug);
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
      assertFreeSlot([...livePosts,...confirmedCtaHistory(repoRoot).filter(p=>p.status==='sent')],job);
      assertScheduledCapacity(channelScheduledCount(livePosts, job.channelId), BUFFER_CHANNEL_QUEUE_TARGET);
    } catch (error) {
      throw new Error(`${job.slug}: ${error.message}`);
    }

    const known = confirmedCtaHistory(repoRoot);
    const byId = new Map(known.map(row => [row.postId, row]));
    const liveCtaRows = livePosts.map(row => ({...byId.get(row.id), ...row}));
    const sentCtaRows = known.filter(row => row.status === 'sent');
    assertCtaOrder(job, [...sentCtaRows, ...liveCtaRows]);
    const mediaManifest = mediaManifestForUrl(job.publicMediaUrl);
    assertVisualReview(repoRoot,job.slug);
    // A track can be revoked after a queue was prepared. Recheck before upload.
    assertRenderedReelAudioCleared(job.slug);
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
    requireBufferRequestCapacity(join(repoRoot,'.workflow-state/buffer-request-budget.json'), 2);
    const created = await createPost(token, job.createPostPayload);
    livePosts = await getLivePosts(token);
    const live = livePosts.find((post) => post.id === created.id);
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
    const loaded = await loadStatusPosts({ getLivePosts: () => getLivePosts(token), getSentPosts: () => recentSentPosts(token), capacityOnly: args.capacityOnly });
    const posts = loaded.posts;
    if (args.capacityOnly) {
      console.log(JSON.stringify({ count: posts.length, posts, mode: 'capacity-only' }, null, 2));
      process.exit(0);
    }
    const sentPosts = loaded.sentPosts;
    const visiblePosts = mergeBufferPosts(posts, sentPosts);
    const reconciledLogs = reconcileDefaultLogs(visiblePosts);
    syncPublishedSocialVideoLinks();
    const dailyTargets = calculateDailyChannelTargets(visiblePosts, { minimum: args.targetPerChannel });
    const readinessCheckpoint = evaluateDailyFloorReadinessCheckpoint({ operatingDate: dailyTargets.operatingDate });
    const dailyFloorEnforcement = evaluateDailyFloorEnforcement({ dailyTargets, readinessCheckpoint });
    console.log(JSON.stringify({ count: posts.length, historyEvidence, dailyTargets, readinessCheckpoint, dailyFloorEnforcement, posts, reconciledLogs }, null, 2));
    if (args.requireOnTimeFloor && dailyFloorEnforcement.status === 'failed') {
      throw new Error(`Daily Buffer floor checkpoint failed: ${dailyFloorEnforcement.reason} (${dailyFloorEnforcement.deficitChannels.join(', ')}).`);
    }
  } else if (args.command === 'channels') {
    const channels = await getChannels(token);
    console.log(JSON.stringify({ count: channels.length, channels }, null, 2));
  } else if (args.command === 'publish') {
    await publish(token, args);
  } else if(args.command === 'repair-cadence') {
    await repairSchedule(token,args);
  } else if (args.command === 'replace-media') {
    await replaceScheduledMedia(token,args);
  } else {
    await editPost(token, args);
  }
} catch (error) {
  console.error(`[buffer-live] ${error.message}`);
  process.exit(1);
}
