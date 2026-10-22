# Batch production standard

Visual enrichment and reusable media: `docs/REEL-ENRICHMENT-SOP.md`. Preserve verified evidence; use local illustrations and licensed stock in supporting scenes.

Tech education expansion: `docs/TECH-EDUCATION-SOP.md`. Use concrete tool lessons, the imported hook strategy, and verified matching demonstrations.

Current original coin media policy: `docs/COIN-HISTORY-SOP.md`. Prefer the owner catalog for relevant coin history, use the seven-field hook brief, and preserve the existing release gates.

Current companion-video backfill and live verification: [Blog video reconciliation](BLOG-VIDEO-RECONCILIATION-SOP.md). Growth priorities and the measured pilot: [October 5 growth audit](GROWTH-AUDIT-2026-10-05.md).

## Fused production scope

Scheduled Fused owner work covers blog and reel research, generation, review, publishing, distribution, rights, and performance reporting. The separate Book Factory owner loop is paused and out of this workflow. Do not schedule or run Book Factory work during Fused production passes. Keep its source and existing assets available for a future explicit restart; they are not part of the active publishing queue.

Effective October5,2026, authorized by Nick. This is the current scheduling and batching authority, superseding historical hourly, five-pass and daily research instructions. Preserve editorial quality and posting output while reducing repeated model context and supervision.

## Current hosted-model default

All scheduled Codex owner tasks and model-assisted SOP actions use GPT-6 Luna (`gpt-6-luna`). Use low reasoning for routine status, evidence triage and weekly review; use medium for coordinated content repair and production work. Do not route scheduled Codex work to older model IDs. Keep deterministic checks and local Gemma/Ollama generation local; these do not use ChatGPT tokens and remain governed by their own validated quality gates. This model choice does not relax factual, editorial, rights, release or publication checks.

## Schedule in Pacific time

| When | Owner | Work |
| --- | --- | --- |
| Monday and Thursday23:00 | Local research batch | Prepare the following3–4 dated queues, one day/four topics at a time |
| Daily08:30 | GPT-6 Luna medium publishing owner | Due inventory, editorial batch review, saved-data community digest and one daily usage sample |
| Daily09:00 | Local publisher | Release due approved packages; verify live results |
| Daily11:00 | Local sequential renderer | Eligible approved sources, cached Chatterbox Standard speech, existing release gates |
| Daily21:30 | Same GPT-6 Luna medium owner | Repair changed failures, finalize media, review inventory and collect at most one due budgeted metrics snapshot |
| Daily22:00 | Local Buffer runner | Reconcile outcomes and refill each channel toward nine queued videos |
| Daily22:20 | Local audit | Deterministic publishing, rights, engagement and operating reports |
| Friday22:30 | Existing GPT-6 Luna low weekly review | Evaluate evidence, usage, reliability and monthly engagement |

The separate08:00 AI oversight is paused; its community and usage responsibilities move to08:30. This is15 scheduled AI invocations per week, down from43, a65.1% reduction in planned invocations. It is not a measured token saving. No automatic reduction to one daily pass is authorized by this rollout.

## Prepare ahead; release when due

### October9 production corrections

During backlog recovery, each existing owner pass targets four complete article packages, with a checkpoint after each. Continue to the next package after a successful publication. A single success is not an automatic stopping point. Record actual throughput and remaining count; stop early only for a concrete blocker or exhausted run capacity. Use the remaining capacity for independent review work if a publisher or renderer is busy. Do not add monitoring jobs or lower quality gates to meet this target.

Use the compact brand context and `scripts/validate-research-outline.py` before section generation. Reject unrelated SEO, sales or investment outlines before generating the body. A valid outline is not factual approval. Preserve failed candidates for direct editorial repair and test changed prompts on one planned topic before another multi-day attempt.

Reconcile individual live-proven slugs before selecting missing articles. Missing dated queues do not mean every planned article is unpublished. Stale proofs require verification, not automatic regeneration. Count completed historical days separately from unfinished plans.

Buffer refill must allocate against the live occupied channel/time pairs and a maximum of three posts per Pacific day, including known sends. Use 13:00,13:20,13:40 and carry overflow to the next available day. Validate again immediately before create. Existing collisions stop refill and require the locked `buffer-live.mjs repair-cadence` action; preserve post IDs, captions and media, then verify live readback. Queue depth without cadence verification cannot be called healthy.

Rendered reels enter a named visual-review queue. Record exact MP4 hashes, actual opening/middle/ending frames, decode and caption evidence, plus per-segment relevance. A missing or stale visual review is not distribution approval. Unrelated stock footage requires replacement and a new render; preserve reusable narration. Keep rendered, automated checks passed, owner reviewed, hosted, scheduled and sent as distinct stages.

### Missing blog incident priority

If an overdue plan lacks live articles, repair its oldest article before optional metrics, community summaries or older reel work while social inventory remains scheduled. Buffer sends do not establish blog health. The owner is authorized to perform editorial repair; missing owner approval is pending work, not a request for Nick to approve routine content.

The local model must pass an actual text generation request before drafting. `scripts/litert-generation-health.py` checks inference and permits one service restart only with verified publisher ownership and no active renderer. A successful model listing alone is insufficient. After a failed restart, preserve the plan and candidates, report the incident, and finish editorial work from verified sources without repeating the same model calls. After a confirmed runtime repair, one explicit `GEMMA_RECOVER_PLAN=1 GEMMA_RUN_DATE=YYYY-MM-DD` recovery may resume the preserved topics through the locked research runner.

Checkpoint each repaired article through source review, enriched graphic, companion files, local QA, exact approval hashes, scoped deployment and live verification. Use the actual release date. Retain the original plan date for backlog accounting. Complete one package before moving to the next; publishing four articles is not evidence that every overdue day is cleared. A no-progress owner pass must report the exact external blocker and attempted resolution. Never substitute another status review for repair.

Before editing an executing shell entrypoint, wait for its owner to finish or safely stop that owned run. Bash may continue reading the file at its previous byte offset after an edit. Preserve candidate outputs from interrupted runs and resume the affected stage, not unrelated topics.

Monday night covers Tuesday through Thursday; Thursday night covers Friday through Monday. Daytime exception recovery includes today. Draft four planned articles per date, two per vertical. Review in manageable chunks of3–4 complete packages with a separate checkpoint per article. Tuesday/Friday owner passes prioritize the new batch; subsequent daily passes resume unfinished review. Reuse relevant primary-source research, while verifying each claim and freshness requirement independently. No generic filler or shared unsupported claims.

Use `scripts/gemma-research-batch.py` for sequential local drafting. It preserves existing queues, flags partial queues and failed plans for owner repair, and does not repeat unchanged failed inference. It has a six-hour total budget and at most90minutes per new dated queue. An exit without a new queue is a deferral/failure, not success. Existing producer and render locks remain authoritative. After a failure, the owner repairs the artifact rather than rerunning the whole batch.

A draft queue is not approval. Complete articles, topic-specific enriched graphics, companion scripts, social copy, factual review, local QA, narration preflight and exact editorial hashes before adding a package to approved inventory. Reviewed future packages may reside in their canonical local article directories for source/render tools but remain unregistered and absent from the reviewed deployment baseline until due. Never run catalog registration or deployment for a future release. Keep companion dependencies complete so review is not repeated from scratch.

The daily publisher can release an intact, reviewed due package without invoking the writer. `reviewed-blog-ready.mjs` checks editorial hashes, holds and actual publication date. A changed, held or misdated approved package requires owner repair; it cannot silently fall back to regeneration. Pending selection excludes future dates, and explicit future publisher dates are blocked. If the Mac was offline past the intended date, set the actual publication date and renew approval before release. Preserve dates of already published articles.

## Reserve and Buffer

Build toward seven days of approved local inventory:28 article packages at four daily, and21 fully reviewed social videos at three daily per channel. These are targets, not claims that this reserve already exists. The compact owner brief reports the next seven dated queues and source-hash readiness. Automated release success is separate from visual review, hosting and confirmed social delivery.

Buffer holds at most ten scheduled/sending videos per channel, with one reserved slot. The daily22:00 run may fill toward nine scheduled posts per channel, subject to shared request budgets, cooldowns and available fully approved assets. Spread posts over future dates using the current recovery cadence of13:00,13:20 and13:40 Pacific. Preserve all previously accepted posts and occupied times. Ten queue slots are capacity, not ten posts per day. Already scheduled Buffer posts do not depend on an AI task running at send time.

Do not solve an API cooldown by polling, rotating keys or adding another scheduler. Save the exact retry condition. A failed daily refill with adequate remaining inventory can wait for the next routine run; imminent exhaustion or missed delivery is an explicit operational exception. The existing watchdog retains one bounded missing-queue recovery per date/generator revision for offline cases, rather than a new recurring AI run.

## Compute and review boundaries

Use one local narration/render queue. Preserve valid audio and media caches; restart only failed work after identifying a repair. Batch preparation does not permit concurrent local models alongside the renderer. The approved hero must appear at frame zero. Keep the pinned Nano voice, free approved music, revocations, accurate captions and full ending.

The local watchdog performs no model probe when no due work exists, and reviewed pending inventory does not require a model probe. Full deterministic audits stay in the existing22:20 job. AI reads the compact current checkpoint and changed evidence only. Do not repeatedly load logs, transcripts or historical SOP versions.

Every final reel still needs actual encoded opening/middle/ending review, timing, caption and rights checks, platform derivatives and exact hosted-byte evidence. The October4 recovery recorded21 automated passes and three failures; neither that count nor a completed worker establishes final social readiness. Carry these explicit exceptions into the next owner pass.

Community reports use verified saved comments only; draft replies for Nick, never send them automatically. Unknown/stale coverage and metrics stay unavailable. Apply the engagement SOP's opinion, series and CTA rules in each batch.

## Seven-day acceptance and rollback

At the Friday review and after seven operating days, compare completed due articles, confirmed sends, queue depth, reserve depth, repair latency and sampled account usage against the prior schedule. Keep failed gates and missing observations visible. A successful pilot requires no unaddressed missed due output, no silently ignored new failure, and a replenishable approved reserve. A lower invocation count alone is not success.

If two daily passes cannot clear actionable work or the reserve repeatedly runs out, repair the bottleneck and document the required temporary capacity. Do not automatically restore hourly monitoring or lower quality. Moving to one daily pass requires a separate evidence-based decision and a tested alert route for urgent failures. Local work still requires the Mac available; local AI tasks require the app/runtime available. No Git commit/push is implied.

Process inspection: a sandbox EPERM is not proof that a worker is running. Use the permitted escalated read-only process inspection route to resolve ownership. Preserve unknown owners if inspection remains unavailable; record the exact limitation rather than repeatedly reporting a historical PID as current.

## Approved pre-revenue growth objective, October 5

Nick confirms no revenue yet and authorizes the prioritized growth plan. The publishing owner approves the 24-video pilot for the existing production schedule. Use median D+7 views within each platform and vertical to select successful formats, with at least six measured creatives per arm. Do not wait for revenue, lead or conversion evidence. Missing views stay unavailable; X impressions cannot substitute for views. Keep comments, saves and production time as diagnostics and preserve all editorial, rights and release gates. See `ops/engagement/growth-pilot.json`. Approval means ready to execute, not already produced or measured.

## October 12 social inventory target

Maintain nine scheduled posts per connected channel, leaving one of the ten available slots free. Preserve the maximum of three posts per channel per Pacific day and seven day repost spacing. Use the existing daily refill owner; new user authorized catch-up refills use the same lock and release gates.

## Active backlog ownership, October 12

The existing owner advances both blog and reel backlogs; an unfinished blog backlog must not indefinitely defer social repair. Start with `node scripts/reel-backlog.mjs --write --summary`. The owner brief and existing Buffer runner also refresh the deterministic inventory. The queue retains named repairs, discovers recent published companions and failed visual reviews, and records stage changes without model calls. Saved channel counts require live confirmation before scheduling.

When any channel is below nine, advance at least two named reels through the next missing stage during each existing owner pass, alongside the article recovery target. Prefer release/hosting work, then completed-video review, opening repairs and scene repairs. Skip items already scheduled or within the seven day repost window. Continue after each success until the target is reached or a concrete external blocker or run capacity limit is recorded. Owner review is work to perform, not a request for Nick.

Use `.workflow-state/reel-backlog/current.json` as the consolidated worklist. Repair instructions and evidence stay attached to each slug. Preserve active renderer locks; a busy renderer defers only conflicting media edits, while independent source review, visual inspection and approved distribution continue. Never edit the executing shell runner. Four opening repairs currently have a candidate-producing script at `.workflow-state/social-refill-2026-10-12/repair-openings.py`. It preserves audio and duration, backs up originals and leaves promotion pending visual inspection.

A repaired candidate proceeds through exact-frame visual approval, release/caption/rights checks, changed-only derivative preparation, exact-slug hosting and hosted-byte verification. Immediately after enough media is ready, run the shared Buffer owner with future-day scheduling and a batch up to nine; do not wait for another day merely because the nightly refill already ran. Respect its existing locks, API budget, cooldown, capacity, three-per-day cadence and duplicate controls. After the live readback, refresh the worklist and current owner checkpoint. Scheduled is not sent.

The evening owner performs this handoff before the 22:00 refill. Report slugs moved between stages, evidence, current channel deficits, the next concrete action and any exact blocker. A status-only pass with actionable safe work is incomplete. No additional recurring AI runs are added.

### October 14 recovery corrections

Refresh the independent YouTube source inventory whenever Instagram runs before YouTube, including an X-first priority order. Channel capacity remains independent. This lets newly hosted reviewed inventory reach Instagram during the same refill without a second scheduled pass.

The local publisher must treat every unreviewed draft as model work even when old HTML, hero and catalog files exist. If the live renderer owns heavy compute, preserve pending input and defer generation. Reviewed deployment recovery may proceed without inference. Preserve durable speech chunks and reuse them after a timeout; never silently change approved voice quality or narration to force completion.

Release and platform preparation both enforce the 100–135 second distribution range. Caption sample gaps may be genuine pauses: investigate the word timings and narration audio, record exact evidence, and require owner review instead of automatically approving or shifting timestamps.

The local text helper rechecks the renderer lock immediately before each inference attempt and exits with temporary status 75 when compute is owned. This covers a renderer starting after the publisher's initial readiness probe. A currently running inference is allowed to finish; its saved draft and checkpoints are preserved.
