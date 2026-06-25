import assert from 'node:assert/strict';
import {test} from 'node:test';
import {audioCacheKey, normalizeForTTS, resolveVoice} from './generate-audio.mjs';

test('audio cache changes when narration or voice changes', () => {
  assert.notEqual(audioCacheKey('First text', 'zoe'), audioCacheKey('Second text', 'zoe'));
  assert.notEqual(audioCacheKey('First text', 'zoe'), audioCacheKey('First text', 'chatterbox'));
});

test('Chatterbox is the default when the cloned voice runtime is installed', () => {
  assert.equal(resolveVoice(undefined, {chatterbox: true, coqui: true}), 'chatterbox');
});

test('unavailable premium voice fails instead of silently changing voices', () => {
  assert.throws(() => resolveVoice('chatterbox', {chatterbox: false, coqui: true}), /unavailable/);
});

test('normalizes unsafe TTS tokens', () => {
  assert.equal(normalizeForTTS('US demand rose 42%.'), 'USA demand rose 42 percent.');
});
