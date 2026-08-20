import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAudit, buildLeadingIndicatorAudit, buildOperationalPenaltyEvents, evaluateBlogPublicationState, evaluateReelReleaseState, formatRevenueProfitEvidence, repeatMultiplier, scoreEvent } from '../scripts/profit-sop-audit.mjs';
import { normalizeOperatingDate, operatingDate } from '../scripts/lib/operating-date.mjs';

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

test('operating dates use America/Los_Angeles instead of UTC', () => {
  const afterMidnightUtc = new Date('2026-07-28T03:38:18.876Z');
  assert.equal(operatingDate(afterMidnightUtc), '2026-07-27');
  assert.equal(normalizeOperatingDate('2026-07-28'), '2026-07-28');
});

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

test('unavailable revenue and gross-profit evidence is never reported as zero', () => {
  assert.equal(formatRevenueProfitEvidence([]), 'unavailable');
  assert.equal(formatRevenueProfitEvidence([
    event({ kind: 'reward', type: 'gross_profit_usd', value: 125.4 }),
  ]), '$125.40');
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

test('pending blog checkpoint forces incomplete operating day hard stop', () => {
  const blogPublication = evaluateBlogPublicationState({
    date: '2026-07-28',
    queue: {
      posts: [
        { slug: 'silver-price-prediction-2026-what-analysts-expect' },
        { slug: 'ai-for-customer-service-small-business-how-to-set-it-up' },
      ],
    },
    pending: {
      remaining: ['ai-for-customer-service-small-business-how-to-set-it-up'],
    },
    completeExists: false,
    registeredSlugs: ['silver-price-prediction-2026-what-analysts-expect'],
  });
  const audit = buildAudit('2026-07-28', [], config, [], { blogPublication });
  assert.equal(audit.operationalState.blogPublication.completionStatus, 'incomplete');
  assert.equal(audit.hardStops.length, 1);
  assert.equal(audit.hardStops[0].type, 'incomplete_blog_checkpoint');
  assert.equal(audit.sopMutationAllowed, false);
});

test('fully registered blog queue with complete marker is marked complete', () => {
  const blogPublication = evaluateBlogPublicationState({
    date: '2026-07-28',
    queue: {
      posts: [
        { slug: 'silver-price-prediction-2026-what-analysts-expect' },
        { slug: 'how-to-use-ai-to-create-social-media-content-faster' },
      ],
    },
    pending: null,
    completeExists: true,
    registeredSlugs: [
      'silver-price-prediction-2026-what-analysts-expect',
      'how-to-use-ai-to-create-social-media-content-faster',
    ],
  });
  const audit = buildAudit('2026-07-28', [], config, [], { blogPublication });
  assert.equal(audit.operationalState.blogPublication.completionStatus, 'complete');
  assert.equal(audit.hardStops.length, 0);
  assert.equal(audit.sopMutationAllowed, true);
});

test('complete marker does not override a missing expected blog slug', () => {
  const blogPublication = evaluateBlogPublicationState({
    date: '2026-08-02',
    queue: {
      posts: [
        { slug: 'irs-rules-for-selling-silver-coins-1099-b-reporting' },
        { slug: 'state-sales-tax-on-silver-coins-which-states-charge-it' },
        { slug: 'how-to-train-your-team-on-ai-tools-step-by-step' },
        { slug: 'ai-for-bookkeeping-small-business-tools-compared' },
      ],
    },
    pending: null,
    completeExists: true,
    registeredSlugs: [
      'irs-rules-for-selling-silver-coins-1099-b-reporting',
      'state-sales-tax-on-silver-coins-which-states-charge-it',
      'ai-for-bookkeeping-small-business-tools-compared',
    ],
  });
  const audit = buildAudit('2026-08-02', [], config, [], { blogPublication });
  assert.equal(audit.operationalState.blogPublication.completionStatus, 'incomplete');
  assert.equal(audit.hardStops.length, 1);
  assert.equal(audit.hardStops[0].type, 'incomplete_blog_registration');
  assert.match(audit.hardStops[0].evidence, /complete\.json exists/);
  assert.equal(audit.sopMutationAllowed, false);
});

test('explicitly blocked queue slugs count as accounted outcomes', () => {
  const blogPublication = evaluateBlogPublicationState({
    date: '2026-08-04',
    queue: {
      posts: [
        { slug: 'instagram-marketing-for-local-business' },
        { slug: 'silver-ira-how-to-set-one-up-step-by-step' },
        { slug: 'silver-in-an-llc-vs-personal-ownership-tax-differences' },
        { slug: 'how-to-speed-up-your-small-business-website' },
      ],
      blockedSlugs: [
        'silver-in-an-llc-vs-personal-ownership-tax-differences',
        'how-to-speed-up-your-small-business-website',
      ],
    },
    pending: null,
    completeExists: true,
    registeredSlugs: [
      'instagram-marketing-for-local-business',
      'silver-ira-how-to-set-one-up-step-by-step',
    ],
  });
  const audit = buildAudit('2026-08-04', [], config, [], { blogPublication });
  assert.equal(audit.operationalState.blogPublication.completionStatus, 'complete');
  assert.deepEqual(
    audit.operationalState.blogPublication.blockedQueueSlugs,
    [
      'silver-in-an-llc-vs-personal-ownership-tax-differences',
      'how-to-speed-up-your-small-business-website',
    ],
  );
  assert.deepEqual(audit.operationalState.blogPublication.unaccountedQueueSlugs, []);
  assert.equal(audit.hardStops.length, 0);
  assert.equal(audit.sopMutationAllowed, true);
});

test('quality-blocked blog work is recorded once as a stable ledger penalty', () => {
  const operationalState = {
    blogPublication: {
      blockedQueueSlugs: ['inherited-junk-silver-what-to-do-with-it'],
    },
  };
  const created = buildOperationalPenaltyEvents({
    date: '2026-08-18',
    operationalState,
    existingEvents: [],
    occurredAt: '2026-08-18T18:30:00.000Z',
  });
  assert.equal(created.length, 1);
  assert.equal(created[0].fingerprint, 'blog-quality-gate-blocked');
  assert.equal(created[0].type, 'missed_checkpoint');
  assert.match(created[0].evidence, /inherited-junk-silver-what-to-do-with-it/);
  assert.deepEqual(buildOperationalPenaltyEvents({
    date: '2026-08-18',
    operationalState,
    existingEvents: created,
  }), []);
});

test('reel release checkpoint reports manual review blockers without authorizing posting', () => {
  const result = evaluateReelReleaseState({
    registeredSlugs: ['silver-inventory', 'local-keywords', 'near-me'],
    releaseQaBySlug: {
      'silver-inventory': { pass: true, manualCaptionReview: false, readyForPosting: false },
      'local-keywords': { pass: true, manualCaptionReview: true, readyForPosting: true },
    },
  });
  assert.equal(result.completionStatus, 'blocked');
  assert.deepEqual(result.manualCaptionReviewPendingSlugs, ['silver-inventory']);
  assert.deepEqual(result.readyForPostingSlugs, ['local-keywords']);
  assert.deepEqual(result.missingReleaseQaSlugs, ['near-me']);
});
