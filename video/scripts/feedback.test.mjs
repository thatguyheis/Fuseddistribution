import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPerformanceEntry, generateReport } from './feedback.mjs';

test('performance entry records share and save signals', () => {
  const entry = buildPerformanceEntry({
    slug: 'demo-reel', platform: 'instagram', datePosted: '2026-08-16',
    metrics: { views: 1000, reach: 800, likes: 80, shares: 20, dmShares: 10, saves: 40, comments: 5, profileVisits: 12, linkClicks: 3, follows: 4, watchTimePct: 55, avgWatchSeconds: 18, completionPct: 32 },
    meta: { hookType: 'contradiction', renderedDuration: 45, musicTrack: 'none' },
  });
  assert.equal(entry.saveRate, 0.05);
  assert.equal(entry.sendRate, 0.0375);
  assert.equal(entry.engagementRate, 0.1812);
  assert.equal(entry.hookType, 'contradiction');
});

test('report includes share and save sections when reach exists', () => {
  const report = generateReport([{ slug: 'demo', platform: 'instagram', views: 100, likes: 10, shares: 3, dmShares: 2, saves: 8, comments: 1, reach: 100, sendRate: 0.05, saveRate: 0.08, hookType: 'pain', totalDuration: 40, musicTrack: 'none' }]);
  assert.match(report, /Share and Save Signals/);
  assert.match(report, /Avg send rate/);
  assert.match(report, /Avg save rate/);
});
