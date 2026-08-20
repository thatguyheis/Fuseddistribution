import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('scheduled renders delegate music selection to the trusted cycle', () => {
  const scheduler = readFileSync(resolve(new URL('../../scripts/render-missing-reels.sh', import.meta.url).pathname), 'utf8');
  assert.match(scheduler, /^TRACK="cycle"$/m);
  assert.doesNotMatch(scheduler, /TRACK=.*ambient-/);
});
