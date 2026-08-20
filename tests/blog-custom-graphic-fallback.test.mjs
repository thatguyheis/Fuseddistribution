import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = resolve('.');
const blogRoot = join(repoRoot, 'public/blog');

function makeSlug(prefix) {
  const tempDir = mkdtempSync(join(tmpdir(), `${prefix}-`));
  return `${prefix}-${basename(tempDir)}`;
}

test('ensure-custom-graphic injects a watch-list fallback when no approved visual exists', () => {
  const slug = makeSlug('tmp-watch-list');
  const dir = join(blogRoot, slug);
  mkdirSync(dir, { recursive: true });

  try {
    writeFileSync(join(dir, 'meta.json'), `${JSON.stringify({
      title: 'Comex Silver Inventory What Declining Stockpiles Mean For Price',
      slug,
      description: 'Test description',
      alt: 'Test alt',
      date: '2026-07-29',
      tags: ['Silver', 'Investing'],
      brand: 'silver',
    }, null, 2)}\n`);
    writeFileSync(join(dir, 'verified.md'), `# Test Title

Lead paragraph.

## What Comex Inventory Shows

Section one.

## Why Declining Stockpiles Matter

Section two.

## What To Watch Next

Section three.
`);

    execFileSync('node', ['public/blog/scripts/build-html.mjs', `--slug=${slug}`], { cwd: repoRoot });
    execFileSync('node', ['public/blog/scripts/ensure-custom-graphic.mjs', `--slug=${slug}`], { cwd: repoRoot });

    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /class="watch-list"/);
    assert.match(html, /What Comex Inventory Shows/);
    assert.match(html, /Why Declining Stockpiles Matter/);
    assert.match(html, /What To Watch Next/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
