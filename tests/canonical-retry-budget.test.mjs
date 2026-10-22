import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const source = readFileSync('scripts/daily-blog-reel.sh', 'utf8');
const start = source.indexOf('  if (( ${#RETRY_SLUGS[@]} > CANONICAL_REVIEW_BLOCKED )); then');
const end = source.indexOf('\nelse\n', start);
const decision = source.slice(start, end);
function retry(count, blocked) {
  return execFileSync('bash', ['-c', `RETRY_SLUGS=(${Array(count).fill('slug').join(' ')}); CANONICAL_REVIEW_BLOCKED=${blocked}; LOG_FILE=/dev/null; schedule_retry() { echo retry; }; ${decision}`], {encoding:'utf8'}).trim();
}
test('exhausted canonical-only failure keeps pending without rapid retries', () => {
  assert.ok(start > 0 && end > start);
  assert.equal(retry(1,1), '');
});
test('fresh attempts and independent retryable failures still retry', () => {
  assert.equal(retry(1,0), 'retry');
  assert.equal(retry(2,1), 'retry');
});
