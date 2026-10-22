import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateVideoBitrate} from './fit-upload-size.mjs';

test('calculates a safe video bitrate under the upload target after audio and mux overhead', () => {
  const bitrate = calculateVideoBitrate({targetBytes: 44_000_000, durationSeconds: 120, audioBitrate: 192_000});
  const estimatedBytes = Math.ceil(((bitrate + 192_000) * 120) / 8 / 0.97);
  assert.ok(estimatedBytes <= 44_000_000);
  assert.ok(bitrate > 2_000_000);
});

test('rejects invalid durations and bitrates too low for a usable reel', () => {
  assert.throws(() => calculateVideoBitrate({durationSeconds: 0}), /positive video duration/);
  assert.throws(() => calculateVideoBitrate({targetBytes: 1_000_000, durationSeconds: 120}), /too small/);
});
