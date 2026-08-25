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

The operating date is always the calendar date in `America/Los_Angeles`, never
the UTC date derived from `toISOString()`. Scheduled owners must pass that date
explicitly to metrics and audit commands. The CLI defaults use the same timezone
as a deterministic fallback. A report whose label does not match its Pacific
operating window is invalid and must be regenerated before comparisons or rule
promotion.

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

## 9. Unattended ownership and completion states

When Nick is away from the console, Codex owns recovery from the oldest durable
checkpoint through blog creation, deterministic QA, deployment, live readback,
Remotion rendering, release QA, durable media hosting, Buffer scheduling, sent
readback, metrics collection, and governed SOP evolution.

Each stage has one authoritative completion proof:

- Blog: registered in `posts.json`, present in the sitemap, and canonical URL
  returns 200 with coherent title/content.
- Reel: H.264/AAC 1080x1920 MP4 plus `release-qa.json` with
  `readyForPosting=true`; render exit alone is insufficient.
- Distribution: Buffer API readback confirms the exact channel, due/sent state,
  and retained video asset. An empty live queue is not success by itself.
- Evolution: metrics snapshot, evidence ledger, audit report, focused tests, and
  an explicit rule/experiment/no-change decision share the Pacific operating
  date.

Owners retry transient model, network, render, deployment, and API failures from
the checkpoint with bounded backoff. They do not bypass quality, security,
platform, capacity, or live-verification gates. A permanent authentication,
account lock, platform rejection, exhausted paid quota, legal/accuracy hard
stop, or unavailable machine is recorded as an external blocker; downstream
stages remain pending instead of being reported complete.

## 10. Algorithmic Darwinism Architect protocol

The Algorithmic Darwinism Architect (ADA) is the governed experiment layer for
reels and supporting social copy. Its purpose is to create small, traceable
variations, measure their real outcomes, select the highest-fit proven genetics,
and use those genetics as the parent for the next generation. ADA does not
replace editorial judgment, deterministic QA, platform rules, or human authority
over publishing and spend.

### 10.1 Evolutionary growth cycle

Every cycle follows four named states:

1. **Genesis:** register a generation, its control, candidate genetics,
   hypothesis, comparison cohort, success metric, expiry date, and rollback
   condition before any candidate is distributed.
2. **Selection:** publish eligible candidates through the normal release gates,
   collect actual Buffer API results at D+1, D+3, and D+7, and compare only
   equivalent cohorts.
3. **Evolution:** select a champion only after the minimum evidence threshold is
   met. Copy its winning genetics, apply one bounded mutation, and register the
   resulting children as the next generation.
4. **Dispersion:** expand a proven champion to another topic, audience segment,
   or platform one dimension at a time. A dispersion result is a new experiment,
   not proof that the original result generalizes everywhere.

If no candidate qualifies, the cycle result is `no_winner`. Retain the incumbent
control and create a narrower next experiment. The system must never choose a
winner merely to keep the cycle moving.

Every ADA task must run `npm run workspace:audit` before handoff. The audit must
tag generation registries and evolution evidence as `ada`, while related reel
and blog files retain their own tags. A mixed change passes the union of those
protocols; ADA status never exempts a reel from release QA or a blog from its
publication gates. Local model caches, generated background libraries, and
rendered MP4 files are not evolutionary evidence and must remain outside Git.

### 10.2 Genetic identity and lineage

Every ADA reel must have one immutable genetic ID:

```text
ADA-<brand>-<platform>-G<generation>-V<variant>

Examples:
ADA-SILVER-YOUTUBE-G001-V01
ADA-TECH-INSTAGRAM-G001-V03
```

The generation registry lives at
`ops/profit-system/evolution/generations/<generation-id>.json`. It is the source
of truth connecting the producing agent, reel slug, Buffer post, genetics, and
measured outcome. Each candidate record must contain:

```json
{
  "geneticId": "ADA-SILVER-YOUTUBE-G001-V01",
  "parentGeneticId": null,
  "generation": 1,
  "variant": 1,
  "agentId": "agent_1",
  "brand": "silver",
  "platform": "youtube",
  "slug": "example-slug",
  "bufferPostId": null,
  "status": "registered",
  "genes": {
    "hookType": "contradiction",
    "openingSeconds": 5,
    "durationBucket": "100-139",
    "segmentDensity": "medium",
    "visualPattern": "stat-led",
    "captionPattern": "specific-question",
    "questionType": "binary-choice",
    "musicMode": "approved-cycle",
    "voiceProfile": "nick-chatterbox-v1"
  },
  "mutation": {
    "gene": "hookType",
    "from": "immediate-value",
    "to": "contradiction",
    "reason": "Test whether a contradiction improves early viewing and clicks"
  },
  "qualityScores": {},
  "bufferSnapshots": {},
  "fitness": null,
  "decision": null
}
```

`bufferPostId` must be populated from successful Buffer create/readback before
performance is attributed. Slug matching is a recovery aid, not the primary join
when a Buffer post ID exists. Never infer which agent or genetic variant produced
a post from its caption text.

The registry contains identifiers and parameters only. Prompts, logs, and
tracked files must never contain Buffer tokens, model credentials, or other
secrets.

### 10.3 Controlled variation

A generation contains one incumbent control and three to five child variants.
Each child inherits every control gene except one declared mutation. The normal
mutation delta is deliberately small:

- Hook wording or hook type, while preserving the same supported claim.
- Opening duration within a two-second range.
- Segment density changed by no more than one level.
- One visual presentation pattern.
- Caption or closing-question pattern.
- One approved music mode, including no music.

Do not mutate the factual conclusion, source evidence, legal disclosure, voice
identity, platform eligibility, or quality threshold. Do not change topic,
hook, duration, CTA, visual style, and posting window together and then claim a
causal winner. When operational constraints force multiple changes, mark the
candidate `confounded`; it can inform exploration but cannot become champion.

For production capacity, use one primary ADA experiment per brand and platform
at a time. Fill remaining slots with the incumbent control or normal production
content so experimentation does not starve reliable distribution.

### 10.4 Fitness landscape

Fitness is calculated only for candidates that passed blog QA, reel validation,
release QA, rights checks, visual review, and Buffer video-asset readback.
Scores are normalized from 0 through 100 within the same brand, platform, D+1,
D+3, or D+7 age bucket, and duration bucket.

```text
fitness = (0.45 * performance)
        + (0.25 * quality)
        + (0.20 * business_value)
        + (0.10 * efficiency)
        - risk_penalty
```

- **Performance:** Buffer API clicks 30%, average view duration 25%, engagement
  rate 20%, views per hour 15%, and impressions per hour 10%. Reweight the
  remaining available metrics proportionally when Buffer omits a metric. Missing
  data is null, never zero. Raw lifetime views are displayed for context but do
  not determine fitness.
- **Quality:** the post-render rubric in `video/REEL-SOP.md`, factual accuracy,
  source fidelity, readability, caption/audio sync, visual integrity, and CTA
  relevance. Any rubric dimension below 3 out of 5 blocks selection.
- **Business value:** attributable conversions, qualified leads, subscription
  activations, revenue, and gross profit when available. Until attribution has a
  sufficient sample, this component is neutral at 50 rather than guessed.
- **Efficiency:** generation cost, API cost, render time, human review minutes,
  rework, and failed attempts relative to the cohort median.
- **Risk penalty:** 0 for a clean candidate, 10 for corrected prepublication
  variance, and disqualification for a quality escape, unsupported financial
  claim, rights failure, privacy/security failure, deceptive impersonation, or
  false completion claim.

Views are therefore useful evidence, but a high-view reel cannot defeat a
lower-view candidate that produces materially better qualified conversion or
avoids a serious quality or risk failure.

### 10.5 Buffer evidence and cohort timing

Run the checked-in API snapshot with the Pacific operating date:

```bash
npm run social:buffer:metrics -- --date=YYYY-MM-DD
```

Attach snapshot evidence to candidates by exact `bufferPostId`. Review D+1 for
early anomaly detection, D+3 for a provisional rank, and D+7 for the selection
decision. Because Buffer metrics can lag by about 24 hours, a missing or stale
snapshot delays selection; it does not count as poor performance.

Candidates are comparable only when brand, platform, age bucket, organic or paid
distribution mode, duration bucket, and posting-window class match. Topic and
audience intent must be similar enough to state a credible causal hypothesis.
Cross-platform totals and unequal-age lifetime totals must never be combined.

### 10.6 Champion selection and reward

A candidate becomes champion only when all of these are true:

- It has at least three comparable published samples for the same genetic
  treatment.
- Its median fitness is at least 15% above the incumbent median.
- The result is present at D+7 and is not driven by one outlier post.
- Quality, business-value, and risk guardrails did not regress.
- The generation is not confounded and no hard stop froze SOP mutation.

Rank qualifying candidates by median fitness. Select one champion for cohorts of
four through eight candidates; a cohort of nine or more may retain the top two
only when both independently clear every promotion threshold. Record the
decision as `champion`, `retained_diversity`, `rejected`, or `no_winner`, with
the snapshot paths and score breakdown.

Reward means increasing the winning genetics' allocation in the next generation,
not bypassing review or spending without approval. Allocate 70% of the next
generation to descendants of the champion, 20% to the incumbent control, and
10% to a bounded exploratory mutation. Keep this split within existing Buffer,
hardware, API, subscription, and publishing limits.

### 10.7 Self-correction and rollback

Flag a fitness variance immediately when a candidate misses its declared target,
regresses a guardrail, or produces inconsistent platform results. Diagnose the
specific component before changing genetics:

- Weak performance with stable quality: mutate one creative gene.
- Strong views but weak clicks or conversion: adjust the content-to-offer fit or
  CTA gene, not the accuracy standard.
- Strong performance with weak quality: reject the candidate and strengthen its
  source, script, or review genetics.
- High cost or rework: simplify the generation path or reduce candidate count.
- Missing or incomparable Buffer data: extend observation; do not mutate from
  unsupported conclusions.

Rollback to the last champion when the next generation loses 10% or more median
fitness at D+7, creates a quality escape, or exceeds the declared cost ceiling.
Every rollback preserves the failed generation and evidence for audit. ADA may
propose changes automatically, but production SOP promotion remains subject to
the rule-promotion controls in section 4 and Nick's authority.

## 11. Controlled expedited Buffer backlog-burn experiment

From 2026-08-05 through the 2026-08-12 review, the distribution owner may target
six posts per Pacific operating day on each of YouTube Shorts, X, and Instagram.
The established floor remains three per channel. Refill the queue every four
hours for fixed 01:00, 05:00, 09:00, 13:00, 17:00, and 21:00 Pacific posting
slots. Use the organization limit of 10, one reserved slot, and the seven-day
repost cooldown. Schedule only after the latest active due time and never roll a
current-day deficit into tomorrow. Prefer new release-approved work, then unsent
backlog, then the oldest approved rotation candidate.

The hypothesis is that doubling controlled distribution will reduce the
release-ready backlog and increase qualified reach without increasing quality
escapes or duplicate/error rates. Compare each platform against its trailing
matched publishing days. Leading measures are sent posts per channel per day,
eligible backlog age/count, Buffer error rate, duplicate rate, clicks, watch
duration, and engagement at matching D+1/D+3/D+7 ages. Lagging measures are
qualified site visits, leads, conversions, revenue, and gross profit.

Stop or roll back to the three-per-channel target if any quality escape occurs,
an active duplicate is created, platform errors become recurrent, the baseline
floor is missed because expedited work consumed capacity, or matched median
engagement falls at least 25%. Missing eligible inventory is not permission to
weaken release QA; report the gate and treat three confirmed sends as the floor.
The implementation is verified by the daily-target, repost-policy, planner,
queue-validation, and live Buffer readback tests. Record the result in
`ops/profit-system/learned-rules.json` and reassess on 2026-08-12 before making
the six-post target permanent.
