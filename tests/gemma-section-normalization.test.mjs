import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const normalize = (input, heading = 'Local Traffic') => execFileSync(
  'python3', ['public/blog/scripts/normalize-section.py', heading],
  { input, encoding: 'utf8' },
);

test('removes an echoed opening title without changing article prose', () => {
  assert.equal(normalize('\n## Local Traffic\n\nKeep this claim.\n'), '\n\nKeep this claim.\n');
});
test('preserves unexpected headings so structural QA still rejects them', () => {
  const input = '## Unsupported Topic\nProse\n## Local Traffic\nMore prose\n';
  assert.equal(normalize(input), input);
});
test('preserves ordinary prose, empty responses and later headings', () => {
  for (const input of ['', 'Local Traffic matters.\n', 'Intro\n## Local Traffic\nBody\n']) {
    assert.equal(normalize(input), input);
  }
});
