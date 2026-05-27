# Blog Reel Renderer — Design Spec
Date: 2026-05-25

## Goal

Convert any blog post's `reel-script.md` into a finished 1080x1920 MP4 with animated visuals, AI voice narration, and background music. One command per post. Zero manual editing.

The system is fully data-driven — no hardcoded segment counts, content, or durations. Every reel is assembled at runtime from its script JSON. Different posts produce different segment sequences, different lengths, different card types, and different visual layouts automatically. The renderer doesn't know or care what the post is about.

---

## Stack

| Layer | Tool | Notes |
|---|---|---|
| Visuals | Remotion + React | Bundles its own ffmpeg |
| Voice | `msedge-tts` npm package | Free, no API key, natural voices |
| Music | Bundled royalty-free ambient tracks (4-5 files) | Included in repo |
| Output | 1080x1920 H.264 MP4, 30fps | Ready to post directly |

---

## Project Structure

```
/Users/nick/Documents/New project/video/
├── package.json
├── remotion.config.ts
├── src/
│   ├── Root.tsx                  # registers all Remotion compositions
│   ├── compositions/
│   │   └── BlogReel.tsx          # main composition — reads script.json, sequences all cards
│   ├── components/
│   │   ├── HookCard.tsx          # full-screen stat, 3s hold
│   │   ├── OverlayCard.tsx       # dark bg, cyan stat, white label
│   │   ├── StatCard.tsx          # text-only stat card (no image)
│   │   ├── ChartCard.tsx         # animated bar chart (grows on entry)
│   │   └── CTACard.tsx           # brand colors, "link in comments"
│   └── types.ts                  # shared TypeScript types
├── scripts/
│   ├── parse-script.mjs          # reel-script.md → script.json
│   └── generate-audio.mjs        # narration lines → MP3 files via Edge TTS
├── music/
│   ├── ambient-01.mp3            # royalty-free ambient track 1
│   ├── ambient-02.mp3            # track 2
│   └── ...                       # 4-5 total
└── out/
    └── [post-slug]/
        ├── audio/                # per-segment narration MP3s
        └── [post-slug].mp4       # final rendered video
```

---

## Script JSON Schema

`parse-script.mjs` converts `reel-script.md` to this structure:

```json
{
  "title": "How to Store Silver Without Losing It",
  "totalDuration": 50,
  "segments": [
    {
      "type": "hook",
      "startSec": 0,
      "endSec": 3,
      "text": "65% of burglars were personally known to the victim.",
      "narration": null
    },
    {
      "type": "overlay",
      "startSec": 3,
      "endSec": 12,
      "text": "A hiding spot is not protection.",
      "narration": "Burglars spend 10 to 12 minutes inside a home..."
    },
    {
      "type": "cta",
      "startSec": 42,
      "endSec": 50,
      "text": "Full storage guide — link in comments.",
      "narration": "Full breakdown with safe specs..."
    }
  ]
}
```

Segment types: `hook`, `overlay`, `stat`, `chart`, `cta`

---

## Visual Components

### Brand tokens (shared across all components)
```ts
const BRAND = {
  bg: '#041018',
  cyan: '#58d6ff',
  white: '#ffffff',
  font: 'Impact',
  width: 1080,
  height: 1920,
}
```

### HookCard
- Full-screen `#041018` background
- Stat text: white Impact, ~120px, centered
- Fade in 0.3s, hold, fade out 0.3s

### OverlayCard
- Full-screen `#041018` background
- Stat line: `#58d6ff` Impact ~100px
- Label below: white Inter/sans ~48px
- Slide up from bottom on entry

### ChartCard
- Dark background
- Horizontal bars animate from 0 → final width over 1s
- Bar color: `#58d6ff`, label: white
- Used when script segment type is `chart`

### CTACard
- `#041018` background
- Main text: white Impact
- Sub-text: `#58d6ff`
- Simple fade in

---

## Audio Pipeline

### Voice narration
1. `generate-audio.mjs` reads `script.json`
2. Sends each `narration` string to Edge TTS (`msedge-tts`)
3. Saves per-segment MP3 to `out/[slug]/audio/segment-N.mp3`
4. Each MP3 trimmed/padded to fit its segment duration

### Background music
- One ambient track selected per render (default: `ambient-01.mp3`)
- Ducked to ~15% volume under narration
- Looped if video is longer than track
- Mixed in Remotion via `<Audio>` component

---

## CLI Commands

Added to main `package.json`:

```json
{
  "video:parse": "node video/scripts/parse-script.mjs",
  "video:audio": "node video/scripts/generate-audio.mjs",
  "video:render": "npx remotion render video/src/Root.tsx BlogReel",
  "video": "npm run video:parse && npm run video:audio && npm run video:render"
}
```

**Full render:**
```bash
npm run video -- --post=silver-storage-guide
```

**Output:** `video/out/silver-storage-guide/silver-storage-guide.mp4`

---

## Data Flow

```
blog/[slug]/reel-script.md
        ↓ parse-script.mjs
video/out/[slug]/script.json
        ↓ generate-audio.mjs
video/out/[slug]/audio/segment-N.mp3
        ↓ Remotion render (BlogReel composition)
video/out/[slug]/[slug].mp4  ← finished video, ready to post
```

---

## Error Handling

- Missing `reel-script.md`: parse step exits with clear message listing the expected path
- Edge TTS failure: log segment number and narration text, skip segment audio (video still renders, silent on that segment)
- Missing music file: fall back to no background music, log warning

---

---

## Performance Feedback System

Every reel is tracked. After posting, Nick logs performance numbers back into the system. Over time the system surfaces what works, and Claude uses that data when writing future scripts.

### What gets tracked

Per reel, two things are stored: **creative choices** (logged automatically at render time) and **performance metrics** (logged manually after posting).

**Creative metadata (auto-logged at render):**
- Hook type: `stat` | `question` | `statement`
- Segment count and types used
- Total duration (seconds)
- Music track used
- Post slug and blog category

**Performance metrics (manually logged after posting):**
- Platform: `facebook` | `instagram` | `tiktok` | `youtube`
- Views, likes, comments, shares
- Watch time % (if available)
- Date posted

### Storage

```
video/data/
├── performance.json       # all historical records, append-only
└── performance-report.md  # auto-generated summary (updated each log)
```

### Logging feedback

```bash
npm run video:feedback -- \
  --post=silver-storage-guide \
  --platform=facebook \
  --views=1200 \
  --likes=45 \
  --shares=12 \
  --watchtime=62
```

Or interactive mode (no flags needed):
```bash
npm run video:feedback
# prompts: which post? which platform? views? likes? shares? watch time %?
```

### Performance report

`video:feedback` auto-regenerates `performance-report.md` after each log. Report shows:

- Top 5 reels by views per platform
- Average views by hook type (stat vs question vs statement)
- Average views by segment count
- Average views by duration bucket (0-30s, 30-60s, 60s+)
- Best-performing music track
- Best-performing blog category

### Using data to optimize

Before writing a new `reel-script.md`, Claude reads `performance-report.md` and `performance.json` to:
- Recommend hook type based on what's performing
- Suggest optimal duration for the platform
- Flag segment patterns that correlate with low watch time
- Note which music track has the best average engagement

---

## Standard Operating Procedure — Reel Creation Cycle

Every reel follows this loop:

```
1. WRITE
   Claude generates reel-script.md for the post
   (references performance-report.md to optimize hook/structure)

2. RENDER
   npm run video -- --post=[slug]
   → MP4 output in video/out/[slug]/

3. POST
   Upload MP4 to platforms manually
   Note the date and platform

4. REVIEW (24-48h after posting)
   npm run video:feedback -- --post=[slug] --platform=[x] --views=N ...
   → performance.json updated
   → performance-report.md regenerated

5. OPTIMIZE
   Before next reel: Claude reads report and adjusts creative direction
   Loop repeats
```

This SOP applies to every reel from day one, even before there is enough data to show patterns. The data accumulates and becomes useful after ~5-10 reels.

---

## Out of Scope

- AI image/B-roll generation (text cards only for now)
- Auto-publishing to social platforms
- Multiple voice options (single Edge TTS voice to start)
- Captions/subtitles burned in (can add later)
- Automated platform API pull for metrics (manual logging for now)
