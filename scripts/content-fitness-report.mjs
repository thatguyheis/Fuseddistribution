#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const weights = {
  retention: 30,
  distribution: 25,
  engagement: 25,
  conversion: 15,
  productionEfficiency: 5,
};

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseArgs(argv) {
  const args = { snapshot: '', format: 'markdown', out: '' };
  for (const item of argv) {
    if (item.startsWith('--snapshot=')) args.snapshot = resolve(item.slice(11));
    else if (item.startsWith('--format=')) args.format = item.slice(9);
    else if (item.startsWith('--out=')) args.out = resolve(item.slice(6));
    else throw new Error(`Unknown argument: ${item}`);
  }
  if (!['json', 'markdown'].includes(args.format)) throw new Error('--format must be json or markdown.');
  return args;
}

function latestSnapshotPath() {
  const latest = readJson(join(repoRoot, 'ops', 'profit-system', 'buffer-metrics', 'latest.json'));
  if (!latest?.path) throw new Error('No latest Buffer snapshot checkpoint exists.');
  return resolve(repoRoot, latest.path);
}

function scheduledSlugMap() {
  const result = new Map();
  for (const name of [
    '.buffer-youtube-scheduled.json',
    '.buffer-x-scheduled.json',
    '.buffer-instagram-scheduled.json',
  ]) {
    const value = readJson(join(repoRoot, name), {});
    const entries = Array.isArray(value) ? value : value.scheduled || value.posts || [];
    for (const entry of entries) {
      if (entry?.postId && entry?.slug) result.set(entry.postId, entry.slug);
    }
  }
  return result;
}

function rawMetric(post, type) {
  return post.rawMetrics?.find((metric) => metric.type === type)?.value ?? null;
}

function exposure(post) {
  return post.views ?? post.impressions ?? rawMetric(post, 'reach');
}

function weightedEngagement(post) {
  return (post.shares || 0) * 3
    + (post.saves || 0) * 3
    + (post.comments || 0) * 2
    + (post.reactions || 0)
    + (post.reposts || 0) * 3;
}

function weightedConversion(post) {
  return (post.clicks || 0)
    + (rawMetric(post, 'profileVisits') || 0)
    + (rawMetric(post, 'follows') || 0) * 2;
}

function percentile(value, population) {
  if (!Number.isFinite(value) || !population.length) return null;
  if (population.length === 1) return 50;
  const less = population.filter((candidate) => candidate < value).length;
  const equal = population.filter((candidate) => candidate === value).length;
  return Number((((less + Math.max(0, equal - 1) / 2) / (population.length - 1)) * 100).toFixed(2));
}

function protocolDna(slug) {
  if (!slug) return null;
  const metadata = readJson(join(repoRoot, 'video', 'out', slug, 'render-meta.json'));
  if (!metadata) return null;
  return {
    hookType: metadata.hookType ?? null,
    voice: metadata.voice ?? null,
    captionMode: metadata.captionMode ?? null,
    musicTrack: metadata.musicTrack ?? null,
    segmentCount: metadata.segmentCount ?? null,
    renderedDuration: metadata.renderedDuration ?? null,
    mediaSources: metadata.mediaSources ?? null,
  };
}

function scoreRows(posts) {
  const mature = posts.filter((post) => ['d3', 'd7', 'mature'].includes(post.ageBucket));
  const cohorts = new Map();
  for (const post of mature) {
    const key = `${post.platform}:${post.ageBucket}`;
    const cohort = cohorts.get(key) || [];
    cohort.push(post);
    cohorts.set(key, cohort);
  }

  return mature.map((post) => {
    const cohort = cohorts.get(`${post.platform}:${post.ageBucket}`) || [];
    const postExposure = exposure(post);
    const engagementRate = postExposure > 0 ? weightedEngagement(post) / postExposure : null;
    const conversionRate = postExposure > 0 ? weightedConversion(post) / postExposure : null;
    const distribution = percentile(postExposure, cohort.map(exposure).filter(Number.isFinite));
    const engagement = percentile(
      engagementRate,
      cohort.map((candidate) => {
        const candidateExposure = exposure(candidate);
        return candidateExposure > 0 ? weightedEngagement(candidate) / candidateExposure : null;
      }).filter(Number.isFinite),
    );
    const conversion = percentile(
      conversionRate,
      cohort.map((candidate) => {
        const candidateExposure = exposure(candidate);
        return candidateExposure > 0 ? weightedConversion(candidate) / candidateExposure : null;
      }).filter(Number.isFinite),
    );
    const retention = Number.isFinite(post.averageViewDurationSeconds) ? 50 : null;
    const productionEfficiency = null;
    const dimensions = { retention, distribution, engagement, conversion, productionEfficiency };
    const available = Object.entries(dimensions).filter(([, value]) => Number.isFinite(value));
    const availableWeight = available.reduce((sum, [name]) => sum + weights[name], 0);
    const score = availableWeight
      ? available.reduce((sum, [name, value]) => sum + value * weights[name], 0) / availableWeight
      : null;
    return {
      postId: post.postId,
      slug: post.slug,
      platform: post.platform,
      ageBucket: post.ageBucket,
      sentAt: post.sentAt,
      exposure: postExposure,
      weightedEngagement: weightedEngagement(post),
      weightedConversion: weightedConversion(post),
      dimensions,
      score: score === null ? null : Number(score.toFixed(2)),
      evidenceCoverage: Number((availableWeight / 100).toFixed(2)),
      protocolDna: protocolDna(post.slug),
    };
  });
}

function platformSummary(rows) {
  const result = {};
  for (const platform of [...new Set(rows.map((row) => row.platform))].sort()) {
    const platformRows = rows.filter((row) => row.platform === platform);
    const exposures = platformRows.map((row) => row.exposure).filter(Number.isFinite).sort((a, b) => a - b);
    result[platform] = {
      maturePosts: platformRows.length,
      mappedSlugs: platformRows.filter((row) => row.slug).length,
      averageExposure: exposures.length
        ? Number((exposures.reduce((sum, value) => sum + value, 0) / exposures.length).toFixed(2))
        : null,
      medianExposure: exposures.length ? exposures[Math.floor(exposures.length / 2)] : null,
    };
  }
  return result;
}

export function buildFitnessReport(snapshot, slugByPostId = new Map()) {
  const posts = (snapshot.posts || []).map((post) => ({
    ...post,
    slug: post.slug || slugByPostId.get(post.postId) || null,
  }));
  const rows = scoreRows(posts);
  const eligible = rows
    .filter((row) => row.score !== null && row.evidenceCoverage >= 0.5)
    .sort((a, b) => b.score - a.score);
  const selectionCount = eligible.length ? Math.max(1, Math.ceil(eligible.length * 0.2)) : 0;
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    snapshot: {
      date: snapshot.date,
      capturedAt: snapshot.capturedAt,
      source: snapshot.source,
      posts: posts.length,
      maturePosts: rows.length,
      slugMappedPosts: posts.filter((post) => post.slug).length,
    },
    metricCoverage: {
      retention: posts.filter((post) => Number.isFinite(post.averageViewDurationSeconds)).length,
      distribution: posts.filter((post) => Number.isFinite(exposure(post))).length,
      engagement: posts.filter((post) => Number.isFinite(exposure(post))).length,
      conversion: posts.filter((post) => Number.isFinite(exposure(post))).length,
      productionCost: 0,
    },
    platformSummary: platformSummary(rows),
    scoringPolicy: {
      weights,
      normalization: 'Same-platform and same-age-bucket percentile. Missing dimensions are excluded and reported through evidenceCoverage.',
      engagementFormula: '3*shares + 3*saves + 2*comments + reactions + 3*reposts, divided by exposure.',
      conversionFormula: 'clicks + profileVisits + 2*follows, divided by exposure.',
    },
    eligiblePosts: eligible.length,
    survivors: eligible.slice(0, selectionCount),
    mutationCandidates: eligible.slice(-selectionCount).reverse(),
    rows,
  };
}

function compactRow(row) {
  return `- ${row.platform} | ${row.slug || row.postId} | score ${row.score} | coverage ${Math.round(row.evidenceCoverage * 100)}% | exposure ${row.exposure ?? 'n/a'} | hook ${row.protocolDna?.hookType || 'unknown'} | captions ${row.protocolDna?.captionMode || 'unknown'}`;
}

export function markdown(report) {
  const lines = [
    '# Content Fitness Snapshot',
    '',
    `Generated: ${report.generatedAt}`,
    `Buffer snapshot: ${report.snapshot.date} captured ${report.snapshot.capturedAt}`,
    '',
    `- Posts: ${report.snapshot.posts}`,
    `- Mature posts scored: ${report.snapshot.maturePosts}`,
    `- Slugs mapped: ${report.snapshot.slugMappedPosts}`,
    `- Eligible for selection: ${report.eligiblePosts}`,
    `- Retention measurements: ${report.metricCoverage.retention}`,
    `- Production-cost measurements: ${report.metricCoverage.productionCost}`,
    '',
    '## Top 20 Percent Survivors',
    '',
    ...(report.survivors.length ? report.survivors.map(compactRow) : ['- No posts have enough comparable evidence.']),
    '',
    '## Bottom 20 Percent Mutation Candidates',
    '',
    ...(report.mutationCandidates.length ? report.mutationCandidates.map(compactRow) : ['- No posts have enough comparable evidence.']),
    '',
    '## Interpretation Guardrail',
    '',
    '- Scores are relative within platform and age bucket. Missing retention and production-cost evidence lowers coverage and blocks claims about those dimensions.',
    '',
  ];
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const snapshotPath = args.snapshot || latestSnapshotPath();
  const snapshot = readJson(snapshotPath);
  if (!snapshot?.posts) throw new Error(`Invalid Buffer snapshot: ${snapshotPath}`);
  const report = buildFitnessReport(snapshot, scheduledSlugMap());
  const output = args.format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : markdown(report);
  if (args.out) writeFileSync(args.out, output);
  else process.stdout.write(output);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`[content-fitness] ${error.message}`);
    process.exit(1);
  }
}
