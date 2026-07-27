#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const systemRoot = join(repoRoot, 'ops', 'profit-system');
const configPath = join(systemRoot, 'config.json');
const eventsPath = join(systemRoot, 'events.jsonl');
const rulesPath = join(systemRoot, 'learned-rules.json');
const reportsRoot = join(systemRoot, 'reports');
const bufferMetricsRoot = join(systemRoot, 'buffer-metrics');

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

function isoDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) fail(`Invalid date: ${value}`);
  return date.toISOString().slice(0, 10);
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
    date: isoDate(raw.date || new Date()),
    kind: raw.kind,
    type: raw.type,
    fingerprint: raw.fingerprint,
    value: finiteNumber(raw.value ?? 1, 'value'),
    evidence: raw.evidence,
    source: raw.source || 'manual',
    attributable: raw.attributable !== false,
    notes: raw.notes || ''
  };
}

function daysBetween(later, earlier) {
  return Math.floor((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000);
}

export function repeatMultiplier(event, history, config) {
  if (event.kind !== 'penalty') return 1;
  const repeats = history.filter((candidate) => candidate.kind === 'penalty'
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

export function buildAudit(date, events, config, snapshots = []) {
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
  const repeatedFailures = todayEvents
    .filter((event) => event.kind === 'penalty' && event.multiplier > 1)
    .map((event) => ({ fingerprint: event.fingerprint, multiplier: event.multiplier, type: event.type }));
  const hardStops = todayEvents.filter((event) => ['critical_rule_violation', 'false_success_claim', 'security_or_privacy_violation'].includes(event.type));
  const improvementCandidates = [];
  const proposedFingerprints = new Set();
  for (const event of todayEvents.filter((candidate) => candidate.kind === 'penalty')) {
    const occurrences = history.filter((candidate) => candidate.kind === 'penalty'
      && candidate.fingerprint === event.fingerprint
      && candidate.date <= date
      && daysBetween(date, candidate.date) <= config.repeatPenalty.lookbackDays).length;
    if ((occurrences >= config.promotionPolicy.minimumRepeatedFailures || hardStops.includes(event))
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
    rewards: todayEvents.filter((event) => event.kind === 'reward'),
    penalties: todayEvents.filter((event) => event.kind === 'penalty'),
    repeatedFailures,
    hardStops: hardStops.map((event) => ({ type: event.type, fingerprint: event.fingerprint, evidence: event.evidence })),
    improvementCandidates,
    sopMutationAllowed: hardStops.length === 0,
  };
}

function markdownReport(audit) {
  const money = audit.rewards
    .filter((event) => ['gross_profit_usd', 'attributed_revenue_usd'].includes(event.type))
    .reduce((sum, event) => sum + event.value, 0);
  const lines = [
    `# Daily Profit and SOP Audit — ${audit.date}`,
    '',
    `- Score: **${audit.score.toFixed(2)}** (raw ${audit.rawScore.toFixed(2)})`,
    `- Comparison: **${audit.comparison.direction}** (${audit.comparison.sampleDays} prior comparable day(s))`,
    `- Revenue/profit evidence recorded: **$${money.toFixed(2)}**`,
    `- Buffer leading-indicator score: **${audit.leadingIndicators.score.toFixed(2)}** (${audit.leadingIndicators.status})`,
    `- Rewards: **${audit.rewards.length}**`,
    `- Penalties: **${audit.penalties.length}**`,
    `- Hard stops: **${audit.hardStops.length}**`,
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
  const date = isoDate(args.date || new Date());
  const config = readJson(configPath);
  const events = readJsonLines(eventsPath).map(normalizeEvent);
  const snapshots = existsSync(bufferMetricsRoot)
    ? readdirSync(bufferMetricsRoot)
      .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .map((name) => readJson(join(bufferMetricsRoot, name)))
    : [];
  const result = buildAudit(date, events, config, snapshots);
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
