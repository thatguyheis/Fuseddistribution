# Reel Creation — Standard Operating Procedure

## Overview

One command per blog post produces a finished 1080×1920 MP4 with:
- Narration via Chatterbox using Nick's local voice reference
- Subtitles cycling through the spoken text
- Animated graphics — number counters, chart bars, glowing CTA
- Background photos: **blog images first, Pexels as fallback**
- Ambient background music

---

## Setup (one-time)

### 0. Remotion skill (Claude Code)

The `remotion-best-practices` skill is installed globally (`~/.agents/skills/remotion-best-practices`). It teaches Claude correct Remotion patterns — `useCurrentFrame()`, `interpolate()`, `spring()`, `<Sequence>`, `<Composition>`. Without it, Claude defaults to web animation patterns that break during rendering.

To reinstall or update: `npx skills add remotion-dev/skills --global`

**Remotion version:** 4.0.479. Packages in use: `remotion`, `@remotion/cli`, `@remotion/transitions`, `@remotion/google-fonts`, `@remotion/layout-utils`. All must stay at the exact same version. Version drift is a render blocker.

**Text fitting:** Variable display text must use `fitText`, `measureText`, or `fillTextBox` from `@remotion/layout-utils` after fonts load. Measurement properties must match rendered font properties. Never hide overflow as a substitute for fitting text.

**Transitions between segments:** `@remotion/transitions` provides slide/fade/wipe between every segment boundary via `TransitionSeries` (replaces `Series`). Transition type is auto-selected by segment pair in `BlogReel.tsx`.

**Background photos:** Ken Burns slow zoom (1.0→1.08 scale) applied to every photo over its segment duration. Transform origin rotates per segment index (center → top-left → bottom-right).

**Hardware media budget:** Use video for the hook only. Use photos for body and question segments. Body clips with the current stock profiles can more than double render time on this Mac; Ken Burns photo motion is the reliable production default.

### 1. Voice (cloned, required)

Production narration uses Chatterbox locally with `voice-sample/voice-reference.wav`. The renderer defaults to `--voice=chatterbox` and fails clearly if the runtime or sample is unavailable. It never silently changes speakers.

Chatterbox processes all stale segments in one batch and loads the model once per reel. A 3-4 minute reel can spend 15-25 minutes in local synthesis on this Mac before Remotion starts. Quiet output during that batch is normal; progress can be checked by counting `video/public/audio/<slug>/segment-*_tmp.wav` files.

**Record your voice sample:**
1. Open QuickTime → File → New Audio Recording
2. Read for 15–20 seconds naturally (see `voice-sample/README.md` for the script)
3. Export as WAV → save to `video/voice-sample/voice-reference.wav`
4. Test a real segment with `node scripts/generate-audio.mjs --post=<slug> --voice=chatterbox --force`

Zoe is an opt-in recovery voice only: `--voice=zoe`. Use it only with Nick's approval.

### 3. Pexels API key (enables background photos when no blog image exists)
Key is stored in `video/.env` (gitignored). Already configured.

To render with photos active:
```bash
cd video && set -a && source .env && set +a && node scripts/render.mjs --post=<slug>
```

Or add to your shell profile so it's always set:
```bash
echo 'export PEXELS_API_KEY=your_key_here' >> ~/.zprofile
```

### 4. Pixabay API key (second video + photo source)
Key is stored in `video/.env` alongside the Pexels key. Already configured.

To verify:
```bash
grep PIXABAY_API_KEY video/.env
```

Both keys load automatically when you run: `cd video && set -a && source .env && set +a`

### 5. Music
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

**Pick rule:** Use the day-of-year mod 9 + 2 to pick a track, skipping `ambient-01` (only 46s — loops too visibly on Long Form reels): `N = ($(date +%j) % 9) + 2`, zero-pad to two digits. Example: day 27 → `(27 % 9) + 2 = 2` → `ambient-02.mp3`. Run this in the shell before the render command:

```bash
TRACK=$(printf "ambient-%02d.mp3" $(( ($(date +%j) % 9) + 2 )))
```

Then pass `--music=$TRACK`. Never use `ambient-01` for Long Form — it is too short and loops noticeably.

To add more: drop MP3s into `video/public/music/` and pass `--music=filename.mp3` at render time.

---

## Per-Post Workflow

### Step 0a — Pre-render environment check (REQUIRED in automated pipeline)

Before running any render, kill stale Remotion chrome processes from previous runs. Zombie processes consume render worker slots and cause silent failures where the MP4 is written but empty or < 5 MB.

```bash
# Kill any leftover chrome-headless-shell from prior Remotion runs
pkill -f "chrome-headless-shell" 2>/dev/null
echo "Cleared zombie Remotion processes"
```

Run this once before the first render of the session. If a previous pipeline run was interrupted (rate limit, crash), there will almost certainly be stale processes.

---

### Step 0 — Sub-Agent Review Procedure (REQUIRED when auditing AI-generated scripts)

Every reel script produced by an agent must pass this review before render. This step exists because agents compress work: they miss timing bugs, fabricate stats, drop chart data, and drift from the blog source. Nick or the Codex workflow owner audits every long-form reel before it goes to render.

---

#### Pre-render script audit checklist

**Fact accuracy (highest priority)**
- [ ] Every stat in the script exists verbatim or close in the blog HTML or reel-data.md — no invented numbers
- [ ] Narration matches what the blog actually says — no reworded claims that change meaning
- [ ] Chart bars match the reel-data.md `## chart` section exactly — correct labels, correct percentages
- [ ] Hook stat is sourced from the post — verify the exact number appears in reel-data.md or blog body

**Timing validation (run the formula on every segment)**
- [ ] For every segment: words in narration ÷ 2.5 + 2 ≤ segment window (endSec − startSec)
- [ ] HOOK narration is 1 sentence, ≤12 words, or window is ≥10s
- [ ] Chart segment window is ≥18s (bar animation + narration)
- [ ] QUESTION segment window is ≥10s (narration is short but visual needs time)
- [ ] No segment has narration cut off by a window that is too tight
- [ ] Total duration is within the declared format range (Long Form: 180–240s)

**Subtitle sync (verify after render)**
- [ ] Scrub to 3 random mid-video points — subtitle text matches spoken word within 0.5 seconds
- [ ] If subtitles lag: re-run `node scripts/generate-captions.mjs --post=<slug>` and re-render

**Script format rules**
- [ ] No em dashes (`—`) anywhere in Text or Narration fields
- [ ] All Text fields are written without surrounding quotes
- [ ] Stat Text labels are 5 words or fewer after the number
- [ ] Stat Text keeps its figure (e.g. "97% READ REVIEWS") — validate-reel errors if narration has a number but Text has none
- [ ] Narration writes "percent" not "%", "USA" not "US"
- [ ] Every segment has a Text field — no narration-only segments
- [ ] QUESTION Text is a complete question ending in "?" (parser voices it aloud)
- [ ] QUESTION segment has Text + Subtext, and the generated narration speaks the complete question before the follow line

**Content quality**
- [ ] Hook uses one of the four approved hook formulas (Contradiction / Pain Point / Immediate Value / Contrarian Stat)
- [ ] Segment count: 8–12 body segments (Long Form default)
- [ ] Content covers the full blog post arc — not just the top stats
- [ ] No filler segments — every slide earns its place with a distinct fact or angle
- [ ] QUESTION CTA type matches post topic (see taxonomy table)

---

#### Post-render audit checklist (in addition to Step 5 checklist)

- [ ] Scrub to 3 random points mid-video — subtitles match audio
- [ ] Watch the HOOK at full speed — text lands before narration ends
- [ ] Scrub to QUESTION slide — question text is large, readable, Subtext visible in cyan
- [ ] No black frames anywhere — all segments have photo or chart
- [ ] Audio does not cut off on any segment — listen through every segment end
- [ ] Chart bars all visible — none clipped by frame edge
- [ ] Total runtime matches declared target (within 10s)

---

#### Quality scoring rubric (use after post-render audit)

Score the reel 1–5 on each dimension before posting:

| Dimension | 1 | 3 | 5 |
|-----------|---|---|---|
| Hook strength | Generic opener | Clear hook, weak data | Stops scroll, stat or contradiction lands instantly |
| Fact density | Mostly filler | 2–3 strong stats | Every segment teaches something specific |
| Timing sync | Cutoffs present | Minor rushes | Every segment breathes, no cutoffs |
| Visual quality | Black frames, bad crop | Photos present, not ideal | Strong imagery, chart reads cleanly |
| CTA quality | Generic or missing | Question present | Controversial, specific, irresistible to answer |

**Minimum to post:** all dimensions ≥ 3. Any dimension scoring 1 = block and fix before posting.

---

### Step 1 — Read reel-data.md

Every blog post has a `public/blog/<slug>/reel-data.md` companion file with the hook, stats, chart data, CTA, and Pexels queries pre-extracted. Read this file — do not re-read `index.html`.

If `reel-data.md` is missing (legacy posts only), fall back to reading the blog HTML and create the reel-data.md before proceeding.

The reel script maps directly from reel-data.md sections:
- `hook` → HOOK segment
- `## stats` entries → Overlay segments (one per stat)
- `## chart` → Chart segment (omit if absent)
- `## question` → QUESTION closing segment (Long Form always ends here — no `## cta`)
- `## media_queries` → passed to fetch-photos.mjs automatically

### Step 2 — Plan segment layout before writing

**Only format: Long Form. Short-form is archived.**

| Format | Target length | Status |
|--------|--------------|--------|
| **Long Form** | 180–240s | **Only format — always use this** |

Long Form covers the full blog post arc. Facebook/Instagram group research shows 3–4 min outperforms short clips for engagement and comments with invested audiences.

**Segment planning (Long Form):**
1. Count every stat from reel-data.md. Each stat = one Stat segment.
2. If reel-data.md has a `## chart`, include a Chart segment — required unless explicitly absent.
3. Group related numbers together. Never split a stat across two segments.
4. Plan 8–12 body segments covering every major section of the blog post. If the article cannot support 8 distinct segments without filler, block the reel and improve the article source.
5. **Set segment duration from narration length, not the other way around.** A 3-sentence narration needs ~12–15s. A 4-sentence narration needs ~15–20s. Never squeeze narration into a shorter window — audio cutoff is worse than a longer reel.
6. Total duration must be 180–240s. Never pad with filler or exceed the range in the automated workflow.
7. Close with a `## QUESTION` segment (not CTA). See §Closing Segment Rules below.

### Step 3 — Write the reel script
Create `public/blog/<slug>/reel-script.md`:

```markdown
# Reel Script: [Title]
Generated: YYYY-MM-DD
Target length: XX seconds
Format: Long Form
Hook type: [see types below]

> **Timestamp rules (parser enforces these):**
> - All timestamps MUST be whole integers — no decimals. `(23–38s)` ✓ · `(23–38.5s)` ✗ — decimal timestamps cause the segment to be silently dropped.
> - The `Target length:` value must equal the last segment's end time exactly. If the last segment ends at 198s, write `Target length: 198 seconds` — not 200 or 210. Any value higher than the last endSec creates a black gap at the end of the video.

---

## HOOK (0–5s)
Text: YOUR HOOK STAT OR CLAIM IN CAPS
Narration: [One punchy sentence. No em dashes. See §Hook Formulas below for patterns.]

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

## QUESTION (XX–XXs)
Text: [THE QUESTION IN ALL CAPS (8 WORDS MAX, must read as a complete question) displayed big on screen]
Subtext: [ENGAGEMENT DIRECTIVE (5 WORDS MAX)]
Narration: [Silver posts: "Follow for more silver news." / Tech posts: "Follow for more tips to grow your business."]

> The parser now **voices the on-screen question**: when Narration is empty or only
> the canned "Follow for more…" line, it prepends the spoken question so the displayed
> question is read aloud (audio matches the card). Therefore the `Text:` must be a
> complete, self-contained question — not a truncated fragment. validate-reel.mjs warns
> if the question text does not end with "?".

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
- Rule of thumb: use `words / 2.5 + 2` seconds as the minimum planning window, then verify against the generated Chatterbox audio.
  - 2 sentences → 10–12s minimum
  - 3 sentences → 14–17s minimum
  - 4 sentences → 18–22s minimum
- Chart segments have no voice narration timed to bars — allow 13–18s for bar animation + narration.
- HOOK is spoken text only (no graphic animation delay) — 3–5s is fine for one punchy sentence.
- CTA narration is typically 1 sentence — allow 6–8s minimum.
- When in doubt, add 3s to your estimate. A reel that breathes is better than one that cuts off.

**Total duration**
- Long Form: 180–240s. This is a hard automated range. Never rush content or pad with filler.

**No em dashes — ever**
- Never use `—` in any Text: field or Narration. Rewrite with a comma, period, or short new sentence.
- Wrong: `"Same metal as any Eagle or bar — just no brand name."`
- Right: `"Same metal as any Eagle or bar. No brand name."`
- This applies to hook text, stat labels, overlay text, CTA text, and all narration.

**TTS pronunciation rules — apply to all Narration fields**
- Write `USA` not `US` when referring to the United States. TTS reads `US` as the word "us".
- Write the word `percent` not the symbol `%`. TTS reads `%` literally or skips it.
- Wrong: `"US inflation hit a 40-year high. Silver gained 107%."`
- Right: `"USA inflation hit a 40-year high. Silver gained 107 percent."`
- The normalization script also handles these automatically, but write them correctly in the source too.

**Sound-off design — critical (80% of viewers watch muted)**
- The hook Text: must communicate the whole point without audio. A viewer who watches silently must understand what the reel is about from the text on screen alone.
- **No decimals or mid-word breaks in HOOK Text.** Numbers like `78.9%` or `1.2M` cause unexpected line breaks in the overlay renderer. Round to whole numbers (`79%`, `1M`) or spell out (`over 1 million`). This applies to all `Text:` fields but is most visible on the HOOK where text is large.
- Every Stat Text: must be self-explanatory without narration. "42% MORE REVENUE" works. "42% IMPROVEMENT" does not.
- **The figure must stay in the Stat Text.** If the narration states a number (e.g. "97 percent…", "10 reviews"), the on-screen Text must include that number. `validate-reel.mjs` now **errors and blocks render** on a stat whose narration has a figure but whose Text has none (years 1900–2100 are ignored). Stripping the number out of the title — "OF CONSUMERS READ REVIEWS" instead of "97% READ REVIEWS" — was the #1 defect found in the 2026-06-24 audit.
- Every segment must have a Text: value — never leave a segment with only narration and no on-screen text.

Supported segment types: `Overlay`, `Stat`, `Chart`, `CTA`, `Question`. Mix and match. Use `Question` as the closing segment for Long Form reels.

---

### Hook Formulas

Every reel hook must use one of these four patterns. Log the type in `Hook type:` at the top of the script so the optimization loop can track what works.

**1. Contradiction** — challenge a common belief
> "Everyone says [common advice]. The data says the opposite."
> Silver: "Everyone says gold is the safe haven. Silver has outperformed it 3 of the last 5 years."
> Tech: "Everyone says social media drives local customers. But 76 percent check your website first."

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

### Closing Segment Rules

**Long Form reels use `## QUESTION` (not `## CTA`).**

The QUESTION segment is the last slide. Goal: drive comments directly on the video. The algorithm counts every comment as a re-engagement signal — more comments in the first hour = wider distribution.

**Narration** — match the content pillar:
- Silver posts: "Follow for more silver news."
- Local business / tech posts: "Follow for more tips to grow your business."

No link ask. No "link in comments." Goal is followers and comments, not clicks.

---

#### QUESTION segment format

```markdown
## QUESTION (XXX–XXXs)
Text: [THE QUESTION — 8 WORDS MAX — all caps]
Subtext: [ENGAGEMENT DIRECTIVE — 5 WORDS MAX — shown in cyan below]
Narration: Follow for more silver news.
```

`Subtext` is optional but recommended. It tells muted viewers exactly what to do. Examples:
- `DROP YOUR ANSWER BELOW`
- `COMMENT YOUR FIRST PURCHASE`
- `TYPE YES OR NO BELOW`
- `TELL ME IN THE COMMENTS`

---

#### CTA Type Taxonomy — pick ONE per reel

**1. Controversial take** (highest comment volume — people feel compelled to correct or agree)
Use when the post has a strong counterintuitive claim.

*Silver:*
> Text: `IS SILVER MORE MANIPULATED THAN GOLD?`
> Subtext: `AGREE OR DISAGREE BELOW`

> Text: `SILVER WILL OUTPERFORM GOLD THIS DECADE`
> Subtext: `AGREE OR DISAGREE BELOW`

> Text: `PAPER SILVER IS WORTHLESS. ONLY PHYSICAL COUNTS`
> Subtext: `HOT TAKE — TELL ME YOURS`

*Local business / tech:*
> Text: `SOCIAL MEDIA IS OVERRATED FOR LOCAL BUSINESS`
> Subtext: `AGREE OR DISAGREE BELOW`

> Text: `YOUR GOOGLE REVIEWS MATTER MORE THAN YOUR WEBSITE`
> Subtext: `HOT TAKE — COMMENT BELOW`

> Text: `MOST LOCAL BUSINESS WEBSITES ARE A WASTE OF MONEY`
> Subtext: `AGREE OR DISAGREE`

> Text: `WORD OF MOUTH BEATS PAID ADS FOR LOCAL BUSINESS`
> Subtext: `AGREE OR DISAGREE BELOW`

**2. Personal story prompt** (high comment quality — people share their own experience, thread builds)
Use for any post about first steps, mistakes, or wins.

*Silver:*
> Text: `WHAT WAS YOUR FIRST SILVER PURCHASE?`
> Subtext: `COMMENT YOUR STORY BELOW`

> Text: `WHERE DID YOU BUY YOUR FIRST OUNCE?`
> Subtext: `SHARE YOUR STORY`

> Text: `WHEN DID YOU START STACKING SILVER?`
> Subtext: `DROP THE YEAR IN THE COMMENTS`

*Local business / tech:*
> Text: `WHAT BROUGHT YOUR FIRST CUSTOMER TO YOUR DOOR?`
> Subtext: `COMMENT YOUR STORY BELOW`

> Text: `HOW DID YOU GET YOUR FIRST GOOGLE REVIEW?`
> Subtext: `SHARE YOUR EXPERIENCE`

> Text: `WHAT WAS YOUR BIGGEST WEBSITE MISTAKE?`
> Subtext: `COMMENT BELOW — HELP OTHERS AVOID IT`

> Text: `WHEN DID YOU REALIZE YOUR WEBSITE WAS HURTING YOU?`
> Subtext: `TELL YOUR STORY BELOW`

**3. Binary choice** (easiest to comment — one word answer, maximum participation)
Use when the post compares two options.

*Silver:*
> Text: `SILVER COINS OR SILVER BARS?`
> Subtext: `TYPE YOUR CHOICE BELOW`

> Text: `BUY NOW OR WAIT FOR A DIP?`
> Subtext: `TYPE A FOR NOW, B FOR WAIT`

> Text: `SILVER OR GOLD: WHICH DO YOU STACK?`
> Subtext: `TYPE A FOR SILVER, B FOR GOLD`

*Local business / tech:*
> Text: `ORGANIC OR PAID ADS: WHAT WORKS FOR YOU?`
> Subtext: `ORGANIC OR PAID. COMMENT BELOW`

> Text: `GOOGLE OR FACEBOOK: WHERE DO CUSTOMERS FIND YOU?`
> Subtext: `TYPE G FOR GOOGLE, F FOR FACEBOOK`

> Text: `DO YOU RESPOND TO EVERY GOOGLE REVIEW?`
> Subtext: `YES OR NO — COMMENT BELOW`

> Text: `WEBSITE OR SOCIAL MEDIA — WHERE DO YOU INVEST?`
> Subtext: `COMMENT YOUR ANSWER`

**4. Prediction ask** (drives repeat engagement — people return to check if they were right)
Use for trend, market, or future-facing posts.

*Silver:*
> Text: `WHERE WILL SILVER BE END OF 2025?`
> Subtext: `DROP YOUR PRICE PREDICTION`

> Text: `WILL SILVER HIT $50 THIS YEAR?`
> Subtext: `YES OR NO — COMMENT BELOW`

*Local business / tech:*
> Text: `WILL AI REPLACE LOCAL BUSINESS WEBSITES?`
> Subtext: `YES, NO, OR MAYBE — COMMENT`

> Text: `WILL GOOGLE REVIEWS MATTER MORE IN 5 YEARS?`
> Subtext: `DROP YOUR PREDICTION BELOW`

> Text: `WILL FACEBOOK STILL DRIVE LOCAL CUSTOMERS IN 2030?`
> Subtext: `YES OR NO BELOW`

**5. Completion prompt / identity signal** (drives algorithm comment signal fast — low friction)
Use when you want volume over depth. One-word answers flood comment section.

*Silver:*
> Text: `ARE YOU A SILVER STACKER?`
> Subtext: `TYPE STACKER IF YOU STACK`

> Text: `HOW MANY OUNCES DO YOU OWN?`
> Subtext: `DROP YOUR NUMBER BELOW`

> Text: `COMMENT SILVER IF YOU HOLD PHYSICAL`
> Subtext: `LET'S SEE HOW MANY STACKERS ARE HERE`

*Local business / tech:*
> Text: `DO YOU HAVE A WEBSITE FOR YOUR BUSINESS?`
> Subtext: `TYPE YES OR NO BELOW`

> Text: `HOW MANY GOOGLE REVIEWS DO YOU HAVE?`
> Subtext: `DROP YOUR NUMBER BELOW`

> Text: `COMMENT YOUR BUSINESS TYPE BELOW`
> Subtext: `LET'S SEE WHO IS IN HERE`

> Text: `ARE YOU GETTING CUSTOMERS FROM GOOGLE?`
> Subtext: `YES OR NO — COMMENT BELOW`

---

#### Picking the right type

| Post topic | Pillar | Best CTA type |
|-----------|--------|--------------|
| Price analysis / market outlook | Silver | Prediction ask |
| Coins vs rounds vs bars | Silver | Binary choice |
| Buying guide / first steps | Silver | Personal story |
| Manipulation, suppression, banking | Silver | Controversial take |
| General silver stacking | Silver | Completion prompt |
| Historical price / performance | Silver | Controversial take or prediction |
| Website tips / what a site does | Tech | Controversial take or personal story |
| Google reviews / reputation | Tech | Binary choice or personal story |
| Google Business Profile / local SEO | Tech | Completion prompt or binary choice |
| Social media for local business | Tech | Controversial take |
| Word of mouth / referrals | Tech | Personal story |
| Paid ads vs organic | Tech | Binary choice |
| Future of local marketing | Tech | Prediction ask |

---

#### What makes a CTA fail

- Too open-ended: "What do you think?" — no friction, no reason to answer
- Requires knowledge the viewer doesn't have: "What's your DCA basis?" — intimidates beginners
- Rhetorical: "Isn't silver amazing?" — no debate, no story to share
- Branded/salesy: "Visit FusedDistribution.com" — kills engagement, feels like an ad
- Mismatched to audience: asking a silver question on a local business post

Long Form always ends with `## QUESTION`. Never use `## CTA` as the closing segment.

The discussion question for captions is sourced from `social-copy.json` → `discussion_question` field — set during blog creation via `reel-data.md` `## shared`. Do not duplicate it in `reel-script.md`.

### Step 3a — Place blog images (required for segment-0 / thumbnail)

**Segment-0 = hero graphic.** Use `hero.jpg` (the branded blog header image) as the HOOK background. It is already sized 1200×630, renders with Ken Burns zoom, and makes the reel open with the same branded graphic as the blog post.

Blog `pexels-*.jpg` images are already downloaded during blog creation — copy them into reel slots to avoid redundant API fetches.

```bash
mkdir -p video/public/photos/<slug>

# Segment-0 = HOOK thumbnail — always use hero.jpg
cp public/blog/<slug>/hero.jpg video/public/photos/<slug>/segment-0.jpg

# Reuse blog pexels images for early body segments
cp public/blog/<slug>/images/pexels-0.jpg video/public/photos/<slug>/segment-1.jpg
cp public/blog/<slug>/images/pexels-1.jpg video/public/photos/<slug>/segment-2.jpg
```

The photo fetcher skips any segment that already has a valid file (>1 KB) in `public/photos/<slug>/`, so manually placed images are never overwritten by Pexels fetches.

**Pexels rate limits and corrupt files**

Pexels occasionally returns `concurrency_exceeded` as the image body instead of an HTTP error. This writes a ~20-byte file that renders as a black frame. The scripts now detect and skip files under 1 KB automatically — but if a run produces black frames on specific segments, check for corrupt stubs:

```bash
# Find any suspiciously small segment photos
find video/public/photos/<slug>/ -name "*.jpg" -size -1k

# Delete corrupt stubs and re-run fetch
rm video/public/photos/<slug>/segment-N.jpg
cd video && set -a && source .env && set +a && node scripts/fetch-photos.mjs --post=<slug>
```

If rate limits persist across a full run, copy a valid sibling photo as a placeholder and render directly (skipping the full `render.mjs` pipeline which re-fetches every run):

```bash
# Use a sibling photo as fallback for the corrupt segment
cp video/public/photos/<slug>/segment-0.jpg video/public/photos/<slug>/segment-N.jpg

# Then render directly without re-fetching
cd video && npx remotion render src/Root.tsx BlogReel out/<slug>/<slug>.mp4 \
  --props='{"slug":"<slug>"}'
```

### Step 3.4 — Script validation gate (REQUIRED before timing check)

Run these checks on every `reel-script.md` before proceeding. Any failure = fix it before render.

**Automated checks — run all. Any non-zero result = fix before render:**

```bash
# No em dashes anywhere (must return 0)
grep -c "—" public/blog/<slug>/reel-script.md

# QUESTION segment present (must return ≥ 1)
grep -c "## QUESTION" public/blog/<slug>/reel-script.md

# No bare % in Narration — write "percent" (must return 0)
grep -c "Narration:.*%" public/blog/<slug>/reel-script.md

# No bare "US" in Narration — write "USA" (must return 0)
grep -cE "Narration:.*\bUS\b" public/blog/<slug>/reel-script.md

# Chart segment required when reel-data.md has ## chart (must return ≥ 1 if applicable)
if grep -q "^## chart" public/blog/<slug>/reel-data.md 2>/dev/null; then
  grep -cE "^\*\*Chart|\*\*Chart " public/blog/<slug>/reel-script.md
fi
```

**Manual checks:**
- [ ] Hook narration ≤ 12 words, OR segment window ≥ 10s
- [ ] Every segment has a `Text:` field — no narration-only segments
- [ ] Segment count is 8-12 body segments (Long Form)
- [ ] Stat Text labels are 5 words or fewer after the number
- [ ] Chart segment present if `reel-data.md` has a `## chart` section
- [ ] QUESTION segment has Text + Subtext + Narration — silver posts: "Follow for more silver news." / tech posts: "Follow for more tips to grow your business."
- [ ] No segment references unverified stats not in `reel-data.md`
- [ ] If `reel-data.md` has `## chart`, a Chart segment exists in the script

**Post-render output check:**
```bash
# Verify output file is not corrupt
ls -lh video/out/<slug>/<slug>.mp4   # size column must show > 5M for typical Long Form
# If near the threshold, verify with ffprobe:
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 video/out/<slug>/<slug>.mp4
# Duration must match declared target (within 10s). Zero duration = silent render failure.
```

If output is < 5 MB OR ffprobe shows zero/wrong duration, the render silently failed. Re-run.

The source controlled 11 AM worker detects stale renders from the MP4, source modification time, and `render-meta.json`. Do not create or depend on `/tmp` tracker files.

---

### Step 3.5 — Timing validation (REQUIRED before render)

Do this before running render. For every segment in `reel-script.md`:

1. Count the words in the `Narration:` field
2. Divide by 2.5 → minimum seconds required
3. Verify the segment window (end − start) ≥ that value + 2s buffer

```
words ÷ 2.5 + 2 = minimum window (seconds)
```

Examples:
- "Returning customers spend 67 percent more than new ones." = 9 words → 9 ÷ 2.5 + 2 = **5.6s minimum** → a 5s window fails
- 4-sentence narration ~40 words → 40 ÷ 2.5 + 2 = **18s minimum**

**If any segment fails:** extend its window and shift all subsequent timestamps. Never shorten the narration. Do not proceed to render until all segments pass.

HOOK is highest risk — it often has 2 sentences crammed into 5s. Keep HOOK narration to 1 short sentence (≤12 words) or extend the window to 10s+.

**Final check — no black gap:** After all timing passes, confirm `Target length:` equals the last segment's `endSec` exactly. Black gap = `Target length > last endSec`. Fix by updating `Target length:` to match.

### Step 4 — Render

Pick a random track from `ambient-01` through `ambient-10` (see §Setup > Music). Always pass `--music=` explicitly — do not let the renderer default.

**Always source `.env` before rendering** — sets `PEXELS_API_KEY` so Pexels fetches work. Guard against missing file first:

```bash
[ -f video/.env ] || { echo "ERROR: video/.env missing — render aborted"; exit 1; }
cd video && set -a && source .env && set +a && node scripts/render.mjs --post=<slug> --music=ambient-XX.mp3 --voice=chatterbox
```

Example (ambient-05):
```bash
[ -f video/.env ] || { echo "ERROR: video/.env missing"; exit 1; }
cd video && set -a && source .env && set +a && node scripts/render.mjs --post=<slug> --music=ambient-05.mp3 --voice=chatterbox
```

Output: `video/out/<slug>/<slug>.mp4`

> **CRITICAL — Do NOT skip or narrate this step.** You MUST execute the render command above via Bash. Do not describe the render as "running" or "in progress" without having called it. The command takes 10–15 minutes and blocks — wait for it to complete. After it exits, immediately verify:
> ```bash
> ls -lh "video/out/<slug>/<slug>.mp4"
> ```
> The file must exist and be larger than 10 MB. If it does not exist or is under 10 MB, the render failed — do not proceed to commit. Do not report success until this check passes.

### Step 5 — Review checklist
- [ ] Numbers animate and count up correctly
- [ ] Chart bars fully visible and centered (not cut off)
- [ ] Subtitles match the Chatterbox narration and stay in sync throughout
- [ ] No narration gets cut off — audio completes before the segment ends
- [ ] No segment feels rushed — voice, subtitle, and slide all finish together
- [ ] Background photos visible on all segments (not dark/black frames)
- [ ] Segment-0 (thumbnail) has a strong blog or Pexels image
- [ ] Background photos don't overpower the text
- [ ] CTA glow is visible and readable
- [ ] Blog data matches reel data exactly
- [ ] Subtitles match audio — scrub 3 random points, subtitle appears with or just before spoken word
- [ ] Video clips playing on hook and stat segments (not static photos where video was expected)

**If timing is off:** extend the segment's end timestamp in `reel-script.md` (e.g. `(23–38s)` → `(23–43s)`) and adjust all subsequent start times to match. After shifting timestamps, re-run Step 3.5 timing validation on all segments — a shift in one propagates to all following segments. Then re-render. Never shorten narration to fit a timestamp — always extend the timestamp instead.

### Step 6 — Commit, deploy, and post

> **IMPORTANT: Do NOT commit mp4 files.** `video/out/**/*.mp4` is in `.gitignore`. GitHub blocks files over 100 MB and warns on files over 50 MB. The mp4 is for manual upload only — it is never pushed to the repo or deployed via Cloudflare.

**Commit reel files (metadata only — no mp4):**
```bash
git add public/blog/<slug>/reel-data.md public/blog/<slug>/reel-script.md public/blog/topic-history.md
git add video/out/<slug>/script.json video/out/<slug>/render-meta.json video/out/<slug>/captions.json video/out/<slug>/captions-meta.json
git commit -m "feat(reel): [Post Title]"
git push origin main
```

**Deploy blog to Cloudflare** (push does NOT auto-deploy):
```bash
npx wrangler deploy
```

Verify the post is live at `https://fuseddistribution.com/blog/<slug>/` before posting.

**Post the reel manually:**
- Upload `video/out/<slug>/<slug>.mp4` to Instagram Reels / Facebook Reels / TikTok
- Caption: copy the platform caption from `public/blog/<slug>/social-copy.json` → `reel.[platform]` field. Add a blank line, then paste `discussion_question` on its own line.
- Hashtags: copy `hashtags` field from `public/blog/<slug>/social-copy.json` (5 max — already correct in the file)
- First comment: paste the live blog URL

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

## 11b. Inline Graphic Types (required for all stat segments)

Every stat entry in `reel-data.md` must include an `explanation:` line and a `graphic_type:`. These render as an explanation line and an animated graphic below the stat number on screen, making stats readable without audio.

### explanation: field

One plain sentence (no em dashes) explaining what the number means or why it matters. Appears in muted cyan below the stat label.

```markdown
- text: 72% BYPRODUCT MINING
  explanation: Silver output tied to copper, gold, zinc production decisions
```

### graphic_type: field + graphic: block

Pick the type that best fits the stat shape. Use `none` if no type fits — the explanation line still renders.

| Type | Use when | Required graphic: fields |
|------|----------|--------------------------|
| `gap` | Two values with a meaningful difference (supply vs demand, revenue vs cost) | `a_label`, `a_value`, `b_label`, `b_value`, `unit` |
| `percent_fill` | Single percentage, split with complement | `value`, `label`, `remainder_label` |
| `percent_pie` | Single percentage shown as donut chart | `value`, `label`, `remainder_label` |
| `growth` | Before/after comparison (year-over-year, then vs now) | `from_value`, `from_label`, `to_value`, `to_label`, `unit` |
| `timeline` | Duration range (e.g. 8–12 years to build a mine) | `min`, `max`, `unit`, `label` |
| `streak` | Consecutive count ("3rd straight year") — `count` = total dots shown, `current` = which is active (1-based) | `count`, `current`, `unit` |
| `drain` | Depleting inventory or reserve | `peak_value`, `peak_label`, `current_value`, `current_label`, `unit` |
| `gauge` | Position on a low→high scale | `value`, `min`, `max`, `low_label`, `high_label` |
| `none` | No graphic fits — renders explanation only | — |

### Full stat block example

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
  narration: Silver's global market ran a 211 million ounce deficit in 2023...

- text: 72% BYPRODUCT MINING
  explanation: Silver output tied to copper, gold, zinc production decisions
  graphic_type: percent_fill
  graphic:
    value: 72
    label: Byproduct
    remainder_label: Primary
  narration: Roughly 72 percent of mine supply comes as a byproduct...

- text: 3RD STRAIGHT YEAR IN DEFICIT
  explanation: Consecutive annual deficits signal a structural imbalance
  graphic_type: streak
  graphic:
    count: 3
    current: 3
    unit: years
  narration: The deficits in 2021 and 2022 were smaller...
```

### reel-script.md format for stat segments

When writing `reel-script.md`, include the same fields using `Graphic_type:` and individual `Graphic_fieldname:` lines:

```markdown
**Stat 1** (5–20s)
Text: 72% BYPRODUCT MINING
Explanation: Silver output tied to copper, gold, zinc production decisions
Graphic_type: percent_fill
Graphic_value: 72
Graphic_label: Byproduct
Graphic_remainder_label: Primary
Narration: Roughly 72 percent of mine supply comes as a byproduct of gold, copper, zinc, and lead mining...
```

---

## 11c. Media Strategy — Video Clips and Photos

Every segment background is sourced in this priority order:

1. **Pixabay video** (portrait MP4, slow cinematic playback at 0.75x)
2. **Pexels video** (portrait MP4 fallback)
3. **Pixabay photo** (large, portrait)
4. **Pexels photo** (large, portrait fallback)

Chart, CTA, and Question segments always get a photo — clean background needed for readability.

### media_queries section in reel-data.md

Replaces `pexels_queries`. Add `prefer: video` (default) or `prefer: photo` per segment:

```markdown
## media_queries
- segment: 0
  query: "silver bullion bars dramatic lighting"
  prefer: video
- segment: 2
  query: "solar panels photovoltaic field aerial"
  prefer: video
- segment: 5
  query: "silver coins collection close up"
  prefer: photo
```

- `prefer:` defaults to `video` if omitted
- Write specific, visual queries — avoid abstract words
- Aim for one entry per segment (hook + all stat segments at minimum)
- The old `pexels_queries` name still works for legacy posts

### Video clip behavior

Video clips play at 0.75x speed for a cinematic slow-motion feel. They loop if the segment is longer than the clip. A dark overlay keeps text readable.

---

## Pipeline Steps (what render.mjs does internally)

| Step | Script | Output |
|------|--------|--------|
| 1. Parse script | `parse-script.mjs` | `out/<slug>/script.json` |
| 2. Narration audio | `generate-audio.mjs --voice=chatterbox` | `public/audio/<slug>/segment-N.m4a` + cache manifest |
| 3. Background media | `fetch-media.mjs` | `public/photos/<slug>/` + media map |
| 4. Captions | `generate-captions.mjs` | `captions.json` + `captions-meta.json` |
| 5. Render video | Remotion | `out/<slug>/<slug>.mp4` + verified `render-meta.json` |

Re-run any step individually:
```bash
node video/scripts/parse-script.mjs --post=<slug>
node video/scripts/generate-audio.mjs --post=<slug> --voice=chatterbox
# Steps using external APIs require .env:
[ -f video/.env ] || { echo "ERROR: video/.env missing"; exit 1; }
cd video && set -a && source .env && set +a && node scripts/fetch-photos.mjs --post=<slug>
```

---

## Visual Style Reference

| Element | Value |
|---------|-------|
| Background | `#041018` (dark navy) |
| Accent | `#58d6ff` (cyan) |
| Text | `#ffffff` white / `#afc6cf` muted |
| Font | Bebas Neue (stats/titles/hook/overlay), Poppins 600 (chart labels), Poppins 400 (subtitles) |
| Format | 1080×1920 portrait @ 30fps |
| Voice | Chatterbox using Nick's local voice reference |
| Music | Ambient MP3 at 15% volume |
| Subtitles | Sentence-by-sentence, semi-transparent pill, bottom of frame |

---

## Performance Targets

Use these as pass/fail benchmarks for the finance and local business niche:

| Metric | Target | Strong | Notes |
|--------|--------|--------|-------|
| **Sends per Reach** | >1% | >3% | **#1 signal** — DM shares weighted 3-5x over likes by Instagram algorithm |
| Save rate | >1% | >3% | #2 signal — educational finance content saves well |
| Intro retention (0–3s) | >50% | >70% | Low = hook failing |
| Overall completion rate | >35% | >50% | Low = too long or mid-reel drop-off |
| Comment rate | >0.5% | meaningful replies | QUESTION slide drives this |
| Like rate | any | — | Lowest-weight signal — optimize last |

**Tracking sends:** Instagram Insights → Reach → Sends. Export weekly — most dashboards don't surface this automatically.

**What to fix based on metric:**
- Low Sends per Reach → caption CTA not triggering shares; rewrite to "Send this to someone who needs to hear it."
- Low saves → increase stat density or make content more reference-worthy
- Low intro retention → hook isn't working; try different hook type next post
- Low completion → reel is too long, or a mid-reel segment is losing people; check retention graph drop-off point

---

## Optimization Loop

After 5+ posts in `performance.json`, review the report:
- **Sends per Reach first** — which hook types drive the most DM shares? Optimize for this above all else.
- Which hook types get the most views? → Contradiction and Pain Point consistently outperform generic stat hooks for business/silver content
- Which duration buckets perform best?
- Which music tracks correlate with engagement? → use those
- Which CTA question type drives most comments? → standardize on it
- Drop-off on long segments? → shorten or cut; never pad narration
- Which captions have highest send rate? → use that CTA phrasing pattern going forward

The report auto-ranks top posts and averages by hook type, duration, and music.

**log sends when running feedback.mjs:**
```bash
node video/scripts/feedback.mjs --post=<slug> --platform=instagram \
  --views=1200 --likes=85 --shares=12 --comments=6 --saves=24 --dm_shares=18
```
`--dm_shares` = DM send count from Instagram Insights → Reach → Sends.
