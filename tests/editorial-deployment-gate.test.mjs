import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { assertEditorialDeployment } from '../scripts/lib/editorial-deployment-gate.mjs';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'editorial-deploy-'));
  const qa = { slug: 'example', pass: true, score: 90, blockers: [], mode: 'codex-editorial',
    reviewed_at: '2026-09-16T18:00:00Z', review_notes: ['Read and corrected source claims.'], artifactSha256: {} };
  for (const file of ['verified.md', 'index.html', 'meta.json', 'research.json', 'hero.jpg',
    'photo-post.jpg', 'reel-script.md', 'reel-data.md', 'social-copy.json']) {
    writeFileSync(join(dir, file), 'reviewed ' + file);
    qa.artifactSha256[file] = createHash('sha256').update('reviewed ' + file).digest('hex');
  }
  const save = () => writeFileSync(join(dir, 'qa.json'), JSON.stringify(qa));
  save();
  return { dir, qa, save };
}

test('a score alone is not editorial approval', () => {
  const { dir, qa, save } = fixture();
  delete qa.mode; save();
  assert.throws(() => assertEditorialDeployment(dir, 'example'), /editorial review/);
});

test('exact reviewed package passes and content or companion drift fails', () => {
  const { dir } = fixture();
  assert.doesNotThrow(() => assertEditorialDeployment(dir, 'example'));
  writeFileSync(join(dir, 'reel-script.md'), 'unreviewed narration');
  assert.throws(() => assertEditorialDeployment(dir, 'example'), /reel-script.md changed/);
});

test('missing review evidence fails even with an editorial mode', () => {
  const { dir, qa, save } = fixture();
  qa.reviewed_at = ''; save();
  assert.throws(() => assertEditorialDeployment(dir, 'example'), /editorial review/);
});
