# Content Evolution SOP

Version: 1.0
Owner: Codex
Operating constraint: Apple Silicon, 8 GB unified memory, low sustained thermal load

## Purpose

This protocol turns production and Buffer evidence into controlled improvements to blog, Reel, and social workflows. It supplements the release and editorial SOPs. It never weakens research, financial accuracy, rights, media integrity, caption review, or authoritative publishing readback.

## Evidence hierarchy

Use evidence in this order:

1. Verified conversions, qualified leads, attributed revenue, and gross profit.
2. Native or Buffer conversion signals such as follows, profile visits, and clicks.
3. Saves, shares, comments, and platform-normalized engagement.
4. Same-platform, same-age exposure and retention.
5. Production time, render time, memory pressure, API cost, and manual rework.
6. Editorial opinion only when measured evidence is unavailable.

Never compare raw lifetime totals across different platforms or age buckets.

## Daily conference loop

Run after the daily posts and Buffer maintenance have authoritative readback:

```bash
npm run social:buffer:metrics -- --date=YYYY-MM-DD --lookback-days=60
npm run social:fitness -- --format=json --out=ops/profit-system/evolution/fitness-YYYY-MM-DD.json
npm run profit:audit -- --date=YYYY-MM-DD
```

The fitness run must report evidence coverage. A score with missing dimensions is a partial score, not full Reel fitness.

## Fitness dimensions

| Dimension | Weight | Current source | Promotion requirement |
|---|---:|---|---|
| Retention | 30 | Average view duration or completion from Buffer/native insights | Real watch evidence, normalized by Reel duration |
| Distribution | 25 | Views, impressions, or reach | Same platform and same age bucket |
| Engagement | 25 | `3*shares + 3*saves + 2*comments + reactions + 3*reposts` per exposure | At least three comparable posts |
| Conversion | 15 | Clicks, profile visits, and `2*follows` per exposure | Attributable post-level signal |
| Production efficiency | 5 | Render seconds, peak memory, API cost, and manual minutes | Recorded measurements, not estimates |

Until retention and production-cost measurements exist, the current analyzer has at most 65 percent evidence coverage. It may rank mutation candidates, but it may not declare a complete creative winner.

## Selection policy

1. Score only D+1, D+3, and D+7 observations against the same platform and age bucket.
2. Use the top 20 percent as survivor candidates and the bottom 20 percent as mutation candidates.
3. Do not promote or kill a protocol from one observation.
4. Promote a protocol element only after three comparable positive samples and at least 15 percent median improvement.
5. Mutate or retire an element after two consecutive bottom-quintile cycles, unless a quality or legal incident requires immediate retirement.
6. Preserve one control variant in every experiment.
7. Change one causal variable per A/B pair when practical.

## Genotype record

Every published Reel must map its Buffer post ID to:

- slug and protocol version;
- hook type and opening text;
- duration and segment count;
- voice and caption mode;
- music track and rights record;
- media sources and visual treatment;
- CTA and platform copy version;
- scheduled local time;
- render wall time, peak memory, API cost, and manual review minutes.

A Reel without this mapping can contribute to platform baselines but cannot breed a protocol mutation.

## Mutation process

For each survivor family:

1. Preserve the source protocol as the control.
2. Generate no more than two low-cost variants.
3. Prefer hook wording, first-frame text, CTA, caption density, or posting-window mutations.
4. Do not rerender solely to change post copy or posting time.
5. Run the deterministic quality and release gates before publication.
6. Register the variant ID in the posting checkpoint.
7. Compare at D+3 and D+7 before promotion.

## Compute budget

- Deterministic Node and shell checks run first.
- Gemma-class local calls handle ranking summaries, copy variants, and structured mutation proposals.
- Run only one local model or render process at a time.
- Prefer one cloud transcription request over loading a second large local model when memory pressure is high.
- Frontier-model review is reserved for weekly synthesis, conflicts, financial claims, and new protocol design.
- No continuous background rendering or continuous model residency is required.

## Quality and rollback

- Existing registered posts receive current deterministic QA during recovery. Findings are warnings for owner repair and never trigger silent deletion of live content.
- A quality escape, duplicate publication, rights failure, false success claim, or broken media attachment freezes mutation promotion.
- Roll back an experiment when its guardrail fires or matched median engagement falls by 25 percent.
- Keep historical generations immutable. Add a new generation instead of rewriting evidence.

## Weekly review

Every seven days:

1. Confirm metric freshness and mapping coverage.
2. Review survivor and mutation cohorts.
3. Review expired experiments and close, extend, or replace them explicitly.
4. Promote only changes that meet the selection policy.
5. Update the Master Evolution Report with measured outcomes and unresolved evidence gaps.
