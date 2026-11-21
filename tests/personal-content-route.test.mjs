import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertPersonalContentRoute } from '../public/blog/scripts/lib/personal-content-route.mjs';

function fixture(brand, coinWorkup = false) {
  const root = mkdtempSync(join(tmpdir(), 'fused-personal-route-'));
  mkdirSync(join(root, 'ops'));
  mkdirSync(join(root, 'public/blog/example'), { recursive: true });
  writeFileSync(join(root, 'ops/editorial-brand-routing.json'), JSON.stringify({
    personal: { brand: 'Nick personal brand / Fused Distribution', allowedMetadataBrands: ['tech'], blockedWorkupDirectories: ['content/coin-history'] },
  }));
  writeFileSync(join(root, 'public/blog/example/meta.json'), JSON.stringify({ brand }));
  if (coinWorkup) mkdirSync(join(root, 'content/coin-history/example'), { recursive: true });
  return root;
}

test('allows a personal tech lesson', () => {
  assert.equal(assertPersonalContentRoute(fixture('tech'), 'example').brand, 'tech');
});

test('blocks client coin content from personal publishing', () => {
  assert.throws(() => assertPersonalContentRoute(fixture('silver'), 'example'), /personal channels are tech only/);
});

test('a tech label cannot reroute a coin-history workup', () => {
  assert.throws(() => assertPersonalContentRoute(fixture('tech', true), 'example'), /client SOP and account/);
});

test('rejects invalid slugs and missing routing policy', () => {
  assert.throws(() => assertPersonalContentRoute(fixture('tech'), '../example'), /valid slug/);
  assert.throws(() => assertPersonalContentRoute(mkdtempSync(join(tmpdir(), 'fused-no-route-')), 'example'), /ENOENT/);
});
