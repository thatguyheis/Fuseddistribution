import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  compositionFramesForSegments,
  totalTransitionFrames,
  transitionDurationFrames,
} from './transition-timing.mjs';

test('rotates body transition durations deterministically', () => {
  assert.equal(transitionDurationFrames('stat', 'stat', 0), 16);
  assert.equal(transitionDurationFrames('stat', 'stat', 2), 18);
  assert.equal(transitionDurationFrames('stat', 'stat', 3), 15);
});

test('composition duration subtracts transition overlap', () => {
  const segments = [
    {type: 'hook', startSec: 0, endSec: 5},
    {type: 'stat', startSec: 5, endSec: 15},
    {type: 'question', startSec: 15, endSec: 23},
  ];
  assert.equal(totalTransitionFrames(segments), 34);
  assert.equal(compositionFramesForSegments(segments, 30), 23 * 30 - 34);
});
