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

### 2. Voice (cloned — one-time setup)

Custom voice uses Coqui XTTS v2 (free, local, no cloud). Auto-activates when `voice-sample/voice-reference.wav` exists.

**Record your voice sample:**
1. Open QuickTime → File → New Audio Recording
2. Read for 15–20 seconds naturally (see `voice-sample/README.md` for the script)
3. Export as WAV → save to `video/voice-sample/voice-reference.wav`
4. Test: `node scripts/test-voice.mjs` (first run downloads ~1.8 GB model)

Until the WAV file exists, renders fall back to macOS Zoe (Premium).

### 3. Pexels API key (enables background photos when no blog image exists)
Key is stored in `video/.env` (gitignored). Already configured.

To render with photos active:
```bash
cd video && export $(cat .env | xargs) && node scripts/render.mjs --post=<slug>
```

Or add to your shell profile so it's always set:
```bash
echo 'export PEXELS_API_KEY=your_key_here' >> ~/.zprofile
```

### 4. Music
10 CC0 ambient tracks live at `video/public/music/`. All are public domain (CC0) from the "Peaceful Instrumental Background Music" collection on Internet Archive (`peaceful-tracks`).

| File | Approx length |
|------|--------------|
| ambient-01.mp3 | 46s (short loop) |
| ambient-02.mp3 | 16 min |
| ambient-03.mp3 | 10 min |
| ambient-04.mp3 | 6 min |
| ambient-05.mp3 | 5 min |
| ambient-06.mp3 | 8 min |
| ambient-07.mp3 | 6.5 min |
| ambient-08.mp3 | 7.8 min |
| ambient-09.mp3 | 5.6 min |
| ambient-10.mp3 | 6.3 min |

**Pick rule:** Use the day-of-year mod 10 to pick a track deterministically: `N = ($(date +%j) % 10) + 1`, zero-pad to two digits. Example: day 27 → `(27 % 10) + 1 = 8` → `ambient-08.mp3`. Run this in the shell before the render command:

```bash
TRACK=$(printf "ambient-%02d.mp3" $(( ($(date +%j) % 10) + 1 )))
```

Then pass `--music=$TRACK`. Never default to `ambient-01` every time.

To add more: drop MP3s into `video/public/music/` and pass `--music=filename.mp3` at render time.

---

## Per-Post Workflow

### Step 1 — Read reel-data.md

Every blog post has a `blog/<slug>/reel-data.md` companion file with the hook, stats, chart data, CTA, and Pexels queries pre-extracted. Read this file — do not re-read `index.html`.

If `reel-data.md` is missing (legacy posts only), fall back to reading the blog HTML and create the reel-data.md before proceeding.

The reel script maps directly from reel-data.md sections:
- `hook` → HOOK segment
- `## stats` entries → Overlay segments (one per stat)
- `## chart` → Chart segment (omit if absent)
- `## cta` → CTA segment
- `## pexels_queries` → passed to fetch-photos.mjs automatically

### Step 2 — Plan segment layout before writing

**Pick a format first:**

| Format | Target length | Best for |
|--------|--------------|----------|
| **Express** | 25–40s | Maximum reach — highest completion rates; 1 stat + chart or 2 stats; no sub-topics |
| **Standard** | 60–90s | Depth posts with 3+ stats and chart |
| **Extended** | 90–120s | Only if retention data supports it — never default to this |

Prefer Express when the blog post has one dominant stat or a single strong chart. Shorter = higher completion rate = more algorithm distribution.

**Segment planning:**
1. Count the stats from reel-data.md. Each stat = one Stat segment.
2. If reel-data.md has a `## chart`, include a Chart segment — required unless explicitly absent.
3. Group related numbers together. Never split a stat across two segments — the number and its label belong on the same slide.
4. Aim for 4–6 body segments (Standard) or 2–3 (Express). If you have too many stats, merge two weaker ones into one Overlay.
5. **Set segment duration from narration length, not the other way around.** Read the narration aloud mentally and count seconds. A 3-sentence narration needs ~12–15s. A 4-sentence narration needs ~15–20s. Never squeeze narration into a shorter window — audio cutoff is worse than a longer reel.
6. Total duration target: Express 25–40s, Standard 60–90s. Maximum: 2 minutes (120s).

### Step 3 — Write the reel script
Create `blog/<slug>/reel-script.md`:

```markdown
# Reel Script: [Title]
Generated: YYYY-MM-DD
Target length: XX seconds
Format: Express|Standard
Hook type: [see types below]

---

## HOOK (0–3s)
[Pick ONE hook type — see §Hook Formulas below]

---

## BODY

**Stat 1** (3–13s)
Text: 42% LABEL IN 5 WORDS OR FEWER
Narration: [2–4 sentences. Match what the blog says verbatim or close to it.]

**Chart** (13–26s)
Title: Chart Heading Here
Bars:
- Label: XX%
- Label: XX%
Narration: [Explain the data the same way the blog does]

**Overlay 1** (26–36s)
Text: SHORT PUNCHY CLAIM HERE
Narration: [2–3 sentences]

---

## CTA (46–52s)
Text: Full breakdown — link in comments.
Narration: [One sentence driving to the link. End with a save/share ask OR a direct question — see §CTA Rules.]

---

## DISCUSSION QUESTION
[One direct question to viewers — short, debatable, or opinion-inviting. This goes in the caption, NOT spoken aloud. Example: "What page do most visitors skip on your site?"]

---

## VISUAL DIRECTION
[Notes on which blog images to use for which segments]
```

**Critical rules — violations cause visual or audio bugs:**

**Text: fields**
- NEVER wrap Text values in quotes. Write: `Text: 42% MORE REVENUE` not `Text: "42% MORE REVENUE"`
- Stat label (the words after the number) must be 5 words or fewer. Long labels wrap badly on screen.
- If a stat is wordy — `"35% More Revenue for Businesses That Respond to Reviews"` — shorten the label: `35% MORE REVENUE FROM RESPONDING`
- Chart is REQUIRED if reel-data.md has a `## chart` section. Do not omit it.
- Stat segments auto-animate the number (count-up effect). Use them for all percentage/number stats.

**Timing and sync — subtitles and voice must stay aligned**
- Segment end time must be ≥ narration end time. The narration plays inside the segment window — if the segment ends before narration finishes, audio gets cut off and subtitles desync.
- Rule of thumb: 1 sentence ≈ 4–5 seconds at Zoe's pace. Count sentences, multiply, add 2s buffer.
  - 2 sentences → 10–12s minimum
  - 3 sentences → 14–17s minimum
  - 4 sentences → 18–22s minimum
- Chart segments have no voice narration timed to bars — allow 13–18s for bar animation + narration.
- HOOK is spoken text only (no graphic animation delay) — 3–5s is fine for one punchy sentence.
- CTA narration is typically 1 sentence — allow 6–8s minimum.
- When in doubt, add 3s to your estimate. A reel that breathes is better than one that cuts off.

**Total duration**
- Express format: 25–40s. Standard: 60–90s. Maximum: 2 minutes. No hard minimum — never rush content.

**No em dashes — ever**
- Never use `—` in any Text: field or Narration. Rewrite with a comma, period, or short new sentence.
- Wrong: `"Same metal as any Eagle or bar — just no brand name."`
- Right: `"Same metal as any Eagle or bar. No brand name."`
- This applies to hook text, stat labels, overlay text, CTA text, and all narration.

**Sound-off design — critical (80% of viewers watch muted)**
- The hook Text: must communicate the whole point without audio. A viewer who watches silently must understand what the reel is about from the text on screen alone.
- Every Stat Text: must be self-explanatory without narration. "42% MORE REVENUE" works. "42% IMPROVEMENT" does not.
- Every segment must have a Text: value — never leave a segment with only narration and no on-screen text.

Supported segment types: `Overlay`, `Stat`, `Chart`, `CTA`. Mix and match.

---

### Hook Formulas

Every reel hook must use one of these four patterns. Log the type in `Hook type:` at the top of the script so the optimization loop can track what works.

**1. Contradiction** — challenge a common belief
> "Everyone says [common advice] — but the data says the opposite."
> Silver: "Everyone says gold is the safe haven — silver has outperformed it 3 of the last 5 years."
> Tech: "Everyone says social media drives local customers — but 76% check your website first."

**2. Pain Point** — name a specific frustration the viewer has right now
> "If you [specific relatable situation], this is the reason why."
> Silver: "If you've been watching silver prices and still haven't bought, here's what you're actually waiting on."
> Tech: "If your phone rings less than it used to, your contact page might be the reason."

**3. Immediate Value** — promise a specific result in a specific time
> "[Number] things that [specific outcome] in [short time]."
> "3 pages every local business website needs — and why most sites skip two of them."

**4. Contrarian Stat** — lead with the most surprising number from the post, no context
> "[Shocking number]. [Label]."
> "76%. That's how many people check your site before they call."

**Hooks to avoid:**
- Rhetorical questions with no implied answer ("Have you ever wondered about silver?")
- Vague openers ("Here's something interesting...")
- Starting with "I" or the brand name
- Hooks that only work with audio — must land silently

---

### CTA Rules

The default CTA text ("Full breakdown — link in comments") stays. The narration must end with ONE of these:

**Save ask** (best for algorithm):
> "Save this if you're thinking about [topic]."

**Share ask** (second best):
> "Send this to someone who [relatable situation]."

**Discussion question** (best for comments):
> "What [specific choice/opinion related to post] — let me know in the comments."

Pick the one that fits the post. Save asks work best for silver/investing content. Share asks work best for tech/business content. Do not use all three — pick one.

The `## DISCUSSION QUESTION` field in the script becomes the last line of the Facebook/Instagram caption (separate from the CTA). It should be one short, opinion-inviting question that a real viewer would actually answer.

### Step 3 — Place blog images (optional but recommended)
If the blog post has strong images, use them instead of Pexels stock:

```bash
# Copy a blog image to use as a specific segment background
cp blog/<slug>/images/hero.jpg video/public/photos/<slug>/segment-0.jpg
cp blog/<slug>/images/chart-screenshot.jpg video/public/photos/<slug>/segment-3.jpg
```

The photo fetcher skips any segment that already has a valid file (>1 KB) in `public/photos/<slug>/`.

**Pexels rate limits and corrupt files**

Pexels occasionally returns `concurrency_exceeded` as the image body instead of an HTTP error. This writes a ~20-byte file that renders as a black frame. The scripts now detect and skip files under 1 KB automatically — but if a run produces black frames on specific segments, check for corrupt stubs:

```bash
# Find any suspiciously small segment photos
find video/public/photos/<slug>/ -name "*.jpg" -size -1k

# Delete corrupt stubs and re-run fetch
rm video/public/photos/<slug>/segment-N.jpg
cd video && export $(cat .env | xargs) && node scripts/fetch-photos.mjs --post=<slug>
```

If rate limits persist across a full run, copy a valid sibling photo as a placeholder and render directly (skipping the full `render.mjs` pipeline which re-fetches every run):

```bash
# Use a sibling photo as fallback for the corrupt segment
cp video/public/photos/<slug>/segment-0.jpg video/public/photos/<slug>/segment-N.jpg

# Then render directly without re-fetching
cd video && npx remotion render src/Root.tsx BlogReel out/<slug>/<slug>.mp4 \
  --props='{"slug":"<slug>"}'
```

### Step 4 — Render

Pick a random track from `ambient-01` through `ambient-10` (see §Setup > Music). Always pass `--music=` explicitly — do not let the renderer default.

Each blog post produces **3 reels**. Render them in sequence — one per reel-data section.

```bash
cd video && export $(cat .env | xargs) && \
  node scripts/render.mjs --post=<slug> --reel=1 --music=ambient-XX.mp3 && \
  node scripts/render.mjs --post=<slug> --reel=2 --music=ambient-XX.mp3 && \
  node scripts/render.mjs --post=<slug> --reel=3 --music=ambient-XX.mp3
```

Use same `ambient-XX.mp3` for all 3 reels in a session (consistent feel per day).

Output:
```
video/out/<slug>/<slug>-reel-1.mp4
video/out/<slug>/<slug>-reel-2.mp4
video/out/<slug>/<slug>-reel-3.mp4
```

### Step 5 — Review checklist
- [ ] Numbers animate and count up correctly
- [ ] Chart bars fully visible and centered (not cut off)
- [ ] Subtitles match what Zoe is saying and stay in sync throughout
- [ ] No narration gets cut off — audio completes before the segment ends
- [ ] No segment feels rushed — voice, subtitle, and slide all finish together
- [ ] Background photos don't overpower the text
- [ ] CTA glow is visible and readable
- [ ] Blog data matches reel data exactly

**If timing is off:** extend the segment's end timestamp in `reel-script.md` (e.g. `(23–38s)` → `(23–43s)`) and adjust all subsequent start times to match. Re-render. Never shorten narration to fit a timestamp — always extend the timestamp instead.

### Step 6 — Commit, deploy, and post

**Commit reel files:**
```bash
git add blog/<slug>/reel-data.md blog/<slug>/reel-script.md blog/<slug>/photo-post.svg blog/<slug>/social-copy.json blog/topic-history.md video/out/<slug>/
git commit -m "feat(reel): [Post Title]"
git push origin main
```

**Deploy blog to Cloudflare** (push does NOT auto-deploy):
```bash
npx wrangler deploy
```

Verify the post is live at `https://fuseddistribution.com/blog/<slug>/` before posting.

**Post reels (automated via Postiz — see SOCIAL-SOP.md):**
Assets: `video/out/<slug>/[slug]-reel-1.mp4`, `-reel-2.mp4`, `-reel-3.mp4`
Captions: `blog/<slug>/social-copy.json` → `reels.reel-1` through `reels.reel-3`

> **Postiz not yet configured:** Until Postiz is running on the Windows PC, post manually.
> Upload each MP4 and use captions from `social-copy.json` for each reel.

**Timing matters — first 6 hours are the algorithm's testing window:**
- Post when your audience is active (Facebook: Tue–Thu 9am–1pm local; Instagram: M/W/F 9–11am)
- Respond to every comment within the first hour — each reply counts as a new engagement signal
- Do not post again on the same platform within 3 hours of this reel — dilutes the testing window

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

## Performance Targets

Use these as pass/fail benchmarks for the finance and local business niche:

| Metric | Target | Strong |
|--------|--------|--------|
| Intro retention (0–3s) | >50% | >70% |
| Overall completion rate | >35% | >50% |
| Save rate | >1% | >3% |
| Share rate | >0.5% | >1% |
| Comment rate | >0.5% | meaningful replies |

If intro retention is low → the hook isn't working. Try a different hook type next post.
If overall completion is low → reel is too long, or a mid-reel segment is losing people. Check the retention graph drop-off point.
If save/share is low → content is good to watch but not worth keeping. Increase stat density or improve the CTA ask.

---

## Optimization Loop

After 5+ posts in `performance.json`, review the report:
- Which hook types get the most views? → write more of those
- Contradiction and Pain Point hooks consistently outperform generic stat hooks for business/silver content
- Which duration buckets perform best? → Express vs Standard
- Which music tracks correlate with engagement? → use those
- Which CTA type (save vs share vs question) drives the most saves/comments? → standardize on it
- Drop-off on long segments? → shorten or cut; never pad narration

The report auto-ranks top posts and averages by hook type, duration, and music.
