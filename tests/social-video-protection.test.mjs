import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readProtectedSlugs } from '../public/blog/scripts/lib/social-video-protection.mjs';

test('approved unregistered Codex editorial slug is protected from social panel mutation', () => {
  const root = mkdtempSync(join(tmpdir(), 'social-video-protection-'));
  const blog = join(root, 'public/blog');
  const slug = 'new-approved-slug';
  mkdirSync(join(blog, slug), { recursive: true });
  writeFileSync(join(blog, slug, 'index.html'), '<article>canonical bytes</article>');
  writeFileSync(join(blog, slug, 'qa.json'), JSON.stringify({ pass: true, mode: 'codex-editorial' }));
  const before = readFileSync(join(blog, slug, 'index.html'));
  const protectedSlugs = readProtectedSlugs(blog, join(root, 'missing-resolutions.json'));
  assert.equal(protectedSlugs.has(slug), true);
  assert.deepEqual(readFileSync(join(blog, slug, 'index.html')), before);
});

test('published legacy articles are protected even without modern editorial QA',()=>{
  const blog=mkdtempSync(join(tmpdir(),'legacy-video-protection-'));
  writeFileSync(join(blog,'posts.json'),JSON.stringify([{slug:'legacy-article'}]));
  assert.equal(readProtectedSlugs(blog,join(blog,'no-resolutions.json')).has('legacy-article'),true);
});
