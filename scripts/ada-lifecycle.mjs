#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const generationRoot = join(repoRoot, 'ops', 'profit-system', 'evolution', 'generations');
const snapshotRoot = join(repoRoot, 'ops', 'profit-system', 'buffer-metrics');
const reportRoot = join(repoRoot, 'ops', 'profit-system', 'evolution');
const scheduledLogs = ['.buffer-youtube-scheduled.json', '.buffer-x-scheduled.json', '.buffer-instagram-scheduled.json'];
const REQUIRED_BUCKETS = ['d1', 'd3', 'd7'];

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const args = { command: 'run', date: new Date().toISOString().slice(0, 10), apply: false };
  for (const item of argv) {
    if (item === 'run' || item === 'status') args.command = item;
    else if (item.startsWith('--date=')) args.date = item.slice(7);
    else if (item === '--apply') args.apply = true;
    else throw new Error(`Unknown argument: ${item}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error('--date must be YYYY-MM-DD.');
  return args;
}

function generationFiles() {
  if (!existsSync(generationRoot)) return [];
  return readdirSync(generationRoot).filter((name) => name.endsWith('.json')).sort()
    .map((name) => join(generationRoot, name));
}

function bufferPostMap() {
  const result = new Map();
  for (const name of scheduledLogs) {
    const value = readJson(join(repoRoot, name), {});
    const entries = Array.isArray(value) ? value : value.scheduled || value.posts || [];
    for (const entry of entries) {
      if (entry?.slug && entry?.postId) result.set(entry.slug, { postId: entry.postId, source: name, scheduledAt: entry.scheduledAt || null });
    }
  }
  return result;
}

function snapshots() {
  if (!existsSync(snapshotRoot)) return [];
  return readdirSync(snapshotRoot).filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort()
    .map((name) => ({ path: join(snapshotRoot, name), value: readJson(join(snapshotRoot, name)) }))
    .filter(({ value }) => value?.status !== 'unavailable' && Array.isArray(value?.posts));
}

function evidenceForPost(postId, availableSnapshots) {
  const evidence = {};
  for (const { path, value } of availableSnapshots) {
    const post = value.posts.find((candidate) => candidate.postId === postId);
    if (!post || !REQUIRED_BUCKETS.includes(post.ageBucket)) continue;
    const current = evidence[post.ageBucket];
    if (!current || String(value.capturedAt) > String(current.capturedAt)) {
      evidence[post.ageBucket] = {
        snapshotPath: path.replace(`${repoRoot}/`, ''),
        capturedAt: value.capturedAt,
        ageHours: post.ageHours,
        views: post.views,
        impressions: post.impressions,
        clicks: post.clicks,
        shares: post.shares,
        saves: post.saves,
        comments: post.comments,
        averageViewDurationSeconds: post.averageViewDurationSeconds,
      };
    }
  }
  return evidence;
}

function qualityGate(record) {
  if (!record.slug) return { status: 'missing_slug' };
  const qa = readJson(join(repoRoot, 'video', 'out', record.slug, 'release-qa.json'));
  if (!qa) return { status: 'missing_release_qa' };
  return { status: qa.pass === true && qa.readyForPosting !== false ? 'passed' : 'blocked', path: `video/out/${record.slug}/release-qa.json` };
}

function fitness(record) {
  const values = Object.values(record.bufferSnapshots || {}).filter((value) => Number.isFinite(value.views));
  const mature = values.find((value) => value.ageHours >= 144) || values.find((value) => value.ageHours >= 72);
  if (!mature) return null;
  const exposure = mature.views ?? mature.impressions;
  const engagement = (mature.shares || 0) * 3 + (mature.saves || 0) * 3 + (mature.comments || 0) * 2;
  return Number((exposure + engagement * 5 + (mature.clicks || 0) * 10).toFixed(2));
}

function updateRecord(record, postMap, availableSnapshots) {
  const next = structuredClone(record);
  const mapped = next.bufferPostId ? { postId: next.bufferPostId, source: 'generation_record' } : postMap.get(next.slug);
  if (mapped?.postId) {
    next.bufferPostId = mapped.postId;
    next.distribution = { ...(next.distribution || {}), source: mapped.source, reconciledAt: new Date().toISOString() };
    next.status = 'distributed';
  }
  if (next.bufferPostId) next.bufferSnapshots = evidenceForPost(next.bufferPostId, availableSnapshots);
  next.qualityGate = qualityGate(next);
  next.fitness = fitness(next);
  const buckets = Object.keys(next.bufferSnapshots || {});
  if (!next.bufferPostId) next.status = 'registered';
  else if (next.qualityGate.status !== 'passed') next.status = 'quality_blocked';
  else if (!REQUIRED_BUCKETS.every((bucket) => buckets.includes(bucket))) next.status = 'awaiting_evidence';
  else next.status = 'ready_for_selection';
  return next;
}

function evaluateGeneration(records) {
  const complete = records.filter((record) => record.status === 'ready_for_selection' && Number.isFinite(record.fitness));
  const byTreatment = new Map();
  for (const record of complete) {
    const key = `${record.brand}:${record.platform}:${record.genes?.hookType || 'unknown'}`;
    byTreatment.set(key, [...(byTreatment.get(key) || []), record]);
  }
  const eligible = [...byTreatment.values()].filter((group) => group.length >= 3);
  if (!eligible.length) {
    return { decision: 'no_winner', reason: 'insufficient_comparable_samples', eligibleSamples: complete.length, minimumSamplesPerTreatment: 3 };
  }
  const ranked = eligible.map((group) => ({ group, medianFitness: group.map((r) => r.fitness).sort((a, b) => a - b)[Math.floor(group.length / 2)] }))
    .sort((a, b) => b.medianFitness - a.medianFitness);
  return { decision: 'champion_candidate', championGeneticIds: ranked[0].group.map((record) => record.geneticId), medianFitness: ranked[0].medianFitness };
}

export function runLifecycle({ apply = false, date = new Date().toISOString().slice(0, 10) } = {}) {
  const postMap = bufferPostMap();
  const availableSnapshots = snapshots();
  const records = generationFiles().map((path) => ({ path, value: readJson(path) })).filter(({ value }) => value?.geneticId);
  const updated = records.map(({ path, value }) => ({ path, before: value, after: updateRecord(value, postMap, availableSnapshots) }));
  const groups = new Map();
  for (const item of updated) {
    const key = `${item.after.brand}:${item.after.platform}:G${String(item.after.generation).padStart(3, '0')}`;
    groups.set(key, [...(groups.get(key) || []), item.after]);
  }
  const evaluations = [...groups].map(([generation, group]) => ({ generation, ...evaluateGeneration(group) }));
  if (apply) for (const { path, after } of updated) writeJson(path, after);
  const report = { version: 1, runAt: new Date().toISOString(), date, apply, records: updated.map(({ before, after }) => ({ geneticId: after.geneticId, beforeStatus: before.status, status: after.status, bufferPostId: after.bufferPostId, evidenceBuckets: Object.keys(after.bufferSnapshots || {}), quality: after.qualityGate?.status, fitness: after.fitness })), evaluations };
  if (apply) writeJson(join(reportRoot, `ada-lifecycle-${date}.json`), report);
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const report = runLifecycle(args);
  console.log(JSON.stringify(report, null, 2));
}
