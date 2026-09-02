import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const nightly = readFileSync('public/blog/scripts/gemma-nightly.sh', 'utf8');
const daily = readFileSync('scripts/daily-blog-reel.sh', 'utf8');

test('Gemma nightly isolates topic failures and does not consume rotation on partial failure', () => {
  assert.match(nightly, /if result=\$\(process_topic/);
  assert.match(nightly, /if \(\( \$\{#QUEUE_ENTRIES\[@\]\} == 0 \)\); then/);
  assert.match(nightly, /if \(\( \$\{#FAILED_TOPICS\[@\]\} == 0 \)\); then/);
});

test('daily runner retries a missing takeover queue instead of silently succeeding', () => {
  assert.match(daily, /ERROR: no valid Gemma queue/);
  assert.match(daily, /schedule_retry ""/);
});
