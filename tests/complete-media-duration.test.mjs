import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCompleteMediaDuration } from '../public/blog/scripts/lib/complete-media-duration.mjs';

test('distribution rejects overlong sources rather than losing the ending', () => {
  assert.doesNotThrow(() => assertCompleteMediaDuration(121, 135));
  assert.doesNotThrow(() => assertCompleteMediaDuration(135, 135));
  assert.throws(() => assertCompleteMediaDuration(206.955, 135), /never truncate/);
  assert.throws(() => assertCompleteMediaDuration(null, 135), /Invalid/);
});
