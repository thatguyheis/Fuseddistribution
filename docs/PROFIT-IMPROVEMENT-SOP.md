# Profit-Aligned Evolving SOP

Owner: Codex, accountable to Nick Hughes.

Purpose: improve Fused Distribution's operating system every day while optimizing
for attributable gross profit, qualified demand, conversion, customer trust, and
reliable execution. Activity and vanity metrics are not profit.

## 1. Daily control loop

Every operating day follows the same comparison-driven loop:

1. **Observe:** collect authoritative outcomes for blogs, reels, Buffer posts,
   leads, conversions, revenue, gross profit, failures, rework, and rule breaches.
2. **Compare:** compare the day with the trailing 28-day median. A minimum of
   three prior operating days is required before declaring improvement or
   regression.
3. **Score:** reward attributable business value and verified high-quality
   delivery. Penalize errors, repeats, bugs, ambiguity, rework, and rule breaches.
4. **Diagnose:** identify the smallest controllable cause, not the nearest person
   or tool. Every negative event needs a stable fingerprint and evidence.
5. **Improve:** prefer a deterministic validator, state checkpoint, test,
   idempotency control, or authoritative readback over another reminder.
6. **Verify:** run the relevant tests and replay the failure case. A rule is not
   improved merely because prose changed.
7. **Record:** write the scorecard, evidence, rule decision, and verification
   result to `ops/profit-system/`.

Run:

```bash
npm run profit:record -- --kind=reward --type=gross_profit_usd \
  --fingerprint=order-123 --value=125.40 --evidence="Paid order 123 gross profit"
npm run profit:record -- --kind=penalty --type=missed_checkpoint \
  --fingerprint=buffer-video-not-created --evidence="Live Buffer API count remained zero"
npm run profit:audit -- --date=YYYY-MM-DD
```

## 2. What the system rewards

The weights in `ops/profit-system/config.json` are deliberately ordered:

1. Attributable gross profit and conversions.
2. Qualified leads and attributable revenue.
3. Verified distribution, high-quality delivery, recovered checkpoints, and
   failures prevented before customers see them.
4. Buffer performance metrics are capped leading indicators while direct profit
   evidence is unavailable. They never count as revenue or profit and only earn
   comparison points after the minimum comparable sample is met.

### Buffer leading-indicator protocol

Run the API-only snapshot after distribution (no browser):

```bash
npm run social:buffer:metrics -- --date=YYYY-MM-DD
```

The snapshot is stored in `ops/profit-system/buffer-metrics/`. Buffer refreshes
metrics daily, so values may lag the social network by about 24 hours. Compare
only the same platform and the same D+1, D+3, or D+7 age bucket. Raw lifetime
views or impressions never earn direct points.

The priority order is clicks, average view duration when derivable, engagement
rate, views per hour, then impressions per hour. Average view duration equals
`totalTimeWatched minutes * 60 / views`; leave it null when either field is
missing. Missing metrics are not zero and are never invented. The aggregate
leading-indicator score is capped at +/-12 points per day, preserving profit,
conversion, quality, and failure evidence as the dominant signals.

Quality is part of profit. Misleading copy, weak creative, broken links,
text-only video posts, duplicate posts, or unclear handoffs create negative
expected value even when they ship quickly.

## 3. What the system punishes

Penalties are evidence-based and increase when the same fingerprint repeats
within 30 days:

- First occurrence: base penalty.
- Second occurrence: 1.5x.
- Third occurrence: 2x.
- Fourth occurrence: 2.5x.
- Fifth and later: 3x maximum.

Critical rule violations, false success claims, and security/privacy violations
carry the largest penalties and freeze automatic SOP mutation until reviewed.
Publishing failures, quality escapes, missed checkpoints, duplicate work, bugs,
manual rework, and unclear handoffs carry smaller but still material penalties.

The penalty applies to the behavior and control failure, not to a person. The
goal is to make the profitable behavior easier and the unprofitable behavior
harder to repeat.

## 4. Rule promotion and retirement

Learned rules live in `ops/profit-system/learned-rules.json` and have four states:

- `experiment`: proposed control with a metric and expiry date.
- `active`: proven control incorporated into the production SOP or validator.
- `retired`: control no longer helps or has been superseded.
- `blocked`: proposal conflicts with a hard rule or lacks evidence.

A successful behavior needs at least three comparable samples and at least 15%
improvement over baseline before promotion. A negative behavior is eligible for
a new control after two occurrences; a critical failure is eligible immediately.

No learned rule may weaken secrets handling, legal/financial disclaimers,
accuracy, editorial QA, release QA, authoritative live verification, user
approval, or platform compliance. Learned rules are additive and reversible.

## 5. Required structure for every SOP change

Every daily change must state:

- Evidence and event fingerprints.
- Expected profit mechanism.
- Baseline and comparison window.
- Exact change and files affected.
- Leading metric and lagging profit metric.
- Guardrail metrics that must not regress.
- Test or replay result.
- Review date and rollback condition.

If evidence is insufficient, record an experiment instead of changing a
production rule. If a change cannot be measured, it is not a self-improvement.

## 6. Daily report interpretation

Daily reports are written to `ops/profit-system/reports/YYYY-MM-DD.{json,md}`.

- Positive score: value exceeded penalties; inspect whether profit evidence is
  real or merely operational reward.
- Negative score: failures and rework outweighed value; address the highest
  expected-loss fingerprint first.
- Baseline building: collect data without declaring a winner.
- Hard stop: freeze learned-rule promotion, repair the incident, and obtain
  human review for any proposed SOP mutation.

The maximum displayed daily score is +/-100 so one large order does not hide a
broken operating system. Raw score remains available for analysis.

## 7. Profit experiments

Run one primary profit experiment per brand/channel at a time. Examples include
buyer-intent topic versus informational topic, offer CTA versus generic CTA,
hook format, landing-page destination, or follow-up speed.

Experiments must preserve content accuracy and platform rules. Use a predeclared
success metric, comparison group, minimum sample, expiry date, and rollback
condition. Do not change several major variables and then claim causality.

## 8. Initial baseline

The current system begins in `baseline_building` because `video/data/performance.json`
previously contained no performance records and no daily profit events existed
before this SOP. Buffer API snapshots now establish the leading-indicator
baseline, while qualified leads, conversions, attributed revenue, gross profit,
post delivery, quality escapes, and rework remain required evidence. The system
must not invent profit attribution to make the score look good.
