import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertApprovedSources } from './approved-sources.mjs';

const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'coin-history-approved-'));
  const slug = 'sample-coin-history';
  const post = join(root, 'public/blog', slug);
  const work = join(root, 'content/coin-history', slug);
  mkdirSync(post, { recursive: true });
  mkdirSync(work, { recursive: true });
  for (const name of ['verified.md', 'index.html', 'meta.json', 'research.json', 'hero.jpg', 'photo-post.jpg',
    'reel-script.md', 'reel-script-approved.md', 'reel-data.md', 'social-copy.json', 'image-sources.json',
    'content-plan.json', 'pipeline-marker.json']) writeFileSync(join(post, name), `fixture:${name}`);
  const transcript = 'approved narration\n';
  writeFileSync(join(work, 'narration-v1-approved.txt'), transcript);
  const transcriptHash = createHash('sha256').update(transcript).digest('hex');
  writeFileSync(join(work, 'script-approval.json'), JSON.stringify({ transcriptApproved: true, approvedTranscriptSha256: transcriptHash }));
  writeFileSync(join(work, 'claim-map.json'), '{"claims":[]}');
  writeFileSync(join(post, 'production-inputs.json'), JSON.stringify({ transcriptSha256: transcriptHash }));
  const names = ['verified.md', 'index.html', 'meta.json', 'research.json', 'hero.jpg', 'photo-post.jpg',
    'reel-script.md', 'reel-script-approved.md', 'reel-data.md', 'social-copy.json', 'production-inputs.json',
    'image-sources.json', 'content-plan.json', 'pipeline-marker.json'];
  const artifactSha256 = Object.fromEntries(names.map((name) => [name, digest(join(post, name))]));
  for (const name of ['narration-v1-approved.txt', 'script-approval.json', 'claim-map.json']) {
    artifactSha256[`content/coin-history/${slug}/${name}`] = digest(join(work, name));
  }
  writeFileSync(join(post, 'qa.json'), JSON.stringify({
    slug, pass: true, score: 90, blockers: [], mode: 'coin-history-automated',
    automaticApproval: { policy: 'coin-history-auto-v1', transcriptHashVerified: true }, artifactSha256,
  }));
  return { root, post, work, slug };
}

test('accepts automatic coin-history QA only while narration and all sources match approved hashes', () => {
  const value = fixture();
  try {
    assert.doesNotThrow(() => assertApprovedSources(value.root, value.slug));
    writeFileSync(join(value.work, 'narration-v1-approved.txt'), 'changed narration\n');
    assert.throws(() => assertApprovedSources(value.root, value.slug), /Approved transcript changed/);
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});

test('rejects an automatic coin-history QA score below the release threshold', () => {
  const value = fixture();
  try {
    const path = join(value.post, 'qa.json');
    const qa = JSON.parse(readFileSync(path, 'utf8'));
    qa.score = 84;
    writeFileSync(path, JSON.stringify(qa));
    assert.throws(() => assertApprovedSources(value.root, value.slug), /Editorial approval required/);
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});
