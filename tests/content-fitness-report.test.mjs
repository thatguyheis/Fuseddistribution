import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFitnessReport } from '../scripts/content-fitness-report.mjs';

function post(index) {
  return {
    postId: `post-${index}`,
    platform: 'youtube',
    ageBucket: 'd7',
    sentAt: `2026-08-0${index}T00:00:00.000Z`,
    views: index * 10,
    impressions: null,
    clicks: index - 1,
    reactions: index,
    comments: 0,
    shares: index === 5 ? 2 : 0,
    saves: index === 5 ? 1 : 0,
    reposts: null,
    averageViewDurationSeconds: null,
    rawMetrics: [],
  };
}

test('selects top and bottom cohorts without inventing missing fitness dimensions', () => {
  const slugMap = new Map(Array.from({ length: 5 }, (_, index) => [
    `post-${index + 1}`,
    `slug-${index + 1}`,
  ]));
  const report = buildFitnessReport({
    date: '2026-08-25',
    capturedAt: '2026-08-25T12:00:00.000Z',
    source: 'buffer_api',
    posts: Array.from({ length: 5 }, (_, index) => post(index + 1)),
  }, slugMap);

  assert.equal(report.metricCoverage.retention, 0);
  assert.equal(report.metricCoverage.productionCost, 0);
  assert.equal(report.eligiblePosts, 5);
  assert.equal(report.survivors.length, 1);
  assert.equal(report.mutationCandidates.length, 1);
  assert.equal(report.survivors[0].slug, 'slug-5');
  assert.equal(report.mutationCandidates[0].slug, 'slug-1');
  assert.equal(report.survivors[0].evidenceCoverage, 0.65);
  assert.equal(report.survivors[0].dimensions.retention, null);
  assert.equal(report.survivors[0].dimensions.productionEfficiency, null);
});
