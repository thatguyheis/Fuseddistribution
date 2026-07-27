#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiUrl = 'https://api.buffer.com';
const organizationId = '6a3e62cb6adcaa97fe293a7d';
const channelIds = [
  '6a3e63375ab6d2f1067461b2',
  '6a3e73fb5ab6d2f10674b516',
  '6a67c5d64b2d03035f4f0228',
];
const outputRoot = join(repoRoot, 'ops', 'profit-system', 'buffer-metrics');

function parseArgs(argv) {
  const args = { date: new Date().toISOString().slice(0, 10), lookbackDays: 28 };
  for (const item of argv) {
    if (item.startsWith('--date=')) args.date = item.slice(7);
    else if (item.startsWith('--lookback-days=')) args.lookbackDays = Number(item.slice(16));
    else throw new Error(`Unknown argument: ${item}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error('date must be YYYY-MM-DD.');
  if (!Number.isInteger(args.lookbackDays) || args.lookbackDays < 7 || args.lookbackDays > 90) {
    throw new Error('lookback-days must be an integer from 7 through 90.');
  }
  return args;
}

function loadAccessToken() {
  if (process.env.BUFFER_ACCESS_TOKEN) return process.env.BUFFER_ACCESS_TOKEN;
  const envPath = join(repoRoot, '.env.local');
  if (!existsSync(envPath)) throw new Error(`Missing ${envPath}`);
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/)
    .find((candidate) => candidate.startsWith('BUFFER_ACCESS_TOKEN='));
  if (!line) throw new Error('BUFFER_ACCESS_TOKEN is not configured.');
  return line.slice('BUFFER_ACCESS_TOKEN='.length).trim().replace(/^(['"])(.*)\1$/, '$2');
}

async function graphql(token, query, variables) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Buffer HTTP ${response.status}`);
  if (!body) throw new Error('Buffer returned a non-JSON response.');
  if (body.errors?.length) throw new Error(body.errors.map(({ message }) => message).join('; '));
  return body.data;
}

const postsQuery = `
  query SentPostMetrics($input: PostsInput!, $after: String) {
    posts(first: 100, after: $after, input: $input) {
      edges {
        node {
          id text status dueAt sentAt externalLink channelId channelService
          metrics { type name value unit description }
          metricsUpdatedAt
        }
      }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

async function getSentPosts(token) {
  const posts = [];
  let after = null;
  do {
    const data = await graphql(token, postsQuery, {
      after,
      input: {
        organizationId,
        filter: { status: ['sent'], channelIds },
        sort: [{ field: 'dueAt', direction: 'desc' }],
      },
    });
    posts.push(...data.posts.edges.map(({ node }) => node));
    after = data.posts.pageInfo.hasNextPage ? data.posts.pageInfo.endCursor : null;
  } while (after);
  return posts;
}

function metricValue(metrics, type) {
  return metrics.find((metric) => metric.type === type)?.value ?? null;
}

export function derivePerformance(post, capturedAt) {
  const metrics = post.metrics || [];
  const views = metricValue(metrics, 'views');
  const impressions = metricValue(metrics, 'impressions');
  const totalTimeWatchedMinutes = metricValue(metrics, 'totalTimeWatched');
  const averageViewDurationSeconds = views > 0 && totalTimeWatchedMinutes !== null
    ? totalTimeWatchedMinutes * 60 / views
    : null;
  const sentAt = post.sentAt || post.dueAt;
  const ageHours = sentAt ? Math.max(0, (Date.parse(capturedAt) - Date.parse(sentAt)) / 3_600_000) : null;
  const ageBucket = ageHours === null ? 'unknown'
    : ageHours < 36 ? 'd1'
      : ageHours < 96 ? 'd3'
        : ageHours < 192 ? 'd7'
          : 'mature';
  const slugMatch = post.text?.match(/fuseddistribution\.com\/blog\/([a-z0-9-]+)/i);
  return {
    postId: post.id,
    platform: post.channelService,
    channelId: post.channelId,
    slug: slugMatch?.[1] || null,
    sentAt,
    ageHours: ageHours === null ? null : Number(ageHours.toFixed(2)),
    ageBucket,
    externalLink: post.externalLink,
    metricsUpdatedAt: post.metricsUpdatedAt,
    metricsAvailable: metrics.length > 0,
    views,
    viewsPerHour: views !== null && ageHours >= 1 ? Number((views / ageHours).toFixed(4)) : null,
    impressions,
    impressionsPerHour: impressions !== null && ageHours >= 1 ? Number((impressions / ageHours).toFixed(4)) : null,
    clicks: metricValue(metrics, 'clicks'),
    engagementRate: metricValue(metrics, 'engagementRate'),
    reactions: metricValue(metrics, 'reactions'),
    comments: metricValue(metrics, 'comments'),
    shares: metricValue(metrics, 'shares'),
    reposts: metricValue(metrics, 'reposts'),
    saves: metricValue(metrics, 'saves'),
    totalTimeWatchedMinutes,
    averageViewDurationSeconds: averageViewDurationSeconds === null
      ? null
      : Number(averageViewDurationSeconds.toFixed(2)),
    rawMetrics: metrics,
  };
}

export function summarizeSnapshot(posts) {
  const mature = posts.filter((post) => ['d3', 'd7', 'mature'].includes(post.ageBucket));
  const byPlatform = {};
  for (const platform of [...new Set(posts.map((post) => post.platform))].sort()) {
    const rows = posts.filter((post) => post.platform === platform);
    const withViews = rows.filter((post) => post.views !== null);
    const withImpressions = rows.filter((post) => post.impressions !== null);
    const withWatchLength = rows.filter((post) => post.averageViewDurationSeconds !== null);
    byPlatform[platform] = {
      posts: rows.length,
      metricsAvailable: rows.filter((post) => post.metricsAvailable).length,
      views: withViews.length ? withViews.reduce((sum, post) => sum + post.views, 0) : null,
      averageViews: withViews.length
        ? Number((withViews.reduce((sum, post) => sum + post.views, 0) / withViews.length).toFixed(2))
        : null,
      impressions: withImpressions.length ? withImpressions.reduce((sum, post) => sum + post.impressions, 0) : null,
      averageImpressions: withImpressions.length
        ? Number((withImpressions.reduce((sum, post) => sum + post.impressions, 0) / withImpressions.length).toFixed(2))
        : null,
      averageViewDurationSeconds: withWatchLength.length
        ? Number((withWatchLength.reduce((sum, post) => sum + post.averageViewDurationSeconds, 0) / withWatchLength.length).toFixed(2))
        : null,
    };
  }
  return {
    posts: posts.length,
    metricsAvailable: posts.filter((post) => post.metricsAvailable).length,
    maturePosts: mature.length,
    byPlatform,
  };
}

function buildInsight(posts) {
  const comparable = posts.filter((post) => ['d3', 'd7', 'mature'].includes(post.ageBucket) && post.views !== null);
  if (!comparable.length) {
    return {
      status: 'baseline_building',
      statement: 'No D+3-or-older posts have Buffer view data yet; keep D+1/D+3/D+7 snapshots and do not declare a creative winner.',
    };
  }
  const grouped = new Map();
  for (const post of comparable) {
    const key = post.platform;
    const list = grouped.get(key) || [];
    list.push(post);
    grouped.set(key, list);
  }
  const ranked = [...grouped].map(([platform, rows]) => ({
    platform,
    sample: rows.length,
    averageViews: rows.reduce((sum, row) => sum + row.views, 0) / rows.length,
  })).sort((a, b) => b.averageViews - a.averageViews);
  const best = ranked[0];
  return {
    status: best.sample >= 3 ? 'observed' : 'directional_only',
    statement: `${best.platform} currently leads mature-post views with ${best.averageViews.toFixed(1)} average views across ${best.sample} post(s); treat this as ${best.sample >= 3 ? 'an observed baseline' : 'directional only'} until matched creative samples accumulate.`,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = loadAccessToken();
  if (!token) throw new Error('BUFFER_ACCESS_TOKEN is empty.');
  const capturedAt = new Date().toISOString();
  const cutoff = Date.parse(`${args.date}T23:59:59.999Z`) - args.lookbackDays * 86_400_000;
  const livePosts = await getSentPosts(token);
  const posts = livePosts
    .map((post) => derivePerformance(post, capturedAt))
    .filter((post) => post.sentAt && Date.parse(post.sentAt) >= cutoff);
  const snapshot = {
    version: 1,
    date: args.date,
    capturedAt,
    source: 'buffer_api',
    sourceLagNotice: 'Buffer refreshes post metrics daily; values can lag the social network by about 24 hours.',
    lookbackDays: args.lookbackDays,
    summary: summarizeSnapshot(posts),
    insight: buildInsight(posts),
    posts,
  };
  mkdirSync(outputRoot, { recursive: true });
  const path = join(outputRoot, `${args.date}.json`);
  writeFileSync(path, `${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(join(outputRoot, 'latest.json'), `${JSON.stringify({ date: args.date, path: `ops/profit-system/buffer-metrics/${args.date}.json`, capturedAt }, null, 2)}\n`);
  console.log(`[buffer-performance] ${args.date}: ${snapshot.summary.metricsAvailable}/${snapshot.summary.posts} posts have metrics`);
  console.log(`[buffer-performance] insight: ${snapshot.insight.statement}`);
  console.log(`[buffer-performance] wrote ${path}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[buffer-performance] ${error.message}`);
    process.exit(1);
  });
}
