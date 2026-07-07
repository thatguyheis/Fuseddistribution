#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_MAX_AGE_MINUTES = 30;
const DEFAULT_MIN_LEAD_MINUTES = 5;

function usage() {
  console.error(`Usage: node public/blog/scripts/validate-buffer-queue.mjs --queue=.buffer-youtube-queue.json [options]

Validates a generated Buffer queue immediately before create_post.

Options:
  --queue=path              Queue JSON to validate. Required.
  --max-age-minutes=N       Maximum queue age. Default: 30.
  --min-lead-minutes=N      Minimum future lead time for selected dueAt values. Default: 5.
`);
  process.exit(2);
}

function parsePositiveInt(raw, name) {
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) throw new Error(`${name} must be a positive integer.`);
  return Number(raw);
}

function parseArgs(argv) {
  const args = {
    queue: '',
    maxAgeMinutes: DEFAULT_MAX_AGE_MINUTES,
    minLeadMinutes: DEFAULT_MIN_LEAD_MINUTES,
  };

  for (const arg of argv) {
    if (arg.startsWith('--queue=')) args.queue = resolve(arg.slice('--queue='.length));
    else if (arg.startsWith('--max-age-minutes=')) args.maxAgeMinutes = parsePositiveInt(arg.slice('--max-age-minutes='.length), '--max-age-minutes');
    else if (arg.startsWith('--min-lead-minutes=')) args.minLeadMinutes = parsePositiveInt(arg.slice('--min-lead-minutes='.length), '--min-lead-minutes');
    else usage();
  }

  if (!args.queue) usage();
  return args;
}

function readQueue(path) {
  if (!existsSync(path)) throw new Error(`Missing queue file: ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse queue JSON: ${error.message}`);
  }
}

function parseDate(value, label, blockers) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) {
    blockers.push(`${label}: missing or invalid date`);
    return null;
  }
  return time;
}

function validateSelectedJob(job, index, now, minLeadMs, blockers) {
  const label = `selected[${index}] ${job?.slug || '(missing slug)'}`;
  if (!job?.slug) blockers.push(`${label}: missing slug`);

  const dueAtTime = parseDate(job?.dueAt, `${label} dueAt`, blockers);
  if (dueAtTime !== null && dueAtTime < now + minLeadMs) {
    blockers.push(`${label}: dueAt is not far enough in the future`);
  }

  const payload = job?.createPostPayload;
  if (!payload || typeof payload !== 'object') {
    blockers.push(`${label}: missing createPostPayload`);
    return;
  }

  if (payload.dueAt !== job.dueAt) blockers.push(`${label}: payload dueAt does not match job dueAt`);
  if (!payload.channelId || payload.channelId !== job.channelId) blockers.push(`${label}: payload channelId does not match job channelId`);
  if (payload.mode !== 'customScheduled') blockers.push(`${label}: payload mode must be customScheduled`);
  if (payload.schedulingType !== 'automatic') blockers.push(`${label}: payload schedulingType must be automatic`);

  const videoUrl = payload.assets?.[0]?.video?.url;
  if (!/^https:\/\/\S+$/i.test(videoUrl || '')) {
    blockers.push(`${label}: missing HTTPS video asset URL`);
  }
  if (videoUrl && job.publicMediaUrl && videoUrl !== job.publicMediaUrl) {
    blockers.push(`${label}: payload video URL does not match publicMediaUrl`);
  }
}

function validateQueue(queue, args) {
  const blockers = [];
  const now = Date.now();
  const maxAgeMs = args.maxAgeMinutes * 60_000;
  const minLeadMs = args.minLeadMinutes * 60_000;

  const generatedAt = parseDate(queue.generatedAt, 'generatedAt', blockers);
  if (generatedAt !== null && generatedAt < now - maxAgeMs) {
    blockers.push(`queue is stale: generatedAt is older than ${args.maxAgeMinutes} minutes`);
  }

  const expiresAt = Date.parse(queue.expiresAt || '');
  if (Number.isFinite(expiresAt) && expiresAt < now) {
    blockers.push('queue is expired');
  }

  const selected = Array.isArray(queue.selected) ? queue.selected : [];
  if (selected.length === 0) blockers.push('selected queue is empty');

  const verification = queue.youtube?.mediaUrlVerification ?? queue.x?.mediaUrlVerification;
  if (verification && verification !== 'required') {
    blockers.push(`media URL verification was not required (${verification})`);
  }

  selected.forEach((job, index) => validateSelectedJob(job, index, now, minLeadMs, blockers));

  return blockers;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const queue = readQueue(args.queue);
  const blockers = validateQueue(queue, args);
  if (blockers.length) {
    for (const blocker of blockers) console.error(`[buffer-queue] FAIL ${blocker}`);
    process.exit(1);
  }
  console.log(`[buffer-queue] OK ${args.queue}`);
} catch (error) {
  console.error(`[buffer-queue] ${error.message}`);
  process.exit(1);
}
