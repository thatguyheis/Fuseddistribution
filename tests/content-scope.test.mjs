import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {scopedSlugs} from '../scripts/lib/content-scope.mjs';

function fixture(scope) {
  const root = mkdtempSync(join(tmpdir(), 'content-scope-'));
  mkdirSync(join(root, 'ops'));
  mkdirSync(join(root, 'public/blog'), {recursive:true});
  mkdirSync(join(root, 'content/coin-history/old-coin'), {recursive:true});
  mkdirSync(join(root, 'content/coin-history/new-coin'), {recursive:true});
  writeFileSync(join(root, 'public/blog/posts.json'), JSON.stringify([
    {slug:'old-coin', date:'2026-10-01'},
    {slug:'local-seo-tips', date:'2026-10-05'},
    {slug:'new-coin', date:'2026-10-20'},
  ]));
  if (scope) writeFileSync(join(root, 'ops/content-scope.json'), JSON.stringify({scope}));
  return root;
}

test('coin-history scope keeps only posts with a coin workup, newest first', () => {
  const root = fixture('coin-history');
  try {
    assert.deepEqual(scopedSlugs(root), ['new-coin', 'old-coin']);
  } finally { rmSync(root, {recursive:true, force:true}); }
});

test('missing config or scope "all" leaves every post in scope', () => {
  for (const scope of [null, 'all']) {
    const root = fixture(scope);
    try {
      assert.equal(scopedSlugs(root), null);
    } finally { rmSync(root, {recursive:true, force:true}); }
  }
});

test('unknown scope fails loudly', () => {
  const root = fixture('podcasts');
  try {
    assert.throws(() => scopedSlugs(root), /unknown content scope/);
  } finally { rmSync(root, {recursive:true, force:true}); }
});
