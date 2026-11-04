import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { editorialRegenerationBlocked } from '../scripts/lib/editorial-regeneration.mjs';
import { isRetiredBlogSlug } from '../scripts/lib/retired-blog-slugs.mjs';

test('protects a reviewed baseline even after local QA was overwritten', () => {
  const root = mkdtempSync(join(tmpdir(), 'editorial-protect-'));
  for (const [base, qa] of [['public/blog', {slug:'example',pass:true,score:92}],
    ['.workflow-state/deployment-baseline/public/blog', {slug:'example',pass:true,mode:'codex-editorial'}]]) {
    const dir = join(root,base,'example'); mkdirSync(dir,{recursive:true});
    writeFileSync(join(dir,'qa.json'),JSON.stringify(qa));
  }
  assert.equal(editorialRegenerationBlocked(root,'example'),true);
});

test('unreviewed new drafts can proceed; invalid slugs cannot', () => {
  const root = mkdtempSync(join(tmpdir(), 'editorial-new-'));
  assert.equal(editorialRegenerationBlocked(root,'new-draft'),false);
  assert.throws(() => editorialRegenerationBlocked(root,'../example'), /Invalid slug/);
});

test('permanent blog redirects block generation and catalog registration', () => {
  const slug = 'silver-premiums-explained-for-beginners';
  assert.equal(isRetiredBlogSlug(slug), true);
  assert.equal(isRetiredBlogSlug('silver-investment-for-beginners-complete-guide'), false);
  const repoRoot = fileURLToPath(new URL('..', import.meta.url));
  const generation = spawnSync(process.execPath, ['scripts/check-editorial-regeneration.mjs', slug],
    { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(generation.status, 1);
  assert.match(generation.stderr, /retired blog slug/);
  const registration = spawnSync(process.execPath, ['public/blog/scripts/add-to-posts.mjs', `--slug=${slug}`],
    { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(registration.status, 1);
  assert.match(registration.stderr, /is retired/);
});
