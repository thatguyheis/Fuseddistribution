import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const buildPost = readFileSync(resolve('public/blog/scripts/build-post.sh'), 'utf8');

test('build-post runs deterministic preflight before rendering JPG assets', () => {
  const preflight = buildPost.indexOf('T11 preflight artifact QA');
  const assets = buildPost.indexOf('assets: jpg from svg');
  const finalGate = buildPost.indexOf('T11 deterministic artifact QA');

  assert.ok(preflight >= 0, 'preflight gate must be present');
  assert.ok(assets >= 0, 'asset stage must be present');
  assert.ok(finalGate >= 0, 'final artifact gate must be retained');
  assert.ok(preflight < assets, 'preflight must block asset rendering');
  assert.ok(assets < finalGate, 'final gate must still validate rendered artifacts');
  assert.match(buildPost, /qa-preflight\.json/);
  assert.match(buildPost, /qa-preflight-fail/);
});

test('QA year validation ignores opaque HTML identifiers', () => {
  const qaLocal = readFileSync(resolve('public/blog/scripts/qa-local.mjs'), 'utf8');
  assert.match(qaLocal, /yearSurface = label === 'index\.html' \? textFromHtml\(text\)/);
});
