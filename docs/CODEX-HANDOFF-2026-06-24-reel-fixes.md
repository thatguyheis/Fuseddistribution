# Codex Handoff — Reel Pipeline Fixes (2026-06-24)

**Author:** Claude (editorial/creative/QA). **Owner to review/ratify:** Codex (workflow
architecture + gates). **Trigger:** Nick audit of `google-review-strategy-that-actually-works.mp4`
— question not voiced + meh transitions + parts lack continuity.

Full root-cause analysis: `video/docs/REEL-AUDIT-2026-06-24.md`.
Findings reproduced across 3 reels (also `how-many-google-reviews-do-you-need-to-rank`,
`fake-google-reviews-how-to-handle-them`).

---

## What changed (5 files)

### 1. `video/src/compositions/BlogReel.tsx`
- Replaced `getTransition(current,next)` with `transitionSpec(current,next,index)`.
  - **Why:** 6 consecutive stat→stat segments all used the *same* default slide →
    monotonous. Now stat→stat **rotates** through slide-up / slide-right / wipe / fade
    by index, so repeated segments vary.
  - Transition durations normalized (14–18f; the old 10–12f into the question was abrupt).
- Added exports `totalTransitionFrames(segments)` and `compositionFrames(script)`.
  - **Why:** `TransitionSeries` *overlaps* transitions, so the real timeline =
    Σ(sequence frames) − Σ(transition frames). These let `Root.tsx` size the composition
    correctly. Added `TransitionChoice` type so mixed fade/slide/wipe presentations
    typecheck.

### 2. `video/src/Root.tsx`
- `calculateMetadata` now returns `compositionFrames(props.script)` instead of
  `totalDuration * fps`.
  - **Why (bug):** old length over-counted by Σ transition frames (~3.4s) → every reel
    rendered a **frozen/black tail** after the last segment. Verified on the audited
    slug: sequences 2850f, transitions 115f → composition 2735f (was 2850f).

### 3. `video/scripts/parse-script.mjs`
- **Sanitize narration:** strip leaked `---` section delimiters (standalone + inline);
  empty → `null`. Fixes `fake-google` segment-1 narration which was literally
  `"--- Fake Google reviews."` → now `"Fake Google reviews."`.
- **Voice the question:** in the `## QUESTION` branch, if narration is empty or only the
  canned "Follow for more…" CTA, prepend the spoken on-screen question, then recompute
  the segment window (`max(declaredDuration, durationFromNarration)`) so it still fits.
  - **Why:** the displayed question was never read aloud (perceived "question wasn't
    TTS'd"). Now audio matches the card. Behavior change vs old SOP intent (silent-read
    question) — **see Decisions below.**
- Changed `const endSec` → `let endSec` to allow the question recompute.

### 4. `video/scripts/validate-reel.mjs` (new gates — these BLOCK render)
- **Stat figure gate (ERROR):** if a stat's narration states a number but its on-screen
  Text has none → error. Years 1900–2100 ignored (source/date cards pass). Enforces
  existing SOP rule "42% MORE REVENUE, not MORE REVENUE" that Gemma was violating.
- **Question completeness (WARN):** warns if question Text doesn't end with "?"
  (truncation / not-a-question signal).

### 5. `video/REEL-SOP.md`
- QUESTION template: note that the parser now voices the question; `Text:` must be a
  complete question.
- Stat rules: added hard rule that the figure must stay in the Stat Text (now gated).

---

## Verified this session
- `npm test` → 14/14 pass (no test changes needed).
- `parse-script` re-run on all 3 slugs: question now voiced; `---` leak gone; windows recomputed.
- `validate-reel` now flags every stripped-number stat (5 in slug 1, 6 in slug 2) + question warnings.
- `npx tsc --noEmit`: **0 errors in `BlogReel.tsx` / `Root.tsx`** (pre-existing library
  type errors in `@types/dom-webcodecs` and remotion `Timer` are unrelated and predate this work).
- Duration math: dead tail removed (see #2).

## NOT done / needs follow-up (Codex + Nick)
1. **No new MP4 rendered this session.** The audited slugs now *fail* the stat-figure gate
   (correct — their titles are genuinely broken). Re-render requires fixing the stat Text
   numbers first. Recommend: render one corrected slug to confirm dead-tail + transition
   variety visually before trusting the daily pipeline.
2. **Gate will block the daily pipeline** until Gemma authors stat Text with numbers. This
   is intended, but Codex should decide: hard-block (current) vs warn-first for one cycle
   while Gemma's prompt is updated.
3. **Decision — question voicing vs silent-read.** Old SOP made the question intentionally
   silent (read time for comments). Nick asked for it voiced. Implemented voiced. If you
   want the silent-read option back, gate it behind a flag in `parse-script` (e.g.
   `--silent-question`) rather than reverting.
4. **Continuity (bigger work, not in this diff).** Audit recommends a Hook→Body→Payoff→CTA
   arc: hook opens a loop, payoff closes it before the CTA; running motif across stat cards;
   consistent media palette per reel. Suggest a validate check that the hook's key term
   reappears in the payoff/question. Needs a Gemma-prompt + SOP change — Codex's call.

## Rollback
All changes are additive/local. Revert the 5 files above to restore prior behavior; no
data migrations, no state changes.
