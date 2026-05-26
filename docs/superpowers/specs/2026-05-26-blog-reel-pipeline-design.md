# Blog + Reel Pipeline — Design Spec
Date: 2026-05-26

## Overview

Automated daily pipeline that produces one tech post + one silver post, then renders a 1080×1920 MP4 reel for each. Optimizes the blog SOP for AI-efficient execution (token reduction) and adds Pexels inline photos with a minimum viable graphics rule.

---

## Goals

1. Compress blog SOP so agents read ~250 lines instead of 1167
2. Add Pexels inline photos to blog posts (min 1 custom graphic + min 1 Pexels photo, max 5 total)
3. Create `reel-data.md` companion file during blog writing so reel scripting never re-reads HTML
4. Daily cron: 1 tech post + 1 silver post + 2 reels per run

---

## File Structure Changes

### Modified
```
blog/BLOG.md              → deprecated; replaced by BLOG-SOP.md + BLOG-REF.md
video/REEL-SOP.md         → updated to read reel-data.md instead of full HTML
video/scripts/fetch-photos.mjs → updated to read pexels_queries from reel-data.md (fallback: existing extractor)
```

### New files
```
blog/BLOG-SOP.md                      Compressed SOP instructions (~250 lines). What agents read.
blog/BLOG-REF.md                      Full CSS block + HTML template. Verbatim copy-paste reference only.
blog/scripts/fetch-pexels.mjs         Fetches inline blog photos from Pexels API.
blog/[slug]/reel-data.md              Per-post reel metadata. Created as last step of blog writing.
```

---

## BLOG-SOP.md Structure

Sections (target: ~250 lines total):

```
## 0. Quick Checklist        12-line rundown of all steps in order
## 1. Brand routing          Silver → Reserve | Tech → Technology Solutions (table)
## 2. posts.json entry       Required fields, uniqueness rules
## 3. Folder structure       Exact paths per post type
## 4. HTML template          "Copy from BLOG-REF.md section 1, fill [SLOTS]" — slot list only
## 5. CSS                    "Copy from BLOG-REF.md section 2 verbatim"
## 6. Content components     Component name, when to use, CSS note if needed (compressed)
## 7. Hero SVG               Design rules only (~25 lines — star math + layout zones)
## 8. Inline images          NEW — Pexels + graphics rule (see below)
## 9. Writing style          Compressed: banlist stays, prose rules ~15 lines
## 10. Slug rules            One line
## 11. reel-data.md          NEW — format + mandatory creation step
## 12. Publish               git add / commit commands
```

### Section 8 — Inline Images Rule

```
Rule: every post must have min 1 custom graphic AND min 1 Pexels photo. Max 5 total visuals.
Custom graphics: chart-wrap, stat-row, math-box, coin-grid, watch-list
Pexels photos: <figure class="article-photo"> inline between paragraphs

For each Pexels photo needed, write a search query (5–7 words, specific to content).
Then run:
  node blog/scripts/fetch-pexels.mjs --post=[slug] --queries="query one|query two"
Copy printed attribution into each <figcaption>.
```

### Section 11 — reel-data.md

```
Required. Create before git commit. Format: see reel-data.md spec below.
Reel creation reads this file — do not rely on reel script reading index.html.
```

---

## reel-data.md Format

File path: `blog/[slug]/reel-data.md`

```markdown
# Reel Data: [slug]
topic: silver|tech
hook: One punchy line — stat or bold claim from post opening

## stats
- text: "Stat as it appears in the post"
  narration: 2–4 sentences. Match blog wording closely.
- text: "Second stat"
  narration: 2–3 sentences.

## chart
title: Chart heading — copy from blog chart
bars:
  - Label: XX%
  - Label: XX%
narration: Explain the data the same way the blog does.

## cta
text: Full breakdown — link in comments.
narration: One sentence driving to the link.

## caption
Facebook caption. 2–4 sentences. No hashtags.

## hashtags
#Tag1 #Tag2 #Tag3

## pexels_queries
- segment: 0
  query: "specific pexels search query"
- segment: 2
  query: "second specific query"
```

**Rules:**
- `## chart` is optional — omit if post has no chart
- `## stats` — 2–3 entries max, pulled from post stat-cards
- `pexels_queries` — segment index maps to search query; used by both blog fetch script and reel fetch-photos.mjs
- Target length: 30–40 lines

---

## blog/scripts/fetch-pexels.mjs

```
CLI: node blog/scripts/fetch-pexels.mjs --post=[slug] --queries="query one|query two" [--orientation=landscape]

Behavior:
- Splits --queries on |
- Fetches one photo per query from Pexels /v1/search (orientation=landscape by default)
- Saves to blog/[slug]/images/pexels-0.jpg, pexels-1.jpg, etc.
- Skips segment if file already exists (safe to re-run)
- Deduplicates photo IDs across queries
- Reads PEXELS_API_KEY from video/.env (same key, no new secrets)
- Prints attribution per photo:
    pexels-0.jpg — Photo by Jane Smith on Pexels (https://pexels.com/photo/12345)
  Agent pastes this into <figcaption> in the HTML.
- Exits 0 on success, 1 if API key missing
```

---

## video/scripts/fetch-photos.mjs — Update

Add `reel-data.md` query lookup before falling back to generic extractor:

```
For each segment i:
  1. Check reel-data.md pexels_queries for segment: i → use that query
  2. Fallback: existing segmentKeywords(seg) extractor (backwards compat)
```

No change to download or dedup logic.

---

## Daily Cron Pipeline

**Schedule:** Daily, 9:00 AM
**Executor:** Claude Code remote agent (scheduled via `schedule` skill)
**Output per run:** 2 blog posts + 2 reel MP4s

### Execution Order

```
1. TOPIC SELECTION
   - Read blog/posts.json
   - Pick one tech angle not yet covered (Websites / Local Business / Marketing)
   - Pick one silver angle not yet covered (Silver / Investing / Buying Guide)

2. TECH POST
   a. Read BLOG-SOP.md + BLOG-REF.md
   b. Write blog/[slug-tech]/index.html (fill all [SLOTS], paste CSS + HTML from REF)
   c. Write blog/[slug-tech]/hero.svg
   d. Run: node blog/scripts/fetch-pexels.mjs --post=[slug-tech] --queries="..."
   e. Write blog/[slug-tech]/reel-data.md
   f. Prepend entry to blog/posts.json

3. SILVER POST
   - Same as step 2 with silver brand routing

4. TECH REEL
   a. Read blog/[slug-tech]/reel-data.md
   b. Write blog/[slug-tech]/reel-script.md from reel-data.md
   c. Run: cd video && export $(cat .env | xargs) && node scripts/render.mjs --post=[slug-tech]

5. SILVER REEL
   - Same as step 4

6. GIT COMMIT
   git add blog/ video/out/
   git commit -m "feat: [tech-title] + [silver-title] + reels"
   (no push — requires explicit permission per CLAUDE.md)
```

### Topic Selection Rules
- Never repeat a slug from posts.json
- Tech angles: avoid topics already covered (check existing titles before picking)
- Silver angles: rotate through categories — Buying Guide → Investing → Storage → History → Market
- If blocked on topic, log to `blog/topic-queue.md` and skip that type for the run

---

## Backfill — Existing Posts

11 posts currently have no reel script:
```
facebook-growth-and-automation
why-free-offers-work
silver-premiums-explained
getting-google-reviews
silver-to-gold-ratio
google-business-profile-setup
what-is-junk-silver
what-a-website-is-worth
dollar-cost-averaging-silver
why-your-website-isnt-getting-customers
welcome-to-fused
```

Backfill plan (separate one-time task, not part of daily cron):
1. For each post: read index.html → write reel-data.md → write reel-script.md → render
2. Run in batches of 3 to avoid Pexels rate limits
3. `welcome-to-fused` — skip reel (2-minute welcome post, no stats to animate)

---

## Compression Summary

| File | Before | After | Savings |
|------|--------|-------|---------|
| BLOG-SOP.md | 1167 lines | ~250 lines | ~79% |
| BLOG-REF.md | — | ~620 lines | reference only |
| reel-data.md per post | 0 (re-read HTML) | ~35 lines | reel reads 35 not 500+ |
| fetch-photos query quality | generic 4-word extract | specific human-written query | better photo relevance |

---

## Open Questions (resolved)

- Pexels key location: `video/.env` — shared, no new secrets needed
- Attribution: printed by fetch-pexels.mjs, agent pastes into figcaption
- Push gate: no auto-push; follows CLAUDE.md hard rule
- Cron frequency: daily at 9:00 AM
