#!/usr/bin/env node
// Deterministic reporting only: no model, network, publishing, or approval actions.
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
const directory = join(root, '.workflow-state/local-operations', date);
mkdirSync(directory, { recursive: true });
const jobs = [
  ['engagement', ['scripts/engagement-report.mjs'], [0]],
  ['topics', ['scripts/topic-inventory.py', '--write'], [0]],
  ['publishing', ['scripts/publishing-health.mjs'], [0, 1]],
  ['rights', ['video/scripts/audit-audio-rights.mjs', '--include-renders', '--json'], [0, 1]],
  ['fitness', ['scripts/content-fitness-report.mjs', '--format=json'], [0]],
  ['lifecycle', ['scripts/ada-lifecycle.mjs', 'run', `--date=${date}`, '--apply'], [0]],
  ['profit', ['scripts/profit-sop-audit.mjs', 'audit', `--date=${date}`], [0, 2]],
];
const results = jobs.map(([name, args, expectedCodes]) => {
  const report = join(directory, `${name}.txt`);
  const stderr = join(directory, `${name}.stderr.txt`);
  const out = openSync(report, 'w');
  const err = openSync(stderr, 'w');
  let result;
  try {
    result = spawnSync(name === 'topics' ? 'python3' : process.execPath, args, { cwd: root, timeout: 120_000, stdio: ['ignore', out, err] });
  } finally { closeSync(out); closeSync(err); }
  return { name, exitCode: result.status, signal: result.signal, error: result.error?.code,
    executionFailed: !!result.error || !expectedCodes.includes(result.status),
    report, stderr };
});
function parsed(name) {
  try { return JSON.parse(readFileSync(join(directory, `${name}.txt`), 'utf8')); }
  catch { return null; }
}
const health = parsed('publishing');
const rights = parsed('rights');
const topicInventory = parsed('topics');
const lifecycle = parsed('lifecycle');
const summary = {
  checkedAt: new Date().toISOString(), operatingDate: date, results, topicInventory,
  publishing: health ? { healthy: health.healthy, unpublishedTopics: health.unpublishedTopics.length,
    brokenPosts: health.brokenPosts.length, missingQueueDates: health.missingQueueDates.length } : null,
  rights: rights?.summary ?? null,
  lifecycle: lifecycle ? { records: lifecycle.records.length, evaluations: lifecycle.evaluations } : null,
  limitations: 'Saved local evidence only. Does not verify live publication, YouTube claims, process ownership or editorial approval. Metrics are cached; unavailable data is not zero.',
};
const latest = join(root, '.workflow-state/local-operations/latest.json');
const temporary = `${latest}.${process.pid}.tmp`;
writeFileSync(temporary, JSON.stringify(summary, null, 2) + '\n');
renameSync(temporary, latest);
console.log(JSON.stringify(summary));
process.exitCode = results.some(result => result.executionFailed) ? 1 : 0;
