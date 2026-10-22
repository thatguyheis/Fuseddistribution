> **Source of truth:** `docs/SOURCE-OF-TRUTH.md` (2026-10-22) wins over this file wherever they disagree. Current scope is coin history only, 3 blog and reel pairs per day.

## Current blog incident priority, October8

> Current schedule authority: `docs/BATCH-PRODUCTION-SOP.md` (October 5 onward). Historical times below are superseded: the owner runs 08:30/21:30, local Buffer refill runs 22:00 Pacific, and weekly review runs Friday 22:30. The current queue target is nine per channel with one reserve slot, superseding the historical October 4 ten-slot note. Do not re-enable the retired hourly or five-pass jobs.


Read the `priorityAction` and `overdueProduction` fields from `node scripts/publishing-owner-brief.mjs` first. Complete the oldest missing article through live verification before optional metrics or older reel repairs when social posts remain queued. A healthy Buffer queue is not a healthy blog pipeline. Follow the missing blog incident rules in `docs/BATCH-PRODUCTION-SOP.md`. The writer now checks real inference and permits one owned restart; an HTTP model listing is not proof of usable generation. If a repaired model still produces deficient sections, finish editorial repair from verified sources instead of repeating the same generation. Preserve partial candidates and actual publication dates.

## Current October5 batch standard

Current companion-video backfill and live verification: [Blog video reconciliation](BLOG-VIDEO-RECONCILIATION-SOP.md). Growth priorities and the measured pilot: [October 5 growth audit](GROWTH-AUDIT-2026-10-05.md).

Follow `docs/BATCH-PRODUCTION-SOP.md` for current schedules. AI ownership is08:30 and21:30 daily plus Friday22:30 review; separate08:00 oversight is paused. Local research batches run Monday/Thursday23:00; Buffer refills once daily22:00. Preserve daily publishing and all release gates. Older schedule sections below are historical and do not authorize extra runs.

## October4 recovery and capacity correction

Nick explicitly requests ten queued videos per channel. `BUFFER_CHANNEL_QUEUE_TARGET=10`, reserve0 supersedes nine-slot instructions below. Do not exceed ten or weaken live capacity, duplicates, media or request-budget checks. Recovery can use `BUFFER_RECOVERY_BATCH=10 BUFFER_ALLOW_FUTURE_DAYS=1`, with a short daily posting window to spread ten posts across future dates. Routine batch size remains three.

An absent publisher lock is available for atomic acquisition, never an indeterminate existing lock. If no lock exists, create it and do the work. An old checkpoint claiming a PID is not evidence of a live process. The interrupted October1 recovery handoff was stopped before source migration; its stale state does not own compute. Current resumption is `com.nick.reel-queue-recovery.20261004verified`, state `.workflow-state/reel-queue-recovery-oct4-resume/status.json`. Preserve its actual active source only. The12 newly published October2–4 sources already have a waiting continuation: `com.nick.reel-new-posts-continuation.20261004`, state `.workflow-state/recovery-2026-10-04/new-reels-continuation.json`. Do not launch another producer for those sources.

The October1 Buffer edit placed an import before the executable shebang. It blocked every later run before API access. Repaired October4; `tests/publishing-entrypoints.test.mjs` now parses production entry points. Run those checks before handing scheduled code changes to unattended jobs. Follow `docs/ENGAGEMENT-SOP.md` for all new engagement rules and report missing evidence honestly.

## Historical October 1 recovery execution and handoff (superseded by October4)

Read `.workflow-state/recovery-2026-10-01/status.md` and `.workflow-state/reel-queue-recovery-oct1-approved-queues/status.json` first. All twelve September29 through October1 articles are published with exact live proof. Do not recreate these articles. Their twelve companions are handed to one explicit local job, `com.nick.reel-queue-recovery.20261001`. Preserve its active slug and production locks; inspect its results during normal owner passes and complete encoded visual review, platform derivatives, hosting and scheduling. A render pass is not social delivery.

For several completed dated queues, `scripts/recover-approved-reel-queues.py --batch-id=<unique-id> <dates>` uses those exact slugs, oldest date first, rather than waking a newest-first global snapshot. Launch only once through `scripts/launch-once.py`, inspect any existing owner first, and keep at most12 items, one attempt each,18-hour deadline, existing TTS circuit and all release gates. Do not add recurring jobs or LLM polling. Validate narration duration before handing off, including after editorial recovery. Local QA alone does not establish enough speech.

## October 1 missed-production recovery correction

The 23:00 research run prepares tomorrow; daytime research recovery targets today. An unfinished current-day plan must not consume tomorrow's preparation slot. Briefs, failed candidates and queue use the same Pacific operating date. Repeated local draft length, structure or topic failures require substantive owner repair, not unchanged model retries or relaxed QA.

A renderer owns compute and the exact source package it is rendering, not all independent editorial work. Verify PIDs. A missing lock directory is not an indeterminate existing lock. While rendering, complete source review, article repair, companion text and lightweight SVG hero preparation in staging without starting another local model. Before public mutation acquire the publisher lock and verify the exact target is not an active render input. Preserve every approval and deployment gate.

Every actionable owner pass must advance a named artifact and record its before/after stage, or identify a precise external blocker and attempted resolution. Repeatedly rereading the same draft and deferring to an unrelated renderer is a failed recovery pass. Complete four planned articles across the five existing daily passes, oldest missing date first; record any remaining daily deficit explicitly. Report published articles, rendered reels, accepted schedules and confirmed sends separately. Do not equate scheduling with delivery or promise recovery without live proof.

## Required enriched heroes, October 1, 2026

Follow `docs/EDITORIAL-HERO-SOP.md` (FD-HERO-GRAPHIC-V2) for every new or newly redesigned hero. Require a topic-specific illustration, explanatory diagram or sourced chart plus a concise truthful hook and relevant key words. Reject title-only art and generic three/four text-card grids. Generic builder output is a draft, not release-ready artwork. Record actual export/phone preview review, chart evidence where applicable, reviewer and final hero hash before editorial approval. Carry the same approved artwork into the reel opening and verify its encoded first frame. This supersedes the old connected-card preference.

## Narration model decision, September 30, 2026

Nick approved Chatterbox Nano after the standard/Nano listening comparison. Use the pinned `video/tts-runtime.json` settings and the narration quality profile in `docs/AUDIO-SOURCE-SOP.md`. Preserve WAV masters and use the explicit high-quality AAC encoding path for new narration. Do not regenerate approved existing reels solely for this configuration update.

## Buffer capacity correction, September 29, 2026

Buffer Free allows 10 queued posts per connected channel, with slots reusable after publishing. Our operating ceiling is nine scheduled/sending posts per channel, leaving one spare on each: YouTube nine, Instagram nine, X nine, or 27 total. This is queue capacity, not a daily publishing quota. Retain the existing posting cadence, quality gates, duplicate checks, shared publisher lock and API request budgets. Fill in bounded batches of at most three per channel per maintenance pass; do not add calls or increase frequency just to fill every slot.

Count live `scheduled` and `sending` posts separately by `channelId`. Pass only the destination channel count as `--current-scheduled`, with `--limit=10 --reserve-slots=1 --platform-count=1`. Never divide slots between channels or block an available channel because another is full. Sent posts count toward daily delivery, but do not occupy queue slots. The executor independently enforces the nine-post operating ceiling for the destination channel.

Verified sources: [Buffer pricing](https://buffer.com/pricing) and [Buffer scheduling limits](https://support.buffer.com/en-us/articles/how-many-posts-can-i-schedule-in-advance-Kmy2IEecqm). This correction supersedes older shared-capacity instructions.

September29 cover requirement: follow `docs/REEL-OPENING-SOP.md`. The approved hero must be visible at frame zero and earn attention with a clear focal subject, concise truthful hook, strong contrast and readable type at actual phone size. Review the encoded opening before scheduling; reject tiny text, cropped titles, blank animation frames or unrelated imagery. Reapprove changed hero artwork before regenerating its reel.

## Required hero opening

New reels must show the approved article hero from frame zero. Use the normal renderer, which stages and verifies that image automatically. Preserve the first second as the complete hero before the transition to the animated reel. See [opening image policy](REEL-OPENING-SOP.md).

## September 29 narration repair

The narration hold was cleared after a55.4 second real Nano synthesis test and a zero word error transcript comparison. Use the pinned free local runtime in `video/tts-runtime.json`. Preserve existing valid audio. Respect the active render lock; do not launch the old bulk recovery helpers. See [repair evidence](NARRATION-REPAIR-2026-09-29.md) and the publishing owner checkpoint for the current render/release result.

September29 implemented upgrades: read `docs/SOP-UPGRADES-2026-09-29.md` for current controls.64 new topic seeds are installed and today's four-topic plan is reserved. Missing-input retries now block until input changes; do not restore the disabled retry plist. Chatterbox is explicitly held after a real300.8 second preflight failure; no automatic restart of old bulk jobs. Preserve audio checkpoints. Render repairs must never write approved Markdown. Buffer now protects12 requests from history/metrics and prioritizes deficits;9 jobs were confirmed scheduled for today. Complete today's articles from the saved plan through existing gates, not by choosing new topics.

September28 afternoon queue update: read `.workflow-state/queue-review-2026-09-28/status.md` first. Buffer refill hit the shared request budget; next eligible normal run19:00 Pacific. Preserve confirmed jobs, do not retry before18:42:04. Three repaired reels have release proof and hosted derivatives. The old remainingSlugs visual-review summary has been reconciled with later exact proof; do not revive that stale alert. Four new narration timeouts remain separate owner work.

September28 offline recovery: read `.workflow-state/offline-recovery-2026-09-28/status.md` and the compact current checkpoint first. The old September25 handoff and September26 retry reload helpers were stopped after repeated launches. Never restart them or use `launchctl submit`. `scripts/launch-once.py` creates explicit RunAtLoad, KeepAlive false jobs. A superseded retry must exit without touching its replacement. Eleven regression tests cover recovery accounting, one-shot configuration, obsolete retry exit, writer idempotency and Instagram audio revocations.

The local render owner is `com.nick.offline-render-recovery.20260928` (two new companions and three visual repairs). `com.nick.offline-reel-continuation.20260928` waits up to six hours, then handles the ten remaining reviewed companions sequentially, one bounded attempt each. Read their `render-progress.json` files under the recovery folder. Preserve active owners and cached narration. A timeout requires a new owner decision, never an automatic restart loop. Do not edit their running scripts. Review finished slugs independently where safe, without touching the renderer's active slug. Actual frames, decode, rights, captions, derivatives and hosted bytes remain required before distribution. One existing model probe succeeded after a runtime restart, but the full saved-plan writer failed quality; do not describe the writer as healthy or rerun failed inference blindly.

September 24 readiness: all four queued recovery articles are published with saved live proof and intact editorial artifact hashes. Preserve them. The 09:00 publisher remains responsible for verification/recovery, the 09:30 owner checks changed evidence, and the existing 11:00 sequential renderer owns their four companion reels. Actual media and distribution gates remain outstanding. Do not regenerate completed articles or launch a duplicate renderer. Preparation evidence: `.workflow-state/morning-2026-09-24/sop-readiness.json`.

Local advisory update: read `docs/LOCAL-ADVISORY-SOP.md` when semantic grouping or a compact summary is needed. The Granite helper now supports 1-4 sequential advisory jobs, a 30-second residency window with final unload, strict output validation, and a 24-hour cache keyed by input, model digest, prompt and SOP contents. Use deterministic checks first; no model call for unchanged known findings. Run before taking a public-tree lock. Advisory outputs cannot grant publication, rights or editorial approval. Keep current Gemma writer and existing release gates.

Local reporting update: read the compact local audit included in `publishing-owner-brief.mjs`; inspect details only when needed. Daily 22:20 launchd owns deterministic reports. Friday 22:30 Luna owns SOP interpretation. The 21:30 publishing pass owns due metrics collection within current budget/cooldown. Other publishing and approval responsibilities remain as below.

September 23 active controls: begin with `node scripts/publishing-owner-brief.mjs`. Daily 08:00 oversight uses GPT-6 Luna low; the five existing daily publishing passes use GPT-6 Luna medium; Friday 22:30 SOP interpretation uses GPT-6 Luna low; daily deterministic reports run locally at 22:20. No hourly oversight. See `docs/TOKEN-BUDGET-SOP.md` for bounded reads and escalation. Free music only. Exact approved track files and current revocations are in `video/data/audio-rights.json`; local approval is not a YouTube claim check. Do not republish any revoked old mix. The reported YouTube claim was fixed by Nick in Studio; do not upload its separate correction again.

# Publishing owner quickstart

Current scheduled Codex model default (October15,2026): GPT-6 Luna (`gpt-6-luna`) for all owner and SOP automation runs. Use low reasoning for oversight and evidence triage and medium for coordinated production or repairs. Local deterministic checks and local Gemma/Ollama generation remain on-device. Apply this current rule over historical model references below; preserve each task's current schedule and status.

Fused scope is blog and reel production, distribution and related performance/SOP work. Book Factory automation is paused and excluded from owner passes; do not start or add Book Factory runs as part of this workflow.

Read `.workflow-state/publishing-owner-current.json` first. It contains current slugs, owners and proof. Older incident history is preserved in `.workflow-state/september16-editorial-repair/quickstart-before-compaction.md`; open only the relevant part when needed. Do not load all logs, historical health dates, or old task history each run.

## Complete daily work

1. Read today's and overdue `public/blog/research/YYYY-MM-DD-queue.json` and corresponding `YYYY-MM-DD-complete.json`. An absent queue is different from zero uncovered queued topics. Compare completion with actual live proof, not just local catalog registration. Use Pacific dates; today's production is due at09:00.
2. When publisher is idle, finish the oldest unapproved daily article before optional backlog work. Editorial repair is the owner's job: do not stop at “no approved article available.” Reuse the draft, correct its actual content, verify primary sources for external claims, complete companions, and inspect actual hero exports. No unsupported ranking promises, invented customers/locations, or unrelated template narration.
3. Run production parser and local QA. Record `codex-editorial` review with date, notes and exact artifact hashes. `scripts/deploy-approved-blog.mjs --slug=...` enforces this evidence. Local QA alone is not editorial approval. Deploy only the scoped package against `.workflow-state/deployment-baseline`; never deploy the shared dirty public tree.
4. Verify live main content, hero bytes, catalog entry/date/order and sitemap. Record proof, then completion. Recovery uses the actual publication date; preserve dates for previously published pages. Never fabricate historical queue dates or backdate new articles.

## Ownership and releases

Use `/tmp/fused-blog-publisher.lock` for public-tree work. Check `scripts/lock-owner-alive.py`; live or indeterminate owners must not be duplicated. Preserve stale locks by renaming only when the PID is proven dead. Rendering owns `/tmp/fused-reel-scheduler.lock` and `/tmp/fused-remotion-render.lock`. Do not edit a running shell script or restart active work merely to gain a slot.

Launchd owns research, publishing, sequential rendering and Buffer. The Luna owner runs09:30/12:30/15:30/18:30/21:30; oversight runs08:00 daily. Routine passes finish one missing daily article, then up to four ready reel releases. If idle, resume the existing bounded renderer; `REEL_SLUG` targets one reviewed registered reel. Reuse cached audio. `REEL_GIT_COMMIT=0`. No deletion, Git commits or pushes.

Before TTS, inspect every narration segment for topic/source accuracy. Run the production parser and narration-duration preflight. Planned timings cannot replace actual speech. The preflight estimate must be at least95seconds; actual release remains at least100seconds and platform delivery at most135seconds. Shorten long on-screen labels without changing useful narration. Never repair short speech with silence or irrelevant paragraphs.

Release requires full decode, actual beginning/middle/end frame inspection, duration and documented caption coverage. Automated caption coverage is not manual listening/alignment. Prepare both platform derivatives, upload exact media to the existing service, and verify HTTP200 plus exact bytes. An MP4 existing is not release or publication. Standalone uploader reads the configured Cloudflare token from `video/.env` without printing it.

For a decoder failure, use the tested `recover-media-timeout.mjs` only with a fresh exact same-slug Html5Video timeout and existing matching local JPEG/manifest. One fallback per reel; preserve failure evidence, source media and unchanged audio. No fallback for unrelated, stale, audio, rights or caption failures. Approved article HTML social-panel changes are staged separately so they cannot invalidate editorial hashes.

## Buffer and token controls

Buffer's existing owner alone schedules at13:00/16:01/19:00/22:00Pacific. One initial full reconciliation, then capacity-only checks. Count every HTTP request. Preserve confirmed jobs on partial failure and respect exact retryAt and local budgets:80/15minutes,90/24hours,2700/30days. Do not add API polling. Use saved per-row sentAt and status for delivery; scheduled/sending is not sent. Top-level file timestamps can be stale.

Use Luna for routine work, deterministic scripts for checks, and no extra agent for serial tasks. Read account usage at most once per Pacific day and reuse the sample. A changed reset timestamp starts a new baseline. Do not redeem a reset unless requested. Keep checkpoint concise and archive history rather than copying it into every prompt. A seven-day target needs an average below one seventh of the weekly allowance per day, with reserve; this is a planning target, not a quota guarantee.

Update SOP only for verified process findings. ADA records owner preference for the native topic diagram hero; this is not measured audience lift. Promote performance winners only with the established comparable-sample evidence. Notify meaningful completion, new failure or required user action; otherwise stay quiet.

Approval-review blocks must retain the exact action, reason and payload manifest. Do not convert an automatic rejection into a claim that the user never authorized publishing generally. September21 update: the four September16 reels were uploaded under renewed user catch-up authorization, with exact hosted-byte proof in `.workflow-state/catchup-2026-09-21/hosted-proof.json`. Their earlier transfer blocker is resolved; do not re-request approval or repeat uploads. Preserve completed work, do not rerender, and do not retry the rejected transfer without approval or a materially safer approved alternative. Unrelated daily article work continues normally.

September18 reconciliation: a blocked deployment attempt does not prove the article remains unpublished. Compare public content with the hash-validated deployment baseline before retrying. The designer-preparation article was live while its local copy had been overwritten. Local files were restored from the reviewed baseline. `build-post.sh` now refuses model regeneration when either local or baseline QA records Codex editorial approval, including `--force`; perform a scoped owner revision instead. Proof and seven-day results: `.workflow-state/seven-day-review-2026-09-18.json`. Check a reel's narration against the restored approved script before trusting release evidence from the overwritten package.

September21 deployment recovery: the scoped blog deployment script now loads only CLOUDFLARE_API_TOKEN from the existing video/.env when absent from its process environment, matching the media uploader. Do not report missing credentials solely because a scheduled process did not export them. The shipping article was deployed successfully through this existing credential source; token contents must never be printed.

September21 recovery clarification: Nick explicitly authorized owning creation and publishing catch-up. When an actual failed topic has a saved research brief but no completed draft, write and source-check an original recovery draft under that authorization. Preserve the brief and failure evidence, label the new draft honestly and use its actual publication date. Do not invent a missing-draft permission blocker or regenerate an already approved article.

Ownership verification: sandboxed process inspection can fail or hide processes. Do not infer idle or retire a lock from missing sandbox output. Confirm with permitted unrestricted ps and the lock PID; on September22 scheduler51599/render66513 were live despite an idle checkpoint.


September25 prevention controls: the writer records `YYYY-MM-DD-plan.json` before inference, independently from the approved-input queue. A missing queue, missing planned slug, or partial completion after09:00 is actionable. A failed daily plan goes to editorial recovery; do not rotate to different topics or reload full histories. Failed sections and one revision are preserved. Unexpected headings trigger one bounded section retry without relaxing QA. The publisher self-retry now uses an independent launchd reload job and must log loaded-state confirmation. X and YouTube planners both exclude revoked source audio before selection.

After late article recovery, if the whole daily queue has passed editorial review and the 11:00 renderer already took its input snapshot, request one bounded local handoff through `scripts/defer-render-catchup.py YYYY-MM-DD`, started with `scripts/launch-once.py` using a unique date label. Inspect an existing same-date handoff first; do not duplicate it. The helper waits up to six hours without model calls and wakes the existing renderer once. A handoff request is not a completed render or release. Continue media checks in the normal owner passes. Source diagrams now belong in `meta.json.contentGraphic` and are emitted by `build-html.mjs`; do not patch generated HTML after building.
