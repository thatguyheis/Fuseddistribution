import test from 'node:test';
import assert from 'node:assert/strict';
import { findUncitedSources } from '../public/blog/scripts/lib/sourced-stats.mjs';

test('generic formula-unit labels are not treated as uncited sources', () => {
  const text = 'Premium (Dollars) = Dealer Price - Silver Value. A 10% premium can vary by product.';

  assert.deepEqual(findUncitedSources(text), []);
});

test('a named source after a numeric claim remains blocked without research evidence', () => {
  const text = 'Conversion increased 10% (Statista).';

  assert.deepEqual(findUncitedSources(text), [{ source: 'Statista', count: 1 }]);
});
