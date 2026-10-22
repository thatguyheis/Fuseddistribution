# Publishing incident: September 7, 2026

## Evidence and causes

- Live `blog/posts.json` began with July 22 articles above September 5 articles. Ten chronological inversions were present locally. `add-to-posts.mjs` prepended recovered articles without sorting, and the browser trusted that order.
- September 4, 5, 6 and 7 queues repeated published slugs. Partial nightly failures preserved the rotation window and the producer did not exclude registered topics. The daily runner forced older registered articles through full rebuilds with a new date.
- September 6 logs show three 1,800 second attempts on `contact-page-best-practices-for-local-business`, then quarantine. The catalog still referenced it. The same happened to `buying-silver-from-a-local-coin-shop-vs-online`. Completion counted registration rather than artifact existence or new output.
- The watchdog defaulted to today's date, ignored older pending dates, and considered absence of pending files healthy even after failed artifacts had been quarantined. Quality-block recovery reset attempt counts on every launch.
- The reel scheduler skipped a lock owned by exited PID 67532. It checked directory existence before the renderer's own stale-lock recovery could run. September 6 renders also exceeded the 2,100 second budget.
- Buffer logs show HTTP 429 with the 250-request daily window exhausted. The hourly Codex owner duplicated scheduled runner queries. The shared cooldown was respected only by the shell runner, not direct API CLI calls. Latest observed retry time: September 8 at 00:08:11 Pacific. This is an external recovery deadline, not proof that delivery resumed.

## Repairs

- Sort catalog writes by validated ISO date, with stable ties. The browser also sorts before displaying cards. Do not rewrite original publication dates during recovery.
- Skip registered slugs when choosing new nightly topics. A repeated registered slug is an existing publication checkpoint, never authority to overwrite it. Missing registered artifacts require restoration and owner review.
- Count actual nonempty required artifacts before completion, retain explicit blocked state, and flag duplicate-only dates as missing fresh output. Exhausted quality blocks require owner repair; never reset attempts automatically.
- `node scripts/publishing-health.mjs --write` records artifact gaps, chronology and daily freshness in `.workflow-state/publishing-health.json`. It exits nonzero when unresolved. This is a local audit; live article identity, sitemap and sent social outcomes still require external verification.
- Scheduler locks are preserved under a timestamped stale name only when their PID is proven absent. Live, permission-denied and indeterminate owners block a second worker.
- All Buffer CLI GraphQL calls honor the same cooldown. HTTP 429 writes that checkpoint immediately. Shorter later cooldowns cannot shorten the existing deadline. Buffer maintenance uses the deterministic runner once per eligible pass, with no independent API probes.
- Existing 30-minute recovery watch now follows this task and maintains the SOP after verified repairs. It reports meaningful changes only. Daily publishing and Buffer ownership remain separate.

## Operating procedure

1. Check processes, dated heartbeats and pending markers before launching work. Never start a second blog producer or renderer.
2. Run the publishing health audit. Treat completion files as claims to reconcile, not success evidence. Check missing queue dates, daily fresh output, actual article files, and catalog order.
3. Restore damaged registered artifacts from preserved, reviewed versions. Keep failed candidates outside the public tree. Do not alter dates or publish failed content to make a counter green.
4. Use the nightly producer for new topics, then the dated daily runner for build, deterministic QA and editorial QA. Repeated or exhausted failures go to an owner repair checkpoint without starving new dates.
5. Deploy only the reviewed scope. This checkout contains extensive unrelated edits, so an unrestricted deployment or Git push is unsafe. Verify canonical article identity, exact catalog membership/order and sitemap after deployment.
6. Run the reel scheduler sequentially with Chatterbox and approved audio. A successful MP4 file is not release approval. Require truthful visual/caption checks and `readyForPosting=true` before distribution.
7. Read `.buffer-live-unavailable.json` before any external Buffer call. Before `retryAt`, do no probes, metrics calls, or scheduling. After it expires, use `scripts/buffer-backlog-runner.sh` once and reconcile authoritative results. Scheduled is not sent.
8. Record new failure evidence, root cause, focused repair, regression results and rollback in this document and the affected SOP. Escalate factual/editorial blocks; never weaken a gate.

## Verification and rollback

Regression suite: `node --test tests/publishing-recovery.test.mjs tests/gemma-nightly-resilience.test.mjs tests/build-post-preflight.test.mjs tests/buffer-publish-preflight.test.mjs tests/buffer-log-reconciliation.test.mjs` (15 passed during repair). Shell syntax checks passed for the daily, nightly, watchdog and reel scheduler scripts. Direct Buffer status replay stopped locally at the shared cooldown without an API call.

Original edited scripts are preserved in `/tmp/fused-sept7-before/`. Missing committed artifacts were restored without overwriting files still present. Their existing QA records are historical evidence, not a new editorial approval. A live-preserving deployment snapshot is prepared in `/tmp/fused-sept7-deploy/`; readback manifest: `/tmp/fused-sept7-deploy-readback.json`.

Rollback only the scoped repair diff or the recorded Cloudflare deployment version. Preserve unrelated work and incident checkpoints. Restoring the old runner revives the duplicate-topic and false-completion defects, so keep affected producers stopped until a replacement repair passes validation.

## Recovery observations

- Chronology deployment `fa0788c2-7d82-4a05-b315-1d49b594f294` verified 280 articles in descending date order and 372 sitemap URLs. Live-response snapshots included per-request HTML injection; a follow-up cleanup retains the unchanged Worker, which generates consent UI and CSP nonces per request. All 14 Worker tests passed before that cleanup.
- Recovery execution exposed a shell failure-propagation bug: `process_topic` runs inside an `if`, which disables implicit `set -e` exits within the function. Research and word-count checks now use explicit `|| return 1`. Section prompts were increased from 320 to 520 tokens and target six distinct sections, keeping the existing 1,100-word gate. The corrected replay rejected a malformed research brief while continuing independent topics.
- The reel timeout is now 5,400 seconds. September 6 evidence showed a valid render only around 70 percent complete at the old 2,100-second deadline. This remains bounded and does not waive release QA. Monitor actual duration and memory contention before changing concurrency; it stays one renderer.
- Previous July retry markers and today's repeated-topic queue are preserved in `.workflow-state/incident-2026-09-07/`. They are owner recovery work, not discarded completed output. September 4 and 6 false completion claims were annotated as invalidated.

- Final deployed repair version: `c007ed43-011f-4b97-93d2-cbe8300cec89`. Live readback verified a single consent dialog, no dialog after declined consent, matching per-request script/CSP nonces, chronological catalog order and browser sorting. The temporary cleanup rejection was resolved with unchanged-Worker evidence and passing tests.
- Persistent reviewed deployment baseline: `.workflow-state/deployment-baseline/`. `scripts/deploy-approved-blog.mjs --slug=<slug>` reruns deterministic QA, requires passed editorial QA and registration, preserves existing dates, copies only that approved article into the baseline, and rebuilds the baseline catalog/sitemap. Scheduled blog deploys use this helper instead of uploading unrelated working-tree edits. Missing baseline is a hard operational block, not permission to fall back to the dirty checkout. Dry-run compilation passed.
- Blog source commits now require `BLOG_GIT_COMMIT=1`; absent that explicit setting, no Git commit or push occurs. Website publishing remains enabled through the scoped helper. Source delivery still requires user authorization and reviewed scope.
- The repaired nightly replay produced two valid draft handoffs: `canadian-silver-maple-leaf-investment-guide` and `customer-testimonial-video-how-to-film-and-use`. Two other topics were explicitly deferred for malformed research and insufficient article length. These are drafts, not published posts. The daily publisher was resumed for final writing, QA and scoped live deployment.

- Shared PID locks now prevent duplicate blog producers and duplicate Buffer runners. A missing/unknown PID is treated as busy, not permission to race a new process. Finished and stale locks are moved aside rather than deleted.
- Final focused regression suite: 16 passed. Worker suite: 14 passed. Scheduled reel plist syntax and all changed shell scripts passed syntax checks. The installed reel timeout was updated and the 11 AM launch agent reloaded successfully.

## Follow-up: 08:25 Pacific

PID 94370 remained active on the first September 7 article; no duplicate producer was started. The host reported 8 GB physical memory, about 8.8 GB swap in use, and a 5.66 GB loaded Gemma writer. The watchdog previously loaded its smaller probe model before checking for an active publisher. It now checks active publishing/rendering first and leaves runtime ownership to their bounded watchdogs. This avoids a second model load or runtime restart during production. No application processes were killed to free memory.

An additional gate inconsistency was found during follow-up: local-model editorial QA outages could fall back to a deterministic artifact pass and still register the post. That branch now explicitly defers publication. The scoped deploy helper rejects deterministic-only QA records and requires matching slug, passing editorial score and no blockers. Passing metadata/file checks is not editorial approval.

At 08:29:29 Pacific, the watchdog logged `BUSY: production task owns the runtime; skipping model probe and restart`, confirming the new guard. The earlier probe had timed out while the writer was active. Seven focused tests passed after the watchdog/editorial-gate follow-up. Publication remains unconfirmed while the first writer stage runs; the second draft remains queued. Buffer was not queried during cooldown.

## 09:00 recovery review

The first September 7 article reached deterministic QA but its 1,800-second whole-post watchdog interrupted editorial QA. The second article continued under the existing producer, without a duplicate job. Owner review then identified unsupported current-price, insurance-cost and Fused inventory claims plus inaccurate purity/security details in the first draft. The writer prompt had demanded three statistics even when no verified statistics were supplied. That contradiction was removed; charts and statistics are now conditional on actual supplied evidence.

The failed Maple Leaf article and all supporting artifacts were preserved in `.workflow-state/incident-2026-09-07/canadian-silver-maple-leaf-investment-guide-editorial-review/`. An explicit editorial hold blocked both rebuild and deployment; a dry-run confirmed the block. The owner rewrote the article using the Royal Canadian Mint's official 2026 specification, removed unsupported financial and business claims, rebuilt metadata, graphics, narration and social copy, and corrected truncated reel labels. Deterministic QA passed and the hero was visually inspected. Full owner editorial approval is recorded in `qa.json` with source URL, review notes and hashes for ten reviewed artifacts. The resolved hold was archived, not deleted. Scoped publication was started; live verification remains required. This is blog editorial approval, not reel release approval.

For future owner holds, preserve the failed candidate, correct source claims and every dependent asset, run deterministic QA, record full editorial review, then archive the hold. Never clear a hold merely because the model returns a passing score or a timer expires.

The corrected Maple Leaf article was confirmed live under deployment `2896058d-83ea-4188-b7c0-561ad949ecb2`. Canonical article content, corrected purity, September 7 date, first position in the 281-post sorted catalog, and the 373-URL sitemap were verified. The article URL is https://fuseddistribution.com/blog/canadian-silver-maple-leaf-investment-guide/.

The second writer reported an undersized structural failure. Review exposed that `WRITER_STAGE=...` overwrote Bash `PIPESTATUS` before the failure code was captured. Both local writer branches now capture the pipeline status immediately, so structural failures take their quality-block path instead of continuing as apparent success. Seven focused tests and shell syntax checks passed. The second article and reel delivery are not confirmed.

## 09:53 Pacific recovery update

Both September 7 articles are now live, with 282 catalog entries sorted newest first and 374 sitemap URLs. The testimonial article received owner editorial review, corrected metadata and graphics, and passed artifact QA. Deployment version: `81faa73e-e6c8-4b19-a4ca-47ffde4c167e`.

A scheduled retry overlapped the manual registration window. Its identified process tree was stopped and the reviewed artifact hashes restored from the deployed baseline. Future manual repairs must acquire the publisher lock before editing a queued post. Do not edit a running shell script in place: the earlier publisher reported an unmatched quote after an in-flight source edit, while the saved script passes `zsh -n`. Quiesce the relevant process before shell edits, then launch a fresh process.

The reel scheduler now defers while the blog publisher owns its lock, preserves finished lock records, avoids terminating unrelated browser processes, and commits only when `REEL_GIT_COMMIT=1` is explicitly authorized. Focused regression suite: 16 tests passed. Remaining work is rendered video QA, Buffer recovery after its recorded cooldown, and 25 historical supporting-artifact gaps.

## 10:27 Pacific monitoring correction

The testimonial renderer completed all 11 Chatterbox narration segments and advanced to Remotion frames (907 of 6,207 at inspection). PID 3280 still owns the render. No second renderer or model probe was started. Buffer cooldown remains active through September 8 at 00:08 Pacific, so no Buffer API request was made.

The health audit had two blind spots: dates with no queue file were invisible, and one fresh post could hide a partially recycled queue. It now reports missing queues for completed calendar days and flags fresh output below the queue count. Two behavioral regression fixtures cover these cases; the focused suite passes all 18 tests. The current audit confirms September 7 has two fresh posts out of two, no missing artifacts for that queue and no catalog order errors. Overall health remains false for historical failures and 25 older supporting-artifact gaps; none of those missing files exists in HEAD, so they were not fabricated as a restoration.

Rollback for this monitor correction: revert only the calendar and partial-count changes in `scripts/lib/publishing-health.mjs` and their two tests, preserving unrelated repairs. The baseline deployment and active renderer are unaffected.

## Workflow consolidation and ADA review

User authorized a complete unattended workflow review. Five overlapping Codex automations were paused, leaving one recurring publishing owner plus the 22:30 ADA review. Launchd retains nightly research, daily publication, sequential reels and four daily Buffer runs. Nightly now uses a repository-owned bounded runner with the publisher lock; daily publishing defers during rendering. Both inactive LaunchAgents were validated, backed up and reloaded.

Confirmed additional defects: analytics retried HTTP 429 immediately without saving the shared cooldown; Buffer maintenance repeated full status reads without mutations; ADA accepted recycled registrations as fresh completion; old release QA could survive a script change; and media preparation silently truncated 180–240 second masters at 135 seconds. Repairs add shared rolling request reservations (80/15 minutes, 90/day, 2700/30 days), analytics cooldown propagation, reuse of unchanged status, artifact/freshness gates, 110–130 second script estimates, and rejection of overlong complete masters before transcoding. Existing release gates remain intact.

The testimonial long master completed at 10:31 with all 11 narration segments and 206.955 seconds of media. It is preserved; it is not claimed as distributed. Two reviewed shorter scripts are now running sequentially in session 83249. The nightly renderer will continue remaining eligible work under its shared lock.

The ADA snapshot is August 26, not fresh. September 7 lifecycle reports no winners with zero matched experiment samples. One expired volume experiment was retired and thirteen reviews explicitly extended. No creative win or revenue effect was invented. Future render timing is now measured; Node peak RSS is labeled with its restricted scope.

Validation: 76 profit, 55 video, 10 recovery/budget/duration and four Python tests passed. Cooldown smoke tests for both API entry points made no external requests. Full operations, downstream handoff, known integration exceptions and rollback are documented in docs/AUTOMATED-PUBLISHING-OPERATIONS.md.

## 11:34 Pacific visual release repair

The shorter testimonial MP4 completed at 124.096 seconds after 1,211 measured wall seconds. Actual frames at 2, 60 and 121 seconds exposed two escapes: a silver pilot asset used on a business topic and a bottom-third blank region. The generic storyboard reused pilot imagery without matching article identity; the scaled layout wrapper lacked positioning and shrink protection, while embedded collage applied a second scale.

The production storyboard now uses the article's reviewed hero asset and actual segment text, with version and script-hash cache checks. The canvas wrapper is positioned and cannot shrink; embedded collage scales only once. Artwork uses contain sizing so text is not cropped. Corrected hook and body stills were actually inspected and fill the portrait frame. A persistent visual-review.json failure now blocks release even if automated caption coverage passes. The current failed testimonial MP4 and its metadata are preserved under visual-review-before. The earlier 206-second master had already been replaced by the normal renderer; earlier wording that it remained preserved was inaccurate. Its long scripts remain preserved.

The Maple Leaf process tree was stopped before encoding with its already-loaded old storyboard module. Completed narration caches were retained. Both short scripts are marked for rerender with the validated visual fixes. Keep the testimonial hold until actual new MP4 frames are inspected; do not clear it from preview evidence alone.

Validation: 55 video tests pass, including topic-specific asset/message assertions. Application TypeScript passes with --skipLibCheck; full checking reports existing WebCodecs duplicate declarations and Remotion Timer declaration errors. No dependencies were changed to hide them. No Buffer calls were made.

Rollback: restore only the scoped composition/storyboard changes if necessary, keep affected media blocked, and preserve failed frames plus MP4. Do not restore a release pass or pilot-asset fallback as an incidental rollback.

## 11:52 Pacific: complete historical audit and two more publications

The user directed Codex to identify every missing date without further input. All 282 previously registered URLs were checked live with matching canonical identities. Across queue history beginning June 9, 41 distinct topics had never been registered. Two are now repaired: Austrian Silver Philharmonic and Yelp for Business, both actually published September 7. Current live catalog has 284 posts, correctly sorted; sitemap has 376 URLs. Exact main content, title, canonical identity and catalog date verified against production version `7aa02c86-7247-4b6d-87be-04ec5c371923`. Evidence: `.workflow-state/recovered-blog-publications-2026-09-07.json`.

The owner health audit previously defaulted to September 3, hiding older failures. It now defaults to the earliest recorded queue and exposes deduplicated unpublished topics with all original dates. A regression test checks June failures remain visible during a September audit. Eight focused recovery tests pass. The full audit intentionally remains unhealthy: 39 topics remain unpublished, June 10 lacks a queue, and 25 legacy posts lack companion files. Historical missed cadence remains recorded rather than backdating replacement content. The preserved candidate and next topic worklist is `.workflow-state/missing-blog-recovery.json`; the next oldest topic is the Britannia versus Eagle comparison.

## 12:30 Pacific owner recovery: Britannia versus Eagle

Published the oldest outstanding June 19 topic, `britannias-vs-eagles-which-silver-coin-is-best`, with its actual September 7 publication date. Replaced the rejected generic draft with a 1,275-word comparison checked against current Royal Mint and U.S. Mint specifications. Reviewed metadata, social copy, hero and square artwork, and synchronized a 121-second estimated reel script and data. Deterministic QA passes; editorial review recorded with artifact hashes. Exact live main content, title, canonical identity, date, sorted catalog and sitemap verified against production version `9f06fd44-e181-437e-8ff4-3bac61843028`. Live catalog now 285 posts; 38 historical topics remain unpublished. Next: `silver-supply-deficit-explained-2026`.

The earlier sequential renderer is finished. Maple Leaf has automated release QA, while testimonial remains on the existing visual hold. Neither is claimed sent; audiovisual and downstream verification remain work. Buffer cooldown is still active, so this pass made no Buffer API calls. The publisher lock is released after this repair. SOP now explicitly requires synchronization of reel data and script after manual narration edits before editorial hashes are recorded.

## 13:00 Pacific owner recovery: deficit source review

Advanced the next oldest topic through complete primary-source review. Prior QA on the June 30 deficit explainer only flagged caption spelling, while the article also contains unsupported data and prescriptive investment rules. A related July 25 published article contains unsupported mine, production-cost and price claims. Preserved its entire directory, wrote failed editorial QA, and persisted an owner editorial hold to stop further rendering or scoped republication of that candidate. The served page is not yet corrected; this is not counted as a recovered publication. Detailed verified facts and required corrections are in `docs/SILVER-DEFICIT-RECOVERY-REVIEW-2026-09-07.md`.

No active writer or renderer lock was present at entry. The owner acquired the publisher lock for these changes. Buffer remains under the existing provider cooldown; no Buffer API request was made. SOP now requires reviewing the full candidate instead of assuming an earlier blocker list captured every defect. The recovery worklist remains 38 topics, with the next stage explicitly recorded as the source-backed deficit correction and live verification.

## 13:39 Pacific owner recovery: deficit correction live

Completed the source-backed correction at the existing deficit URL, retaining July 25 and adding a visible September 7 correction notice. Removed unsupported claims and retired the invalid mixed-unit chart with preserved evidence. Reviewed new article, metadata, social copy, artwork, and a complete 113-second estimated reel with synchronized data. Deterministic QA passes. Live main content, canonical title/date, catalog order and sitemap verified against version `6b44499a-2f16-489e-943d-7ddc4b30f14b`.

Added explicit reviewed canonical coverage records to publishing health so an equivalent corrected article can close an overlapping queued topic without creating a duplicate. Validation requires live proof fields, current HTML hash, editorial approval, artifact completeness and no active owner hold. A regression test confirms content drift reopens the topic and historical freshness remains false. Nine focused tests pass. The catalog remains 285 posts; pending topics decrease to 37. Next is `silver-storage-vault-vs-home-storage`. No Buffer API requests were made under the active cooldown. Publisher lock released after this pass.

## 14:16 Pacific owner recovery: storage comparison live

Recovered the July 4 missing vault versus home storage topic with a 1,305-word replacement. Removed unsupported insurance limits, universal protection claims and unverified Fused vault-service offer. Reviewed current CFTC cost guidance and U.S. Mint coin-care guidance, complete article, social copy, hero and square artwork, and synchronized 125-second estimated reel. Deterministic QA passes. Live main content, canonical title/date, catalog order and sitemap verified on version `ef4754fc-794f-4418-a9d2-3f7298e87fde`. The site now has 286 registered articles and 36 pending topics.

Found a reproducible narration defect: sentence splitting after the abbreviation U.S. discarded the short source fragment, leaving Mint without its identity. The generator now expands U.S. before splitting sentences; the owner repaired the current narration and data. Five Python tests pass including a source-identity regression. SOP updated. No active producer existed at entry; owner lock acquired and released. Buffer provider cooldown remains active and no Buffer API calls were made.

## 14:52 Pacific owner recovery: tax article and companions

Reviewed the pending July 10 tax draft and existing August 1 canonical article against IRS Topic 409, Publication 550, Publication 551, and Form 8949 guidance. The existing article provides the required coverage; the rejected draft incorrectly mixes ordinary stock gains treatment and fabricated brackets. Preserved the complete existing directory before repairing its malformed 183-second script and companion assets. Added federal-scope, NIIT and source-edition clarification plus a transaction worksheet section, retaining the original August 1 date. Reviewed complete 130-second estimated narration and synchronized data, metadata, social copy and both artwork formats. Deterministic QA passes.

Live main content, title, canonical identity, date, catalog order and sitemap verified against version `13898124-5a55-4cae-8094-ef0c3bc45214`. Canonical coverage recorded with content hash; the pending worklist is now 35 topics and catalog remains 286 articles. Repaired a generator defect that included a further-information bibliography as narration and statistical overlays. Six Python tests pass, including a bibliography-exclusion regression. SOP updated. No active producer was present; owner lock acquired and released. No Buffer calls under the existing cooldown. Rendered media is not claimed released or sent.

## 15:19 Pacific owner pass: history research and hosted reel recovery

Completed primary-source review for the July 13 Bretton Woods topic. Preserved rejected candidate remains unpublished: it invents a silver parity and bimetallic system, misidentifies a designer, and conflates domestic silver coinage with the international gold window. Source map and required replacement are recorded in `docs/BRETTON-WOODS-RECOVERY-REVIEW-2026-09-07.md`. Topic remains pending; 35 topics remain.

Advanced testimonial distribution repair. Actually inspected replacement MP4 frames at 2, 60 and 121 seconds; topic-correct imagery, filled portrait frame and closing question verified. Preserved prior visual hold and recorded new MP4 hash, sampled visual pass and evidence frames. Did not claim manual speech-caption alignment. Release QA passed with automated three-point caption coverage. Prepared exact-slug YouTube and X media, each preserving all 124.096 seconds at 720x1280 and 5,865,420 bytes. Uploaded both exact KV keys and verified both hosted URLs returned 200 video/mp4 with matching byte lengths. Existing Worker KV routes already serve these files; no unrelated deployment required.

No Buffer API request was made under the active provider cooldown. Media is ready for the sole Buffer scheduler after the cooldown, not claimed scheduled or sent. Evidence: `.workflow-state/testimonial-hosted-recovery-2026-09-07.json`. No writer or renderer was active at entry; publisher lock acquired for repairs and released at completion.

### 2026-09-07T23:00:28.746500+00:00 - Bretton Woods missing topic published

Recovered July 13 queued topic with a new source checked article. Live content, canonical, actual September 7 date, catalog order and sitemap all verified against production 2bc59f8f-c131-426c-91c4-98aeed468ff3. Catalog now 287; remaining unpublished topics 34. SOP adds monetary history checks to prevent invented silver parity and unsupported return claims. Artwork reviewed; reel script estimated 117 seconds, video release still pending. Buffer was not called during cooldown.

### 2026-09-07T23:34:44.159244+00:00 - Maple Leaf delivery preparation and ice-test review

Today has two fresh queued publications; no active writer or renderer at this pass. Inspected Maple Leaf MP4 frames at 2, 65 and 130 seconds; readable topic art, captions and closing question. Release check passes with automated caption coverage, not manual speech alignment. Prepared and uploaded exact YouTube/X copies: 132.352 seconds, 720x1280, 7,072,776 bytes each. Both hosted URLs returned HTTP 200 video/mp4 with matching sizes. Evidence: `.workflow-state/maple-hosted-recovery-2026-09-07.json`. No Buffer calls during cooldown; neither copy is claimed scheduled or sent.

Reviewed full oldest failed ice-test candidate and primary sources. The candidate confuses heat transfer with a fabricated price/premium method. Saved replacement brief in `docs/ICE-TEST-RECOVERY-REVIEW-2026-09-07.md`; topic remains pending, total 34. SOP now requires concept and mechanism validation before proceeding with companions.

### 2026-09-08T04:10:12.227279+00:00 - Ice-test article published and overlay defect fixed

Published the complete replacement for the July 17 missing topic. Actual September 7 date retained separately from missed cadence. Verified canonical live main content, title, catalog order and sitemap. Production 2253539f-f56f-4b51-ae2f-57f9fdfd15bc; 288 articles, 33 topics pending.

Generator keyword labels discarded negation, turning does not certify into DOES CERTIFY. Added conservative limitation label for first-sentence negation and regression cases; seven Python tests pass. Corrected this article's overlays, restored narration context and synchronized reel data. SOP updated. No Buffer calls and no rendered-video completion claim.

### 2026-09-08T04:42:53.824175+00:00 - Graded-silver source review completed

Reviewed the full next failed candidate and PCGS/NGC primary sources. Found incorrect Mint State wear descriptions, universal grade-price table, unsupported fee and value claims and fabricated Fused inventory. Saved complete replacement brief; 33 topics remain, none closed by source review alone. Today has two fresh queued publications. No live writer/render locks or matching production processes. Installed daily and renderer plists match source semantically. Buffer 19:00 Pacific log explicitly records no API call during cooldown. The Library renderer log is stale August 16 evidence; active script uses /tmp/fuseddistribution-render-missing-reels.log.

### 2026-09-08T05:14:55.184108+00:00 - Graded-silver replacement written

Completed new article, metadata, hooks and source record from primary-source review. Removed unsupported grade-price tables and corrected Mint State terminology. Explicit failed work-in-progress QA prevents publication/render until companions and editorial review are complete. Count remains 33. Buffer 22:00 Pacific run made no API call during cooldown. No other writer/render active at lock acquisition.

### 2026-09-08T05:48:18.692418+00:00 - Graded-silver topic published

Published reviewed replacement for July 19 queued topic, including coherent 120 second estimated narration and visually inspected artwork. Verified live content, canonical, actual September 7 date, catalog order and sitemap. Catalog 289; pending topics 32.

Found that raw checklist HTML is escaped by the Markdown renderer. Converted graded-silver and prior ice-test checklists to supported Markdown and verified both live pages have rendered list markup without escaped div tags. SOP documents this limitation and why a reel card satisfying the graphic gate is insufficient evidence of correct checklist rendering. Previous artifacts preserved. No Buffer API calls during cooldown.

### 2026-09-08T06:21:27.844942+00:00 - Nightly failure detected and selection repaired

23:00 research exited 1 at 23:04 after all four drafts failed word/section gates; September 8 queue is absent. Two selected topics already had verified canonical coverage. Fixed selector to reuse health-validated resolutions; syntax, nine recovery tests and actual selector fixture pass. Removed indiscriminate chrome/workerd kills from the inactive nightly script. No job was active during editing. Tomorrow queue repair is now highest priority in persisted owner state. Purity marks source review also completed; 32 topics remain.

### 2026-09-08T06:53:56.149673+00:00 - Next-day silver article replacement written

Overnight candidates were held in shell variables and discarded on failed validation, leaving only briefs. Fixed inactive nightly script to preserve each candidate before gates; bash syntax passes. Wrote new purity-marks article and checked decimal/gross-mass arithmetic. September 8 metadata is intentional; editorial QA remains failed pending companions. Tech replacement and queue still required, so no completion claim. Buffer cooldown remains active.

### 2026-09-08T07:27:40.175341+00:00 - Purity article live; Buffer scheduling recovered

Published and verified September 8 purity article, catalog order/canonical/date/sitemap. Catalog290; 31 historical topics remain. Tech article and daily queue still pending. Reviewed 116 second narration restores omitted comparison operand and speaks decimal fineness explicitly. SOP requires checking full numerical examples.

Invoked sole Buffer runner once after cooldown and idle-owner check. Seven scheduled jobs saved: testimonial and Maple Leaf on YouTube/X/Instagram at 13:00 and 13:20 Pacific, plus review-response reel on Instagram at13:40. Saved provider IDs/media URLs in `.workflow-state/buffer-recovery-scheduled-2026-09-08.json`. Scheduled is not sent; later runner must reconcile delivery.

### 2026-09-08T08:00:19.757296+00:00 - September 8 tech replacement written

Replaced failed review-response content with source-based workflow article. Removed unverified vendor/pricing table, unsupported ranking/response-rate claims and invented studies. Current Google API policies and reply guidance reviewed; distinguishes authorization, drafting, posting, exceptions, retention and delivery verification. Fictional examples labeled. Companions and editorial review pending; no publication or queue completion claimed.

### 2026-09-08T08:33:05.708268+00:00 - September 8 blog queue recovered

Published tech review-response replacement and reverified today's silver article against exact live main content, titles, canonicals, dates, catalog order and sitemap. Production fad858e2-5800-411a-b988-a323f4ab093d. Rebuilt missing September 8 queue with actual source artifacts and original historical queued dates; completion scope explicitly blog publication only. Catalog291; historical pending30. Artwork and 110 second tech narration reviewed. Rendered videos remain downstream work. No new Buffer calls.

### 2026-09-08T09:05:17.355623+00:00 - Fresh reel production started

Today's two blogs remain complete. Started sole renderer with one reel and one attempt, Chatterbox voice and existing approved music pipeline; disabled optional generative media for this recovery run. Current item is Google review-response tech article, voice generation in progress. Shared locks protect against concurrent writers. No completion or delivery claim. Spot-price failed draft/source review saved with potential live canonical correction; missing-topic count remains30.

### September 8 owner progress at 2026-09-08T09:11:56.530226+00:00

The owner monitor remains active every 30 minutes. Full queue health still reports 30 historical unpublished topics; September 8 is fresh=2/expected=2. The sole tech renderer is alive (scheduler 33305, renderer 33327, audio worker 33484), with two audio segments completed and no released MP4 yet. Prepared the 1,322-word spot-price canonical correction outside public, checked six-section structure and numerical examples, and added market quotation and dimensional arithmetic controls to the operating SOP. The canonical correction has not been deployed and the pending topic remains open. Also observed deterministic reel repair only trims script whitespace and reduces reel-data indentation, changing approved artifact hashes; compare semantic content and complete review before refreshing proof. No independent Buffer calls or second heavy job were started.

### September 8 tech reel release at 2026-09-08T09:59:30.771100+00:00

The single render completed at 02:26:49 Pacific: 120.789 seconds with complete closing question, no failed attempt. Owner viewed MP4 frames at 1, 35, 64, 96 and 118 seconds and recorded visual approval. Automated caption coverage passed; manual audiovisual alignment remains unclaimed. Both 720x1280 platform files preserve duration at 5,496,432 bytes, were uploaded to the exact media keys, and returned HTTP 200 video/mp4 with matching size. Evidence: `.workflow-state/ai-reviews-hosted-recovery-2026-09-08.json`. Buffer was not called; this reel is hosted, not yet scheduled or sent.

The exhausted render budget previously allowed parsing/repairing the next purity article before breaking. Moved the budget check ahead of these mutations after the scheduler exited; zsh syntax and source ordering checks pass. SOP updated. Production verification of this placement remains for the next bounded run. Historical pending count remains 30; next owner priority is the staged spot-price correction while the writer is idle.

### Spot-price canonical correction verified 2026-09-08T10:34:09.116442+00:00

Published corrected `silver-spot-price-explained-what-it-means` through scoped baseline version da2f22f7-1048-4a05-ab7f-0a76e8995c91, preserving June 28 publication date and adding September 8 correction notice. Preserved previous artifacts under `spot-price-before` in this incident directory. Replaced unsupported inventory, forecast and universal quote claims; fixed premium units. Reviewed artwork and synchronized reel companions with full illustrative inputs and 117-second estimate. Local QA and reel validation pass. Curl readback confirms exact main content, canonical/title, original date, newest-first catalog and sitemap. Python default HTTP client received 403; established curl client succeeded. Verified equivalence now resolves the July 20 missing spot-price topic; full audit reports 29 pending. No historical fresh publication fabricated. Corrected reel still needs rendering and release. Next missing topic is July 22 silver stacking. No Buffer calls, Git commits or pushes.

### Stacking canonical correction verified 2026-09-08T11:10:26.642122+00:00

Missing July 22 candidate invented rolling bars into cylinders and claimed freedom from market fluctuation. The overlapping portfolio guide also had unsupported allocation, price, inventory and timing claims plus incorrect break-even wording. Preserved previous canonical artifacts in `stacking-before`, replaced the guide with a 1,367-word sourced purchase process, reviewed artwork and eight-segment companions, and retained June 22 publication date with correction notice. Initial automatic reel candidate exceeded the duration gate (171 seconds) without writing a replacement; manually authored and synchronized a complete 116-second estimate. Local QA and parsed reel validation pass. Scoped deployment e195aae0-5c4f-439f-8dc4-38d2f59f870b verified exact live main, title/canonical, original date, catalog order and sitemap. Verified equivalent coverage closes July 22 topic; 28 unpublished topics remain. Corrected reel still needs render and release.

Adjacent `silver-investment-for-beginners-complete-guide` has separate unsupported advice, inventory and tax/IRA claims. Preserved old QA and applied failed local editorial QA so it is not newly selected for reels. Served page is unchanged; correction remains explicitly tracked in `.workflow-state/adjacent-live-editorial-recovery.json`. SOP now requires net-sale break-even arithmetic, evidence for allocation claims and review of actual companion files after generator failure. No Buffer API calls or Git operations.

### Solar source review and purity render started 2026-09-08T11:42:48.345732+00:00

Today remains fresh 2/expected 2; 28 unpublished topics remain. No production lock was active at start. Started one purity reel attempt under scheduler 37869 and renderer 37896, session 28513; currently Chatterbox audio stage. No Buffer calls, whose seven scheduled jobs remain not due. Full solar candidate and potential canonical review found factual errors beyond the metadata failure; saved primary source review and correction outline in `docs/SOLAR-DEMAND-RECOVERY-REVIEW-2026-09-08.md`. Updated SOP on PV units, adoption scope and forecast distinctions. Preserved other reel source hashes for checking that the fixed render-budget guard avoids modifying the next article. No solar publication or equivalent closure claimed.

### Purity visual rejection and repair 2026-09-08T12:34:31.188374+00:00

Original purity master finished at 05:01:50 Pacific, 119.253 seconds; budget guard stopped before next candidate mutations. Compared 574 other reel source hashes with the saved snapshot: no changes. Actual production evidence confirms the budget fix.

Owner inspected frames 1, 15, 44, 78 and 117 seconds. Rejected imagery: gold bars labeled FINE GOLD accompany silver mass calculation; unrelated ceramics accompany fineness explanation. Applied failed visual review, preserved master and all photos in `purity-visual-before`, and replaced body/question backgrounds with approved article-specific Fused artwork. Updated media provenance and marked script mtime stale without changing text. Started one bounded replacement session 47749, renderer 39662; all seven narration segments were cache-valid and reused. Release hold intentionally remains until new frames are inspected. No hosted media or Buffer scheduling of this rejected version. SOP now requires material identity checks. Historical backlog remains 28, solar correction pending.

### Purity portrait repair released and hosted 2026-09-08T13:14:06.361017+00:00

First visual replacement still cropped landscape artwork in portrait body scenes. Preserved that master/photos under `purity-cropped-artwork-before`. Created a native 720x1280 text-free brand SVG background, rendered it through the existing asset tool and replaced body/question photos. One bounded rerender reused all seven narration segments. Owner viewed final frames 15, 44, 78 and 117 seconds: readable labels/captions, no wrong-material images or cropped background text, complete closing question. Cleared visual hold only after this inspection and reran release successfully. Automated caption coverage passed; manual speech alignment remains unclaimed.

Both platform copies retain 119.253 seconds at 3,786,456 bytes. Exact KV uploads succeeded and both hosted URLs returned HTTP 200 video/mp4 with matching size. Evidence: `.workflow-state/purity-hosted-recovery-2026-09-08.json`. No Buffer calls; media readiness is not scheduling or sent proof. Today remains two fresh blogs and now two prepared reel media packages. Historical unpublished count remains 28; next priority is solar canonical correction. SOP updated to require portrait crop checks.

### Solar canonical correction verified 2026-09-08T13:48:53.613116+00:00

Preserved original article/companions under `solar-before`. Replaced canonical with 1,334-word source-reviewed guide distinguishing installation stock/flow, production, silver intensity, pilot adoption and forecast scope. Removed unsupported prices, bank targets, global per-panel mass, Fused stock claims and price-floor advice. Checked both hypothetical multiplicative scenarios (0.90 and 1.08), reviewed hero/photo artwork and synchronized eight-segment 126-second reel estimate. Local QA and parsed reel validation pass. Scoped deployment d0f520d1-811c-4f43-9bc6-1f03c6e77290 preserves July 1 date with September 8 notice; live main, canonical/title, catalog date/order and sitemap match. Verified equivalent coverage resolves July 30 topic, leaving 27 unpublished topics. Rendered companion not yet complete. No Buffer or Git operations. Next missing topic is July 31 chart analysis; adjacent beginner guide correction remains open separately.


## September 8, 07:27 Pacific: chart analysis recovered

Reviewed the failed July 31 chart-analysis topic and the full overlapping live guide. Preserved original files under `.workflow-state/incident-2026-09-07/chart-analysis-before/`. Replaced unsupported price-floor and timing claims, incorrect chart definitions, fabricated market history and false inventory language. The correction identifies instrument and volume scope, distinguishes OHLC change from range, and labels numerical examples as hypothetical. Primary source review used LBMA, CME Group and Fidelity. Original August 27 publication date retained with a visible September 8 correction.

Article QA passed after correcting the Related heading to the required template. Hero and square artwork were visually inspected; synchronized eight-segment reel script parses and validates at an estimated 110 seconds. This companion still requires rendering and audiovisual release review. Scoped deployment `19343f90-eb61-40c0-bf79-10cefa05b4fb` verified exact live main content, title, canonical URL, original catalog date, newest-first catalog order and sitemap. Evidence: `.workflow-state/chart-analysis-live-proof-2026-09-08.json`. Recorded equivalent coverage only after live verification. Remaining historical topics: 26; historical cadence misses remain visible.

Added chart interpretation checks to the operations SOP. Updated the existing active 30-minute owner automation to read current counts from the ledger instead of a stale 39-topic checkpoint and to explicitly allow reviewed corrections of overlapping articles. No Buffer calls were made during this pass. Today's two reels remain hosted awaiting the sole normal scheduler; previously scheduled jobs are not yet due and are not reported as sent.


## September 8, 08:04 Pacific: July 31 website chatbot guide published

Rebuilt `ai-chatbot-for-small-business-website-setup-guide` from its preserved failed candidate. The existing general customer-service guide was read in full and was not counted as equivalent website installation coverage. Removed fabricated customer statistics and Fused client experience. Verified Tidio installation, Lyro knowledge/testing, handoff controls and nonrenewing initial allowance from primary documentation. Examples and proposed tests are explicitly labelled. Actual publication date is September 8; July 31 remains the original queued date.

Deterministic article QA passed. Hero and square artwork were visually reviewed. Synchronized eight-segment reel script parses and validates at an estimated 112 seconds; render and audiovisual review remain pending. Scoped version `ae25d8a1-14a5-48ee-abc5-2fdf265ad30e` verified exact live main content, title, canonical URL, date, catalog order and sitemap. Proof: `.workflow-state/chatbot-live-proof-2026-09-08.json`. Catalog now has 292 live articles, sitemap 384 URLs and historical unpublished worklist 25 topics. Historical missed cadence remains visible.

Added software setup evidence and quota/fallback checks to the operations SOP. Compared installed and repository ProgramArguments, StartCalendarInterval and WorkingDirectory for research, daily publisher, renderer and Buffer runner; all four match. No other production lock was active on entry. Today's two fresh articles remain verified, their two reels hosted awaiting the sole scheduler. No Buffer calls were made; previously scheduled 13:00 onward jobs are not yet due and are not called sent.


## September 8, 08:39 Pacific: August 1 restaurant guide published

Rebuilt `ai-tools-for-restaurant-ordering-and-menu-management` from the preserved failed August 1 candidate. Removed unsupported market forecasts, tool capability claims, subscription prices and automatic accuracy promises. Verified Square item description generation and channel/modifier controls, Toast voice integration scope and ordinary online ordering setup using primary documentation. Proposed order acceptance tests and arithmetic are explicitly hypothetical. Actual publication is September 8; original August 1 queue date remains recorded.

Article QA passes; hero and square artwork visually reviewed. Synchronized eight-segment companion reel parses and validates at estimated 110 seconds; rendering and audiovisual release review remain pending. Scoped deployment `8ae334fe-92b2-4da5-9a6d-effcf2e30d42` verified exact live main content, title, canonical identity, publication date, catalog ordering and sitemap. Evidence: `.workflow-state/restaurant-live-proof-2026-09-08.json`. Catalog is 293 articles, sitemap 385 URLs, unresolved historical topic count 24. Added restaurant capability and completed-order evidence checks to the operations SOP. No other production lock on entry and no Buffer calls this pass. Today's two fresh reels remain hosted awaiting the normal scheduler; seven previously scheduled jobs begin at 13:00 Pacific and are not yet due.


## September 8, 09:15 Pacific: daily catalog false failure repaired

The 09:00 publisher correctly revalidated both fresh posts but compared only the first live/local slug. Scoped deployment preserved same-day tie order while local registration prepended recovered posts. Full direct comparison proved all 293 entries identical and chronologically ordered. The old check nevertheless redeployed unchanged assets as version `906b6957-7d6a-43cd-8776-863b5108cd6b`, waited 12 minutes, and created a false pending retry.

Prepared a standalone full-catalog verifier and seven regression tests while production remained active. Waited for natural exit before backing up and modifying the shell script. The verifier requires complete slug metadata equality, unique slugs and descending valid dates; it accepts same-day permutations. Seven new tests plus nine publishing recovery tests pass, as does zsh syntax checking.

Kicked the existing launchd publisher once with its installed environment. The 09:14:37 run verified both posts, 385 sitemap URLs and all 293 catalog entries, cleared the pending marker, wrote complete live=2/quality_blocked=0 and released the lock. No article rebuild or redundant deployment occurred in the repaired run. Evidence: `.workflow-state/catalog-verification-live-proof-2026-09-08.json`. SOP updated.

Completed full failed-draft review and initial primary-source research for the next missing team-training topic while the lock was occupied; recorded `docs/TEAM-AI-TRAINING-RECOVERY-REVIEW-2026-09-08.md`. Its fabricated Fused results, repetitions and truncated prose require full replacement. It remains unpublished; historical count remains 24. No Buffer calls or delivery claims were made.


## September 8, 09:49 Pacific: August 2 team-training guide published

Replaced the preserved failed `how-to-train-your-team-on-ai-tools-step-by-step` draft with a proposed practice curriculum, sourced NIST responsibility/training principles and generated-content limitations. Removed invented Fused staff survey, productivity and SEO results, repeated sections and incomplete prose. Clearly labelled fictional cases, voluntary framework scope and hypothetical full-task timing. Actual publication September 8 and original queue August 2 are separate.

Local article QA passes after clarifying a team skills heading. Actual hero and square artwork reviewed. Synchronized eight-segment reel script parses and validates at estimated 111 seconds, including complete timing operands; rendering and audiovisual review remain pending. Scoped version `774fd25b-859c-426f-afc5-22bcf613cb08` verified exact live main content, title, canonical identity, date and sitemap. The repaired catalog verifier also passed against all 294 live entries. Sitemap is 386 URLs; historical unpublished topics now 23. Proof: `.workflow-state/training-live-proof-2026-09-08.json`. SOP updated with training evidence and complete-task timing checks.

On entry, no production lock was active and the repaired daily publisher still showed successful completion. No Buffer calls were made; fresh reels remain hosted awaiting the normal scheduler and existing afternoon posts are not yet due.


## September 8, 10:25 Pacific: August 3 comparison recovered

Replaced the failed Claude versus ChatGPT guide, removing fabricated studies, unsupported reasoning/accuracy rankings, fixed subscription prices and Fused experiment claims. Read official OpenAI project and workspace documentation and Anthropic project/Team documentation; comparison is a proposed matched-task method, not a benchmark. Hypothetical full-task arithmetic preserved in article and narration. Original queued date August 3; actual publication September 8.

Local QA passed, artwork visually reviewed, synchronized eight-segment reel parsed and validated at estimated 111 seconds. Rendering and audiovisual release review remain pending. Scoped version b4fc2561-41c3-4c13-b607-284fd15e4df9 verified exact live main content, title, canonical identity, date, full 295-entry catalog and 387-URL sitemap. Evidence: `.workflow-state/comparison-live-proof-2026-09-08.json`. Historical unresolved topic count now 22. SOP updated to require comparable configurations and measured evidence before product rankings. No active job on entry and no Buffer calls this pass; fresh reels remain hosted awaiting normal scheduling.


## September 8, 11:00 Pacific: LLC source review and scheduled reel start

Read both preserved August 4 LLC/silver drafts in full. The earlier deterministic-pass draft contains false inventory, double-taxation, S corporation and capital-gains claims. The later revision is better but needs classification scope and recommendation qualifications. Read IRS single-member LLC guidance, Publications 3402, 544, 550, 551 and Topic 409. Prepared a 1,487-word corrected candidate outside public production: `.workflow-state/llc-tax-recovery-candidate-2026-09-08.md`; review and remaining corporate-election checks in `docs/LLC-SILVER-RECOVERY-REVIEW-2026-09-08.md`. Candidate is not approved or published; count remains 22. SOP updated with entity classification and editorial review requirements.

No publisher lock was taken for public changes and no production article was modified. Left the 11:00 slot available. The scheduled renderer started at 11:00:04 on the recovered Claude/ChatGPT comparison, scheduler PID 47164 and render PID 47186, advancing into Chatterbox audio generation. Do not edit its active inputs. Render/release/hosting remain incomplete. No Buffer API calls this pass.


### September 8, 11:37 Pacific: LLC corporate scope corrected

The missing August 4 LLC article advanced from initial source review to a corrected 1,628 word candidate. IRS corporate and S corporation reporting guidance resolved the remaining scope issue; internal destinations were checked locally and the candidate hash was saved. SOP now requires separate entity/distribution analysis and prohibits inferring tax savings from headline-rate subtraction. No public article was counted as recovered: 22 historical topics remain unpublished. Artifact build and live proof follow the active renderer.

The 11:00 scheduled comparison reel remains in narration generation with segments 0 and 1 complete. The configured Chatterbox timeout is 30 minutes per segment, and the whole render has a 90 minute limit. An elapsed run of 37 minutes does not establish failure. Preserved the active locks and narration checkpoints; no duplicate job or Buffer probe was started.

11:38 follow-up: segment 2 also completed. Three of eight narration segments now have completed output; the active renderer is making progress.


### September 8, 12:13 Pacific: website-speed source review advanced

Health reports 22 unpublished topics and no catalog ordering errors. The scheduled comparison reel has five completed narration segments and remains active within its 90 minute bound. Preserved its ownership and files. Completed source/overlap review for the next August 4 website-speed topic; rejected unsupported revenue/ranking statistics and identified existing coverage requiring correction before equivalence can count. Saved the detailed review and strengthened SOP measurement/caching/image rules. No public article changed or backlog count reduced. Buffer remains with the normal 13:00 owner; no additional API calls.


### September 8, 12:43 Pacific: bounded retry preserved six narration segments

The 11:00 comparison render reached its 5,400-second deadline at 12:30:05 and exited 124. Its existing scheduler started attempt 2 without owner intervention. Logs prove segments 0 through 5 were reused from valid cache, avoiding repeated completed narration. Verified new renderer PID 50767 and child 50771; scheduler PID 47164 remains owner. No duplicate render or active-script edit. Continue monitoring the bounded retry and perform actual audiovisual review before hosting/distribution.

Advanced the website-speed recovery to a complete 1,589 word correction candidate outside production inputs. Original live article date and queued date remain separate; final publication and equivalence proof remain pending. Unpublished backlog remains 22.


### September 8, 13:17 Pacific: fresh reels scheduled, sent-link defect repaired

The 13:00 launchd Buffer run scheduled fresh AI-review and silver-purity reels on YouTube and X for 14:00 and 15:00 respectively, and stopped at nine shared active posts. Instagram fresh reels were not scheduled in this run. Local authoritative reconciliation confirms testimonial delivery to YouTube and X; Instagram was sending at that snapshot and is not counted sent. Saved IDs, URLs and timestamps in `.workflow-state/buffer-afternoon-recovery-2026-09-08.json`; no additional API calls.

The updater rejected Buffer's valid legacy twitter.com permalink. Added exact-host URL validation supporting both X domains, with three passing regression tests. Before repair the dry run saw no update; after repair it selected YouTube and X. Preserved the original panel and synchronized the local testimonial page; a second dry run confirms idempotency. Live deployment remains pending while rendering owns production.

The comparison retry has completed narration and is advancing through video frames. Continue actual audiovisual review and hosting after completion. Historical unpublished backlog remains 22.

## September 10: resume after usage exhaustion with Luna routing

Verified all six standalone Codex schedules now specify gpt-5.6-luna; their active/paused states were preserved. The heartbeat tool rejected model/reasoning overrides because it inherits the task model. The user authorized Astra overwatch, so the owner now runs hourly with a 152-word dispatch prompt and requires bounded fresh-context Luna recovery work. Added PUBLISHING-OWNER-QUICKSTART.md and a compact publishing-owner-current.json to avoid rereading this chronology. Daily ADA prompt was narrowed to changed evidence and relevant gates. These are configuration and context reductions, not measured token savings. All five source/installed production LaunchAgent schedules matched on command, schedule and working directory.

Resumed the interrupted comparison reel after its prior visual/release approval: prepared the X derivative, uploaded both full-duration formats to KV and verified HTTP 200 video/mp4 with 8,709,638 bytes each. Saved comparison-hosted-recovery-2026-09-10.json. No Buffer API calls were made; latest scheduled-run block was the shared rolling request budget, with recorded retry eligibility September 10 13:01:25 Pacific. Prior September 8 fresh YouTube and X reels are confirmed sent in authoritative saved records. Instagram fresh outcomes remain sending/scheduled until normal reconciliation.

The full queue audit now lists 24 unpublished topics. September 9 is missing repeat-customer coverage; September 10's daily run is not due until 09:00 Pacific and must not be described as already missed. A Luna worker prepared the retention replacement and is progressing its scoped article recovery. Original dates, source review and all publication gates remain required. Remaining backlog is not complete.


### September 10 final retention recovery verification

The repeat-customer article is live with its real September 10 publication date. Live main content, all 296 catalog entries, descending date order and sitemap passed. Evidence: `.workflow-state/repeat-customers-live-proof-2026-09-10.json`. Final review corrected unsupported social copy, malformed companion data and a nine-versus-eight segment mismatch. A nested rejected backup was preserved outside both the source and isolated deployment tree before the final deployment. Quickstart now requires checking actual directory scope and final artifact hashes rather than trusting worker summaries. There remain 23 unpublished topics and 25 legacy companion gaps; no order errors were reported. The new article reel still needs rendering and audiovisual review. Publisher ownership was released after verification.


### September 10 daily publisher equivalence mismatch

At 06:17 Pacific, today’s queue still includes the resolved beginner-stacking alias. Inspection found that daily-blog-reel.sh handles direct registered slugs at its recovery skip and final completeness checks, but does not consume the validated canonical resolutions used by publishing-health. This can retry resolved coverage and mark a covered queue item incomplete. Repair is pending and prioritized before the 09:00 run. Use the same strict hash, editorial, hold and completeness gates as the health auditor; equivalent coverage must not count as fresh dated publication. No production run was triggered during this check.


September 10 repair follow-through: shared canonical validation now governs daily skip and completion. Main review corrected a valid-alias exit-code error and tests that were failing because a temporary fixture could not locate the script. Eighteen real resolver, summary, publishing and recovery regressions pass, as does zsh syntax. Local scheduled code is updated; no manual production run was triggered. Evidence: `.workflow-state/publisher-equivalence-repair-2026-09-10.json`. Verify the scheduled 09:00 run before claiming operational completion.


September 10 09:25 Pacific: scheduled recovery is verified complete. The working-tree sitemap omitted repeat-customer while approved baseline and live sitemap included it. Regeneration restored exact388location equality. Replaced line counting with strict location comparison including static pages and all296catalog articles;22focusedtests pass. Automatic09:24retry cleared pending state, released publisher ownership and wrote completion16:25:57Z. Both queued topics are covered, with one genuinely new article and one approved canonical equivalent. No duplicate publisher was launched. Evidence `.workflow-state/daily-recovery-live-proof-2026-09-10.json`.


### September 10 repeat-customer render failure

The scheduled retry failed at frame1230 with segment-3.mp4 stalled at6.5seconds in Html5Video and a28second delayRender timeout. The first attempt hit the90minute wrapper timeout; logs also recorded a generative-hook GPU memory failure. All8Chatterboxsegments were cached and reused on retry. These are different failure stages; do not regenerate valid narration or raise timeouts as a blanket repair. Preserve the media input, inspect decode and seek behavior, and normalize or replace through the approved media path once active renderer ownership is free. Revalidate the final media and audiovisual release gates. The storage reel was advancing under the same scheduler and was not interrupted. Evidence `.workflow-state/repeat-customer-render-failure-2026-09-10.json`; repair remains pending.


September10 21:30: repeat-customer normalized input completed2750frames and full decode, resolving the observed browserstall on this run. Release remainedblocked because final91.712seconds is below100secondminimum. Validate duration after audio retiming and transition overlap; markdown target duration is not output evidence. Preserve usefulcontent and release threshold; avoid blankpadding. Sampledframes reviewed, manualaudiosync notclaimed. Evidence `.workflow-state/repeat-customer-release-review-2026-09-10.json`.
