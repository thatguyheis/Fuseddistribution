# Reel SOP Enhancements — Design Spec
Date: 2026-06-05

## Scope

Forward-looking SOP improvements only. No retroactive changes to existing reels.

The goal is higher quality output on every future reel: stats that are readable without audio, real video clips in the background, and subtitles that stay in sync. The specific numbers used as examples below (211M oz, 72%, etc.) are illustrative only — they show what the new fields look like, not literal values to target.

**Deliverables:**
1. `video/REEL-SOP.md` — new sections and updated rules covering all three tracks
2. `blog/BLOG-SOP.md` §11 — updated `reel-data.md` format with new required fields
3. Supporting code changes that make the new SOP rules executable

## Overview

Three parallel tracks to improve reel quality:

- **Track A** — Visual enrichment: inline stat graphics + explanation text on every stat segment
- **Track B** — Media pipeline: actual video clip playback, dual source (Pixabay + Pexels)
- **Track C** — Subtitle sync: ffprobe-based timing replaces estimated word rate

---

## Track A — Visual Enrichment (StatCard)

### Problem
Stat segments show a number + short label (e.g. `211M OZ ANNUAL DEFICIT`). Muted viewers get no context. No graphic reinforces the data.

### Solution

Two new required fields on every stat entry in `reel-data.md`:

```markdown
- text: 211M OZ ANNUAL DEFICIT
  explanation: More consumed than mined. Third straight year.
  graphic_type: gap
  graphic:
    a_label: Supply
    a_value: 998
    b_label: Demand
    b_value: 1209
    unit: M oz
  narration: Silver's global market ran a 211 million ounce deficit...
```

### 8 Graphic Types

| Type | Use case | Required fields |
|------|----------|----------------|
| `gap` | Two-value comparison with gap (supply/demand, revenue/cost) | `a_label`, `a_value`, `b_label`, `b_value`, `unit` |
| `percent_fill` | Single percentage as horizontal fill bar with remainder | `value`, `label`, `remainder_label` |
| `percent_pie` | Single percentage as animated donut chart | `value`, `label`, `remainder_label` |
| `growth` | Before/after comparison (year-over-year, then vs now) | `from_value`, `from_label`, `to_value`, `to_label`, `unit` |
| `timeline` | Duration range bar with milestone labels | `min`, `max`, `unit`, `label` |
| `streak` | Consecutive count (Nth straight year/month) | `count` (total dots shown), `current` (1-based index of active dot), `unit` |
| `drain` | Depleting inventory/reserve bar | `peak_value`, `peak_label`, `current_value`, `current_label`, `unit` |
| `gauge` | Position on a scale (low→high) | `value`, `min`, `max`, `low_label`, `high_label` |
| `none` | Stat doesn't fit any graphic type | — |

### New Component: `InlineGraphic.tsx`

`src/components/InlineGraphic.tsx` — renders correct graphic based on `graphic_type`. Each graphic animates on entry using `spring()`. Exported as single component accepting `type` + `data` props.

### StatCard Changes

`StatCard.tsx` updated to render:
1. Animated number (existing)
2. Label (existing)
3. `explanation` text — Poppins 400, ~18px, muted cyan, centered
4. `InlineGraphic` — below explanation, max height ~180px

### reel-data.md Format Change

`explanation:` and `graphic_type:` are **required** on every stat. `graphic:` block required unless `graphic_type: none`. SOP agent that writes reel-data must populate all three fields for every stat entry.

---

## Track B — Media Pipeline

### Problem
`fetch-photos.mjs` fetches Pexels videos but extracts a still frame and deletes the MP4. `PhotoBg.tsx` uses `<Img>` — no video playback. Only one source (Pexels). No actual video clips in any render.

### Solution

#### New file: `scripts/fetch-media.mjs` (replaces `fetch-photos.mjs`)

Priority order per segment:
1. Pixabay video (portrait, small size MP4)
2. Pexels video (portrait, small size MP4)
3. Pixabay photo (large, portrait)
4. Pexels photo (large, portrait)

Chart, question, cta segments: skip video, go straight to photo (clean bg needed).

Output:
- MP4 saved to `public/videos/<slug>/segment-N.mp4`
- Thumbnail JPG saved to `public/photos/<slug>/segment-N.jpg`
- `out/<slug>/media.json` — replaces `photos.json`:

```json
{
  "0": { "type": "video", "src": "videos/slug/segment-0.mp4", "thumb": "photos/slug/segment-0.jpg", "source": "pixabay" },
  "1": { "type": "photo", "src": "photos/slug/segment-1.jpg", "source": "pexels" }
}
```

Existing valid files (>1KB photo, >10KB video) are skipped — no re-fetch on re-render.

#### `.env` additions

Both keys already set in `video/.env` (gitignored). No further setup needed.

#### Renamed component: `MediaBg.tsx` (replaces `PhotoBg.tsx`)

Reads `media.json` at render time. Per segment:
- `type: 'video'` → Remotion `<Video>` component, `muted`, `playbackRate={0.75}` for slow cinematic feel, loop if segment longer than clip
- `type: 'photo'` → `<Img>` with Ken Burns (existing)
- No entry → dark background fallback (existing)

#### `reel-data.md` format change

`pexels_queries` section renamed `media_queries`. Optional `prefer:` field per entry:

```markdown
## media_queries
- segment: 0
  query: "silver bullion bars stack"
  prefer: video
- segment: 3
  query: "solar panels photovoltaic"
  prefer: video
- segment: 5
  query: "silver coins collection"
  prefer: photo
```

`prefer` defaults to `video` if omitted.

#### `render.mjs` update

Replace `fetch-photos.mjs` call with `fetch-media.mjs`. Pass both API keys from env.

#### Backward compatibility

`photos.json` still written as alias (same paths, type always `photo`) so any existing code referencing it doesn't break. Deprecated — remove after one sprint.

---

## Track C — Subtitle Sync Fix

### Problem
`generate-captions.mjs` estimates caption timing using 2.5 words/sec. Zoe TTS speaks faster. Subtitles appear after the spoken word — drift worsens across longer narrations.

### Solution

After `generate-audio.mjs` writes each `.m4a`, run `ffprobe` to get actual audio duration:

```bash
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 segment-N.m4a
```

`generate-captions.mjs` updated flow:
1. Read narration text for segment
2. Read actual `.m4a` duration from ffprobe (or from `audio-durations.json` written by `generate-audio.mjs`)
3. Split narration into caption chunks (existing logic — max 120 chars, sentence boundaries)
4. Distribute chunks proportionally: `chunk_start = segment_start + (chunk_index / total_chunks) * actual_duration`
5. Add 150ms lead offset so subtitle appears fractionally before the word

`generate-audio.mjs` change: after writing each `.m4a`, append actual duration to `out/<slug>/audio-durations.json`:

```json
{ "0": 4.3, "1": 12.7, "2": 8.1 }
```

`generate-captions.mjs` reads this file instead of re-running ffprobe.

### SOP pre-render checklist addition

```
- [ ] Scrub to 3 random mid-video points — subtitle text matches spoken word within 0.5s
```

---

## File Change Summary

| File | Change |
|------|--------|
| `src/components/InlineGraphic.tsx` | New — 8 graphic types |
| `src/components/StatCard.tsx` | Add explanation + InlineGraphic render |
| `src/components/MediaBg.tsx` | New — replaces PhotoBg.tsx, handles video + photo |
| `src/components/PhotoBg.tsx` | Deprecated — keep as thin wrapper calling MediaBg |
| `scripts/fetch-media.mjs` | New — replaces fetch-photos.mjs, dual source, saves MP4s |
| `scripts/fetch-photos.mjs` | Deprecated — thin wrapper calling fetch-media |
| `scripts/generate-audio.mjs` | Write `audio-durations.json` after each segment |
| `scripts/generate-captions.mjs` | Read actual durations, proportional chunk distribution |
| `scripts/render.mjs` | Call fetch-media instead of fetch-photos |
| `video/.env` | Add PIXABAY_API_KEY (already done) |
| `video/REEL-SOP.md` | Document all 3 tracks, new reel-data format, media_queries |

---

## reel-data.md Full Updated Format

```markdown
# Reel Data: [slug]
topic: silver|tech
format: long-form

hook: Strongest number or claim from the post.
hook_type: contrarian_stat|pain_point|immediate_value|contradiction

## stats
- text: 211M OZ ANNUAL DEFICIT
  explanation: More consumed than mined. Third straight year.
  graphic_type: gap
  graphic:
    a_label: Supply
    a_value: 998
    b_label: Demand
    b_value: 1209
    unit: M oz
  narration: 2-4 sentences matching blog wording.

- text: 72% BYPRODUCT MINING
  explanation: Silver output tied to copper, gold, zinc decisions
  graphic_type: percent_fill
  graphic:
    value: 72
    label: Byproduct
    remainder_label: Primary
  narration: ...

- text: 3RD STRAIGHT YEAR IN DEFICIT
  explanation: Consecutive annual deficits signal a structural imbalance
  graphic_type: streak
  graphic:
    count: 3
    current: 3
    unit: years
  narration: ...

## chart
title: Chart heading
bars:
  - Label: XX%
narration: ...

## question
text: ONE QUESTION IN CAPS
subtext: ENGAGEMENT DIRECTIVE
narration: Follow for more silver news.

## shared
discussion_question: ...
hashtags: #Tag1 #Tag2

## media_queries
- segment: 0
  query: "silver bullion bars stack"
  prefer: video
- segment: 2
  query: "silver mine production underground"
  prefer: video
```

---

## REEL-SOP.md Changes

1. **§11 reel-data.md** — update format, add `explanation`/`graphic_type`/`graphic` as required fields, rename `pexels_queries` → `media_queries`, add `prefer:` field docs
2. **§Setup** — document Pixabay API key alongside Pexels
3. **New §: Graphic Types** — table of 8 types with field definitions and when to use each
4. **New §: Media Priority** — Pixabay video → Pexels video → Pixabay photo → Pexels photo
5. **§Step 4 Render** — note `fetch-media.mjs` handles both sources automatically
6. **§Step 5 Review** — add subtitle sync scrub check
7. **§Pre-render audit checklist** — add subtitle timing check item
