#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeOperatingDate } from './lib/operating-date.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const systemRoot = join(repoRoot, 'ops', 'profit-system');
const configPath = join(systemRoot, 'config.json');
const eventsPath = join(systemRoot, 'events.jsonl');
const rulesPath = join(systemRoot, 'learned-rules.json');
const reportsRoot = join(systemRoot, 'reports');
const bufferMetricsRoot = join(systemRoot, 'buffer-metrics');
const blogResearchRoot = join(repoRoot, 'public', 'blog', 'research');
const blogPostsPath = join(repoRoot, 'public', 'blog', 'posts.json');
const reelOutputRoot = join(repoRoot, 'video', 'out');

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const [command, ...raw] = argv;
  if (!['audit', 'record'].includes(command)) fail('Usage: profit-sop-audit.mjs <audit|record> [--key=value]');
  const args = { command };
  for (const item of raw) {
    if (!item.startsWith('--') || !item.includes('=')) fail(`Invalid argument: ${item}`);
    const [key, ...value] = item.slice(2).split('=');
    args[key.replaceAll('-', '_')] = value.join('=').trim();
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readJsonIfExists(path, fallback = null) {
  return existsSync(path) ? readJson(path) : fallback;
}

export function isUsableBufferSnapshot(snapshot, date) {
  return snapshot?.date === date
    && snapshot.source === 'buffer_api'
    && Array.isArray(snapshot.posts);
}

function readJsonLines(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try { return JSON.parse(line); }
      catch (error) { fail(`${path}:${index + 1}: ${error.message}`); }
    });
}

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(`${label} must be numeric.`);
  return number;
}

function normalizeEvent(raw) {
  const allowedKinds = new Set(['reward', 'penalty']);
  if (!allowedKinds.has(raw.kind)) fail('Event kind must be reward or penalty.');
  if (!raw.type || !/^[a-z0-9_]+$/.test(raw.type)) fail('Event type must be snake_case.');
  if (!raw.fingerprint || raw.fingerprint.length < 3) fail('Event fingerprint is required.');
  if (!raw.evidence || raw.evidence.length < 3) fail('Event evidence is required.');
  return {
    id: raw.id || crypto.randomUUID(),
    occurredAt: raw.occurredAt || new Date().toISOString(),
    date: normalizeOperatingDate(raw.date || new Date()),
    kind: raw.kind,
    type: raw.type,
    fingerprint: raw.fingerprint,
    value: finiteNumber(raw.value ?? 1, 'value'),
    evidence: raw.evidence,
    source: raw.source || 'manual',
    attributable: raw.attributable !== false,
    notes: raw.notes || '',
    supersededAt: raw.supersededAt || null,
    supersededBy: raw.supersededBy || null,
    supersessionReason: raw.supersessionReason || null,
  };
}

function daysBetween(later, earlier) {
  return Math.floor((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000);
}

export function repeatMultiplier(event, history, config) {
  if (event.kind !== 'penalty') return 1;
  const repeats = history.filter((candidate) => candidate.kind === 'penalty'
    && !candidate.supersededAt
    && candidate.fingerprint === event.fingerprint
    && candidate.date < event.date
    && daysBetween(event.date, candidate.date) <= config.repeatPenalty.lookbackDays).length;
  return Math.min(
    config.repeatPenalty.maximumMultiplier,
    1 + repeats * config.repeatPenalty.incrementPerRepeat,
  );
}

export function scoreEvent(event, history, config) {
  const weights = event.kind === 'reward' ? config.rewardWeights : config.penaltyWeights;
  const weight = weights[event.type];
  if (!Number.isFinite(weight)) fail(`Unknown ${event.kind} type: ${event.type}`);
  if (event.supersededAt) return { points: 0, multiplier: 1, weight };
  if (event.kind === 'reward' && !event.attributable) return { points: 0, multiplier: 1, weight };
  const multiplier = repeatMultiplier(event, history, config);
  const magnitude = weight * event.value * multiplier;
  return { points: event.kind === 'reward' ? magnitude : -magnitude, multiplier, weight };
}

function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function groupByDate(scoredEvents) {
  const grouped = new Map();
  for (const event of scoredEvents) {
    const row = grouped.get(event.date) || { score: 0, rewards: 0, penalties: 0 };
    row.score += event.points;
    if (event.points >= 0) row.rewards += event.points;
    else row.penalties += Math.abs(event.points);
    grouped.set(event.date, row);
  }
  return grouped;
}

function clamp(value, maximum) {
  return Math.max(-maximum, Math.min(maximum, value));
}

export function buildLeadingIndicatorAudit(date, snapshots, config) {
  const policy = config.leadingIndicators;
  if (!policy) return { score: 0, status: 'disabled', comparisons: [], insight: null };
  const current = snapshots.find((snapshot) => snapshot.date === date);
  if (!current) return { score: 0, status: 'missing_snapshot', comparisons: [], insight: null };
  const historicalPosts = snapshots
    .filter((snapshot) => snapshot.date < date)
    .flatMap((snapshot) => snapshot.posts || []);
  const uniqueHistory = new Map();
  for (const post of historicalPosts) {
    const key = `${post.postId}:${post.ageBucket}`;
    uniqueHistory.set(key, post);
  }
  const comparisons = [];
  for (const post of current.posts || []) {
    if (!['d1', 'd3', 'd7'].includes(post.ageBucket)) continue;
    for (const [metric, weight] of Object.entries(policy.weights)) {
      const value = post[metric];
      if (!Number.isFinite(value)) continue;
      const baselineValues = [...uniqueHistory.values()]
        .filter((candidate) => candidate.platform === post.platform
          && candidate.ageBucket === post.ageBucket
          && candidate.postId !== post.postId
          && Number.isFinite(candidate[metric]))
        .map((candidate) => candidate[metric]);
      if (baselineValues.length < policy.minimumComparablePosts) continue;
      const baseline = median(baselineValues);
      const relativeDelta = baseline === 0 ? (value > 0 ? 1 : 0) : (value - baseline) / Math.abs(baseline);
      comparisons.push({
        postId: post.postId,
        slug: post.slug,
        platform: post.platform,
        ageBucket: post.ageBucket,
        metric,
        value,
        baselineMedian: baseline,
        samplePosts: baselineValues.length,
        relativeDelta,
        points: weight * clamp(relativeDelta, 1),
      });
    }
  }
  const rawScore = comparisons.reduce((sum, comparison) => sum + comparison.points, 0);
  return {
    score: clamp(rawScore, policy.maximumDailyPoints),
    rawScore,
    status: comparisons.length ? 'comparable' : 'baseline_building',
    comparisons,
    insight: current.insight || null,
    sourceLagNotice: current.sourceLagNotice || null,
  };
}

export function evaluateBlogPublicationState({ date, queue, pending, completeExists, registeredSlugs = [] }) {
  const expectedSlugs = Array.isArray(queue?.posts)
    ? queue.posts.map((post) => post?.slug).filter(Boolean)
    : [];
  const pendingRemaining = Array.isArray(pending?.remaining)
    ? pending.remaining.filter(Boolean)
    : [];
  const blockedSlugs = Array.isArray(queue?.blockedSlugs)
    ? [...new Set(queue.blockedSlugs.filter(Boolean))]
    : [];
  const registeredSet = new Set(registeredSlugs);
  const blockedSet = new Set(blockedSlugs);
  const registeredQueueSlugs = expectedSlugs.filter((slug) => registeredSet.has(slug));
  const blockedQueueSlugs = expectedSlugs.filter((slug) => !registeredSet.has(slug) && blockedSet.has(slug));
  const missingRegisteredSlugs = expectedSlugs.filter((slug) => !registeredSet.has(slug));
  const unaccountedQueueSlugs = expectedSlugs.filter((slug) => !registeredSet.has(slug) && !blockedSet.has(slug));
  const hardStops = [];
  if (pendingRemaining.length) {
    hardStops.push({
      type: 'incomplete_blog_checkpoint',
      fingerprint: `blog-pending-${date}`,
      evidence: `public/blog/research/${date}-pending.json still lists ${pendingRemaining.length} remaining slug(s): ${pendingRemaining.join(', ')}.`,
    });
  } else if (expectedSlugs.length && unaccountedQueueSlugs.length) {
    hardStops.push({
      type: 'incomplete_blog_registration',
      fingerprint: `blog-registration-${date}`,
      evidence: completeExists
        ? `public/blog/research/${date}-complete.json exists, but expected queue slugs are still missing from public/blog/posts.json without explicit block evidence for ${date}: ${unaccountedQueueSlugs.join(', ')}.`
        : `Expected queue slugs are still missing from public/blog/posts.json without explicit block evidence for ${date}: ${unaccountedQueueSlugs.join(', ')}.`,
    });
  }
  return {
    date,
    expectedSlugs,
    pendingRemaining,
    blockedSlugs,
    registeredQueueSlugs,
    blockedQueueSlugs,
    missingRegisteredSlugs,
    unaccountedQueueSlugs,
    completeExists,
    // A quality block is an unfinished checkpoint until the post is repaired
    // and registered. Treating an empty pending marker plus a blocked slug as
    // complete is what allowed the 8/26 404 to disappear from recovery.
    completionStatus: hardStops.length
      ? 'incomplete'
      : blockedQueueSlugs.length
        ? 'blocked'
        : 'complete',
    hardStops,
  };
}

export function evaluateReelReleaseState({ registeredSlugs = [], releaseQaBySlug = {} }) {
  const missingReleaseQaSlugs = [];
  const manualCaptionReviewPendingSlugs = [];
  const otherNotReadySlugs = [];
  const readyForPostingSlugs = [];

  for (const slug of registeredSlugs) {
    const releaseQa = releaseQaBySlug[slug];
    if (!releaseQa) {
      missingReleaseQaSlugs.push(slug);
    } else if (releaseQa.readyForPosting === true) {
      readyForPostingSlugs.push(slug);
    } else if (releaseQa.manualCaptionReview !== true) {
      manualCaptionReviewPendingSlugs.push(slug);
    } else {
      otherNotReadySlugs.push(slug);
    }
  }

  return {
    expectedSlugs: registeredSlugs,
    readyForPostingSlugs,
    missingReleaseQaSlugs,
    manualCaptionReviewPendingSlugs,
    otherNotReadySlugs,
    completionStatus: missingReleaseQaSlugs.length || manualCaptionReviewPendingSlugs.length || otherNotReadySlugs.length
      ? 'blocked'
      : 'ready',
  };
}

export function buildOperationalPenaltyEvents({ date, operationalState = {}, existingEvents = [], occurredAt = new Date().toISOString() }) {
  const events = [];
  const addIfNew = (event) => {
    const alreadyRecorded = existingEvents.some((existing) => existing.date === date && existing.fingerprint === event.fingerprint);
    if (!alreadyRecorded) events.push(normalizeEvent(event));
  };
  const blockedSlugs = operationalState.blogPublication?.blockedQueueSlugs || [];
  if (blockedSlugs.length) {
    addIfNew({
      occurredAt,
      date,
      kind: 'penalty',
      type: 'missed_checkpoint',
      fingerprint: 'blog-quality-gate-blocked',
      value: blockedSlugs.length,
      evidence: `The ${date} blog queue has ${blockedSlugs.length} quality-blocked slug(s) archived below .workflow-blocked/${date}: ${blockedSlugs.join(', ')}.`,
      source: 'local_checkpoint',
      attributable: true,
      notes: 'Recorded automatically from the dated blocked-work checkpoint to keep quality failures in the profit ledger.',
    });
  }
  if (operationalState.bufferMetrics?.status === 'unavailable') {
    addIfNew({
      occurredAt,
      date,
      kind: 'penalty',
      type: 'missed_checkpoint',
      fingerprint: 'buffer-metrics-api-fetch-unavailable',
      value: 1,
      evidence: `The same-date Buffer metric snapshot for ${date} has an unavailable checkpoint, so matched D+1/D+3/D+7 evidence is unavailable rather than zero.`,
      source: 'buffer_api',
      attributable: true,
      notes: 'Recorded automatically from the dated Buffer unavailable checkpoint to prevent a failed snapshot from being silently omitted.',
    });
  }
  return events;
}

function readOperationalState(date) {
  const queue = readJsonIfExists(join(blogResearchRoot, `${date}-queue.json`));
  const pending = readJsonIfExists(join(blogResearchRoot, `${date}-pending.json`));
  const completeExists = existsSync(join(blogResearchRoot, `${date}-complete.json`));
  const posts = readJsonIfExists(blogPostsPath, []);
  const blockedRoot = join(repoRoot, '.workflow-blocked', date);
  const registeredSlugs = Array.isArray(posts)
    ? posts.map((post) => post?.slug).filter(Boolean)
    : [];
  const blockedSlugs = existsSync(blockedRoot)
    ? [...new Set(readdirSync(blockedRoot)
      .map((entry) => join(blockedRoot, entry, '_status.json'))
      .filter((path) => existsSync(path))
      .map((path) => readJsonIfExists(path))
      .map((status) => status?.slug)
      .filter(Boolean))]
    : [];
  const blogPublication = evaluateBlogPublicationState({
    date,
    queue: queue ? { ...queue, blockedSlugs } : { blockedSlugs },
    pending,
    completeExists,
    registeredSlugs,
  });
  const releaseQaBySlug = Object.fromEntries(blogPublication.registeredQueueSlugs
    .map((slug) => [slug, readJsonIfExists(join(reelOutputRoot, slug, 'release-qa.json'))]));
  const availableMetrics = readJsonIfExists(join(bufferMetricsRoot, `${date}.json`));
  const unavailableMetrics = readJsonIfExists(join(bufferMetricsRoot, `${date}.unavailable.json`));
  const usableMetrics = isUsableBufferSnapshot(availableMetrics, date);
  return {
    blogPublication,
    reelRelease: evaluateReelReleaseState({
      registeredSlugs: blogPublication.registeredQueueSlugs,
      releaseQaBySlug,
    }),
    bufferMetrics: usableMetrics
      ? {
        status: unavailableMetrics?.status === 'unavailable' ? 'available_with_refresh_failure' : 'available',
        checkpoint: `ops/profit-system/buffer-metrics/${date}.json`,
        refreshFailureCheckpoint: unavailableMetrics?.status === 'unavailable'
          ? `ops/profit-system/buffer-metrics/${date}.unavailable.json`
          : null,
      }
      : unavailableMetrics?.status === 'unavailable'
        ? { status: 'unavailable', checkpoint: `ops/profit-system/buffer-metrics/${date}.unavailable.json` }
        : { status: 'missing' },
  };
}

export function buildAudit(date, events, config, snapshots = [], operationalState = {}) {
  const history = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const scored = history.map((event) => ({ ...event, ...scoreEvent(event, history, config) }));
  const todayEvents = scored.filter((event) => event.date === date);
  const leadingIndicators = buildLeadingIndicatorAudit(date, snapshots, config);
  const eventScore = todayEvents.reduce((sum, event) => sum + event.points, 0);
  const rawScore = eventScore + leadingIndicators.score;
  const grouped = groupByDate(scored.filter((event) => event.date < date
    && daysBetween(date, event.date) <= config.comparisonWindowDays));
  const baselineScores = [...grouped.values()].map((row) => row.score);
  const baselineMedian = median(baselineScores);
  const activeTodayEvents = todayEvents.filter((event) => !event.supersededAt);
  const repeatedFailures = activeTodayEvents
    .filter((event) => event.kind === 'penalty' && event.multiplier > 1)
    .map((event) => ({ fingerprint: event.fingerprint, multiplier: event.multiplier, type: event.type }));
  const eventHardStops = activeTodayEvents.filter((event) => ['critical_rule_violation', 'false_success_claim', 'security_or_privacy_violation'].includes(event.type));
  const operationalHardStops = operationalState.blogPublication?.hardStops || [];
  const hardStops = [
    ...eventHardStops.map((event) => ({ type: event.type, fingerprint: event.fingerprint, evidence: event.evidence })),
    ...operationalHardStops,
  ];
  const improvementCandidates = [];
  const proposedFingerprints = new Set();
  for (const event of activeTodayEvents.filter((candidate) => candidate.kind === 'penalty')) {
    const occurrences = history.filter((candidate) => candidate.kind === 'penalty'
      && !candidate.supersededAt
      && candidate.fingerprint === event.fingerprint
      && candidate.date <= date
      && daysBetween(date, candidate.date) <= config.repeatPenalty.lookbackDays).length;
    if ((occurrences >= config.promotionPolicy.minimumRepeatedFailures
      || eventHardStops.some((hardStop) => hardStop.id === event.id))
      && !proposedFingerprints.has(event.fingerprint)) {
      proposedFingerprints.add(event.fingerprint);
      improvementCandidates.push({
        fingerprint: event.fingerprint,
        problemType: event.type,
        occurrences,
        proposedControl: `Add or strengthen a deterministic prevention check for ${event.fingerprint}.`,
        evidence: event.evidence,
        autoApplicable: hardStops.length === 0,
      });
    }
  }
  const comparable = baselineScores.length >= config.minimumComparableDays;
  const deltaVsMedian = comparable ? rawScore - baselineMedian : null;
  return {
    version: 1,
    date,
    generatedAt: new Date().toISOString(),
    score: clamp(rawScore, config.maximumAbsoluteScore),
    rawScore,
    eventScore,
    leadingIndicators,
    comparison: {
      comparable,
      sampleDays: baselineScores.length,
      trailingMedianScore: baselineMedian,
      deltaVsMedian,
      direction: !comparable ? 'baseline_building' : deltaVsMedian > 0 ? 'improved' : deltaVsMedian < 0 ? 'regressed' : 'flat',
    },
    rewards: activeTodayEvents.filter((event) => event.kind === 'reward'),
    penalties: activeTodayEvents.filter((event) => event.kind === 'penalty'),
    repeatedFailures,
    hardStops,
    operationalState,
    improvementCandidates,
    sopMutationAllowed: hardStops.length === 0,
  };
}

export function formatRevenueProfitEvidence(rewards) {
  const moneyEvents = rewards
    .filter((event) => ['gross_profit_usd', 'attributed_revenue_usd'].includes(event.type))
  if (!moneyEvents.length) return 'unavailable';
  const money = moneyEvents.reduce((sum, event) => sum + event.value, 0);
  return `$${money.toFixed(2)}`;
}

export function markdownReport(audit) {
  const moneyEvidence = formatRevenueProfitEvidence(audit.rewards);
  const lines = [
    `# Daily Profit and SOP Audit — ${audit.date}`,
    '',
    `- Score: **${audit.score.toFixed(2)}** (raw ${audit.rawScore.toFixed(2)})`,
    `- Comparison: **${audit.comparison.direction}** (${audit.comparison.sampleDays} prior comparable day(s))`,
    `- Revenue/profit evidence recorded: **${moneyEvidence}**`,
    `- Buffer leading-indicator score: **${audit.leadingIndicators.score.toFixed(2)}** (${audit.leadingIndicators.status})`,
    `- Rewards: **${audit.rewards.length}**`,
    `- Penalties: **${audit.penalties.length}**`,
    `- Hard stops: **${audit.hardStops.length}**`,
    `- Completion status: **${audit.operationalState?.blogPublication?.completionStatus || 'unknown'}**`,
    '',
    '## Reward Evidence',
    '',
    ...(audit.rewards.length ? audit.rewards.map((event) => `- ${event.type}: +${event.points.toFixed(2)} — ${event.evidence}`) : ['- None recorded.']),
    '',
    '## Penalty Evidence',
    '',
    ...(audit.penalties.length ? audit.penalties.map((event) => `- ${event.type}: ${event.points.toFixed(2)} (repeat x${event.multiplier}) — ${event.evidence}`) : ['- None recorded.']),
    '',
    '## Buffer Leading Indicators',
    '',
    audit.leadingIndicators.insight?.statement
      ? `- ${audit.leadingIndicators.insight.statement}`
      : '- No Buffer performance snapshot is available for this date.',
    `- Comparable normalized measurements: ${audit.leadingIndicators.comparisons.length}.`,
    audit.leadingIndicators.sourceLagNotice ? `- Freshness: ${audit.leadingIndicators.sourceLagNotice}` : '- Freshness: unavailable.',
    '',
    '## Operational State',
    '',
    ...(audit.operationalState?.blogPublication?.expectedSlugs?.length
      ? [
        `- Blog queue expected slugs: ${audit.operationalState.blogPublication.expectedSlugs.length}.`,
        `- Blog queue registered in posts.json: ${audit.operationalState.blogPublication.registeredQueueSlugs.length}.`,
        audit.operationalState.blogPublication.pendingRemaining.length
          ? `- Pending blog slugs still open: ${audit.operationalState.blogPublication.pendingRemaining.join(', ')}.`
          : '- No pending blog slugs remain for this date.',
        audit.operationalState.blogPublication.completeExists
          ? '- A dated complete marker exists for this operating day.'
          : '- No dated complete marker exists for this operating day.',
      ]
      : ['- No dated blog queue was found for this operating day.']),
    `- Reel release checkpoint: ${audit.operationalState?.reelRelease?.completionStatus || 'unavailable'}.`,
    `- Buffer metric checkpoint: ${audit.operationalState?.bufferMetrics?.status || 'unavailable'}.`,
    ...(audit.operationalState?.reelRelease?.manualCaptionReviewPendingSlugs?.length
      ? [`- Manual caption review pending: ${audit.operationalState.reelRelease.manualCaptionReviewPendingSlugs.join(', ')}.`]
      : []),
    ...(audit.operationalState?.reelRelease?.missingReleaseQaSlugs?.length
      ? [`- Missing reel release QA: ${audit.operationalState.reelRelease.missingReleaseQaSlugs.join(', ')}.`]
      : []),
    ...(audit.operationalState?.reelRelease?.otherNotReadySlugs?.length
      ? [`- Reels not ready for another release-QA reason: ${audit.operationalState.reelRelease.otherNotReadySlugs.join(', ')}.`]
      : []),
    '',
    '## Improvement Candidates',
    '',
    ...(audit.improvementCandidates.length ? audit.improvementCandidates.map((item) => `- **${item.fingerprint}** (${item.occurrences} occurrence(s)): ${item.proposedControl}`) : ['- No rule change has sufficient evidence today.']),
    '',
    '## Governance Result',
    '',
    audit.hardStops.length
      ? '- SOP mutation is frozen. Resolve the hard-stop incident and obtain human review.'
      : '- Evidence-backed additive controls may be proposed. Existing hard rules may not be weakened.',
    '',
  ];
  return lines.join('\n');
}

function record(args) {
  const config = readJson(configPath);
  const event = normalizeEvent({
    kind: args.kind,
    type: args.type,
    fingerprint: args.fingerprint,
    value: args.value ?? 1,
    evidence: args.evidence,
    source: args.source,
    date: args.date,
    notes: args.notes,
    attributable: args.attributable !== 'false',
  });
  const weights = event.kind === 'reward' ? config.rewardWeights : config.penaltyWeights;
  if (!Number.isFinite(weights[event.type])) fail(`Unknown ${event.kind} type: ${event.type}`);
  appendFileSync(eventsPath, `${JSON.stringify(event)}\n`);
  console.log(`[profit-system] recorded ${event.kind} ${event.type} ${event.fingerprint}`);
}

function audit(args) {
  const date = normalizeOperatingDate(args.date || new Date());
  const config = readJson(configPath);
  const events = readJsonLines(eventsPath).map(normalizeEvent);
  const snapshots = existsSync(bufferMetricsRoot)
    ? readdirSync(bufferMetricsRoot)
      .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .map((name) => readJson(join(bufferMetricsRoot, name)))
    : [];
  const operationalState = readOperationalState(date);
  const operationalPenaltyEvents = buildOperationalPenaltyEvents({ date, operationalState, existingEvents: events });
  for (const event of operationalPenaltyEvents) appendFileSync(eventsPath, `${JSON.stringify(event)}\n`);
  const result = buildAudit(date, [...events, ...operationalPenaltyEvents], config, snapshots, operationalState);
  mkdirSync(reportsRoot, { recursive: true });
  writeFileSync(join(reportsRoot, `${date}.json`), `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(join(reportsRoot, `${date}.md`), markdownReport(result));
  const latest = { date, report: `ops/profit-system/reports/${date}.json`, generatedAt: result.generatedAt };
  writeFileSync(join(systemRoot, 'latest.json'), `${JSON.stringify(latest, null, 2)}\n`);
  console.log(`[profit-system] ${date} score=${result.score.toFixed(2)} direction=${result.comparison.direction} rewards=${result.rewards.length} penalties=${result.penalties.length}`);
  console.log(`[profit-system] report ${join(reportsRoot, `${date}.md`)}`);
  if (result.hardStops.length) process.exitCode = 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.command === 'record') record(args);
    else audit(args);
  } catch (error) {
    console.error(`[profit-system] ${error.message}`);
    process.exit(1);
  }
}
