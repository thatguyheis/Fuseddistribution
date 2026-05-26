import { test } from 'node:test';
import assert from 'node:assert/strict';

// Pure function — same parsing logic as loadReelDataQueries in fetch-photos.mjs
function parseReelDataQueries(md) {
  const queries = {};
  const sectionMatch = md.match(/## pexels_queries\n([\s\S]*?)(?=\n##|$)/);
  if (!sectionMatch) return queries;

  const lines = sectionMatch[1].split('\n');
  let currentSegment = null;
  for (const line of lines) {
    const segMatch = line.match(/^-\s+segment:\s*(\d+)/);
    const queryMatch = line.match(/^\s+query:\s*"(.+?)"/);
    if (segMatch) currentSegment = parseInt(segMatch[1], 10);
    if (queryMatch && currentSegment !== null) {
      queries[currentSegment] = queryMatch[1];
      currentSegment = null;
    }
  }
  return queries;
}

test('parses pexels_queries from reel-data.md content', () => {
  const md = `# Reel Data: test-slug
topic: silver

## pexels_queries
- segment: 0
  query: "silver coins safe storage"
- segment: 2
  query: "silver tarnish moisture"
`;
  const queries = parseReelDataQueries(md);
  assert.equal(queries[0], 'silver coins safe storage');
  assert.equal(queries[2], 'silver tarnish moisture');
  assert.equal(queries[1], undefined);
});

test('returns empty object when no pexels_queries section', () => {
  const md = `# Reel Data: test-slug\ntopic: tech\n\n## stats\n- text: "foo"\n`;
  const queries = parseReelDataQueries(md);
  assert.deepEqual(queries, {});
});

test('returns empty object for empty string', () => {
  assert.deepEqual(parseReelDataQueries(''), {});
});
