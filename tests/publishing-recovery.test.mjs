import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { newestFirst } from '../public/blog/scripts/lib/post-order.mjs';
import { auditPublishing } from '../scripts/lib/publishing-health.mjs';
import { cooldownUntil, saveCooldown } from '../public/blog/scripts/lib/buffer-cooldown.mjs';

test('backlog insertion sorts chronologically and preserves ties and input', () => {
  const posts = [{ slug: 'old', date: '2026-07-22' }, { slug: 'new', date: '2026-09-05' }, { slug: 'peer', date: '2026-09-05' }];
  assert.deepEqual(newestFirst(posts).map(p => p.slug), ['new', 'peer', 'old']);
  assert.equal(posts[0].slug, 'old');
  assert.throws(() => newestFirst([{ slug: 'bad', date: '2026-02-31' }]));
});

test('catalog and complete marker cannot hide missing artifacts or recycled topics', () => {
  const root = mkdtempSync(join(tmpdir(), 'publishing-audit-'));
  const blog = join(root, 'public/blog');
  mkdirSync(join(blog, 'research'), { recursive: true });
  writeFileSync(join(blog, 'posts.json'), JSON.stringify([{ slug: 'old', date: '2026-09-03' }]));
  writeFileSync(join(blog, 'research/2026-09-06-queue.json'), JSON.stringify({ posts: [{ slug: 'old' }] }));
  writeFileSync(join(blog, 'research/2026-09-06-complete.json'), '{}');
  const report = auditPublishing(root);
  assert.equal(report.healthy, false);
  assert.deepEqual(report.dates[0].missing, ['old']);
  assert.deepEqual(report.dates[0].duplicateTopics, ['old']);
  assert.equal(report.dates[0].fresh, 0);
});

test('shared Buffer cooldown survives callers and cannot be shortened', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'buffer-cooldown-')), 'state.json');
  saveCooldown(path, 86400, '24h', 100000);
  saveCooldown(path, 60, '15min', 101000);
  assert.equal(cooldownUntil(path, 102000), 86500000);
  assert.equal(cooldownUntil(path, 86500001), null);
});

test('default audit retains historical unpublished topics and all planned dates', () => {
  const root = mkdtempSync(join(tmpdir(), 'publishing-history-'));
  const blog = join(root, 'public/blog');
  mkdirSync(join(blog, 'research'), { recursive: true });
  writeFileSync(join(blog, 'posts.json'), '[]');
  for (const date of ['2026-06-19', '2026-09-07']) {
    writeFileSync(join(blog, 'research', `${date}-queue.json`), JSON.stringify({ posts: [{ slug: 'missing' }] }));
  }
  const report = auditPublishing(root, { today: '2026-09-07' });
  assert.equal(report.startDate, '2026-06-19');
  assert.deepEqual(report.unpublishedTopics, [{ slug: 'missing', firstQueued: '2026-06-19', queuedDates: ['2026-06-19', '2026-09-07'] }]);
  assert.equal(report.healthy, false);
  assert.ok(report.missingQueueDates.includes('2026-06-20'));
});

test('equivalent topic requires verified canonical evidence and reopens after content drift', () => {
  const root = mkdtempSync(join(tmpdir(), 'publishing-equivalent-'));
  const blog = join(root, 'public/blog');
  mkdirSync(join(blog, 'research'), { recursive: true });
  mkdirSync(join(blog, 'canonical'));
  mkdirSync(join(root, '.workflow-state'));
  for (const file of ['index.html', 'hero.jpg', 'reel-data.md', 'reel-script.md', 'social-copy.json']) writeFileSync(join(blog, 'canonical', file), 'reviewed');
  writeFileSync(join(blog, 'canonical/qa.json'), JSON.stringify({ slug: 'canonical', pass: true, score: 90, mode: 'codex-editorial', blockers: [] }));
  writeFileSync(join(blog, 'posts.json'), JSON.stringify([{ slug: 'canonical', date: '2026-07-25' }]));
  writeFileSync(join(blog, 'research/2026-06-30-queue.json'), JSON.stringify({ posts: [{ slug: 'missing' }] }));
  assert.equal(auditPublishing(root).unpublishedTopics.length, 1);
  const resolution = { queuedSlug: 'missing', canonicalSlug: 'canonical', status: 'verified', rationale: 'Complete topic reviewed in corrected canonical article', verifiedAt: '2026-09-07T20:00:00Z', url: 'https://fuseddistribution.com/blog/canonical/', catalog: true, sitemap: true, indexSha256: createHash('sha256').update('reviewed').digest('hex') };
  writeFileSync(join(root, '.workflow-state/canonical-topic-resolutions.json'), JSON.stringify({ resolutions: [resolution] }));
  const report = auditPublishing(root);
  assert.deepEqual(report.unpublishedTopics, []);
  assert.deepEqual(report.dates[0].missing, []);
  assert.equal(report.dates[0].fresh, 0);
  assert.equal(report.healthy, false, 'late equivalent coverage cannot erase missed cadence');
  writeFileSync(join(blog, 'canonical/index.html'), 'unreviewed replacement');
  assert.equal(auditPublishing(root).unpublishedTopics.length, 1);
});

test('audit detects absent completed-day queues without flagging an unscheduled current day', () => {
  const root = mkdtempSync(join(tmpdir(), 'publishing-calendar-'));
  const blog = join(root, 'public/blog');
  mkdirSync(join(blog, 'research'), { recursive: true });
  writeFileSync(join(blog, 'posts.json'), '[]');
  const report = auditPublishing(root, { startDate: '2026-09-05', today: '2026-09-07' });
  assert.equal(report.healthy, false);
  assert.deepEqual(report.missingQueueDates, ['2026-09-05', '2026-09-06']);
  assert.equal(auditPublishing(root, { startDate: '2026-09-07', today: '2026-09-07' }).healthy, true);
});

test('one fresh post cannot hide a partially recycled daily queue', () => {
  const root = mkdtempSync(join(tmpdir(), 'publishing-partial-'));
  const blog = join(root, 'public/blog');
  mkdirSync(join(blog, 'research'), { recursive: true });
  for (const slug of ['old', 'fresh']) {
    mkdirSync(join(blog, slug));
    for (const file of ['index.html', 'hero.jpg', 'reel-data.md', 'reel-script.md', 'social-copy.json']) {
      writeFileSync(join(blog, slug, file), 'fixture');
    }
  }
  writeFileSync(join(blog, 'posts.json'), JSON.stringify([{ slug: 'fresh', date: '2026-09-07' }, { slug: 'old', date: '2026-09-06' }]));
  writeFileSync(join(blog, 'research/2026-09-07-queue.json'), JSON.stringify({ posts: [{ slug: 'fresh' }, { slug: 'old' }] }));
  const report = auditPublishing(root, { startDate: '2026-09-07', today: '2026-09-07' });
  assert.equal(report.healthy, false);
  assert.equal(report.dates[0].fresh, 1);
  assert.deepEqual(report.brokenPosts, []);
});

test('render lock probe preserves live and unknown owners, identifies exited owner', () => {
  const lock = mkdtempSync(join(tmpdir(), 'render-lock-test-'));
  const probe = () => spawnSync('python3', ['scripts/lock-owner-alive.py', lock]).status;
  assert.equal(probe(), 0);
  writeFileSync(join(lock, 'pid'), String(process.pid));
  assert.equal(probe(), 0);
  writeFileSync(join(lock, 'pid'), '99999999');
  assert.equal(probe(), 1);
});

test('nightly function propagates research failure even inside an if conditional', () => {
  const nightly = readFileSync('public/blog/scripts/gemma-nightly.sh', 'utf8');
  const requireOutput = nightly.slice(nightly.indexOf('require_model_output() {'), nightly.indexOf('# ── Process one topic'));
  const processTopic = nightly.slice(nightly.indexOf('process_topic() {'), nightly.indexOf('# Select unpublished topics'));
  const dir = mkdtempSync(join(tmpdir(), 'nightly-failure-'));
  const script = `set -euo pipefail
BLOG_DIR="$1"; RESEARCH_DIR="$1"; TODAY=2026-09-07
slugify() { echo sample; }
word_count() { printf '%s' "$1" | wc -w; }
ollama_call() { echo short; }
${requireOutput}
${processTopic}
if process_topic sample tech; then exit 99; else exit 0; fi
`;
  const result = spawnSync('bash', ['-c', script, 'test', dir], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /research brief.*too short/);
  assert.equal(existsSync(join(dir, 'sample/gemma_draft.md')), false);
});
