import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const nightly = readFileSync('public/blog/scripts/gemma-nightly.sh', 'utf8');
const daily = readFileSync('scripts/daily-blog-reel.sh', 'utf8');

test('Gemma nightly isolates failures and preserves them before advancing rotation', () => {
  assert.match(nightly, /if result=\$\(process_topic/);
  assert.match(nightly, /if \(\( \$\{#QUEUE_ENTRIES\[@\]\} == 0 \)\); then/);
  assert.match(nightly, /failedTopics/);
  assert.ok(nightly.indexOf("'PYATTEMPT'") < nightly.indexOf('if (( ${#QUEUE_ENTRIES[@]} == 0 )); then'));
});

test('daily runner records missing queue as a repair block and relies on the research wake path', () => {
  assert.match(daily, /BLOCKED: no valid queue for \$TODAY/);
  assert.match(daily, /publisher-retry-policy\.py" block "\$TODAY" --reason missing_approved_queue/);
  assert.match(daily, /LOCAL_LLM="\$\{LOCAL_LLM:-\$PROJECT_DIR\/scripts\/ollama-local-no-think\.sh\}"/);
});
