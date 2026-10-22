import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCaptionCorrections } from '../video/scripts/lib/caption-corrections.mjs';

test('caption corrections use exact source text and preserve Whisper timing', () => {
  const source = { 0: [{ text: 'Wyman walked', startSec: 1.2, endSec: 2.4 }] };
  const { captions, review } = applyCaptionCorrections(source, {
    transcriptSha256: 'abc',
    corrections: [{ segment: 0, cue: 0, expectedText: 'Wyman walked', text: 'Weinman walked' }],
  });
  assert.equal(captions[0][0].text, 'Weinman walked');
  assert.equal(captions[0][0].startSec, 1.2);
  assert.equal(captions[0][0].endSec, 2.4);
  assert.equal(source[0][0].text, 'Wyman walked');
  assert.equal(review.applied.length, 1);
});

test('caption corrections reject stale Whisper source text', () => {
  assert.throws(() => applyCaptionCorrections({ 0: [{ text: 'changed', startSec: 0, endSec: 1 }] }, {
    corrections: [{ segment: 0, cue: 0, expectedText: 'old', text: 'new' }],
  }), /source changed/);
});
