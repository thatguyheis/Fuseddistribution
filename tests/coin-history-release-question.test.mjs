import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {coinHistoryQuestionError} from '../video/scripts/release-reel.mjs';

test('coin-history release requires a final spoken question card', () => {
  const root = mkdtempSync(join(tmpdir(), 'coin-release-'));
  const dir = join(root, 'content', 'coin-history', 'sample');
  mkdirSync(dir, {recursive:true});
  writeFileSync(join(dir, 'script-approval.json'), '{}');
  try {
    assert.match(coinHistoryQuestionError(root, 'sample', {segments:[{type:'overlay'}]}), /question card/);
    assert.equal(coinHistoryQuestionError(root, 'sample', {segments:[{type:'question'}]}), null);
    assert.equal(coinHistoryQuestionError(root, 'ordinary-blog', {segments:[{type:'overlay'}]}), null);
  } finally {
    rmSync(root, {recursive:true,force:true});
  }
});
