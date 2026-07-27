import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAudit, buildLeadingIndicatorAudit, repeatMultiplier, scoreEvent } from '../scripts/profit-sop-audit.mjs';

const config = JSON.parse(readFileSync(new URL('../ops/profit-system/config.json', import.meta.url), 'utf8'));

function event(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    occurredAt: '2026-07-27T12:00:00.000Z',
    date: '2026-07-27',
    kind: 'penalty',
    type: 'bug',
    fingerprint: 'buffer-post-not-created',
    value: 1,
    evidence: 'Buffer API returned no live post.',
    source: 'test',
    attributable: true,
    notes: '',
    ...overrides,
  };
}

test('repeated failures receive escalating punishment', () => {
  const current = event();
  const history = [
    event({ date: '2026-07-25', occurredAt: '2026-07-25T12:00:00.000Z' }),
    event({ date: '2026-07-26', occurredAt: '2026-07-26T12:00:00.000Z' }),
  ];
  assert.equal(repeatMultiplier(current, history, config), 2);
  assert.equal(scoreEvent(current, history, config).points, -20);
});

test('unattributed vanity outcomes receive no reward', () => {
  const result = scoreEvent(event({
    kind: 'reward',
    type: 'qualified_lead',
    fingerprint: 'unattributed-traffic',
    attributable: false,
  }), [], config);
  assert.equal(result.points, 0);
});

test('attributable gross profit dominates operational rewards', () => {
  const profit = scoreEvent(event({ kind: 'reward', type: 'gross_profit_usd', fingerprint: 'sale-order-1', value: 100 }), [], config);
  const quality = scoreEvent(event({ kind: 'reward', type: 'high_quality_delivery', fingerprint: 'qa-pass', value: 1 }), [], config);
  assert.ok(profit.points > quality.points);
});

test('critical violations freeze SOP mutation', () => {
  const audit = buildAudit('2026-07-27', [event({
    type: 'false_success_claim',
    fingerprint: 'claimed-buffer-post-without-readback',
  })], config);
  assert.equal(audit.sopMutationAllowed, false);
  assert.equal(audit.hardStops.length, 1);
});

test('repeat failures become improvement candidates', () => {
  const events = [
    event({ date: '2026-07-26', occurredAt: '2026-07-26T12:00:00.000Z' }),
    event(),
  ];
  const audit = buildAudit('2026-07-27', events, config);
  assert.equal(audit.improvementCandidates.length, 1);
  assert.equal(audit.improvementCandidates[0].occurrences, 2);
});

test('repeated events produce one deduplicated improvement candidate', () => {
  const events = [
    event({ date: '2026-07-26', occurredAt: '2026-07-26T12:00:00.000Z' }),
    event(),
    event({ id: crypto.randomUUID(), occurredAt: '2026-07-27T13:00:00.000Z' }),
  ];
  const audit = buildAudit('2026-07-27', events, config);
  assert.equal(audit.improvementCandidates.length, 1);
  assert.equal(audit.improvementCandidates[0].occurrences, 3);
});

test('Buffer metrics remain baseline-only without three comparable posts', () => {
  const result = buildLeadingIndicatorAudit('2026-07-27', [{
    date: '2026-07-27',
    insight: { statement: 'Collect more data.' },
    posts: [{ postId: 'today', platform: 'youtube', ageBucket: 'd3', viewsPerHour: 10 }],
  }], config);
  assert.equal(result.status, 'baseline_building');
  assert.equal(result.score, 0);
});

test('Buffer leading metrics compare same platform and age bucket and stay capped', () => {
  const historical = [1, 2, 3].map((index) => ({
    date: `2026-07-2${index}`,
    posts: [{ postId: `old-${index}`, platform: 'youtube', ageBucket: 'd3', viewsPerHour: 10, clicks: 1 }],
  }));
  const current = {
    date: '2026-07-27',
    posts: [{ postId: 'today', platform: 'youtube', ageBucket: 'd3', viewsPerHour: 1000, clicks: 100 }],
  };
  const result = buildLeadingIndicatorAudit('2026-07-27', [...historical, current], config);
  assert.equal(result.status, 'comparable');
  assert.ok(result.score > 0);
  assert.ok(result.score <= config.leadingIndicators.maximumDailyPoints);
});
