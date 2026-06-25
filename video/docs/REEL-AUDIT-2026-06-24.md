# Reel Production Audit — 2026-06-24

Audited: `google-review-strategy-that-actually-works` (reported), cross-checked
`how-many-google-reviews-do-you-need-to-rank` and `fake-google-reviews-how-to-handle-them`.

Method: systematic-debugging (root cause before fixes). Findings below are
reproducible across all three files, so they are pipeline-level, not one-offs.

---

## Root causes (confirmed)

### 1. The on-screen QUESTION is never spoken ("question wasn't TTS")
- TTS **did** run: `segment-7.m4a` exists (2.6s). Nothing failed.
- But the audio says the hardcoded line **"Follow for more tips to grow your business."**
  in *every* reel. The displayed question
  ("READY TO TURN YOUR REVIEWS INTO REAL LOCAL…" / "WHAT'S YOUR BUSINESS'S REVIEW
  GOAL RIGHT NOW" / "STOP CHASING FAKE SCORES…") is **decoupled** from the narration.
- So the question card shows text that no voice ever reads → perceived as "not TTS'd."
- Source: `reel-script.md` QUESTION block authors `Text:` (displayed) and `Narration:`
  (a canned follow CTA) as two unrelated strings. `parse-script.mjs` keeps them
  separate (`parse-script.mjs:93-102`), `generate-audio.mjs` voices `narration` only,
  `QuestionCard` renders `text` only. Decoupled by design of the template.
- Secondary: question segment runs 6s but its audio is 2.6s → ~3.4s of dead air on a
  static card to close every video.

### 2. On-screen STAT titles are number-stripped fragments
- Every stat title displays a broken clause with its key number removed:
  - "YOU NEED AT LEAST REVIEWS" (missing **10**)
  - "YOU NEED REVIEWS BEFORE MOST" (missing **20**)
  - "THEY THINK THEY NEED OR" (missing **50 or 100**)
  - "ONCE YOU'RE PAST VOLUME RELATIVE" (missing **10**)
  - "GOOGLE CONTROLS OF ALL REVIEWS" (missing **79.4%**)
- The number is the entire point of a stat card, and it only survives in the narration.
- Source: the `## STAT: <LABEL>` headers in `reel-script.md` are authored with
  digits/percent stripped. `parse-script.mjs:80-81` copies the header verbatim as
  display text. parse-script is faithful; **the authoring step (upstream generator)
  is the bug.**

### 3. Narration corruption leaking into segments
- `fake-google-reviews`: segment-1 narration is literally `"--- Fake Google reviews."`
  — the `---` section delimiter and a near-empty stub leaked into a real segment.
  Hook narration = `"Real activity beats fake numbers every time. --- Fake Google reviews."`
- Indicates the upstream generator sometimes emits malformed section bodies; the parser
  does not guard against `---`/empty narration.

### 4. Transitions are monotonous + a dead tail at the end
- `BlogReel.tsx:34-48` `getTransition`: 6 consecutive stat→stat cuts ALL resolve to the
  **same** default `slide(from-bottom)`. Same move 6× in a row = monotony, not "meh"
  randomness. Durations are short (10–18 frames ≈ 0.3–0.6s) → abrupt.
- **Duration math bug:** `Root.tsx` sets composition length = `totalDuration * fps`
  = sum of segment durations (87s → 2610f). But `TransitionSeries` *overlaps*
  transitions, so real content length = sum − Σtransition frames
  (≈103f ≈ 3.4s here). Result: ~3.4s frozen/black tail after the question card, on top
  of the question's own 3.4s silent dead air. The close of every reel is ~6s of nothing.

### 5. No continuity / no narrative arc (the core complaint)
The pipeline is **segment-atomic**: each part is generated independently —
own stock clip, own TTS file, own caption — with nothing binding them:
- Hook promises X ("Get 20 reviews to unlock revenue") but body delivers loosely
  related stats, and the CTA ("Follow for more tips") pays off neither the hook nor the
  displayed question. No Hook → escalation → payoff → CTA arc.
- One script literally narrates `"Here's how to hit 10 fast: 1."` then **stops** — the
  promised list never arrives. Broken open-loop.
- Parenthetical `(Source: BrightLocal…)` is read **aloud** in narration — kills pace.
- No recurring visual motif, no step counter carried across cards, no callback to the
  hook at the end.

---

## What good short-form structure requires (2026 research)

- **0–3s decides everything.** 71% decide in 3s; first 3s drive ~80% of completion. Hook
  must state the promise (result/tension/number) in frame 1, big readable text, motion.
- **Structure = Hook → Body → Payoff.** Every 4–6s give a new info/visual/turn.
- **Open loop** the hook, **close it** at payoff before the CTA (AIDA / PAS).
- **CTA must be low-friction and specific.** Comment-keyword CTAs get ~1.5–2.2× comments;
  "save" CTAs lift 7–14 day reach. A generic "follow for more" underperforms.
- **B2B/education:** proof-driven hooks, on-screen data (numbers must be visible).
- Target 15–30s for completion; education tolerates +5–10s.

Sources: Socialync, invideo, virvid, automateed, thrivethemes (AIDA/PAS), crazyegg.

---

## Recommended structure for the generator (spec, not yet implemented)

Encode an **arc**, not 8 independent cards. Proposed per-reel contract:

1. **HOOK (0–3s):** one promise line with the payoff number visible. Open a loop
   ("Most businesses get this wrong" / "You need fewer than you think").
2. **BODY stats (each 4–8s):** title MUST keep its number (`97% READ REVIEWS`, not
   "OF CONSUMERS READ"). Carry a running motif (step 1/2/3 or a progress number).
3. **PAYOFF (pre-CTA):** explicitly close the hook's loop ("So the magic number is 10.").
4. **QUESTION/CTA (last 4–6s):** narration **reads the displayed question**, then one
   specific low-friction ask ("Comment '10' and I'll send the checklist"). No dead air.

Concrete fixes to hand to workflow owner (Codex owns architecture/gates):
- **Stat titles:** stop stripping numbers in the upstream `reel-script.md` generator;
  derive the on-screen title from the narration's key clause *including* the figure,
  or fit the full stat with `@remotion/layout-utils`.
- **Question audio:** voice the displayed question (append the follow line), OR drop the
  canned narration and let the question render as a designed silent end-card with music
  swell — but not a 6s static silent card.
- **Duration:** in `Root.tsx`, set `durationInFrames = totalDuration*fps − Σtransitionframes`
  (or compute composition length from the actual TransitionSeries timeline) to kill the
  ~3.4s dead tail.
- **Transitions:** vary stat→stat moves (alternate slide direction / wipe / fade) and/or
  lengthen to ~18–24f for smoothness; tie cut cadence to the 4–6s info beat.
- **Parser guards:** reject/strip `---` and empty narration; fail validation in
  `validate-reel.mjs` when a segment narration is empty or a stat title has no digit but
  its narration does.
- **Continuity:** add a hook-payoff check to validation (hook promise term must reappear
  in payoff/CTA), and reuse a consistent media palette per reel.
