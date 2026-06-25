import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaCacheKey, parseMediaQueries} from './fetch-media.mjs';

test('media cache changes when query, preference, or segment type changes', () => {
  const base = mediaCacheKey('google reviews', 'video', 'stat');
  assert.notEqual(base, mediaCacheKey('customer feedback', 'video', 'stat'));
  assert.notEqual(base, mediaCacheKey('google reviews', 'photo', 'stat'));
  assert.notEqual(base, mediaCacheKey('google reviews', 'video', 'question'));
});

test('media query parser reads prefer lines after query lines', () => {
  const parsed = parseMediaQueries(`## media_queries
- segment: 0
  query: "hook"
  prefer: video
- segment: 1
  query: "body"
  prefer: photo
`);
  assert.deepEqual(parsed, {
    0: {query: 'hook', prefer: 'video'},
    1: {query: 'body', prefer: 'photo'},
  });
});
