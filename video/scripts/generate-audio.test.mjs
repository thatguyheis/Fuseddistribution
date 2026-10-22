import assert from 'node:assert/strict';
import {test} from 'node:test';
import {audioCacheKey, boundedTtsTimeout, chatterboxRuntime, normalizeForTTS, resolveVoice} from './generate-audio.mjs';

test('audio cache changes when narration or voice changes', () => {
  assert.notEqual(audioCacheKey('First text', 'zoe'), audioCacheKey('Second text', 'zoe'));
  assert.notEqual(audioCacheKey('First text', 'zoe'), audioCacheKey('First text', 'chatterbox'));
});

test('Chatterbox is the default when the cloned voice runtime is installed', () => {
  assert.equal(resolveVoice(undefined, {chatterbox: true, coqui: true}), 'chatterbox');
  assert.equal(resolveVoice('chatterbox-standard', {chatterbox: true, coqui: true}), 'chatterbox-standard');
  assert.notEqual(audioCacheKey('Same text', 'chatterbox-standard'), audioCacheKey('Same text', 'chatterbox'));
});

test('production Chatterbox defaults to the pinned high quality Standard profile', () => {
  const runtime = chatterboxRuntime('chatterbox');
  assert.equal(runtime.variant, 'standard');
  assert.equal(runtime.qualityProfile, 'chatterbox-standard-hq-v1');
  assert.equal(runtime.modelRevision, '5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18');
  assert.deepEqual(runtime.generation, {
    exaggeration: 0.4,
    cfgWeight: 0.5,
    chunkCharacters: 280,
    maxSpeechTokens: 600,
  });
  assert.notEqual(audioCacheKey('Same words', 'chatterbox'), audioCacheKey('Same words', 'chatterbox-standard'));
});

test('local TTS permits a longer supervised Chatterbox run while bounding it', () => {
  assert.equal(boundedTtsTimeout(45 * 60 * 1000), 45 * 60 * 1000);
  assert.equal(boundedTtsTimeout(60 * 60 * 1000), 45 * 60 * 1000);
  assert.equal(boundedTtsTimeout(45 * 60 * 1000, true), 45 * 60 * 1000);
  assert.equal(boundedTtsTimeout(60 * 60 * 1000, true), 45 * 60 * 1000);
});

test('unavailable premium voice fails instead of silently changing voices', () => {
  assert.throws(() => resolveVoice('chatterbox', {chatterbox: false, coqui: true}), /unavailable/);
});

test('normalizes unsafe TTS tokens', () => {
  assert.equal(normalizeForTTS('US demand rose 42%.'), 'USA demand rose 42 percent.');
});
