import test from 'node:test';
import assert from 'node:assert/strict';
import { musicMixForTrack } from './music-mix.mjs';

const db = {
  policy: {
    musicMix: {
      narrationReferenceLufs: -24,
      relativeGain: 0.2,
      measuredIntegratedLufs: { 'loud.mp3': -8, 'quiet.mp3': -30 },
    },
  },
};

test('normalizes music tracks to 20 percent of the narration reference', () => {
  const loud = musicMixForTrack('loud.mp3', { db });
  const quiet = musicMixForTrack('quiet.mp3', { db });
  assert.equal(loud.narrationReferenceLufs, -24);
  assert.equal(loud.relativeGain, 0.2);
  assert(Math.abs(loud.targetLufs - (-24 + 20 * Math.log10(0.2))) < 0.001);
  assert(loud.gain < quiet.gain);
  assert(Math.abs((loud.measuredLufs + 20 * Math.log10(loud.gain)) - loud.targetLufs) < 0.001);
  assert(Math.abs((quiet.measuredLufs + 20 * Math.log10(quiet.gain)) - quiet.targetLufs) < 0.001);
});

test('treats narration-only renders as having no music mix', () => {
  assert.deepEqual(musicMixForTrack('none', { db }), {
    enabled: false,
    gain: 0,
    targetLufs: null,
    measuredLufs: null,
  });
});
