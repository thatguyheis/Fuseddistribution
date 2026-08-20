import test from 'node:test';
import assert from 'node:assert/strict';
import { retimeScriptToAudio } from './audio-timing.mjs';
import { compositionFramesForSegments, transitionDurationFrames } from './transition-timing.mjs';

test('uses measured speech duration and preserves only a deliberate dialogue gap', () => {
  const source = {
    slug: 'example', totalDuration: 40,
    segments: [
      { type: 'hook', startSec: 0, endSec: 20, text: 'HOOK', narration: 'A hook.' },
      { type: 'question', startSec: 20, endSec: 40, text: 'QUESTION?', narration: 'A question?' },
    ],
  };
  const { script, timing } = retimeScriptToAudio(source, { 0: 4, 1: 3 });
  const transitionSeconds = transitionDurationFrames('hook', 'question', 0) / 30;
  assert.equal(script.segments[0].startSec, 0);
  assert.equal(script.segments[0].endSec, Number((4 + transitionSeconds + 0.2).toFixed(3)));
  assert.equal(script.segments[1].startSec, script.segments[0].endSec);
  assert.equal(script.totalDuration, Number((4 + transitionSeconds + 0.2 + 3 + 0.5).toFixed(3)));
  assert.equal(compositionFramesForSegments(script.segments, 30) / 30, Number((4 + 0.2 + 3 + 0.5).toFixed(3)));
  assert.equal(timing.totalNarrationSeconds, 7);
});

test('fails closed when a narrated segment has no measured audio', () => {
  const script = { slug: 'example', segments: [{ type: 'hook', startSec: 0, endSec: 5, text: 'HOOK', narration: 'Voice.' }] };
  assert.throws(() => retimeScriptToAudio(script, {}), /Missing measured narration duration/);
});
