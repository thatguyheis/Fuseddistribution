import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {reviewCoinImage, validateImageReview} from './coin-image-relevance.mjs';

const fixture = {slug: 'lincoln-cent', topic: 'Lincoln cent history', coinIdentity: '1909 Lincoln cent', imageHash: 'abc123'};
const pass = {slug: fixture.slug, topic: fixture.topic, coinIdentity: fixture.coinIdentity, imageSha256: fixture.imageHash,
  matchesCoin: true, confidence: 0.98, visibleEvidence: 'Lincoln portrait and date 1909'};

test('coin image review must be hash and episode bound', () => {
  assert.equal(validateImageReview(pass, fixture), true);
  assert.throws(() => validateImageReview({...pass, topic: 'Different story'}, fixture), /stale|different episode/);
  assert.throws(() => validateImageReview({...pass, coinIdentity: 'Morgan dollar'}, fixture), /stale|different episode/);
  assert.throws(() => validateImageReview({...pass, imageSha256: 'changed'}, fixture), /stale|different episode/);
});

test('coin image review fails closed on uncertain or absent visual evidence', () => {
  assert.throws(() => validateImageReview({...pass, matchesCoin: false}, fixture), /not verified/);
  assert.throws(() => validateImageReview({...pass, confidence: 0.6}, fixture), /not verified/);
  assert.throws(() => validateImageReview({...pass, visibleEvidence: ''}, fixture), /not verified/);
});

test('local vision review sends image and exact coin identity and accepts a bound result', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'coin-image-review-'));
  const imagePath = join(directory, 'coin.jpg');
  writeFileSync(imagePath, Buffer.from('image-bytes'));
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = {url, body: JSON.parse(options.body)};
    return {ok: true, json: async () => ({message: {content: JSON.stringify({matchesCoin: true, confidence: 0.98, visibleEvidence: 'Lincoln portrait and 1909 date', reason: 'Matches visible coin design'})}})};
  };
  try {
    const review = await reviewCoinImage({...fixture, imagePath, model: 'gemma3:4b'});
    assert.equal(review.matchesCoin, true);
    assert.equal(request.url, 'http://127.0.0.1:11434/api/chat');
    assert.match(request.body.messages[0].content, /1909 Lincoln cent/);
    assert.equal(request.body.messages[0].images[0], Buffer.from('image-bytes').toString('base64'));
  } finally { globalThis.fetch = originalFetch; }
});

test('local vision review rejects a mismatch', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'coin-image-review-'));
  const imagePath = join(directory, 'coin.jpg');
  writeFileSync(imagePath, Buffer.from('not the target coin'));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ok: true, json: async () => ({message: {content: JSON.stringify({matchesCoin: false, confidence: 0.98, visibleEvidence: 'Different coin'})}})});
  try { await assert.rejects(reviewCoinImage({...fixture, imagePath}), /not verified/); }
  finally { globalThis.fetch = originalFetch; }
});
