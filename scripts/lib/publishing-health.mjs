import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const required = ['index.html', 'hero.jpg', 'reel-data.md', 'reel-script.md', 'social-copy.json'];
export function verifiedCanonicalEquivalents(root) {
  const blog = join(root, 'public/blog');
  const posts = JSON.parse(readFileSync(join(blog, 'posts.json'), 'utf8'));
  const registered = new Map(posts.map(post => [post.slug, post]));
  const missingFiles = slug => required.filter(file => {
    try { return statSync(join(blog, slug, file)).size === 0; } catch { return true; }
  });
  const resolutionsPath = join(root, '.workflow-state/canonical-topic-resolutions.json');
  if (!existsSync(resolutionsPath)) return new Map();
  const parsed = JSON.parse(readFileSync(resolutionsPath, 'utf8'));
  if (!parsed || !Array.isArray(parsed.resolutions)) throw new Error('canonical resolution registry is malformed');
  const equivalents = new Map();
  for (const resolution of parsed.resolutions) {
    if (!resolution || typeof resolution !== 'object') continue;
    const target = resolution.canonicalSlug;
    if (typeof resolution.queuedSlug !== 'string' || typeof target !== 'string' ||
        resolution.status !== 'verified' || !resolution.rationale?.trim() ||
        !Number.isFinite(Date.parse(resolution.verifiedAt)) || !registered.has(target) ||
        registered.has(resolution.queuedSlug) ||
        missingFiles(target).length || resolution.catalog !== true || resolution.sitemap !== true ||
        resolution.url !== `https://fuseddistribution.com/blog/${target}/`) continue;
    const index = readFileSync(join(blog, target, 'index.html'));
    if (createHash('sha256').update(index).digest('hex') !== resolution.indexSha256) continue;
    if (existsSync(join(root, '.workflow-state/editorial-holds', `${target}.json`))) continue;
    try {
      const qa = JSON.parse(readFileSync(join(blog, target, 'qa.json'), 'utf8'));
      if (qa.pass !== true || qa.slug !== target || qa.score < 85 || qa.blockers?.length || qa.mode === 'deterministic-local') continue;
    } catch { continue; }
    equivalents.set(resolution.queuedSlug, target);
  }
  return equivalents;
}

export function auditPublishing(root, { startDate, today } = {}) {
  const blog = join(root, 'public/blog');
  const posts = JSON.parse(readFileSync(join(blog, 'posts.json'), 'utf8'));
  const registered = new Map(posts.map(post => [post.slug, post]));
  const missingFiles = slug => required.filter(file => {
    try { return statSync(join(blog, slug, file)).size === 0; } catch { return true; }
  });
  let equivalents;
  try { equivalents = verifiedCanonicalEquivalents(root); } catch { equivalents = new Map(); }
  const publishedSlug = slug => registered.has(slug) ? slug : equivalents.get(slug);
  const brokenPosts = posts.map(p => ({ slug: p.slug, missing: missingFiles(p.slug) })).filter(p => p.missing.length);
  const orderErrors = posts.slice(1).filter((p, i) => p.date > posts[i].date).map(p => p.slug);
  const queueFiles = readdirSync(join(blog, 'research')).filter(f => /^\d{4}-\d{2}-\d{2}-queue.json$/.test(f)).sort();
  // An incident-specific date hid old failed topics from every recurring audit.
  // Default to the first recorded production queue, not the current incident.
  startDate ??= queueFiles[0]?.slice(0, 10) ?? today;
  const dates = [];
  const unpublished = new Map();
  for (const file of queueFiles) {
    const date = file.slice(0, 10);
    if (date < startDate || (today && date > today)) continue;
    const queue = JSON.parse(readFileSync(join(blog, 'research', file), 'utf8'));
    for (const post of queue.posts) {
      if (publishedSlug(post.slug)) continue;
      const pending = unpublished.get(post.slug) ?? { slug: post.slug, firstQueued: date, queuedDates: [] };
      pending.queuedDates.push(date);
      unpublished.set(post.slug, pending);
    }
    const missing = queue.posts.filter(p => !publishedSlug(p.slug) || missingFiles(publishedSlug(p.slug)).length).map(p => p.slug);
    const covered = queue.posts.filter(p => !missing.includes(p.slug) && (equivalents.has(p.slug) || registered.get(p.slug)?.date === date)).length;
    const fresh = queue.posts.filter(p => registered.get(p.slug)?.date === date && !missingFiles(p.slug).length).length;
    dates.push({ date, expected: queue.posts.length, covered, fresh, missing,
      resolvedTopics: queue.posts.filter(p => equivalents.has(p.slug)).map(p => ({ slug: p.slug, canonicalSlug: equivalents.get(p.slug) })),
      duplicateTopics: queue.posts.filter(p => registered.has(p.slug) && registered.get(p.slug).date !== date).map(p => p.slug),
      completionClaimed: existsSync(join(blog, 'research', `${date}-complete.json`)) });
  }
  // Completed calendar days must be accounted for even if the producer never
  // created a queue. Today's absent queue may still be awaiting its schedule.
  const missingQueueDates = [];
  if (today && startDate) {
    const queuedDates = new Set(dates.map(d => d.date));
    for (const day = new Date(`${startDate}T00:00:00Z`); day.toISOString().slice(0, 10) < today; day.setUTCDate(day.getUTCDate() + 1)) {
      const date = day.toISOString().slice(0, 10);
      if (!queuedDates.has(date)) missingQueueDates.push(date);
    }
  }
  const issues = brokenPosts.length + orderErrors.length + missingQueueDates.length
    + dates.filter(d => d.covered < d.expected || !d.fresh).length;
  return { checkedAt: new Date().toISOString(), startDate, healthy: issues === 0,
    unpublishedTopics: [...unpublished.values()], brokenPosts, orderErrors, missingQueueDates, dates };
}
