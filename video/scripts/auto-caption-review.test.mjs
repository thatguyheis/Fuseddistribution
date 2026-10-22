import test from 'node:test';
import assert from 'node:assert/strict';
import {CAPTION_GAP_TOLERANCE_SECONDS, captionNearPoint} from './auto-caption-review.mjs';

test('caption checkpoint tolerates a short natural pause after speech', () => {
  const chunks = [{text: 'The new cent marked the centennial.', startSec: 0.14, endSec: 3.72}];
  const match = captionNearPoint(chunks, 4.54);
  assert.equal(CAPTION_GAP_TOLERANCE_SECONDS, 0.9);
  assert.equal(match?.chunk.text, chunks[0].text);
  assert.equal(Number(match?.distance.toFixed(2)), 0.82);
});

test('caption checkpoint still rejects gaps longer than the allowed pause', () => {
  const chunks = [{text: 'End of sentence.', startSec: 0.14, endSec: 3.72}];
  assert.equal(captionNearPoint(chunks, 4.63), null);
});
