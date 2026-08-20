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
4. **Known content gap — RESOLVED same day** (`50ef7c93`): all 7 stat-thin posts received researched, sourced stat paragraphs (GoldSilver, Invesp, Bain/Gorgias, GetResponse/Mailchimp/Litmus/HubSpot, EmailToolTester/StackScored), Sources blocks, research.json, chart.json, body charts, `## chart` reel sections, and chart heroes. All values validator-passed and live-verified. SOP §8 now carries a chart-first rule: every draft must include 3+ comparable same-unit sourced stats (write-article.sh and research.sh prompts updated to match), so future posts arrive chartable. Fallback for genuinely numberless topics: another custom graphic; zero custom graphics = QA failure.

## Files touched

- `public/blog/scripts/build-chart.sh` (new), `build-chart-inject.mjs` (new), `build-chart-inject.test.mjs` (new)
- `public/blog/scripts/build-svg.mjs`, `build-post.sh` (modified)
- `public/blog/BLOG-SOP.md` §6 (stage documented)
- 3 retrofit post folders (chart.json, index.html, reel-data.md, hooks.json, hero.svg/jpg, photo-post.svg/jpg)

## Codex Architecture Review - 2026-07-08

**Review status:** Accepted as the right direction for the decoupled workflow. The implementation uses the correct ownership split: the model only proposes chart data, while `build-chart-inject.mjs` owns deterministic validation, DOM mutation, reel-data mutation, and hook-stat sync.

### Decisions

- **Stage placement approved:** T8b runs after deterministic HTML plus Pexels mutation and before T9 reel, T10 social, JPG asset generation, deterministic QA, and brain QA. That means `reel-data.md`, `index.html`, `hooks.json`, regenerated `hero.svg`, and final JPG assets are available to downstream stages before publish registration.
- **`mark chart` semantics approved:** only mark `chart` when a real non-skipped `chart.json` exists. A clean skip should remain visible by absence of the `chart` stage, not as a successful chart stage.
- **Enhancement-only behavior accepted:** chart generation should not block publish by itself. The anti-fabrication validator is strong enough to reject bad chart output, and a skipped chart is preferable to publishing invented numbers.
- **Retrofit approach accepted:** adding `chart.json`, body chart markup, `## chart`, hero chart SVG/JPG, and synced `hooks.json` to existing posts is consistent with the current artifact model. Already-rendered reels correctly remain unchanged until re-render.

### Current Verification

- `node --test public/blog/scripts/build-chart-inject.test.mjs` passed: 10/10.
- `node --check public/blog/scripts/build-chart-inject.mjs` passed.
- `node --check public/blog/scripts/build-svg.mjs` passed.
- `bash -n public/blog/scripts/build-chart.sh public/blog/scripts/build-post.sh public/blog/scripts/research.sh public/blog/scripts/write-article.sh` passed.

### Residual Risks / Follow-ups

1. **Validator should prefer source documents over generated HTML.** `build-chart-inject.mjs` currently validates against `verified.md`, `research.json`, and `index.html`. Including `index.html` helps retrofits, but it can also validate a number that only exists in generated markup from an earlier hook/stat artifact. Safer future change: validate bars and `hero_stat` against `verified.md` + `research.json` only, or explicitly tag `index.html` as a fallback used only for legacy retrofits.
2. **Value validation checks numeric tokens, not full value semantics.** The current boundary regex prevents `9` matching `92` or `6` matching `60`, which is good. It does not prove the source used the same unit as the chart value; for example, a `%` value could pass if the same number appears elsewhere as plain text. Same-unit chart enforcement reduces this risk, but a tighter validator should require nearby unit/source context when practical.
3. **SOP says zero custom graphics is a QA failure, but deterministic QA does not enforce it yet.** `BLOG-SOP.md` now requires at least one custom graphic and names `chart-wrap`, `stat-row`, `math-box`, `coin-grid`, and `watch-list`. `qa-local.mjs` does not currently appear to count those elements. If this becomes a hard business rule, add a deterministic `validateCustomGraphics()` check to `qa-local.mjs` so no-chart/no-graphic posts cannot register in `posts.json`.
4. **Gemma JSON reliability still needs live-run observation.** The validator makes bad output safe, but the scheduled Hermes/Gemma path may skip charts often if JSON is malformed or under-specified. Watch `[chart]` lines in `scripts/daily-blog-reel.log` after the next scheduled run before deciding whether to carve chart extraction back to Claude.
5. **Idempotency is conservative.** If `index.html` already contains `class="chart-wrap"` or `reel-data.md` already has `## chart`, the injector leaves those surfaces unchanged. That prevents duplicate charts, but it also means changing `chart.json` later will not refresh already-injected surfaces unless the old chart block is removed or a replace mode is added.

### Recommended Next Codex Work

1. Add a deterministic custom-graphic count to `qa-local.mjs`.
2. Tighten chart value provenance to `verified.md` + `research.json` by default.
3. Add an optional `--replace` mode to `build-chart-inject.mjs` for intentional chart refreshes.
4. After one live 9am run, update this handoff with observed Gemma success/skip/error rates.
