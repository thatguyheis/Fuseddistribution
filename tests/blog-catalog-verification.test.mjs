import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyBlogCatalog } from '../scripts/verify-blog-catalog.mjs';

const entries = [
  { slug: 'new-a', date: '2026-09-08', title: 'A' },
  { slug: 'new-b', date: '2026-09-08', title: 'B' },
  { slug: 'older', date: '2026-09-07', title: 'Older' },
];
test('same-day permutations retain complete chronological coverage', () => {
  assert.equal(verifyBlogCatalog(entries, [entries[1], entries[0], entries[2]]).count, 3);
});
test('matching newest slug cannot hide a missing older entry', () => {
  assert.throws(() => verifyBlogCatalog(entries, entries.slice(0, 2)), /counts differ/);
});
test('equal count cannot hide a replaced slug', () => {
  assert.throws(() => verifyBlogCatalog(entries, [entries[0], { ...entries[1], slug: 'wrong' }, entries[2]]), /missing new-b/);
});
test('duplicate slug cannot stand in for another entry', () => {
  assert.throws(() => verifyBlogCatalog(entries, [entries[0], entries[0], entries[2]]), /duplicate/);
});
test('stale metadata and changed original dates fail', () => {
  assert.throws(() => verifyBlogCatalog(entries, [entries[0], { ...entries[1], title: 'Stale' }, entries[2]]), /differs/);
  assert.throws(() => verifyBlogCatalog(entries, [entries[0], entries[1], { ...entries[2], date: '2026-09-06' }]), /differs/);
});
test('old-before-new dates and malformed dates fail', () => {
  assert.throws(() => verifyBlogCatalog(entries, [entries[2], entries[0], entries[1]]), /out of order/);
  assert.throws(() => verifyBlogCatalog(entries, [{ ...entries[0], date: '2026-02-30' }, ...entries.slice(1)]), /Invalid publication date/);
});
test('empty and non-array catalogs cannot pass', () => {
  assert.throws(() => verifyBlogCatalog([], []), /empty/);
  assert.throws(() => verifyBlogCatalog(entries, {}), /invalid catalog/);
});
