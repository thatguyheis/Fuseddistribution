# Session Summary — 2026-07-07 Live Content Cleanup (Plan 5, final plan)

Resumed after session crash mid-Part-B. All 5 PLAN-INDEX plans now executed.

## Part A: banned AI words in 12 live posts — DONE (committed pre-crash as 933ace7e)

- Re-verified post-crash: zero banned-word prose hits across all 12 `index.html` and every existing `verified.md`.
- Intentionally left: `leveraged futures` (3×) in `hunt-brothers-silver-squeeze` — legitimate finance term describing the Hunt position, not a buzzword.
- 5 of the 12 posts have no `verified.md` (pre-existing; never generated): google-business-profile-setup, local-business-website-pages, short-form-video-local-business, silver-portfolio-allocation, hunt-brothers-silver-squeeze.

## Part B: two broken posts regenerated — DONE (5192edbb)

| Slug | Old defect | Result |
|---|---|---|
| welcome-email-sequence-for-new-customers | Body was GBP/reviews content, unrelated to title | Rebuilt on-topic: 10-email welcome sequence structure. qa-local pass. |
| automated-email-sequences-for-local-business | Same ~5 points repeated under different H2s | Rebuilt with 9 distinct sections. qa-local pass. Post-build swap: "Leveraging"→"Using" (H2) and "leveraging the power of"→"putting … to work" in index.html + verified.md (gerund dodged the whole-word grep). |

- qa-brain stage was down (ollama brain returned no JSON) for both builds; deterministic gate passed, build continues by design — gate not bypassed.
- Originals preserved in `.workflow-blocked/manual-content-cleanup/` (untracked).
- posts.json titles/excerpts synced to rebuilt meta; dates kept original (2026-07-06/-07-01 era entries unchanged in position). No 404 window: one slug at a time, no deploy mid-rebuild (verified live 200 before starting).

## Publish (full definition) — DONE

- posts.json: 140 entries, 0 duplicate slugs, live copy matches local.
- Pushed content commits 933ace7e + 5192edbb to origin/main (standing permission).
- `npx wrangler deploy` → version 8d6ed462-ddb9-4f9e-ab4c-b8bc0c99e330 (11:58 AM PDT, outside cron window).
- Curl-verified: both rebuilt posts + 3 spot-checked Part A posts all 200; `accordingly` count 0 on silver-portfolio-allocation; welcome post serves 10 on-topic H2s; artifact leak fix live (`qa.json` → 404).

## Git state — NEEDS NICK

Unpushed commits were reordered (cherry-pick onto origin/main, tree verified identical, no reset --hard) so content could push without script/config commits. Still local, awaiting Nick review + push:

- `2c4ec831` fix: stop serving per-post pipeline artifacts (.assetsignore) — already live via deploy, just unpushed in git
- `1ef2b84f` feat: quarantine recovery script + sanitizer URL guard
- `b09b3211` feat: inline internal link injector + deterministic link gate

Backup branches from reorders: `backup-pre-reorder`, `backup-pre-reorder-partB` — safe to delete after review.

Untracked, uncommitted: 5 PLAN-*.md + PLAN-INDEX.md, session summaries, `.superpowers/`. Pre-existing modified files left alone: docs/CODEX-HANDOFF-2026-06-29, public/blog/research/topic-index.json (pipeline counter), video/REEL-SOP.md, stash@{0}.

## Needs review

1. ~~Push the 3 local script/config commits~~ — DONE, Nick approved, pushed same day.
2. ~~Rebuilt posts bland~~ — DONE: editorial polish pass (9e044abf, pushed + deployed + verified). Removed 6 fabricated stat attributions, fixed live `[INSERT: Your Website Link Here]` placeholder leak, replaced with sourced GetResponse/Klaviyo benchmarks.
3. Carried over from recovery session: 9 reel-blocked posts (Codex domain), insuring-physical-silver-at-home topic drift, sanitizer decimal-range precision.
4. ~~qa-brain outage~~ — ROOT-CAUSED + FIXED: 30s curl / 75s wall timeouts vs ~150s actual gemma3:4b eval time on the 3.5k-token QA prompt. qa-gate.sh defaults now 240s/520s (commit da1e4b01, LOCAL — needs Nick push). Both posts re-judged: score 92, pass.
5. Model comparison (granite4.1:3b, qwen3:4b vs gemma3:4b-it-qat) — see docs/MODEL-COMPARISON-2026-07-07.md. Verdict: keep gemma; granite too short as writer, no speed win as QA brain.

## 2026-07-08 follow-up (all pushed + deployed)

- Anti-fabrication gate shipped (af8d6ecf): named-source stat claims must trace to research.json. Three layers: writer prompt rule, lint fix loop, qa-local publish blocker. Detector: `scripts/lib/sourced-stats.mjs`.
- research.json was publicly served (200) — added to .assetsignore, verified 404 post-deploy.
- research.json seeded for both regenerated email posts (07532a99) so future re-renders pass their own citations.
- OPEN for Nick: gate flagged fabricated citations in OLDER live posts (best-silver-storage-options-for-investors: "Silverinvestor.org", "Precious Metals Advisor", "Investopedia"; customer-loyalty-program-ideas: "Yelp", "BrightLocal"). Live until rebuilt or manually cleaned — same treatment as the 07-07 polish recommended.
