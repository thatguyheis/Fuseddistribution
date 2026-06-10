# Design: UGC Ad Creative System (Free Tier)
**Date:** 2026-06-10
**Status:** Approved

## Overview

Three free components reverse-engineered from the Arcads Claude Code workflow, built on existing infrastructure. No paid APIs. Extends the daily blog pipeline to produce organic social ad creatives and UGC scripts alongside each post.

---

## Architecture

### New files

```
blog/
  MASTER_CONTEXT-silver.md
  MASTER_CONTEXT-tech.md

.claude/plugins/cache/local/fused/1.0.0/skills/
  social-ad/SKILL.md
  ugc-script/SKILL.md

blog/[slug]/
  ad-google-search.svg + .jpg
  ad-apple-notes.svg + .jpg
  ad-stat-card.svg + .jpg        (default)
  ad-text-thread.svg + .jpg
  ad-quote-card.svg + .jpg
  ugc-script.md                  (2 A/B variants)
```

### Data flow

```
11pm  Gemma reads MASTER_CONTEXT-[brand].md files
      → drafts posts in correct voice
      → adds ad_formats + ugc_angle to queue JSON

9am   Claude reads MASTER_CONTEXT-[brand].md
      → builds 4 posts
      → runs social-ad skill per slug (SVG → JPEG)
      → runs ugc-script skill per slug
      → commits all assets in single push
```

---

## Component 1: MASTER_CONTEXT Files

**Paths:**
- `blog/MASTER_CONTEXT-silver.md`
- `blog/MASTER_CONTEXT-tech.md`

**Schema (both files):**

```markdown
# MASTER_CONTEXT — [Brand]

## Brand Identity
- Name + sub-line
- CTA target URL
- One-sentence positioning
- What this brand is NOT

## Audience
- Primary segment: who, age range, situation
- Pain points in their own language
- Objections / what they distrust

## Voice & Tone
- Register: second person, active, direct
- Sentence style rules
- 3 on-brand sample lines
- 3 off-brand sample lines

## Content Pillars
- 4-5 topic buckets with angle description
- Evergreen vs seasonal flag

## Product / Service Details
- Key facts, stats, differentiators
- Always mention / never mention list

## UGC Prompting Principles
- Preferred script formats for this brand
- Authenticity cues specific to audience
- Forbidden words beyond global writing rules

## Visual Identity
- SVG background: #041018
- Accent colors (hex)
- Typography stack

## Changelog
| Date | Change | Why |
```

**Silver brand:** audience = first-time buyers, skeptical of dealers, fear of overpaying. Pillars: buying guides, storage, price education, dealer vetting, inflation hedge. Preferred UGC: testimonial + problem-solution.

**Tech brand:** audience = local business owners, not tech-savvy, frustrated with zero results from current site. Pillars: Google visibility, reviews, local SEO, social, website ROI. Preferred UGC: founder-style + demo.

**Gemma integration:** MASTER_CONTEXT preamble added to Gemma's workspace (`AGENTS.md` or nightly script). Gemma reads both files before drafting. Gemma adds `ad_formats` and `ugc_angle` to each queue entry.

---

## Component 2: social-ad Skill

**Skill path:** `.claude/plugins/cache/local/fused/1.0.0/skills/social-ad/SKILL.md`

**Trigger:** `social-ad [slug]`, or called automatically per post in daily pipeline.

**Canvas:** 1200×1200 SVG → Chrome headless → JPEG (same pipeline as photo-post.svg).

**Output:** `blog/[slug]/ad-[template-type].jpg` + source SVG.

**SVG entity rule:** grep for `&[a-zA-Z]+;` before every JPEG conversion. Zero matches required.

### Five templates

**google-search** — Fake phone chrome + Google search bar + 3 result cards. Query text = post keyword. Result #1 = fuseddistribution.com with post title. "About 53,400 results" subtext. Dark mode chrome.

**apple-notes** — White card on dark background. Yellow Notes icon top-left. Title = punchy claim. 5-7 checkmark bullets with stats/truths from post. Last item bolder. "— shared from Notes" footer.

**stat-card** — Full bleed dark (`#041018`). One giant number centered (largest stat from post). Two lines of context. Brand wordmark bottom-right. Matches existing hero.svg visual language (grid lines, radial glows optional).

**text-thread** — iMessage dark mode. Friend asks relatable question matching post topic. "You" answers in 2-3 short replies. Recommendation + link hint in final bubble. Subtle phone status bar top.

**quote-card** — Large pull quote from post body. Attribution line. Cyan left border accent (`#58d6ff`). Clean typography. No visual clutter.

### Default behavior (no ad_formats specified)
Generate: `stat-card` + `google-search`.

### Skill workflow
1. Read `blog/[slug]/index.html` — extract title, key stats, keyword, CTA target
2. Read `MASTER_CONTEXT-[brand].md` — get voice, visual identity, forbidden words
3. Read `ad_formats` from queue JSON (or use defaults)
4. For each format: generate SVG, run entity check, generate JPEG
5. Append paths to `social-copy.json` under `"organic_ads": []`
6. Log each output: template type, file size, pass/fail

---

## Component 3: ugc-script Skill

**Skill path:** `.claude/plugins/cache/local/fused/1.0.0/skills/ugc-script/SKILL.md`

**Trigger:** `ugc-script [slug]`, or called automatically per post in daily pipeline.

**Output:** `blog/[slug]/ugc-script.md`

### Output format

```markdown
# UGC Script — [Post Title]

**Format:** [type]
**Brand:** [silver|tech]
**Word count:** [N] (~[N]s)

---

## VARIANT A

### HOOK (0–2s)
[≤8 words. Mid-thought opener. No setup, no name intro.]

### BODY (3–25s)
[3 short beats. One truth/stat each. Specific timeframe,
one sensory detail, acknowledge doubt before resolving.]

### CTA (last 5s)
[Single action. Feels like story ending, not ad tag.]

---

## VARIANT B
[Same structure, different hook angle]

---

**Format rationale:** [why this type was chosen]
**Forbidden words applied:** [list from MASTER_CONTEXT]
**Realism cues applied:** [specific techniques used]
```

### Format selection logic

| Format | When to use |
|--------|-------------|
| Testimonial | Post angle is skepticism → proof |
| Problem/Solution | Post leads with pain point |
| Demo | Step-by-step how-to content |
| Comparison | Post compares options/products/dealers |
| Founder | Brand story / why-we-exist content |

Silver defaults: testimonial, comparison.
Tech defaults: founder, demo.
`ugc_angle` in queue JSON overrides defaults.

### Validation (run before writing file)
- No em dashes (—)
- No `%` — write "percent"
- No "US" alone — write "USA"
- No AI buzzwords (full list from BLOG-SOP.md)
- Hook ≤8 words
- Total word count 60–95 words per variant

---

## Pipeline Integration

### daily-blog-reel.sh — new FINAL STEPS (8 + 9)

Added after step 7 (sitemap), before commit:

```
8. For each slug — social-ad skill:
   Read MASTER_CONTEXT-[brand].md + ad_formats from queue
   Generate SVG templates → entity check → JPEG
   Append to social-copy.json organic_ads[]
   Default if ad_formats absent: stat-card + google-search

9. For each slug — ugc-script skill:
   Read MASTER_CONTEXT-[brand].md + ugc_angle from queue
   Generate 2 variants → validate → write ugc-script.md
   Default if ugc_angle absent: auto-select by content type
```

Commit message format:
```
feat: [title1] + [title2] + [title3] + [title4] + 8 ad creatives + 4 ugc scripts
```

### Queue JSON — expanded schema

```json
{
  "slug": "where-to-buy-silver-online-safely",
  "keyword": "where to buy silver online safely",
  "brand": "silver",
  "draft": "blog/where-to-buy-silver-online-safely/gemma_draft.md",
  "ad_formats": ["google-search", "stat-card"],
  "ugc_angle": "comparison"
}
```

`ad_formats` and `ugc_angle` are optional. Pipeline falls back to defaults if absent.

### Gemma workspace update

Add to Gemma's `AGENTS.md` (or nightly script preamble):

```
Before drafting any post, read:
- blog/MASTER_CONTEXT-silver.md
- blog/MASTER_CONTEXT-tech.md

Use the matching brand file to inform:
- Post angle and framing
- Voice and sentence style
- Which content pillars to draw from
- Forbidden words and phrases

For each post entry in the queue JSON, add:
- "ad_formats": choose 2 from [google-search, apple-notes, stat-card, text-thread, quote-card]
  Match to post content: stat-heavy → stat-card, comparison → google-search, list → apple-notes
- "ugc_angle": choose from [testimonial, problem-solution, demo, comparison, founder]
  Match to post angle
```

---

## What Does NOT Change

- Existing `photo-post.svg` / `photo-post.jpg` pipeline — unchanged, still generated
- `social-copy.json` schema — organic_ads[] is additive, existing keys untouched
- `reel-script.md` pipeline — unchanged
- Git/deploy flow — single commit, same wrangler deploy step
- BLOG-SOP.md entity validation gate — applies to all new SVGs too

---

## File Size Budget

Each ad template JPEG target: 60–120 KB (same as hero.jpg baseline).
If Chrome headless produces >200 KB, simplify SVG (reduce gradient layers).

---

## Out of Scope

- Paid video generation (Veo, Seedance, etc.)
- Meta Ads Manager publishing
- Postiz integration for new ad assets (phase 2)
- A/B performance tracking
