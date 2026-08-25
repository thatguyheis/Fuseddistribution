# Fused Distribution Master Evolution Report

Cycle date: 2026-08-25
System generation: 1
Evidence sources: repository SOPs, production logs, release QA, fresh Buffer API snapshot, profit ledger, and deterministic quality audits

## A. Executive Fitness Summary

Current system fitness: **64/100**.

Trend: **mixed but improving operationally**. The publication system completed today's four-post checkpoint, live verification passed, and the fresh Buffer conference recovered 174 post records. However, the current leading-indicator audit scored **-12**, 93 legacy Reels remain release-blocked, and the required retention and production-cost dimensions have no measurements.

| Dimension | Score | Evidence |
|---|---:|---|
| Publication reliability | 78 | Live readback, sitemap checks, Buffer media gates, resumable checkpoints |
| Content and release quality | 55 | Strong deterministic gates, but four recovered posts fail current QA and 93 rendered Reels remain blocked |
| Measurement and attribution | 45 | 174 Buffer records and 169 mature observations, but zero retention and production-cost measurements |
| Compute efficiency | 72 | Gemma-first leaf work and deterministic scripts, offset by memory-heavy local generation and Remotion rendering |
| Governance and learning | 75 | Profit ledger, learned rules, tests, and rollback gates exist; experiment expiry and protocol drift need cleanup |

The previous generic 42-55 estimate understated the real system. The stack already has a closed-loop foundation. Its bottleneck is evidence quality and attribution, not basic automation.

## B. Detailed Audit Findings

### 1. Fitness evidence is incomplete

The fresh snapshot contains 174 posts, 169 mature observations, and 139 mapped slugs. The new deterministic fitness run can score 148 observations, but every eligible score has only 65 percent evidence coverage. Buffer currently supplies exposure, engagement, and some conversion fields. It supplies no usable average watch duration or completion data in this snapshot, and the pipeline records no render wall time, peak memory, API cost, or manual review time.

Root cause: the original profit loop was designed around available Buffer metrics and operational events, not the complete Reel fitness function requested here.

Action: treat current scores as relative selection hints. Do not declare causal winners until retention and production-cost evidence are collected.

### 2. Recovery success was based on HTTP status, not current quality

The 9 AM recovery path treated a registered post returning HTTP 200 as healthy. Independent QA found current-rule failures in all four recovered posts:

- `how-to-buy-silver-for-the-first-time`: missing related block and invalid Reel chart data.
- `where-to-buy-silver-online-safely`: missing related/read-next content plus invalid Reel stat and chart fields.
- `what-pages-every-small-business-website-needs`: no inline body links under the current rule.
- `mobile-website-speed-why-it-matters-for-local-business`: visible `[City Name]`, disallowed dash punctuation, and no inline body links.

The recovery script now reruns deterministic QA and logs quality drift without deleting or silently rewriting live content. Commit `0856326d` contains this control.

### 3. Buffer-to-genotype mapping is incomplete

Thirty-five of 174 Buffer records are not mapped to a slug. Most are older Instagram posts whose captions or historical checkpoints do not preserve a blog URL or post-to-slug mapping.

Impact: those posts can establish platform baselines, but their hooks, captions, music, and visual protocol cannot be selected or mutated reliably.

Action: require post ID, slug, protocol version, and variant ID in every confirmed scheduling checkpoint.

### 4. Current scores cannot establish causal creative traits

Both `stat` and `statement` hooks appear among survivors and mutation candidates. Proportional captions also appear in both groups. The evidence does not support claims that one hook family or caption mode is globally superior.

Action: run matched single-variable tests. Preserve topic, duration, platform, and age bucket while changing only hook text, CTA, caption density, or posting window.

### 5. Experiment governance is stale

The learned-rule file contains experiments whose `reviewAfter` dates have passed, including the YouTube silver topic test and the expedited Buffer backlog burn. They remain active or experimental without a recorded close, extension, or replacement decision.

Action: weekly review must close expired experiments explicitly. An expired experiment must not continue changing production targets by inertia.

### 6. SOP ownership language has drifted

The active scheduled path is Gemma/Hermes plus deterministic scripts with Codex ownership. Some social and nightly-generation documentation still describes a daily Claude pipeline or asks Claude to polish drafts. These statements conflict with the active Codex-only operating model.

Action: migrate historical provider-specific language to role-based terms such as local drafting agent, deterministic auditor, and Codex owner. Preserve historical notes only in an incident appendix.

### 7. The Buffer capacity assumption needs revalidation

The repository enforces a shared organization cap of ten scheduled posts, while Buffer currently documents ten scheduled posts **per channel** on its Free plan. The conservative repository rule is safe, but it may leave capacity unused. Buffer's current Free plan also documents three connected channels, Insights, API access, and 3,000 requests per month. [Buffer pricing](https://buffer.com/pricing)

Action: verify the API's actual account/channel capacity semantics before changing the guard. Do not increase volume from documentation alone.

### 8. Reel release debt is the largest production backlog

The audit has 265 rendered Reels and 265 matching blog pages, with no missing panels or release-QA files. However, 93 Reels are blocked by legacy captions, timing, duration, music gain, or rights evidence. This is quality debt, not ready inventory.

Action: rerender in small controlled groups, prioritize slugs with proven demand, and measure wall time and memory during every rerender.

### 9. The local compute design is mostly sound but needs measurement

The pipeline correctly uses deterministic scripts and small local models for leaf work. The remaining risk is simultaneous Gemma, Chatterbox, browser, FFmpeg, and Remotion workloads on 8 GB unified memory.

Action: enforce one heavy process at a time and record render duration plus peak resident memory. Production efficiency cannot be scored from estimates.

## C. Performance Mapping

Fresh conference summary:

- Buffer posts: 174.
- Mature observations: 169.
- Slug-mapped posts: 139.
- Fitness-eligible observations: 148.
- Retention measurements: 0.
- Production-cost measurements: 0.
- Instagram mature average exposure: approximately 104 views.
- Buffer leading-indicator score for the day: -12 after 127 normalized comparisons.

Directional survivor examples:

| Platform | Slug | Partial fitness | Exposure | Protocol evidence |
|---|---|---:|---:|---|
| X | `best-appointment-booking-tools-for-small-business-2026` | 82.35 | 9 impressions | Statement hook, proportional captions |
| X | `chatgpt-for-small-business-owners-beginners-guide` | 82.29 | 12 impressions | Stat hook, proportional captions |
| Instagram | `instagram-for-local-business-complete-guide` | 72.27 | 113 views | Statement hook, proportional captions |
| YouTube | `silver-recycling-and-scrap-recovery-market` | 69.88 | 156 views | Stat hook, proportional captions |
| YouTube | `dollar-cost-averaging-silver-strategy-explained` | 63.73 | 18 views | Statement hook, proportional captions |

Directional mutation examples include YouTube observations with one to eight views, Instagram `electric-vehicle-silver-demand-explained` at 37 views, and several X observations with one to three impressions.

These are selection candidates, not causal winners. Small absolute samples and missing retention prevent a sound claim that the displayed hook or caption style caused the result.

## D. Evolved Next-Generation SOPs

The executable next-generation protocol is [EVOLUTION-SOP.md](./EVOLUTION-SOP.md). Its material changes are:

1. Evidence coverage is mandatory beside every score.
2. Same-platform and same-age comparisons are mandatory.
3. Top and bottom quintiles require repeated cycles before promotion or extinction.
4. Every published post must preserve genotype metadata and variant identity.
5. Quality, rights, and release gates override performance optimization.
6. Existing live checkpoints receive current-rule QA during recovery.
7. Production efficiency requires measured wall time, memory, money, and manual minutes.

Expected impact: higher confidence in protocol changes and fewer false winners. CPU/cost: negligible for deterministic scoring. Ease: high.

## E. Active Monitoring and Buffer Conference Protocol

Daily commands:

```bash
npm run social:buffer:metrics -- --date=YYYY-MM-DD --lookback-days=60
npm run social:fitness -- --format=json --out=ops/profit-system/evolution/fitness-YYYY-MM-DD.json
npm run profit:audit -- --date=YYYY-MM-DD
```

Cadence:

- After every publish: confirm Buffer ID, channel, state, due time, and video asset.
- D+1: collect early exposure and attachment failures. Do not select winners.
- D+3: first comparable fitness ranking.
- D+7: survivor/mutation decision checkpoint.
- Weekly: close expired experiments, approve mutations, and update this report.

Rubric:

- Retention 30.
- Distribution 25.
- Engagement 25, with saves and shares weighted highest.
- Conversion 15.
- Production efficiency 5.

Current maximum evidence coverage is 65 percent. Native Instagram/YouTube retention export or another authoritative source is required to unlock retention fitness.

## F. High-Impact Low-CPU Tool Stack

| Rank | Tool | Role | Expected impact | CPU/cost | Ease | Decision |
|---:|---|---|---|---|---|---|
| 1 | Existing Node, Buffer API, KV, FFmpeg, Remotion | Deterministic production and evidence loop | High | Existing cost; render bursts | High | Keep as core |
| 2 | Buffer Free | Publishing, readback, basic analytics | High | Free, 3 channels, API quota | High | Keep; verify capacity semantics |
| 3 | Groq Whisper API | Word/segment timestamps when local memory is constrained | High caption accuracy potential | Free-tier limits; cloud upload; 25 MB free-tier file cap | High | Controlled fallback only |
| 4 | CapCut Desktop/Web | Manual caption and hook-template A/B prototypes | Medium | Core captioning available; region/version variance | High | Optional manual experiment |
| 5 | Klyssa | Local short-form review/editing with offline Whisper | Medium | Local FFmpeg/Whisper load; vendor lists M1-M4 | Medium | Pilot one file before adoption |
| 6 | Seloice or MiOffice WASM tools | One-off local-browser crop/compress/trim | Low to medium | Free standard tools; browser memory | High | Utility fallback, not pipeline core |
| 7 | WayinVideo | Clip long source videos in the cloud | Low for the current generated-Reel workflow | Free credits, then paid; cloud upload | Medium | Defer until long-form source exists |
| 8 | LazyReel | Manual local auto-edit or research experiment | Unproven for this pipeline | Local GPU or provider-key cost | Medium | Research-only pilot |

Verified references: [CapCut auto captions](https://www.capcut.com/help/how-to-recognise-subtitles), [Groq speech-to-text](https://console.groq.com/docs/speech-to-text), [OpenAI Whisper](https://github.com/openai/whisper), [Klyssa](https://www.klyssa.app/), [Seloice](https://www.seloice.com/), [MiOffice FAQ](https://mioffice.ai/faq), and [WayinVideo](https://wayin.ai/).

OpenNolan and Radical Tempo are not approved recommendations. No authoritative evidence was found that they are suitable, maintained Reel-production tools. Canva remains useful for manual static overlays, but the existing SVG generator is cheaper and more reproducible for automated production.

## G. Sub-Agent Architecture

| Agent | Implementation | Scope | Escalation |
|---|---|---|---|
| Evidence collector | Deterministic Node scripts | Buffer snapshots, release state, cost telemetry | Fails closed on unavailable evidence |
| Fitness scorer | Deterministic Node first, Gemma summary second | Percentiles, quintiles, coverage, ranking | No creative mutation authority |
| Quality auditor | Deterministic QA | Links, placeholders, citations, Reel schema, media integrity | Blocks new publication |
| Mutation proposer | Gemma-class local model | Two variants from survivor DNA | Cannot publish or change hard rules |
| Rights/release auditor | Deterministic records plus human caption review | Music, captions, duration, attachment | Blocks release |
| Synthesis owner | Codex | Weekly conflict resolution and SOP updates | User approval for external effects or material policy changes |

This architecture already matches much of the repository. The improvement is explicit evidence handoff between agents and eliminating provider names from role definitions.

## H. Immediate Seven-Day Action Plan

### Day 1

- Preserve the fresh 174-post snapshot and fitness generation.
- Repair the four current-rule blog QA defects.
- Close or extend expired learned-rule experiments.

### Day 2

- Make post ID, slug, protocol version, and variant ID mandatory in all scheduling logs.
- Backfill the 35 unmapped posts where authoritative logs permit it.

### Day 3

- Add render wall-time and peak-memory telemetry.
- Record manual caption-review minutes.

### Day 4

- Export native retention data for a small matched YouTube and Instagram sample.
- Join it to existing post IDs without replacing Buffer evidence.

### Day 5

- Select one survivor topic with adequate exposure.
- Generate two variants: hook text A/B only. Keep all other variables fixed.

### Day 6

- Publish the matched variants in unoccupied comparable windows.
- Confirm attachments and variant IDs through authoritative readback.

### Day 7

- Run D+1 diagnostics, not winner selection.
- Review mapping coverage, failures, CPU telemetry, and manual rework.

## I. Long-Term Evolutionary Roadmap

### Generations 1-2

- Reach 95 percent post-to-slug/protocol mapping.
- Add real retention and production-cost telemetry.
- Repair live quality drift and prioritize the 93-Reel release backlog by measured demand.

### Generations 3-5

- Run controlled hook, CTA, caption-density, and posting-window tests.
- Promote only elements with three comparable positive samples.
- Retire stale experiments and provider-specific instructions.

### Generations 6+

- Feed verified conversions and gross profit into survivor selection.
- Maintain stable controls and automatic rollback triggers.
- Keep frontier synthesis weekly or incident-driven, with routine work deterministic or Gemma-first.

Target: system fitness above 80 with at least 85 percent evidence coverage, no unresolved quality escapes, and measured production cost reduced by 30 percent without lowering release quality.

## ADA Prompt Evolution

The supplied ADA prompt should evolve in five ways:

1. Require evidence coverage beside every fitness score.
2. Separate system fitness, content fitness, and business-profit fitness.
3. Remove mandatory recommendations for named tools until current capability, cost, privacy, and maintenance are verified.
4. Prohibit causal claims from cross-platform totals, one-off winners, or incomplete retention evidence.
5. Require tests, rollback conditions, versioned generations, and human approval before a mutation changes legal, financial, security, rights, or publishing controls.

The prompt's Darwinian framing is useful for disciplined experimentation. The selection mechanism must remain statistical and governed, not rhetorical.
