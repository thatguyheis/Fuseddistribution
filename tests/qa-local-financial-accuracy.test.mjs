import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve('.');

function runQa(args) {
  return spawnSync('node', ['public/blog/scripts/qa-local.mjs', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

test('qa-local blocks unsupported IRS silver purchase reporting claims', () => {
  const result = runQa(['--slug=do-you-have-to-report-silver-coin-purchases-to-irs']);
  assert.notEqual(result.status, 0, `expected qa-local to fail, stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /financial accuracy:/);
});

test('qa-local still passes the corrected silver capital gains article', () => {
  const result = runQa(['--slug=silver-capital-gains-tax-how-it-works-in-the-us']);
  assert.equal(result.status, 0, `expected qa-local to pass, stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /\[qa-local\] pass silver-capital-gains-tax-how-it-works-in-the-us/);
});

test('qa-local accepts positional slug arguments after the argv fix', () => {
  const result = runQa(['silver-capital-gains-tax-how-it-works-in-the-us']);
  assert.equal(result.status, 0, `expected positional slug invocation to pass, stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.doesNotMatch(result.stderr, /ENOENT|usr\/local\/bin\/node/);
});
