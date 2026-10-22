# Engagement production standard

Effective October 1, 2026. Owner: Codex. This adds interaction to useful educational output; it does not replace source accuracy or the existing release gates. Muse's claims about algorithm effects, follower behavior and the catalog's causal performance are hypotheses, not verified findings. Preserve current schedules, free tools, request budgets, Nano voice and the 135-second delivery ceiling.

## I1: Spoken engagement beat

Every new or migrated reel script declares `engagement-policy: 1` and `content-kind: educate|opinion`. Its final question segment has `Engagement-beat: identity|debate`, names the actual topic, and invites a preference, experience or reason. Avoid generic reactions, homework prompts, unsupported premises and pressure to make a financial decision. End narration with the exact displayed question. The question has its own block of at most15 seconds; put any summary in the preceding segment. The rotating pitch belongs after the question in the caption. The parser retains the fields and validation blocks missing tags, unspoken questions and overlong final blocks. Release repeats the check against measured segment timing.

Legacy approved renders are not invalidated by metadata alone. Retrofitted scripts need renewed artifact hashes and a new render before their changed speech is distributed. Never modify the active renderer's source. The review referenced seven backlog scripts, but the actual current recovery queue has twelve; the migration manifest names the real scope.

## I2: Content mix

At least one of each four new scripts should take a defensible stance. Tag it `opinion`; the other three remain `educate`. Review the trailing28-day approved-script mix weekly, with a target of at least25% opinion, and separately require at least one actually shipped opinion reel per week. A tag is not editorial evidence: the script must state a qualified position and fairly describe its limits or countercase. Missing tags stay unknown. Do not retroactively label educational articles opinion to meet a quota. The audit reports deficits and next action; it does not block useful approved education or force low-quality output.

First three scripts are in `ops/engagement/scripts/`. They replace unsupported absolute seed headlines with qualified arguments. Draft/editorial approval is not an approved rendered asset.

## I3: Nick on camera

Queue one original on-camera script each week. First slot: week of October5, with recording requested now. Nick has agreed to shoot. Use `docs/NICK-SHOOT-CHECKLIST.md`. Target60–85 seconds, hard ceiling under90 for this format. Actual footage, captions, rights, frame review and hosted proof are required before scheduling. Never simulate Nick's face or claim a shoot happened. This format is an explicit short-format exception; the current automated blog-reel renderer keeps its existing100-second minimum until a dedicated tested live-footage path is ready. A script awaiting footage is not a renderable job.

## I4: Recurring series

`docs/series-bible.md` defines Stack of the Week and Website Roast, including eight reviewed episode outlines. Alternate one series episode weekly initially: Stack in week1, Roast in week2, then repeat. A second weekly episode is optional only with approved inventory and free capacity. The talking-head slot can serve the series slot. Use owned demos or permissioned websites and specific constructive criticism, not personal attacks or invented client failures. A roast's engagement question precedes the verified built-before-you-pay offer. On engagement-only caption weeks, keep the offer in the spoken script without adding a link to the caption.

## I5: CTA rotation

Per channel, new accepted posts follow reserve -> newsletter -> engagement -> reserve. Queue planning reads confirmed scheduling history, records `cta_slot`, and composes one destination: `/reserve/`, `/newsletter/silver/` or `/newsletter/tech/` by content vertical, or no link. `social-copy.json` stores the starting slot and cycle; each actual channel job and accepted log stores its resolved slot. The executor checks chronological neighbors from its live readback plus confirmed sent evidence before creation. It never advances the cycle on an unaccepted attempt. Unknown pre-migration history is marked legacy and starts a new cycle; it is not fabricated. Existing scheduled posts are preserved. Out-of-order inserts must replan instead of breaking a known cycle.

The standard captions use the approved title and discussion question so stale all-purpose reserve copy cannot introduce a second destination. X captions retain the280-character cap. Website offer language does not imply guaranteed results.

## I6: Daily community review

By09:00 Pacific, provide a digest covering top-level comments on posts published in the previous seven days across YouTube, Instagram, X and Facebook. Questions rank first, substantive takes next, suspected spam goes to a separate ignore-review section. Codex drafts replies for up to five real comments; Nick replies for15 minutes. No automatic reply, like, deletion or moderation is authorized by this SOP.

Use the read-only source/export adapter in `scripts/engagement-report.mjs`. A verified connector/export is required. The current Buffer publishing integration does not establish access to community comments; experimental capability names in its schema are not a tested comment reader. Never invent an endpoint, post, comment or reply. Missing/stale source coverage must appear prominently in the digest, not as zero comments. Reuse saved data and honor Buffer cooldown/request reserve. A daily report with unavailable coverage is an exception report, not a successful comment fetch. Save approved exports under ignored `.workflow-state/community-input.json`; schema and command are documented in `docs/COMMUNITY-DATA.md`.

Flagged comments exclude suspected spam and already confirmed replies. Track the weekly share of flagged comments with authoritative reply evidence; target80%, with unknown when coverage or evidence is missing. A suggested reply is not a posted reply.

## I7: Article questions

End with a topic-specific identity or two-sided choice. Preserve nuance and avoid a false dilemma when the real answer depends on context. Backfill the ten named September28 articles in the migration manifest, retaining original dates. Update the article CTA and caption question together, stage changes for active sources, and reapprove/deploy only the changed package. For the ten legacy September28 packages, preserve existing spoken narration until a separately approved rerender; the twelve September29–October1 scripts were migrated for new speech. Do not reuse a render whose narration changed.

## I8: Measurement and decisions

Run `node scripts/engagement-report.mjs` for deterministic current-week rows and a monthly ranking in `docs/engagement-log.md`. Record platform/post ID, observation date, views, comments, shares, saves, attributed follows and comments/views*100. Null remains unavailable; views=0 means rate undefined. Never substitute impressions for views. Record whether the provider's comment count includes replies. Keep post cohorts and observation windows explicit; do not add cumulative snapshots across dates or claim a lifetime total is a weekly increment.

First90-day goals: establish a current baseline, then aim for1% reel comment rate, one shipped opinion per week and80% replies to flagged comments. These are targets, not forecasts. Weekly Friday review uses the existing Luna review. Its first pass of each month reviews the previous month's top/bottom three comparable posts and writes five lines about shared patterns and the next bounded experiment. Require at least seven days of observation and100 views for ranking; report insufficient data if fewer than six eligible posts. Report other platforms separately where views are unavailable. No automatic promotion on sparse data.

Rollback: if a new gate misclassifies valid content, preserve its failing fixture, repair the gate and test it. Do not disable accuracy, rights, source-hash, release, capacity or live-proof checks to improve engagement. Record I1–I8 acceptance evidence in `docs/ENGAGEMENT-IMPLEMENTATION-2026-10-01.md`.

October5 integration: the combined08:30 owner prepares the digest by09:00; separate08:00 oversight is paused. The21:30 owner retains metrics responsibility. Local22:20 reporting and Friday22:30 interpretation remain unchanged. See `docs/BATCH-PRODUCTION-SOP.md`.

## Audience-matched commercial destinations

Effective October 5: the stored `reserve` rotation slot retains its historical name and order, but technology jobs set `cta_brand=tech` and direct viewers to `https://fuseddistribution.com/#contact`; silver jobs retain the Reserve destination. Newsletter destinations remain vertical-specific. Preserve already accepted posts. New captions must pass destination validation before publishing. See `docs/GROWTH-AUDIT-2026-10-05.md` for evidence and the bounded creative pilot.
