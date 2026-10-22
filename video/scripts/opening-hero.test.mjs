import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {stageOpeningHero} from './opening-hero.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('owner supplied coin evidence is staged as the reel opening hero', () => {
  const root = mkdtempSync(join(tmpdir(), 'fused-opening-hero-'));
  try {
    const article = join(root, 'public/blog/example-coin');
    mkdirSync(join(article, 'images'), {recursive: true});
    const hero = Buffer.from('generic-cover');
    const evidence = Buffer.from('owner-coin-photo');
    writeFileSync(join(article, 'hero.jpg'), hero);
    writeFileSync(join(article, 'images/coin.jpg'), evidence);
    writeFileSync(join(article, 'image-sources.json'), JSON.stringify({assets: [{
      path: 'images/coin.jpg', sha256: digest(evidence), sourceType: 'owner-supplied',
      role: 'coin evidence', label: 'verified owner coin photograph',
    }]}));

    const staged = stageOpeningHero(root, 'example-coin', digest(hero));
    assert.equal(staged.role, 'owner-coin-evidence');
    assert.equal(staged.src, 'heroes/example-coin-coin-evidence.jpg');
    assert.equal(staged.sha256, digest(evidence));
    assert.deepEqual(readFileSync(join(root, 'video/public/heroes/example-coin-coin-evidence.jpg')), evidence);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('changed owner coin evidence fails closed', () => {
  const root = mkdtempSync(join(tmpdir(), 'fused-opening-hero-'));
  try {
    const article = join(root, 'public/blog/example-coin');
    mkdirSync(join(article, 'images'), {recursive: true});
    writeFileSync(join(article, 'hero.jpg'), 'generic-cover');
    writeFileSync(join(article, 'images/coin.jpg'), 'changed-photo');
    writeFileSync(join(article, 'image-sources.json'), JSON.stringify({assets: [{
      path: 'images/coin.jpg', sha256: digest(Buffer.from('approved-photo')),
      sourceType: 'owner-supplied', role: 'coin evidence', label: 'verified owner coin photograph',
    }]}));
    assert.throws(() => stageOpeningHero(root, 'example-coin', digest(Buffer.from('generic-cover'))), /failed source manifest verification/);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('verified public-domain Wikimedia coin evidence is staged as the reel opening hero', () => {
  const root = mkdtempSync(join(tmpdir(), 'fused-opening-hero-'));
  try {
    const article = join(root, 'public/blog/example-coin');
    mkdirSync(join(article, 'images'), {recursive: true});
    const hero = Buffer.from('generic-cover');
    const evidence = Buffer.from('public-domain-coin-photo');
    writeFileSync(join(article, 'hero.jpg'), hero);
    writeFileSync(join(article, 'images/coin.jpg'), evidence);
    writeFileSync(join(article, 'image-sources.json'), JSON.stringify({assets: [{
      path: 'images/coin.jpg', sha256: digest(evidence), sourceType: 'Wikimedia Commons',
      page: 'https://commons.wikimedia.org/wiki/File:Example_coin.jpg',
      license: 'Public domain as listed on Wikimedia Commons',
      role: 'coin evidence', label: 'Verified 1892 coin image',
    }]}));

    const staged = stageOpeningHero(root, 'example-coin', digest(hero));
    assert.equal(staged.role, 'verified-coin-evidence');
    assert.equal(staged.sha256, digest(evidence));
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
