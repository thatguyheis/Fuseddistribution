import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const resolver = fileURLToPath(new URL('../scripts/resolve-canonical-topic.mjs', import.meta.url));
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';
import { auditPublishing } from '../scripts/lib/publishing-health.mjs';

const exec = promisify(execFile);
const queued = 'queued-topic';
const canonical = 'canonical-topic';

async function fixture({ date = '2026-09-10', mutate = () => {} } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'publisher-equivalence-'));
  const blog = join(root, 'public/blog');
  await mkdir(join(blog, 'research'), { recursive: true });
  await mkdir(join(blog, canonical), { recursive: true });
  const files = ['index.html', 'hero.jpg', 'reel-data.md', 'reel-script.md', 'social-copy.json'];
  for (const file of files) await writeFile(join(blog, canonical, file), file === 'hero.jpg' ? 'jpg' : file);
  await writeFile(join(blog, canonical, 'qa.json'), JSON.stringify({ pass: true, slug: canonical, score: 90, mode: 'editorial' }));
  const indexSha256 = createHash('sha256').update(await readFile(join(blog, canonical, 'index.html'))).digest('hex');
  const posts = [{ slug: canonical, date: '2026-09-01' }];
  await writeFile(join(blog, 'posts.json'), JSON.stringify(posts));
  await mkdir(join(root, '.workflow-state'), { recursive: true });
  const resolution = { queuedSlug: queued, canonicalSlug: canonical, status: 'verified', verifiedAt: '2026-09-10T00:00:00Z', url: `https://fuseddistribution.com/blog/${canonical}/`, catalog: true, sitemap: true, rationale: 'Reviewed equivalent topic.', indexSha256 };
  await mutate({ root, resolution, posts, blog });
  await writeFile(join(root, '.workflow-state/canonical-topic-resolutions.json'), JSON.stringify({ resolutions: [resolution] }));
  await writeFile(join(blog, 'research', `${date}-queue.json`), JSON.stringify({ posts: [{ slug: queued }] }));
  return root;
}

async function withFixture(options, fn) {
  const root = await fixture(options);
  try { await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}

test('valid equivalent covers the queue while retaining no fresh publication', async () => withFixture({}, root => {
  const report = auditPublishing(root, { startDate: '2026-09-10', today: '2026-09-10' });
  assert.equal(report.dates[0].covered, 1);
  assert.equal(report.dates[0].fresh, 0);
  assert.equal(report.healthy, false);
}));

for (const [name, change] of [
  ['invalid hash', ({ resolution }) => { resolution.indexSha256 = 'bad'; }],
  ['editorial hold', async ({ root, resolution }) => { await mkdir(join(root, '.workflow-state/editorial-holds'), { recursive: true }); await writeFile(join(root, '.workflow-state/editorial-holds', `${resolution.canonicalSlug}.json`), '{}'); }],
  ['unapproved resolution', ({ resolution }) => { resolution.status = 'pending'; }],
  ['missing companion', async ({ blog }) => { await writeFile(join(blog, canonical, 'reel-script.md'), ''); }],
]) test(`${name} stays pending`, async () => withFixture({ mutate: change }, root => {
  const report = auditPublishing(root, { startDate: '2026-09-10', today: '2026-09-10' });
  assert.equal(report.dates[0].covered, 0);
  assert.deepEqual(report.unpublishedTopics[0]?.slug, queued);
}));

test('resolver fails closed on a malformed registry', async () => withFixture({}, async root => {
  await writeFile(join(root, '.workflow-state/canonical-topic-resolutions.json'), '{bad');
  await assert.rejects(exec('node', [resolver, '--queued=queued-topic'], { cwd: root }), e => e.code === 1 && !e.stderr.includes('MODULE_NOT_FOUND'));
}));

test('known but invalid alias fails closed', async () => withFixture({ mutate: ({ resolution }) => { resolution.indexSha256 = 'bad'; } }, async root => {
  await assert.rejects(exec('node', [resolver, '--queued=queued-topic'], { cwd: root }));
}));

test('actual resolver accepts valid alias and unknown topic', async () => withFixture({}, async root => {
 assert.equal((await exec('node', [resolver, '--queued=queued-topic'], {cwd:root})).stdout.trim(), canonical);
 assert.equal((await exec('node', [resolver, '--queued=unknown-topic'], {cwd:root})).stdout, '');
}));


test('actual daily summary accepts fresh article plus equivalent but rejects alias-only freshness', async () => withFixture({}, async root => {
  const shell = await readFile(new URL('../scripts/daily-blog-reel.sh', import.meta.url), 'utf8');
  const code = shell.match(/QUEUE_SUMMARY=\$\(python3[^\n]*<<'PY'\n([\s\S]*?)\nPY/)[1];
  const blog = join(root, 'public/blog');
  const queuePath = join(blog, 'research/2026-09-10-queue.json');
  const args = ['-c', code, queuePath, join(blog, 'posts.json'), '2026-09-10', JSON.stringify({[queued]:canonical})];
  assert.equal((await exec('python3', args, {cwd:root})).stdout.trim(), '1 1');
  await mkdir(join(blog, 'fresh-topic'));
  for (const file of ['index.html','hero.jpg','reel-data.md','reel-script.md','social-copy.json']) await writeFile(join(blog,'fresh-topic',file), 'content');
  await writeFile(join(blog,'posts.json'), JSON.stringify([{slug:canonical,date:'2026-09-01'},{slug:'fresh-topic',date:'2026-09-10'}]));
  await writeFile(queuePath, JSON.stringify({posts:[{slug:queued},{slug:'fresh-topic'}]}));
  assert.equal((await exec('python3', args, {cwd:root})).stdout.trim(), '2 0');
}));
