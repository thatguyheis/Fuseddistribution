import { test } from 'node:test';
import assert from 'node:assert/strict';

test('splits queries on pipe delimiter', () => {
  const raw = 'silver coins safe storage|moisture tarnish silver container';
  const queries = raw.split('|').map(q => q.trim());
  assert.deepEqual(queries, [
    'silver coins safe storage',
    'moisture tarnish silver container',
  ]);
});

test('formats attribution string', () => {
  const photo = { photographer: 'Jane Smith', url: 'https://www.pexels.com/photo/12345/' };
  const attribution = `Photo by ${photo.photographer} on Pexels (${photo.url})`;
  assert.equal(attribution, 'Photo by Jane Smith on Pexels (https://www.pexels.com/photo/12345/)');
});

test('deduplicates photo IDs across queries', () => {
  const usedIds = new Set();
  const photos = [
    { id: 1, src: { large: 'url1' } },
    { id: 1, src: { large: 'url1' } },
    { id: 2, src: { large: 'url2' } },
  ];
  const unique = photos.filter(p => {
    if (usedIds.has(p.id)) return false;
    usedIds.add(p.id);
    return true;
  });
  assert.equal(unique.length, 2);
  assert.deepEqual([...usedIds], [1, 2]);
});

test('parses PEXELS_API_KEY from .env file content', () => {
  const envContent = 'PEXELS_API_KEY=abc123xyz\nOTHER_VAR=foo\n';
  const lines = envContent.split('\n');
  let key = null;
  for (const line of lines) {
    const m = line.match(/^PEXELS_API_KEY=(.+)/);
    if (m) key = m[1].trim();
  }
  assert.equal(key, 'abc123xyz');
});
