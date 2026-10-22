import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { editorialRegenerationBlocked } from '../scripts/lib/editorial-regeneration.mjs';

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
