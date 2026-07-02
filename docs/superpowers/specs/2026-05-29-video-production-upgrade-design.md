# Video Production Upgrade — Design Spec
Date: 2026-05-29
Status: Approved

## Goal

Upgrade Remotion reel output from flat/static to polished, premium-feeling short-form video. Three areas: between-segment transitions, typography, and background photo motion + animation tightening.

---

## Section 1 — Between-Segment Transitions

**Package:** `@remotion/transitions` (already in Remotion ecosystem, install alongside existing version)

**Change:** Replace `<Series>` → `<TransitionSeries>` in `BlogReel.tsx`. Each `Series.Sequence` becomes `TransitionSeries.Sequence` with a `<Transition>` between each pair.

**Transition map:**

| Boundary | Presentation | Timing | Frames |
|----------|-------------|--------|--------|
| Hook → first body segment | `slide({ direction: "from-bottom" })` | `springTiming` | 18 |
| Stat → Chart | `fade()` | `linearTiming` | 12 |
| Chart → next segment | `wipe({ direction: "from-left" })` | `springTiming` | 15 |
| Any → CTA | `fade()` | `linearTiming` | 10 |
| All other boundaries | `slide({ direction: "from-bottom" })` | `springTiming` | 15 |

**Side effect:** Existing fade-out interpolations at segment ends in each card component must be removed — `TransitionSeries` handles exit animation. Fade-in interpolations stay (they handle the within-segment entrance, separate from the transition).

**Files:** `package.json`, `BlogReel.tsx`, all 5 card components (remove exit fades)

---

## Section 2 — Typography

**Package:** `@remotion/google-fonts`

**Font replacements:**

| Current | New | Weight | Used in |
|---------|-----|--------|---------|
| Impact | Bebas Neue | 400 (only weight) | Hook text, stat numbers/labels, overlay text, chart title |
| Trebuchet MS | Poppins | 600 | Chart bar labels |
| (none) | Poppins | 400 | Subtitle text, CTA body text |

**Loading:** `loadFont()` calls added to `Root.tsx` — blocks render until fonts ready, no flash frames. One call per font/weight combination.

**CSS:** Replace all hardcoded `fontFamily: 'Impact'` and `fontFamily: 'Trebuchet MS'` strings across all card components and Subtitle.tsx with the loaded font family names returned by `loadFont()`.

**Files:** `Root.tsx`, `HookCard.tsx`, `StatCard.tsx`, `OverlayCard.tsx`, `ChartCard.tsx`, `CTACard.tsx`, `Subtitle.tsx`

---

## Section 3 — Ken Burns + Spring Tightening

### Ken Burns (PhotoBg.tsx)

Slow zoom on background image over segment duration using `useCurrentFrame` + `interpolate`.

```
scale: 1.0 → 1.08  (over full durationInFrames)
transformOrigin: varies by (segmentIndex % 3) → center / top-left / bottom-right
```

Implementation: `PhotoBg` receives `durationInFrames` and `segmentIndex` props. Uses `interpolate(frame, [0, durationInFrames], [1, 1.08], { extrapolateRight: 'clamp' })` for scale. Transform applied to the `<Img>` element directly.

### Spring Parameter Tightening

All card components updated:

| Parameter | Current range | New value |
|-----------|-------------|-----------|
| `damping` | 14–22 | 30 |
| `stiffness` | 60–120 | 160 |
| Chart bar stagger delay | 0.12s per bar | 0.08s per bar |
| Count-up duration | 1.2s | 0.9s |

Uniform values across all cards — consistent feel, no card feels slower than another.

**Files:** `PhotoBg.tsx`, `HookCard.tsx`, `StatCard.tsx`, `OverlayCard.tsx`, `ChartCard.tsx`, `CTACard.tsx`

---

## Files Changed (full list)

| File | Changes |
|------|---------|
| `package.json` | Add `@remotion/transitions`, `@remotion/google-fonts` |
| `Root.tsx` | Add `loadFont()` calls for Bebas Neue + Poppins 400/600 |
| `BlogReel.tsx` | `Series` → `TransitionSeries`, add `<Transition>` between segments |
| `PhotoBg.tsx` | Add `durationInFrames` + `segmentIndex` props, Ken Burns interpolation |
| `HookCard.tsx` | Remove exit fade, tighten spring, Bebas Neue |
| `StatCard.tsx` | Remove exit fade, tighten spring, Bebas Neue |
| `OverlayCard.tsx` | Remove exit fade, tighten spring, Bebas Neue |
| `ChartCard.tsx` | Remove exit fade, tighten spring params + stagger, Bebas Neue/Poppins |
| `CTACard.tsx` | Remove exit fade, tighten spring, Bebas Neue |
| `Subtitle.tsx` | Replace Trebuchet MS → Poppins 400 |

**Total: 10 files**

---

## Risk & Rollback

- Transition frame counts (10–18) are subtracted from segment duration — segments effectively shorten slightly. If narration clips, increase segment windows in reel-script.md by the transition frame count (0.3–0.6s per boundary).
- Ken Burns scale max of 1.08 is conservative — won't clip text. If photos are portrait-oriented and crop badly, fallback is `transformOrigin: center`.
- Font swap is visual-only — no timing impact.
- Rollback: `git revert` the commit. No data changes.

---

## Success Criteria

- Renders complete without error on both `local-business-repeat-customers` and `silver-storage-options`
- No narration clipping (audio completes before segment ends)
- Fonts render correctly on all 5 segment types
- Transitions visible between each segment boundary
- Background photos visibly animate (subtle, not jarring)
- File size stays under 15 MB per reel
