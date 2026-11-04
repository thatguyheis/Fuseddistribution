import { fileURLToPath } from 'node:url';
import { editorialRegenerationBlocked } from './lib/editorial-regeneration.mjs';
import { isRetiredBlogSlug } from './lib/retired-blog-slugs.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
if (isRetiredBlogSlug(process.argv[2] ?? '')) {
  console.error('BLOCKED: retired blog slug has a permanent redirect and must not be regenerated');
  process.exitCode = 1;
} else if (editorialRegenerationBlocked(root, process.argv[2] ?? '')) {
  console.error('BLOCKED: owner-reviewed package requires scoped editorial revision, not model regeneration');
  process.exitCode = 1;
}
