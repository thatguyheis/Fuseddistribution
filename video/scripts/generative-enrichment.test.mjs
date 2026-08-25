import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEnrichmentPrompt,
  deterministicEnrichmentSeed,
  enrichmentCacheKey,
  generativeMediaMode,
  openGenerativeAiEnabled,
  resolveOpenGenerativeAiPaths,
  selectBackgroundScene,
} from './generative-enrichment.mjs';

test('generation is explicitly enabled', () => {
  assert.equal(openGenerativeAiEnabled({}), false);
  assert.equal(openGenerativeAiEnabled({GENERATIVE_MEDIA_ENABLED: '1'}), true);
});

test('generation remains in shadow mode until production use is separately approved', () => {
  assert.equal(generativeMediaMode({}), 'shadow');
  assert.equal(generativeMediaMode({GENERATIVE_MEDIA_MODE: 'production'}), 'shadow');
  assert.equal(generativeMediaMode({
    GENERATIVE_MEDIA_MODE: 'production',
    GENERATIVE_MEDIA_PRODUCTION_APPROVED: '1',
  }), 'production');
});

test('prompt requests decorative portrait-safe artwork without factual text', () => {
  const prompt = buildEnrichmentPrompt({
    topic: 'silver',
    segment: {type: 'hook', text: 'Silver costs $31.25 https://example.com today'},
  });
  assert.match(prompt, /silver highlights/i);
  assert.match(prompt, /No words, letters, numbers/i);
  assert.match(prompt, /Background scenery only/i);
  assert.doesNotMatch(prompt, /31\.25|https:\/\//);
});

test('background scenes interpret silver and business topics without copying narration', () => {
  assert.match(selectBackgroundScene({
    topic: 'silver',
    segment: {text: 'How to store a coin collection in a home safe'},
  }), /vault.*collector chest/i);
  assert.match(selectBackgroundScene({
    topic: 'tech',
    segment: {text: 'Email follow-up and customer communication'},
  }), /wireless communication waves/i);
  assert.match(selectBackgroundScene({
    topic: 'tech',
    segment: {text: 'Local SEO and Google reviews'},
  }), /small-business street/i);
});

test('seed and cache key are deterministic and react to routed scene changes', () => {
  assert.equal(deterministicEnrichmentSeed('test-slug', 0), deterministicEnrichmentSeed('test-slug', 0));
  assert.notEqual(deterministicEnrichmentSeed('test-slug', 0), deterministicEnrichmentSeed('test-slug', 1));
  const env = {
    OPEN_GENERATIVE_AI_LOCAL_AI_DIR: '/tmp/open-generative-ai-test',
    OPEN_GENERATIVE_AI_MODEL_ID: 'dreamshaper-8',
  };
  const first = enrichmentCacheKey({slug: 'test', index: 0, segment: {type: 'hook', text: 'Email communication'}, topic: 'tech', env});
  const second = enrichmentCacheKey({slug: 'test', index: 0, segment: {type: 'hook', text: 'Local SEO reviews'}, topic: 'tech', env});
  assert.notEqual(first, second);
});

test('paths can be explicitly configured for headless pipeline use', () => {
  const paths = resolveOpenGenerativeAiPaths({
    OPEN_GENERATIVE_AI_LOCAL_AI_DIR: '/tmp/oga',
    OPEN_GENERATIVE_AI_SD_CLI: '/tmp/bin/sd-cli',
    OPEN_GENERATIVE_AI_MODEL_PATH: '/tmp/models/model.safetensors',
  });
  assert.equal(paths.dataDir, '/tmp/oga');
  assert.equal(paths.binaryPath, '/tmp/bin/sd-cli');
  assert.equal(paths.modelPath, '/tmp/models/model.safetensors');
});
