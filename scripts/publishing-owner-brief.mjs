#!/usr/bin/env node
// Read-only, bounded evidence for scheduled owners. This never declares work complete.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { buildBacklog } from './reel-backlog.mjs';
import { batchInventory } from './batch-inventory.mjs';
import { dailyProductionState } from './lib/daily-production-state.mjs';
import {verifiedPublicationSlugs} from './lib/verified-blog-publication.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
function read(path) {
  try { return JSON.parse(readFileSync(join(root, path), 'utf8')); }
  catch (error) { return { unavailable: true, reason: error.code || 'invalid_json', path }; }
}
function lock(path) {
  try {
    return { path, pid: readFileSync(join(path, 'pid'), 'utf8').trim(), modifiedAt: statSync(path).mtime.toISOString(), ownership: 'must_verify_process_before_mutation' };
  } catch (error) { return { path, observation: error.code, ownership: error.code === 'ENOENT' ? 'available_for_atomic_acquisition' : 'indeterminate_preserve', nextAction: error.code === 'ENOENT' ? 'Create the publisher lock atomically before mutation; absence is not a blocker.' : 'Inspect ownership; do not duplicate.' }; }
}
const todayQueue = read(`public/blog/research/${today}-queue.json`);
const todayCompletion = read(`public/blog/research/${today}-complete.json`);
const hourPacific = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
const owner = read('.workflow-state/publishing-owner-current.json');
const localAudit = read('.workflow-state/local-operations/latest.json');
const samples = read('.workflow-state/token-budget-samples.json');
const advisory = read('.workflow-state/local-advisory/latest.json');
const sample = (samples.samples || []).filter(s => s.operatingDate === today).at(-1);
let pending;
try { pending = readdirSync(join(root, 'public/blog/research')).filter(n => /^\d{4}-\d{2}-\d{2}-pending\.json$/.test(n)).sort(); }
catch (error) { pending = [{ unavailable: true, reason: error.code }]; }
// A current-day queue must not hide missed plans from offline days.
const overdueProduction = readdirSync(join(root, 'public/blog/research'))
  .filter(name => /^\d{4}-\d{2}-\d{2}-plan\.json$/.test(name) && name.slice(0, 10) < today)
  .sort().map(name => {
    const day = name.slice(0, 10);
    const plan = read(`public/blog/research/${name}`);
    const queue = read(`public/blog/research/${day}-queue.json`);
    const completion = read(`public/blog/research/${day}-complete.json`);
    return { date: day, ...dailyProductionState(queue, completion, 23, plan,verifiedPublicationSlugs(root,plan.posts||[])) };
  }).filter(item => item.actionable);
console.log(JSON.stringify({
  checkedAt: new Date().toISOString(), operatingDate: today,
  overdueProduction,
  preferredCoinMedia: {catalog: 'content/coin-library/catalog.json', sop: 'docs/COIN-HISTORY-SOP.md', instruction: 'Use relevant owner coin photos first; rotate history with other categories. Candidate seeds require factual and crop review. Confirm each claimed coin feature against the exact raw image; the first Morgan episode O attribution was withdrawn and must not be reused.'},
  reelBacklog: (() => {const q=buildBacklog(root);return {...q,items:q.items.filter(i=>i.stage!=='waiting_repost_window').slice(0,12)};})(),
  priorityAction: overdueProduction.length ? {
    stage: 'repair_oldest_missing_blog', date: overdueProduction[0].date,
    instruction: 'Finish and live-verify the oldest missing article before optional metrics or older reel repairs while social inventory remains scheduled. Owner approval is work, not a user blocker.',
  } : {stage: 'prepare_due_approved_inventory'},
  writerHealth: read('.workflow-state/litert-health/latest.json'),
  preparedInventory: batchInventory(root,today),
  researchBatch: read('.workflow-state/research-batch/latest.json'),
  legacyVideoRepair: {queue:'.workflow-state/blog-video-reconciliation/legacy-video-repair-queue.json',pending:read('.workflow-state/blog-video-reconciliation/legacy-video-repair-queue.json').items?.filter(row=>row.status==='needs_matching_approved_video').length},
  blogVideoReconciliation: (() => { const v=read('.workflow-state/blog-video-reconciliation/latest.json'); return {checkedAt:v.checkedAt,existingPlayers:v.existingPlayers,eligible:v.eligible?.length,blocked:v.blocked,error:v.error,deployed:v.deployed?.length,report:'.workflow-state/blog-video-reconciliation/latest.json'}; })(),
  reelEnrichment: {sop: 'docs/REEL-ENRICHMENT-SOP.md', library: 'content/reel-media/README.md', instruction: 'Use applicable local generated illustration, reviewed stock video and original evidence. Inspect every scene and pacing in the exact MP4. Reject repeated static cards, unrelated imagery or generation artifacts; log and repair failed media enrichment before scheduling.'},
  techEducation: {sop: 'docs/TECH-EDUCATION-SOP.md', topics: 'content/tech-education/README.md', instruction: 'Use specific tool lessons and the seven-field hook strategy. Verify current usage and exact demo evidence; Whisper fallback is not Whisper transcription. Muse means Meta Muse for Small Business; verify account-specific demonstrations and do not assume native Buffer integration.'},
  topicInventory: read('.workflow-state/topic-inventory.json'),
  publisherRetry: read(`.workflow-state/publisher-retry/${today}.json`),
  dailyProduction: dailyProductionState(todayQueue, todayCompletion, hourPacific, read(`public/blog/research/${today}-plan.json`), verifiedPublicationSlugs(root, read(`public/blog/research/${today}-plan.json`).posts || [])),
  localAudit: localAudit.unavailable ? localAudit : {
    checkedAt: localAudit.checkedAt, operatingDate: localAudit.operatingDate,
    executionFailures: localAudit.results?.filter(result => result.executionFailed),
    publishing: localAudit.publishing, rights: localAudit.rights,
    report: '.workflow-state/local-operations/latest.json',
  },
  localAdvisory: {
    procedure: 'docs/LOCAL-ADVISORY-SOP.md',
    latest: advisory.unavailable ? advisory : {
      state: advisory.state, finishedAt: advisory.finishedAt, model: advisory.model,
      modelCalls: advisory.modelCalls, cacheHits: advisory.cacheHits,
      error: advisory.error, unloaded: advisory.unloaded, unloadError: advisory.unloadError,
    },
    instruction: 'Advisory only; use current input hashes, not file existence. Exact checks and unchanged known findings need no model. Defer to live production owners.',
  },
  checkpoint: owner.unavailable ? owner : {
    updatedAt: owner.updatedAt, activeOwnerWork: owner.activeOwnerWork,
    nextActions: owner.nextActions?.slice(0, 5), publishingRecovery: owner.publishingRecovery,
  },
  pendingQueueCount: pending.length, oldestPendingFiles: pending.slice(0, 3),
  todayQueue,
  todayCompletion,
  bufferCooldown: read('.buffer-live-unavailable.json'),
  usage: sample || { sampleDue: true },
  locks: ['/tmp/fused-blog-publisher.lock', '/tmp/fused-reel-scheduler.lock', '/tmp/fused-remotion-render.lock'].map(lock),
  instructions: 'Saved evidence may be stale. Verify ownership and changed artifacts for one actionable stage. No full log dumps, polling, duplicate producers or completion inferred from this summary.',
}, null, 2));
