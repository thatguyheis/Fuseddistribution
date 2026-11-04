import { PERMANENT_REDIRECTS } from '../../src/redirects.js';

export function isRetiredBlogSlug(slug) {
  return PERMANENT_REDIRECTS.has(`/blog/${slug}`);
}
