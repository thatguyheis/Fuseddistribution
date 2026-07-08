# Codex Handoff — T8b Chart Stage (2026-07-08)

**From:** Claude (editorial/creative/QA)
**To:** Robert Paulson / Codex (workflow architecture owner)
**Status:** Implemented, tested, committed on `main` (`1b423d0f`), deployed. Requesting architecture review since pipeline stages are Codex-owned.

## Why

Nick flagged that pipeline posts ship with no charts or applicable graphics and weak heroes. Root cause: the decoupled gemma pipeline includes chart CSS in every post template but nothing ever generates chart markup; `build-svg.mjs` heroes were plain title cards with a gemma-picked stat that was sometimes off-topic (SMS post hero read "9.5% OF EMAILS ARE OPENED"). Reel side already supports a `## chart` section in `reel-data.md` (REEL-SOP renders animated bars, validates against it) — nothing upstream ever wrote one.

## What was added

New stage **T8b chart** in `public/blog/scripts/build-post.sh`, after pexels, before T9 reel:

1. **`scripts/build-chart.sh`** — brain half. Prompts a model to extract 3-6 comparable, same-unit stats from `verified.md` + `research.json` into `<slug>/chart.json` (schema: `{title, source, bars:[{label,value}], hero_stat:{value,label}, narration}` or `{skipped:true, skip_reason}`). Brain selection: claude only when `HERMES_TAKEOVER != 1` and `CLAUDE_ENABLED != 0` and CLI present (180s alarm), else `$LOCAL_LLM`. In the current daily plist (HERMES_TAKEOVER=1, CLAUDE_ENABLED=0) the brain is gemma.
2. **`scripts/build-chart-inject.mjs`** — deterministic half, this is the gate:
   - Every `bars[].value` numeric token must appear verbatim (digit-boundary regex) in `verified.md`/`research.json`/`index.html` or the **whole chart is rejected** (exit 3). Same check applied to `hero_stat` before hooks sync. A hallucinating brain cannot publish a number.
   - Enforces 3-6 bars, single unit (%, $, x, plain), label ≤42 chars, title ≤90 chars.
   - Injects `chart-wrap` horizontal bar SVG (SOP §6 math, `width = round(pct/100*447)`, word-of-mouth-referrals layout) into `index.html` before the 3rd `<h2>` (fallbacks: sources-block / faq-block / article-cta). Idempotent — skips if a `chart-wrap` already exists.
   - Appends `## chart` (title/bars/narration, REEL-SOP format) to `reel-data.md` before `## question`. Idempotent.
   - Syncs `hooks.json` `key_stat` to `hero_stat` so hero/photo-post stats are on-topic.
3. **`scripts/build-svg.mjs`** — when a non-skipped `chart.json` with ≥3 bars exists, `hero.svg` renders a mini 3-bar chart (title lifted to y=250) instead of the big stat card. Also changed `xml()` to numeric entities (`&#38;` etc.) — the old `&amp;` output would have tripped the file's own named-entity self-check the first time a title contained `&`.
4. **`build-post.sh` wiring** — runs build-chart.sh, and on a real chart re-runs build-svg.mjs before the assets stage so hero.jpg/photo-post.jpg pick it up. Stage is enhancement-only: any failure or no-chartable-data logs and continues; publish path unchanged. `mark chart` only on success.

## Tests / verification

- `node --test public/blog/scripts/build-chart-inject.test.mjs` — 10 tests: token extraction, verbatim-match boundaries, unit mixing, bar-count limits, SOP bar math, descending sort + XML escaping, injection anchors, idempotency, reel section format.
- End-to-end on 3 real posts (see below): injector output verified, heroes screenshot-checked at 1200x630, body chart screenshot-checked on dark background, SVG entity grep clean, idempotent re-run confirmed.
- Not exercised: gemma-brain path under launchd (next 9am run is the live test — watch `[chart]` lines in daily-blog-reel.log).

## Retrofits shipped

Charts + chart heroes + `## chart` reel-data + synced key_stat for the only 3 recent posts whose text contains ≥3 comparable sourced numbers:

- `text-message-marketing-for-small-business` — text vs email engagement gap (90/68/9.5/3%)
- `email-open-rate-what-is-good-for-small-business` — open-rate benchmarks (35/30/20/15%)
- `call-to-action-best-practices-for-small-business-websit` — CTA stats (371/202/60%, HubSpot/WordStream/Statista)

Their already-rendered reels do NOT have chart segments; the `## chart` section is picked up on next re-render. No re-render was triggered.

## Review asks for Codex

1. **Stage placement/ownership** — T8b sits between pexels and reel inside build-post.sh; confirm placement and the `mark chart` status semantics fit the gate model.
2. **Gemma JSON reliability** — daily runs use gemma for extraction. Validator makes bad output safe (chart just skipped) but if gemma rarely emits valid JSON the stage is dead weight; consider whether the chart brain deserves the qa-brain treatment or a claude carve-out.
3. **qa-gate interaction** — injector edits index.html after html/pexels stages; confirm qa-gate.sh ordering still sees the final DOM.
4. **Known content gap** — 7 of 10 recent posts are stat-thin (0-2 sourced numbers), so they legitimately get no chart. Real fix is research-backed rewrites (anti-fabrication gate work from 2026-07-07/08 applies). Proposed follow-up, not started.

## Files touched

- `public/blog/scripts/build-chart.sh` (new), `build-chart-inject.mjs` (new), `build-chart-inject.test.mjs` (new)
- `public/blog/scripts/build-svg.mjs`, `build-post.sh` (modified)
- `public/blog/BLOG-SOP.md` §6 (stage documented)
- 3 retrofit post folders (chart.json, index.html, reel-data.md, hooks.json, hero.svg/jpg, photo-post.svg/jpg)
