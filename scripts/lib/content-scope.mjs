import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Single reader for ops/content-scope.json. Returns null when every
// registered post is in scope, otherwise the in-scope slugs newest first.
export function readContentScope(repoRoot) {
  const path = join(repoRoot, 'ops/content-scope.json');
  if (!existsSync(path)) return { scope: 'all' };
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function scopedSlugs(repoRoot) {
  const { scope } = readContentScope(repoRoot);
  if (!scope || scope === 'all') return null;
  if (scope !== 'coin-history') throw new Error(`unknown content scope: ${scope}`);
  const posts = JSON.parse(readFileSync(join(repoRoot, 'public/blog/posts.json'), 'utf8'));
  return posts
    .filter((post) => post?.slug && existsSync(join(repoRoot, 'content/coin-history', post.slug)))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map((post) => post.slug);
}
