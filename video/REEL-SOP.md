# Reel Creation — Standard Operating Procedure

## Overview

One command per blog post produces a finished 1080×1920 MP4 with:
- Narration via Zoe (Premium) macOS voice
- Subtitles cycling through the spoken text
- Animated graphics — number counters, chart bars, glowing CTA
- Background photos: **blog images first, Pexels as fallback**
- Ambient background music

---

## Setup (one-time)

### 1. Voice
Zoe (Premium) must be installed:
> System Settings → Accessibility → Spoken Content → System Voice → Customize → download **Zoe (Premium)**

### 2. Pexels API key (enables background photos when no blog image exists)
Key is stored in `video/.env` (gitignored). Already configured.

To render with photos active:
```bash
cd video && export $(cat .env | xargs) && node scripts/render.mjs --post=<slug>
```

Or add to your shell profile so it's always set:
```bash
echo 'export PEXELS_API_KEY=your_key_here' >> ~/.zprofile
```

### 3. Music
CC0 ambient track lives at `video/public/music/ambient-01.mp3`.
Add more: drop MP3s into `video/public/music/` and pass `--music=filename.mp3` at render time.

---

## Per-Post Workflow

### Step 1 — Gather blog graphics
Before writing the reel script, open the blog post and collect:
- **Charts and data graphics** — the blog already has SVG charts with the exact data. Mirror these in the reel script as `Chart` segments. Use the same labels, values, and title.
- **Hero images or photos** — if the blog has a strong header image, copy it to `video/public/photos/<slug>/segment-N.jpg` to use it as a background on the hook or a key segment. This takes priority over Pexels.
- **Key statistics** — pull the headline numbers directly from the blog. These become `Overlay` or `Stat` segments with number counter animations.

**The reel is a motion version of content already in the blog — not new content.** Every stat, chart, and claim should already exist in the post.

### Step 2 — Write the reel script
Create `blog/<slug>/reel-script.md`:

```markdown
# Reel Script: [Title]
Generated: YYYY-MM-DD
Target length: XX seconds

---

## HOOK (0–3s)
[One punchy line — stat, question, or bold claim pulled from the blog opening]

---

## BODY

**Overlay 1** (3–13s)
Text: [Stat from the blog — keep to one line]
Narration: [2–4 sentences. Match what the blog says verbatim or close to it.]

**Chart** (13–26s)
Title: [Chart heading — copy from the blog chart]
Bars:
- Label: XX%
- Label: XX%
Narration: [Explain the data the same way the blog does]

**Overlay 2** (26–36s)
Text: [Second key stat or claim]
Narration: [2–3 sentences]

---

## CTA (46–52s)
Text: [Call to action]
Narration: [One sentence driving to the link]

---

## VISUAL DIRECTION
[Notes on which blog images to use for which segments]
```

Supported segment types: `Overlay`, `Stat`, `Chart`, `CTA`. Mix and match.
Keep total duration under 60 seconds — 45–55s is the sweet spot.

### Step 3 — Place blog images (optional but recommended)
If the blog post has strong images, use them instead of Pexels stock:

```bash
# Copy a blog image to use as a specific segment background
cp blog/<slug>/images/hero.jpg video/public/photos/<slug>/segment-0.jpg
cp blog/<slug>/images/chart-screenshot.jpg video/public/photos/<slug>/segment-3.jpg
```

The photo fetcher skips any segment that already has a file in `public/photos/<slug>/`.

### Step 4 — Render
```bash
cd video && export $(cat .env | xargs) && node scripts/render.mjs --post=<slug>
```

With different music:
```bash
cd video && export $(cat .env | xargs) && node scripts/render.mjs --post=<slug> --music=ambient-02.mp3
```

Output: `video/out/<slug>/<slug>.mp4`

### Step 5 — Review checklist
- [ ] Numbers animate and count up correctly
- [ ] Chart bars fully visible and centered (not cut off)
- [ ] Subtitles match what Zoe is saying
- [ ] Narration timing fits each segment — nothing rushed or trailing off
- [ ] Background photos don't overpower the text
- [ ] CTA glow is visible and readable
- [ ] Blog data matches reel data exactly

If timing feels off, adjust the `(Xs–Ys)` timestamps in `reel-script.md` and re-render.

### Step 6 — Post
Upload `video/out/<slug>/<slug>.mp4` to Instagram Reels, TikTok, or Facebook Reels.
Copy the `## FACEBOOK CAPTION` and `## HASHTAGS` from the reel script.
Add the blog post URL in the first comment.

### Step 7 — Log performance
After 48–72 hours, log results:
```bash
cd video && node scripts/feedback.mjs --post=<slug> --platform=instagram --views=1200 --likes=85 --shares=12 --comments=6
```

Or run interactively:
```bash
cd video && node scripts/feedback.mjs
```

Review the auto-generated report at `video/data/performance-report.md`.

---

## Pipeline Steps (what render.mjs does internally)

| Step | Script | Output |
|------|--------|--------|
| 1. Parse script | `parse-script.mjs` | `out/<slug>/script.json` |
| 2. Narration audio | `generate-audio.mjs` | `public/audio/<slug>/segment-N.m4a` |
| 3. Background photos | `fetch-photos.mjs` | `public/photos/<slug>/segment-N.jpg` + `out/<slug>/photos.json` |
| 4. Render video | Remotion | `out/<slug>/<slug>.mp4` |
| 5. Log feedback | `feedback.mjs` | `data/performance.json` + `data/performance-report.md` |

Re-run any step individually:
```bash
node video/scripts/parse-script.mjs --post=<slug>
node video/scripts/generate-audio.mjs --post=<slug>
PEXELS_API_KEY=... node video/scripts/fetch-photos.mjs --post=<slug>
```

---

## Visual Style Reference

| Element | Value |
|---------|-------|
| Background | `#041018` (dark navy) |
| Accent | `#58d6ff` (cyan) |
| Text | `#ffffff` white / `#afc6cf` muted |
| Font | Impact (stats/titles), Trebuchet MS (chart labels) |
| Format | 1080×1920 portrait @ 30fps |
| Voice | Zoe (Premium) via macOS `say` |
| Music | Ambient MP3 at 15% volume |
| Subtitles | Sentence-by-sentence, semi-transparent pill, bottom of frame |

---

## Optimization Loop

After 5+ posts in `performance.json`, review the report:
- Which hook types get the most views? → write more of those
- Which duration buckets perform best? → target that length
- Which music tracks correlate with engagement? → use those
- Drop-off on long segments? → shorten or cut

The report auto-ranks top posts and averages by hook type, duration, and music.
