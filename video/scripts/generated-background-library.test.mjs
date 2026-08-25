import test from 'node:test';
import assert from 'node:assert/strict';
import {
  backgroundTags,
  planGeneratedBackgrounds,
  rankLibraryBackgrounds,
} from './generated-background-library.mjs';

test('plans one new hook background and one reused narrative background', () => {
  assert.deepEqual(planGeneratedBackgrounds([
    {type: 'hook'},
    {type: 'chart'},
    {type: 'overlay'},
    {type: 'question'},
  ]), {newIndex: 0, reuseIndex: 2});
});

test('tags capture topic, scene, and controlled subject category', () => {
  assert.deepEqual(backgroundTags({
    topic: 'silver',
    sceneId: 'silver-vault',
    segment: {text: 'Store a bullion collection in a safe'},
  }), ['coins', 'silver', 'silver-vault']);
});

test('library ranking excludes the new asset and penalizes recent repetition', () => {
  const asset = (id, overrides = {}) => ({
    id,
    status: 'approved-background-only',
    topic: 'tech',
    sceneId: 'tech-data',
    tags: ['tech', 'tech-data', 'data'],
    useCount: 0,
    lastUsedAt: null,
    ...overrides,
  });
  const ranked = rankLibraryBackgrounds({
    assets: [asset('new'), asset('recent'), asset('fresh')],
    usageHistory: [{assetId: 'recent'}],
    topic: 'tech',
    sceneId: 'tech-data',
    tags: ['tech', 'tech-data', 'data'],
    excludeIds: ['new'],
  });
  assert.deepEqual(ranked.map((entry) => entry.id), ['fresh', 'recent']);
});

test('library ranking never crosses topic boundaries to fill a slot', () => {
  const ranked = rankLibraryBackgrounds({
    assets: [{
      id: 'silver-only',
      status: 'approved-background-only',
      topic: 'silver',
      sceneId: 'silver-vault',
      tags: ['silver', 'coins'],
    }],
    topic: 'tech',
    sceneId: 'tech-general',
    tags: ['tech', 'tech-general'],
  });
  assert.deepEqual(ranked, []);
});
