import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { budgetDecision, reserveBufferRequest } from '../public/blog/scripts/lib/buffer-request-budget.mjs';

test('request windows use the latest exhausted deadline and allow expiry', () => {
  const windows = [{ milliseconds: 100, limit: 1 }, { milliseconds: 1000, limit: 2 }];
  assert.equal(budgetDecision([100, 150], 160, windows), 1100);
  assert.equal(budgetDecision([100, 150], 1100, windows), null);
});

test('separate callers share reservations and a rejected request is not counted', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'buffer-budget-')), 'requests.json');
  const options = { now: 1000, windows: [{ milliseconds: 100, limit: 2 }] };
  reserveBufferRequest(path, options);
  reserveBufferRequest(path, options);
  assert.throws(() => reserveBufferRequest(path, options), /budget exhausted/);
  assert.equal(JSON.parse(readFileSync(path)).requests.length, 2);
  reserveBufferRequest(path, { ...options, now: 1100 });
  assert.deepEqual(JSON.parse(readFileSync(path)).requests, [1100]);
});
