import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readProtectedSlugs(blogRoot, resolutionPath) {
  const protectedSlugs = new Set();
  // Published legacy articles also require a scoped panel deployment. Never let
  // an old media-map entry silently restore a broken player in canonical HTML.
  const catalog = join(blogRoot, 'posts.json');
  if (existsSync(catalog)) {
    for (const post of JSON.parse(readFileSync(catalog, 'utf8'))) {
      if (typeof post.slug === 'string') protectedSlugs.add(post.slug);
    }
  }
  if (existsSync(resolutionPath)) {
    const resolutions = JSON.parse(readFileSync(resolutionPath, 'utf8')).resolutions || [];
    for (const row of resolutions) if (row.canonicalSlug) protectedSlugs.add(row.canonicalSlug);
  }
  for (const entry of readdirSync(blogRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const qaPath = join(blogRoot, entry.name, 'qa.json');
    if (!existsSync(qaPath)) continue;
    try {
      const qa = JSON.parse(readFileSync(qaPath, 'utf8'));
      if (qa.pass === true && qa.mode === 'codex-editorial') protectedSlugs.add(entry.name);
    } catch {
      // Invalid QA is not an approval signal.
    }
  }
  return protectedSlugs;
}
