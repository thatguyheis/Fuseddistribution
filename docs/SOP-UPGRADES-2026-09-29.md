# SOP upgrades applied September 29

All five requested controls are installed in the local production scripts. The ordinary launchd jobs remain loaded. No Git commit, push or website deployment was performed for these changes.

| Control | Installed behavior | Verification |
| --- | --- | --- |
| Topic inventory | Shared JSON pool with categories and research starting points. Both brands checked independently against14 unused topics. The22:20 local audit refreshes inventory; every owner brief displays it. Dated plans reserve topics, and low inventory is visible before exhaustion. |64 new seeds across8 categories; after today's four-topic reservation, silver30 unused/15 days and tech34 unused/17 days. Selection excludes published, resolved and reserved slugs and varies categories. |
| Publisher retries | Missing approved input records an input-hash-keyed owner block, with no automatic retry. Input changes allow reevaluation. Transient retries are capped at2 per unchanged input set. | Regression tests cover unchanged quality blocks, changed input and exhausted retry budget. Today's repeated retry job was unloaded; its plist is preserved under a disabled filename. |
| Narration preflight and circuit | A real uncached segment must finish within5 minutes and decode before full synthesis. Other segments are capped at10 minutes; generation stops on the first failure. Two runtime failures open a persistent circuit. An explicit measured-failure hold survives cosmetic code changes until supervised success. Both normal and direct render entry points enforce the circuit. | Real test exited1 after300.8 seconds. Existing segment0–4 cache was reused; the remaining segment failed. Current Chatterbox runtime is held. This is a detected, contained failure, not a repaired or completed reel. |
| Approved source protection | Deterministic repairs write staged render JSON only. Renderer and release gate verify nine editorial artifact hashes. New renders record those source hashes and reject changes during rendering. | Source-integrity test proves staged repair leaves Markdown unchanged and rejects real source drift. Restored the approved skip-links sources and trailing newlines in the three repaired reel sources, preserving changed copies. No narration was rewritten during restoration. |
| Scheduling budget and fairness | At most2 recent sent-history pages per status pass; a5 minute cache avoids duplicate reads. Bounded history is explicitly incomplete. Twelve requests are protected from history and metrics use. Posting requires room for creation plus readback. Confirmed readbacks become the next in-process queue snapshot. Channels with larger deficits go first, with rotating ties. | One real owner pass filled9/10 slots, three on each platform, using27 requests. One queue slot stays reserved. All accepted jobs preserve independent live readback and exact IDs. |

## Topic expansion

32 silver seeds cover industrial materials, coin production, reading silver datasets and collecting stories.32 tech seeds cover AI workflow evaluation, useful website content, accessibility operations and process measurement. Existing topics remain preserved in the shared pool.

The source URLs are primary research starting points, not claims that a finished article has been fact checked. Every article still needs source verification, editorial review, companion assets and live verification. New subject variety does not relax those gates.

Today's reserved topics:

- Why silver is used in electrical contacts
- Coin blanks and planchets explained
- Choosing a low risk first AI task for a small business
- Planning a website around customer questions

These are planned topics, not published articles. The existing publishing owner should work from `public/blog/research/2026-09-29-plan.json` rather than choose replacements.

## Normal operating rules

- At the evening audit, inspect each brand's unused count. Below14 means replenish that brand to at least28 reviewed seeds before the next deadline. Do not use a combined count to hide one exhausted brand.
- Existing dated plans are obligations. An exhausted-inventory plan is preserved when replenishment unlocks it; other unfinished plans require explicit editorial recovery. Neither a plan nor a draft is an approved publishing queue.
- Do not run the old September28 bulk render helpers again. Their results are historical evidence. Use the normal scheduler after the narration hold is resolved.
- The narration hold can be cleared only after a supervised real segment succeeds, its decode and actual duration are checked, and its content is reviewed. Then record success through `scripts/tts-circuit.py success`. A service answering, a model listing or a cached segment alone does not demonstrate successful new synthesis. Do not change voices silently.
- Never refresh approval hashes merely to hide an unexpected source change. Restore exact approved bytes where the difference is understood, or perform a new editorial review.
- Missing history rows remain unverified; they are never inferred sent. Preserve accepted Buffer IDs when later requests fail. Keep current API ceilings and capacity reserve.

## Validation and current status

72 focused tests pass, including retry behavior, topic reservation/rotation, dated exhaustion recovery, TTS circuit/timeout controls, source integrity, rights, parsing, media preflight, channel priority, reconciliation and request reserves. Shell/Node syntax checks and scoped whitespace checks pass.

Nine posts are accepted for September29 at13:00/13:20/13:40 Pacific, three per platform. Scheduled is not delivered. The current voice runtime still needs performance repair; the new safeguards prevent another unattended twelve-reel timeout chain.

Evidence: `.workflow-state/sop-upgrade-2026-09-29/` contains test results, topic inventory, today-plan, real TTS result/log, source restorations, Buffer validation and accepted schedule. The routine publishing owner remains responsible for today's article production and saved delivery reconciliation.

Primary source starting points checked for the expanded categories: [USGS silver data](https://www.usgs.gov/centers/national-minerals-information-center/silver-statistics-and-information), [U.S. Mint production](https://www.usmint.gov/learn/production-process), [W3C planning](https://www.w3.org/WAI/planning/), [Google search guidance](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), and [NIST AI risk framework](https://www.nist.gov/itl/ai-risk-management-framework).

## Narration repaired at12:29 Pacific

The earlier voice hold is resolved. Free local Chatterbox Nano completed the failed passage in55.4 seconds with zero transcript word errors. The skip links reel completed and passed release QA and full decode. A bounded three-reel backlog run is active. See [repair evidence](NARRATION-REPAIR-2026-09-29.md).
