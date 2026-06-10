# UGC Ad Creative System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MASTER_CONTEXT brand files, social-ad SVG templates, and ugc-script skill to the Fused blog pipeline — all free, no new APIs.

**Architecture:** Two MASTER_CONTEXT markdown files feed brand context into both Gemma (Ollama, 11pm) and Claude (9am). Two new Claude Code skills (social-ad, ugc-script) run as final steps in the daily pipeline. Gemma's queue JSON gains two new fields (ad_formats, ugc_angle) to drive skill defaults.

**Tech Stack:** zsh shell scripts, SVG + Chrome headless → JPEG (existing), Ollama/gemma4:e2b, Claude Code skill SKILL.md format (YAML frontmatter + markdown body).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `blog/MASTER_CONTEXT-silver.md` | Silver brand bible — voice, audience, pillars, visual identity |
| Create | `blog/MASTER_CONTEXT-tech.md` | Tech brand bible — voice, audience, pillars, visual identity |
| Create | `.claude/plugins/cache/local/fused/1.0.0/skills/social-ad/SKILL.md` | Claude Code skill: generates 5 SVG ad templates → JPEG |
| Create | `.claude/plugins/cache/local/fused/1.0.0/skills/ugc-script/SKILL.md` | Claude Code skill: writes UGC scripts in 5 formats |
| Modify | `blog/scripts/gemma-nightly.sh` | Inject MASTER_CONTEXT into brand prompts; add ad_formats + ugc_angle to queue JSON |
| Modify | `bin/daily-blog-reel.sh` | Add steps 8+9: social-ad + ugc-script per slug after posts built |
| Modify | `blog/BLOG-SOP.md` | Document new file outputs (organic_ads[], ugc-script.md) |

---

## Task 1: MASTER_CONTEXT — Silver Brand

**Files:**
- Create: `blog/MASTER_CONTEXT-silver.md`

- [ ] **Step 1: Create the file**

```markdown
---
brand: silver
updated: 2026-06-10
---

# MASTER_CONTEXT — Fused Distribution (Silver)

> Read this file before drafting any silver post, ad, or script.
> Append a dated changelog entry after any meaningful change.

---

## Brand Identity

- **Name:** Fused Distribution
- **Sub-line:** Distribution
- **CTA target:** /reserve/
- **Site:** fuseddistribution.com
- **Positioning:** The straightforward way to build a physical silver reserve — no dealer markup games, no confusing premiums, no pressure.
- **What this brand is NOT:** Not a gold dealer. Not a "get rich quick" scheme. Not aggressive. Not complex.

---

## Audience

**Primary segment:** First-time silver buyers, ages 30–55, middle income, worried about inflation and dollar devaluation. Often have a 401k but feel it's not enough protection. Skeptical of salespeople. Do their own research before buying anything.

**Pain points (in their own words):**
- "I don't know if I'm getting ripped off on premiums"
- "How do I know the dealer is legit?"
- "I don't know where to store it once I have it"
- "I don't know how much to buy"
- "Is this the right time to buy or should I wait?"

**Objections / what they distrust:**
- Salespeople pushing numismatic coins
- Vague pricing that hides real costs
- Overly complex jargon
- Claims that sound too good to be true
- Any hint of a pitch before they've made up their mind

---

## Voice & Tone

- **Register:** Second person (you/your). Active voice. Present tense. Direct.
- **Sentence style:** Short. Mix lengths deliberately. No sentence over 20 words. One idea per sentence.
- **Energy:** Confident but calm. Knowledgeable without showing off. Like a friend who actually knows silver.

**On-brand sample lines:**
- "Silver premiums vary. Knowing what you're paying for makes the difference."
- "You don't need to be an expert. You need a plan."
- "A 10 oz bar costs less per ounce than a 1 oz coin. That's just math."

**Off-brand sample lines (never write these):**
- "Silver is the ultimate hedge against the coming collapse." ← fear-mongering
- "Leverage your silver holdings to maximize your portfolio's potential." ← buzzword soup
- "In today's volatile economic landscape, precious metals offer a comprehensive solution." ← AI filler

---

## Content Pillars

| Pillar | Angle | Evergreen? |
|--------|-------|-----------|
| Buying guides | Practical how-to, reduce confusion at purchase | Yes |
| Storage | Real options, real tradeoffs, no fear | Yes |
| Price education | Spot price, premiums, when to buy | Yes |
| Dealer vetting | What to look for, red flags, comparison | Yes |
| Inflation hedge | Why silver works, history, data | Yes |
| Market outlook | Price drivers, supply/demand, industrial use | Seasonal |

---

## Product / Service Details

**Always mention:**
- Physical silver only (not ETFs, not paper silver)
- Premiums exist and vary — educate the reader
- Storage is a real consideration, address it honestly
- The reserve plan concept: regular, planned buying vs. timing the market

**Never mention:**
- Specific price predictions
- Guaranteed returns
- Competitor brand names by name

**Key facts to draw from:**
- Silver has 10,000+ industrial uses including solar panels and EVs
- Global silver supply has been in deficit for 6+ consecutive years (as of 2026)
- Silver-to-gold ratio historically averages ~60:1; spikes signal undervaluation
- .999 fine silver is standard for bullion; .9999 for premium coins
- Troy ounce (31.1g) not the same as standard ounce (28.35g) — a common confusion

---

## UGC Prompting Principles

**Preferred formats:** Testimonial, Comparison (work best for skeptical buyers)

**Authenticity cues for silver audience:**
- Acknowledge the skepticism directly ("I wasn't sure if it was worth it")
- Use a specific number or timeframe ("after buying my first 10 oz bar")
- Avoid enthusiasm that sounds like a pitch — calm confidence only
- Never claim silver "saved" someone financially — too dramatic
- Reference a real pain point: price confusion, dealer trust, storage worry

**Forbidden words (beyond global writing rules):**
- collapse, crash, hyperinflation, SHTF, prepper (too fear-driven)
- guaranteed, certain, definitely going up (no price predictions)
- amazing, incredible, game-changer (too hype)

---

## Visual Identity

- **Background:** `#041018`
- **Primary accent:** `#58d6ff` (cyan)
- **Secondary accent:** `#4dffb8` (green)
- **Text primary:** `#e8f4f8`
- **Text muted:** `rgba(175,198,207,0.70)`
- **Typography:** Trebuchet MS, sans-serif
- **Style:** Grid lines, radial glows, concentric rings — matches existing hero.svg

---

## Changelog

| Date | Change | Why |
|------|--------|-----|
| 2026-06-10 | Initial creation | New UGC ad creative system |
```

Save as `blog/MASTER_CONTEXT-silver.md`.

- [ ] **Step 2: Verify file exists and reads correctly**

```bash
head -5 "/Users/nick/Documents/New project/blog/MASTER_CONTEXT-silver.md"
```
Expected: `---` frontmatter block.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add blog/MASTER_CONTEXT-silver.md
git commit -m "feat: add MASTER_CONTEXT-silver brand bible"
```

---

## Task 2: MASTER_CONTEXT — Tech Brand

**Files:**
- Create: `blog/MASTER_CONTEXT-tech.md`

- [ ] **Step 1: Create the file**

```markdown
---
brand: tech
updated: 2026-06-10
---

# MASTER_CONTEXT — Fused Distribution (Technology Solutions)

> Read this file before drafting any tech post, ad, or script.
> Append a dated changelog entry after any meaningful change.

---

## Brand Identity

- **Name:** Fused Distribution Technology Solutions
- **Sub-line:** Technology Solutions
- **CTA target:** /#contact
- **Site:** fuseddistribution.com
- **Positioning:** Websites and digital marketing that actually get local businesses found on Google — no jargon, no retainer traps, no vague promises.
- **What this brand is NOT:** Not a national agency. Not an SEO farm. Not a tool subscription service. Not complicated.

---

## Audience

**Primary segment:** Local business owners, ages 35–60, service-based businesses (contractors, salons, restaurants, clinics, trades). Not tech-savvy. Spending money on a website that gets zero calls. Frustrated that competitors seem to rank higher even though they do worse work.

**Pain points (in their own words):**
- "I have a website but nobody calls from it"
- "I don't even show up when people search for me"
- "I don't know what I'm paying for with my current guy"
- "I asked Google how to get more reviews and got a wall of text"
- "I don't have time to post on social media every day"

**Objections / what they distrust:**
- Agencies that promise page-one rankings without explaining how
- Long contracts they can't get out of
- Dashboards and reports they don't understand
- Anyone who talks about "impressions" and "reach" instead of phone calls

---

## Voice & Tone

- **Register:** Second person (you/your). Active voice. Present tense. Direct.
- **Sentence style:** Short. Plain. Business owner who is busy and just wants to know what to do.
- **Energy:** Straight to the point. No hand-holding but no condescension. Like the one friend who actually knows this stuff.

**On-brand sample lines:**
- "Your Google Business Profile is free. Most people set it up wrong."
- "Reviews matter more than your website for local search. That's just how Google works."
- "If someone searches your service + your city and you don't show up, you're invisible."

**Off-brand sample lines (never write these):**
- "Harness the power of digital transformation to elevate your brand's online presence." ← pure buzzword
- "In today's competitive digital landscape, having a robust online ecosystem is paramount." ← AI filler
- "Leverage our comprehensive suite of solutions to streamline your marketing efforts." ← every agency ever

---

## Content Pillars

| Pillar | Angle | Evergreen? |
|--------|-------|-----------|
| Google visibility | GBP setup, local SEO, map pack ranking | Yes |
| Reviews and reputation | Getting more, responding, strategy | Yes |
| Website fundamentals | What works, what doesn't, what to fix | Yes |
| Social media | Practical, realistic volume and format | Yes |
| Customer retention | Email, SMS, referrals, repeat business | Yes |
| Analytics | What to actually look at and why | Yes |

---

## Product / Service Details

**Always mention:**
- Local business context — this is for businesses serving a geographic area
- Practical steps the reader can take immediately
- Real numbers where possible (e.g. "87% of people check reviews before visiting")
- That Google Business Profile is free and often more powerful than the website

**Never mention:**
- Specific client results with dollar figures (legal risk)
- Competing agency names by name
- Monthly retainer pricing in posts

**Key facts to draw from:**
- 46% of all Google searches have local intent
- Google Business Profile is the most important free tool for local search
- Businesses with 10+ reviews rank noticeably better in the local pack
- Page speed under 3 seconds reduces bounce rate significantly
- 88% of consumers trust online reviews as much as personal recommendations

---

## UGC Prompting Principles

**Preferred formats:** Founder, Demo (work best for skeptical small business owners)

**Authenticity cues for local business audience:**
- Speak as a peer, not an expert looking down — "I used to make this mistake too"
- Use a concrete business type in the hook ("If you run a plumbing business...")
- Demo format: show the actual step, not just the concept
- Founder format: explain frustration with vague agency promises as origin story
- Avoid technical terms without explanation

**Forbidden words (beyond global writing rules):**
- synergy, ecosystem, paradigm, digital transformation (agency-speak)
- guaranteed results, page one guaranteed (illegal/undeliverable claims)
- disrupt, innovate (startup clichés irrelevant to local business)

---

## Visual Identity

- **Background:** `#041018`
- **Primary accent:** `#58d6ff` (cyan)
- **Secondary accent:** `#4dffb8` (green)
- **Text primary:** `#e8f4f8`
- **Text muted:** `rgba(175,198,207,0.70)`
- **Typography:** Trebuchet MS, sans-serif
- **Style:** Grid lines, radial glows, concentric rings — matches existing hero.svg

---

## Changelog

| Date | Change | Why |
|------|--------|-----|
| 2026-06-10 | Initial creation | New UGC ad creative system |
```

Save as `blog/MASTER_CONTEXT-tech.md`.

- [ ] **Step 2: Verify**

```bash
head -5 "/Users/nick/Documents/New project/blog/MASTER_CONTEXT-tech.md"
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add blog/MASTER_CONTEXT-tech.md
git commit -m "feat: add MASTER_CONTEXT-tech brand bible"
```

---

## Task 3: social-ad Skill

**Files:**
- Create: `.claude/plugins/cache/local/fused/1.0.0/skills/social-ad/SKILL.md`

- [ ] **Step 1: Create the skill file**

```markdown
---
name: social-ad
description: >
  Generate organic social ad images for a Fused Distribution blog post.
  Reads post content + MASTER_CONTEXT brand file, generates 2-5 SVG ad
  templates (1200x1200), converts each to JPEG via Chrome headless, and
  appends paths to social-copy.json under organic_ads[].
  Trigger: social-ad [slug], "make ad creatives for [post]", "generate social ads".
---

# social-ad — Fused Distribution Ad Creative Generator

Generates platform-agnostic organic social ad images from an existing blog post.
All output is 1200×1200 SVG → JPEG using the same Chrome headless pipeline as photo-post.jpg.

---

## Step 1 — Gather inputs

The user provides a slug (e.g. `silver-storage-guide`). Determine brand from post:

```bash
grep -i "reserve\|/reserve/" "/Users/nick/Documents/New project/blog/[slug]/index.html" | head -3
```

If `/reserve/` found → brand = silver. If `/#contact` found → brand = tech.

Read brand file:
- Silver: `/Users/nick/Documents/New project/blog/MASTER_CONTEXT-silver.md`
- Tech: `/Users/nick/Documents/New project/blog/MASTER_CONTEXT-tech.md`

Extract from `blog/[slug]/index.html`:
- Post title (h1)
- Largest stat or number in the post (scan for digits + context)
- Primary keyword / topic
- 5 key facts or bullet points
- Best pull quote (short, punchy, ≤15 words)
- CTA URL (/reserve/ or /#contact)

Determine which templates to generate:
1. Check `blog/research/YYYY-MM-DD-queue.json` for today's date — look for this slug's `ad_formats` field
2. If found and non-empty: use those template names
3. If absent: default to `["stat-card", "google-search"]`

---

## Step 2 — Generate SVGs

Generate each requested template. Rules that apply to ALL templates:

**XML entity rule (enforced before every JPEG conversion):**
```bash
grep -En "&[a-zA-Z]+;" blog/[slug]/[filename].svg
```
Must return zero matches. Fix any named entities before continuing:
- `&middot;` → `&#183;`
- `&nbsp;` → `&#160;`
- `&bull;` → `&#8226;`
- `&mdash;` → `&#8212;`
- `&ndash;` → `&#8211;`
- `&copy;` → `&#169;`
- `&amp;` is fine — it is a valid XML entity, leave it

**Canvas:** `width="1200" height="1200" viewBox="0 0 1200 1200"`

**Brand palette (from MASTER_CONTEXT):**
- Background: `#041018`
- Primary accent: `#58d6ff`
- Secondary accent: `#4dffb8`
- Text primary: `#e8f4f8`
- Text muted: `rgba(175,198,207,0.70)`
- Font: Trebuchet MS, sans-serif

---

### Template: stat-card

Full-bleed dark background. One giant number centered. Two lines of context below. Brand wordmark bottom-right. Minimal.

```svg
<!-- Replace [STAT], [CONTEXT LINE 1], [CONTEXT LINE 2] with values extracted from the post -->
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="#041018"/>
  <!-- Optional: subtle radial glow -->
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#58d6ff" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#58d6ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#glow)"/>
  <!-- Giant stat — font-size 180-220 depending on digit count -->
  <text x="600" y="560" text-anchor="middle" font-family="'Trebuchet MS',sans-serif"
    font-size="200" font-weight="700" fill="#58d6ff">[STAT]</text>
  <!-- Context line 1 -->
  <text x="600" y="660" text-anchor="middle" font-family="'Trebuchet MS',sans-serif"
    font-size="42" fill="#e8f4f8">[CONTEXT LINE 1]</text>
  <!-- Context line 2 (optional, muted) -->
  <text x="600" y="720" text-anchor="middle" font-family="'Trebuchet MS',sans-serif"
    font-size="32" fill="rgba(175,198,207,0.70)">[CONTEXT LINE 2]</text>
  <!-- Brand wordmark bottom-right -->
  <text x="1150" y="1160" text-anchor="end" font-family="'Trebuchet MS',sans-serif"
    font-size="22" fill="rgba(88,214,255,0.50)">fuseddistribution.com</text>
</svg>
```

Output: `blog/[slug]/ad-stat-card.svg`

---

### Template: google-search

Dark phone chrome frame. Google search bar. 3 fake result cards. First result = fuseddistribution.com. Styled in dark mode.

Structure (top to bottom):
- Dark rounded phone chrome frame (1100×1000 inner, centered, `#1a1a2e`, 24px corner radius)
- Google logo top-left, search bar with post keyword as query, magnifier icon right
- "About 53,400 results" subtitle in muted text
- 3 result cards:
  - Card 1: `fuseddistribution.com › blog › [slug]` URL in green (`#4dffb8`), post title in `#e8f4f8` as h3, 2-line description from post intro
  - Card 2: Generic competitor URL (e.g. `investopedia.com › ...`), plausible title, 1-line description
  - Card 3: Generic competitor URL, plausible title, 1-line description
- Subtle highlight/border on Card 1 only

Output: `blog/[slug]/ad-google-search.svg`

---

### Template: apple-notes

White card on dark background. Yellow Notes app icon. Punchy title. 5-7 checkmark bullets. Last item bolder.

Structure:
- Dark background `#041018`
- White rounded card (900×800, centered, `#ffffff`, 20px corner radius)
- Yellow circle icon top-left (50px, `#FFD60A`) with white notepad lines inside
- "Notes" label next to icon in `#1c1c1e` medium weight
- Title: punchy claim or question from post (font-size 36, `#1c1c1e`, bold)
- Divider line
- 5-7 bullets with ✓ checkmarks (`#34C759` green) + short truths/stats from post
- Last bullet slightly larger/bolder — the punchline
- Footer: "— shared from Notes" in muted gray

Output: `blog/[slug]/ad-apple-notes.svg`

---

### Template: text-thread

iMessage-style dark mode bubbles. Friend asks relatable question. "You" answers in 2-3 replies. Subtle phone chrome top.

Structure:
- Dark background `#1c1c1e`
- Phone status bar top (time, battery, signal — simplified)
- Contact name header with avatar circle
- Incoming bubble (gray `#3a3a3c`, rounded, left-aligned): friend's question matching post topic
- Outgoing bubbles (blue `#0a84ff`, right-aligned): 2-3 short replies ending with recommendation
- Last outgoing bubble slightly larger — the recommendation with brand mention
- Timestamp between groups in muted gray

Output: `blog/[slug]/ad-text-thread.svg`

---

### Template: quote-card

Large pull quote. Attribution. Cyan left border. Clean.

Structure:
- Dark background `#041018`
- 6px left accent bar (`#58d6ff`, 700px tall, centered vertically)
- Large pull quote from post (font-size 52, `#e8f4f8`, italic, max 12 words per line)
- Attribution: "— [persona or "Fused Distribution"]" in muted cyan
- Brand wordmark bottom-right in muted text

Output: `blog/[slug]/ad-quote-card.svg`

---

## Step 3 — Convert SVG to JPEG

For each generated SVG, run entity check then convert:

```bash
# Entity check first
ENTITY_COUNT=$(grep -cE "&[a-zA-Z]+;" "blog/[slug]/ad-[type].svg" 2>/dev/null || echo 0)
if [[ "$ENTITY_COUNT" -gt 0 ]]; then
  echo "ERROR: named HTML entities found in ad-[type].svg — fix before converting"
  grep -En "&[a-zA-Z]+;" "blog/[slug]/ad-[type].svg"
  exit 1
fi

# Convert
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu \
  --screenshot=/tmp/ad-tmp.png \
  --window-size=1200,1200 \
  "file://$(pwd)/blog/[slug]/ad-[type].svg" 2>/dev/null && \
sips -s format jpeg /tmp/ad-tmp.png \
  --out "blog/[slug]/ad-[type].jpg" \
  -s formatOptions 85 && \
rm /tmp/ad-tmp.png

# Verify
ls -lh "blog/[slug]/ad-[type].jpg"
# Must exist and be > 30 KB
```

---

## Step 4 — Update social-copy.json

Read the existing `blog/[slug]/social-copy.json`. Add or update the `organic_ads` key:

```json
{
  "organic_ads": [
    { "type": "stat-card",     "file": "/blog/[slug]/ad-stat-card.jpg" },
    { "type": "google-search", "file": "/blog/[slug]/ad-google-search.jpg" }
  ]
}
```

Merge with existing keys — do not overwrite `facebook`, `instagram`, `twitter`, `linkedin`.

---

## Step 5 — Report

Output a summary table:

```
social-ad complete for [slug]
┌─────────────────┬──────────┬────────┐
│ Template        │ Size     │ Status │
├─────────────────┼──────────┼────────┤
│ stat-card       │ 78 KB    │ OK     │
│ google-search   │ 92 KB    │ OK     │
└─────────────────┴──────────┴────────┘
social-copy.json organic_ads[] updated.
```

If any template fails entity check or JPEG conversion: report FAILED, explain what failed, do not skip silently.
```

- [ ] **Step 2: Verify file exists**

```bash
head -8 "/Users/nick/.claude/plugins/cache/local/fused/1.0.0/skills/social-ad/SKILL.md"
```

Expected: YAML frontmatter with `name: social-ad`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add "/Users/nick/.claude/plugins/cache/local/fused/1.0.0/skills/social-ad/SKILL.md"
git commit -m "feat: add social-ad skill — 5 SVG organic ad templates"
```

---

## Task 4: ugc-script Skill

**Files:**
- Create: `.claude/plugins/cache/local/fused/1.0.0/skills/ugc-script/SKILL.md`

- [ ] **Step 1: Create the skill file**

```markdown
---
name: ugc-script
description: >
  Write UGC-style organic video scripts for a Fused Distribution blog post.
  Reads post content + MASTER_CONTEXT, selects best format from 5 types,
  generates 2 A/B variants (60-95 words each), validates writing rules,
  and saves to blog/[slug]/ugc-script.md.
  Trigger: ugc-script [slug], "write UGC script for [post]", "ugc for [slug]".
---

# ugc-script — Fused Distribution UGC Script Generator

Writes 2 A/B variant UGC-style scripts (not AI actor scripts — for real-person filming or
caption-style text overlays) from an existing blog post. Scripts are 60-95 words, hook ≤8 words.

---

## Step 1 — Gather inputs

The user provides a slug. Determine brand:

```bash
grep -c "/reserve/" "/Users/nick/Documents/New project/blog/[slug]/index.html"
```

Non-zero → silver. Zero → tech.

Read brand MASTER_CONTEXT:
- Silver: `blog/MASTER_CONTEXT-silver.md`
- Tech: `blog/MASTER_CONTEXT-tech.md`

Extract from `blog/[slug]/index.html`:
- Post title
- Post angle (what question does it answer)
- 3 strongest stats or facts
- Main pain point addressed
- CTA URL and text

Check today's queue file `blog/research/[YYYY-MM-DD]-queue.json` for this slug's `ugc_angle` field.

---

## Step 2 — Select format

**Format decision tree:**

| Signal in post | Format |
|----------------|--------|
| `ugc_angle` field in queue JSON (overrides all) | Use that format |
| Post is a buying guide or "how to spot/avoid" | Comparison |
| Post angle is "I was skeptical / didn't expect" | Testimonial |
| Post leads with a pain point → solution | Problem/Solution |
| Post is a step-by-step how-to | Demo |
| Post covers brand story or why-we-exist | Founder |
| Silver brand, no other signal | Testimonial (silver default) |
| Tech brand, no other signal | Founder (tech default) |

---

## Step 3 — Write scripts

Write **2 variants** per post using the selected format. Each variant:

**Structure:**
```
HOOK (0-2s): ≤8 words. Opens mid-thought. No "Hi I'm...", no brand name first, no setup.
BODY (3-25s): 3 short beats. One truth/stat per beat. Specific timeframe, one sensory detail.
CTA (last 5s): One action. Feels like end of story.
```

**Format-specific guidance:**

**Testimonial:**
- Variant A hook: opens with skepticism ("I wasn't sure this was worth it...")
- Variant B hook: opens with a result with timeframe ("After buying my first 10 oz...")
- Body: acknowledge doubt → experience → specific result
- Realism: one tiny imperfect detail ("took me a while to figure out the premium thing")

**Problem/Solution:**
- Variant A hook: pain-first ("If you struggle with [exact pain point]...")
- Variant B hook: counter-intuitive ("Here's what nobody tells you about [topic]...")
- Body: relatable struggle → product/approach → two benefits with specifics
- Realism: use "you" not "people" — speak directly to viewer

**Demo:**
- Variant A hook: task-first ("Let me show you exactly how to [task]...")
- Variant B hook: warning ("Watch this before you [do the thing]...")
- Body: step 1 → step 2 → result, keep calm tone, no enthusiasm spikes
- Realism: mention one thing that commonly goes wrong

**Comparison:**
- Variant A hook: comparison-first ("I tried [A] vs [B] and the difference...")
- Variant B hook: frame as protection ("Don't [buy/do X] until you see this...")
- Body: option A context → option B context → clear winner + one balanced concession
- Realism: acknowledge the runner-up has one legitimate upside

**Founder:**
- Variant A hook: frustration origin ("I started this because I was tired of [problem]...")
- Variant B hook: audience-first ("If you run a [business type], this is what we do...")
- Body: problem → failed alternatives → what we built differently
- Realism: one specific failure or frustration that drove the decision

---

## Step 4 — Validate

Before writing the output file, check every variant:

```python
import re, sys

script = """[VARIANT TEXT]"""

checks = {
    "no em dashes":     len(re.findall(r'—', script)) == 0,
    "no % symbol":      len(re.findall(r'\d+%', script)) == 0,
    "no standalone US": len(re.findall(r'\bUS\b', script)) == 0,
    "hook ≤8 words":    len(script.split('\n')[0].split()) <= 8,
    "word count 60-95": 60 <= len(script.split()) <= 95,
}

for check, passed in checks.items():
    print(f"{'PASS' if passed else 'FAIL'}: {check}")

sys.exit(0 if all(checks.values()) else 1)
```

Fix any FAILs before writing the file. Common fixes:
- Em dash → comma or period
- `73%` → `73 percent`
- `US` → `USA`
- Hook too long → cut to 8 words max
- Word count too high → trim body beats to one sentence each

Also apply MASTER_CONTEXT forbidden words check: scan both variants for brand-specific forbidden words and replace.

---

## Step 5 — Write output file

Save to `blog/[slug]/ugc-script.md`:

```markdown
# UGC Script — [Post Title]

**Format:** [selected format]
**Brand:** [silver|tech]
**Generated:** [YYYY-MM-DD]

---

## VARIANT A (~[N] words / ~[N]s)

### HOOK (0–2s)
[hook line]

### BODY (3–25s)
[beat 1]

[beat 2]

[beat 3]

### CTA (last 5s)
[cta line]

---

## VARIANT B (~[N] words / ~[N]s)

### HOOK (0–2s)
[hook line]

### BODY (3–25s)
[beat 1]

[beat 2]

[beat 3]

### CTA (last 5s)
[cta line]

---

**Format rationale:** [one sentence: why this format was chosen]
**Realism cues applied:** [list 2-3 specific techniques used]
**Forbidden words checked:** yes
```

---

## Step 6 — Report

```
ugc-script complete for [slug]
Format: Testimonial
Variant A: 74 words / ~30s ✓
Variant B: 71 words / ~28s ✓
Saved: blog/[slug]/ugc-script.md
```
```

- [ ] **Step 2: Verify**

```bash
head -8 "/Users/nick/.claude/plugins/cache/local/fused/1.0.0/skills/ugc-script/SKILL.md"
```

Expected: YAML frontmatter with `name: ugc-script`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add "/Users/nick/.claude/plugins/cache/local/fused/1.0.0/skills/ugc-script/SKILL.md"
git commit -m "feat: add ugc-script skill — 5-format UGC script generator"
```

---

## Task 5: Update gemma-nightly.sh

**Files:**
- Modify: `blog/scripts/gemma-nightly.sh`

Two changes:
1. `process_topic()` reads the matching MASTER_CONTEXT file and injects brand voice into the Ollama prompt
2. Queue JSON writer adds `ad_formats` and `ugc_angle` fields per post

- [ ] **Step 1: Add MASTER_CONTEXT read to process_topic()**

Find this block in `process_topic()`:

```bash
  # Brand context
  local BRAND_CTX
  if [[ "$BRAND" == "silver" ]]; then
    BRAND_CTX="Fused Distribution — silver and precious metals reserve plans. Audience: retail investors buying physical silver. CTA: /reserve/"
  else
    BRAND_CTX="Fused Distribution Technology Solutions — websites and digital marketing for local businesses. Audience: small business owners. CTA: /#contact"
  fi
```

Replace with:

```bash
  # Brand context — read from MASTER_CONTEXT file
  local MC_FILE
  if [[ "$BRAND" == "silver" ]]; then
    MC_FILE="$BLOG_DIR/MASTER_CONTEXT-silver.md"
  else
    MC_FILE="$BLOG_DIR/MASTER_CONTEXT-tech.md"
  fi

  local BRAND_CTX
  if [[ -f "$MC_FILE" ]]; then
    # Extract key sections from MASTER_CONTEXT for prompt injection
    BRAND_CTX=$(awk '
      /^## Brand Identity/,/^## Audience/ { print }
      /^## Audience/,/^## Voice/ { print }
      /^## Voice/,/^## Content Pillars/ { print }
      /^## UGC Prompting Principles/,/^## Visual Identity/ { print }
    ' "$MC_FILE" | head -80)
  else
    # Fallback if file missing
    if [[ "$BRAND" == "silver" ]]; then
      BRAND_CTX="Fused Distribution — silver and precious metals reserve plans. Audience: retail investors buying physical silver. CTA: /reserve/"
    else
      BRAND_CTX="Fused Distribution Technology Solutions — websites and digital marketing for local businesses. Audience: small business owners. CTA: /#contact"
    fi
  fi
```

- [ ] **Step 2: Verify MASTER_CONTEXT injection works (dry test)**

```bash
cd "/Users/nick/Documents/New project"
awk '
  /^## Brand Identity/,/^## Audience/ { print }
  /^## Audience/,/^## Voice/ { print }
  /^## Voice/,/^## Content Pillars/ { print }
  /^## UGC Prompting Principles/,/^## Visual Identity/ { print }
' blog/MASTER_CONTEXT-silver.md | head -40
```

Expected: Brand Identity and Voice sections printed, ~30-40 lines.

- [ ] **Step 3: Add ad_formats and ugc_angle to queue JSON writer**

Find this block near the end of the script:

```python
entries.append({
    'slug': slug,
    'keyword': keyword,
    'brand': brand,
    'draft': f'blog/{slug}/gemma_draft.md'
})
```

Replace with:

```python
# Determine ad_formats based on keyword content
keyword_lower = keyword.lower()
if any(w in keyword_lower for w in ['compare', 'vs', 'difference', 'best', 'dealer', 'buy']):
    ad_formats = ['google-search', 'stat-card']
elif any(w in keyword_lower for w in ['how to', 'guide', 'step', 'setup', 'start']):
    ad_formats = ['apple-notes', 'stat-card']
elif any(w in keyword_lower for w in ['what is', 'explained', 'history', 'why']):
    ad_formats = ['quote-card', 'stat-card']
else:
    ad_formats = ['stat-card', 'google-search']

# Determine ugc_angle based on keyword content
if any(w in keyword_lower for w in ['compare', 'vs', 'best', 'dealer', 'alternative']):
    ugc_angle = 'comparison'
elif any(w in keyword_lower for w in ['how to', 'step by step', 'setup', 'guide for beginners']):
    ugc_angle = 'demo'
elif any(w in keyword_lower for w in ['why', 'what is', 'explained', 'history']):
    ugc_angle = 'testimonial'
elif brand == 'tech' and any(w in keyword_lower for w in ['google', 'website', 'profile']):
    ugc_angle = 'founder'
else:
    ugc_angle = 'testimonial' if brand == 'silver' else 'founder'

entries.append({
    'slug': slug,
    'keyword': keyword,
    'brand': brand,
    'draft': f'blog/{slug}/gemma_draft.md',
    'ad_formats': ad_formats,
    'ugc_angle': ugc_angle
})
```

- [ ] **Step 4: Verify queue schema change with dry run**

```bash
python3 - <<'EOF'
import json

# Simulate the new logic for a sample keyword
keyword = "how to buy silver for the first time"
brand = "silver"
keyword_lower = keyword.lower()

if any(w in keyword_lower for w in ['compare', 'vs', 'difference', 'best', 'dealer', 'buy']):
    ad_formats = ['google-search', 'stat-card']
elif any(w in keyword_lower for w in ['how to', 'guide', 'step', 'setup', 'start']):
    ad_formats = ['apple-notes', 'stat-card']
elif any(w in keyword_lower for w in ['what is', 'explained', 'history', 'why']):
    ad_formats = ['quote-card', 'stat-card']
else:
    ad_formats = ['stat-card', 'google-search']

if any(w in keyword_lower for w in ['compare', 'vs', 'best', 'dealer', 'alternative']):
    ugc_angle = 'comparison'
elif any(w in keyword_lower for w in ['how to', 'step by step', 'setup', 'guide for beginners']):
    ugc_angle = 'demo'
elif any(w in keyword_lower for w in ['why', 'what is', 'explained', 'history']):
    ugc_angle = 'testimonial'
elif brand == 'tech' and any(w in keyword_lower for w in ['google', 'website', 'profile']):
    ugc_angle = 'founder'
else:
    ugc_angle = 'testimonial' if brand == 'silver' else 'founder'

print(json.dumps({'ad_formats': ad_formats, 'ugc_angle': ugc_angle}, indent=2))
EOF
```

Expected output: `{"ad_formats": ["google-search", "stat-card"], "ugc_angle": "comparison"}` (buy matches 'buy' in first branch).

- [ ] **Step 5: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add blog/scripts/gemma-nightly.sh
git commit -m "feat: inject MASTER_CONTEXT into Gemma prompts; add ad_formats + ugc_angle to queue JSON"
```

---

## Task 6: Update daily-blog-reel.sh

**Files:**
- Modify: `/Users/nick/bin/daily-blog-reel.sh`

Add steps 8 and 9 to the FINAL STEPS block inside the Claude prompt.

- [ ] **Step 1: Find the FINAL STEPS block**

The block ends with:

```
6. Commit and deploy:
   git add blog/ sitemap.xml
   git commit -m 'feat: [post-1-title] + [post-2-title] + [post-3-title] + [post-4-title]'
   git push origin main
   npx wrangler deploy" \
```

- [ ] **Step 2: Add steps 8 and 9 before the commit step**

Replace:

```
6. Commit and deploy:
   git add blog/ sitemap.xml
   git commit -m 'feat: [post-1-title] + [post-2-title] + [post-3-title] + [post-4-title]'
   git push origin main
   npx wrangler deploy" \
```

With:

```
6. For each slug — run social-ad skill:
   Invoke social-ad skill for each post.
   Read MASTER_CONTEXT for the brand. Use ad_formats from queue JSON (or default: stat-card + google-search).
   Generate SVGs → entity check → JPEG. Append to social-copy.json organic_ads[].

7. For each slug — run ugc-script skill:
   Invoke ugc-script skill for each post.
   Read MASTER_CONTEXT for the brand. Use ugc_angle from queue JSON (or auto-select).
   Validate: no em dashes, no %, no standalone US, hook ≤8 words. Save blog/[slug]/ugc-script.md.

8. Commit and deploy:
   git add blog/ sitemap.xml
   git commit -m 'feat: [post-1-title] + [post-2-title] + [post-3-title] + [post-4-title] + 8 ad creatives + 4 ugc scripts'
   git push origin main
   npx wrangler deploy" \
```

- [ ] **Step 3: Verify the edit looks correct**

```bash
grep -n "social-ad\|ugc-script\|8 ad creatives" /Users/nick/bin/daily-blog-reel.sh
```

Expected: 3 matches across the new steps 6, 7, and 8.

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add /Users/nick/bin/daily-blog-reel.sh
git commit -m "feat: add social-ad + ugc-script steps to daily pipeline"
```

---

## Task 7: Update BLOG-SOP.md

**Files:**
- Modify: `blog/BLOG-SOP.md`

Document new output files so the quick checklist stays accurate.

- [ ] **Step 1: Add new file outputs to the quick checklist**

Find in BLOG-SOP.md:

```
- [ ] Write `social-copy.json` (§14) — apply §9 writing rules to every caption field
```

Add after it:

```
- [ ] Run `social-ad` skill — generates 2 SVG ad templates → JPEG, updates `organic_ads[]` in social-copy.json
- [ ] Run `ugc-script` skill — writes 2 A/B UGC script variants to `ugc-script.md`, validated
```

- [ ] **Step 2: Add ugc-script.md to the file structure section**

Find the file structure section that lists `reel-script.md`:

```
    reel-script.md
```

Add after it:

```
    ugc-script.md           ← 2 A/B UGC script variants for real-person filming
    ad-stat-card.svg/.jpg   ← generated organic ad (stat-card template)
    ad-google-search.svg/.jpg ← generated organic ad (google-search template)
```

- [ ] **Step 3: Document organic_ads key in social-copy.json section (§14)**

Find the social-copy.json schema in §14. Add after the existing platform keys:

```json
"organic_ads": [
  { "type": "stat-card",     "file": "/blog/[slug]/ad-stat-card.jpg" },
  { "type": "google-search", "file": "/blog/[slug]/ad-google-search.jpg" }
]
```

Note: `organic_ads[]` is additive — existing facebook/instagram/twitter/linkedin keys are untouched.

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add blog/BLOG-SOP.md
git commit -m "docs: update BLOG-SOP with social-ad and ugc-script outputs"
```

---

## Task 8: Smoke Test

Validate the full system works end-to-end on an existing post before the next pipeline run.

- [ ] **Step 1: Pick a test slug**

```bash
ls "/Users/nick/Documents/New project/blog/" | grep "silver" | head -5
```

Pick one with an existing `index.html` and `social-copy.json`. Use `silver-storage-guide` or similar.

- [ ] **Step 2: Test social-ad skill manually**

In a Claude Code session:

```
social-ad silver-storage-guide
```

Expected outputs:
```bash
ls -lh "/Users/nick/Documents/New project/blog/silver-storage-guide/ad-"*.jpg
# Should show 2 files, each >30 KB
```

Check social-copy.json updated:
```bash
python3 -c "
import json
d = json.load(open('/Users/nick/Documents/New project/blog/silver-storage-guide/social-copy.json'))
print(json.dumps(d.get('organic_ads', 'MISSING'), indent=2))
"
```
Expected: array with 2 entries, each with `type` and `file` keys.

- [ ] **Step 3: Test ugc-script skill manually**

In a Claude Code session:

```
ugc-script silver-storage-guide
```

Expected output file:
```bash
cat "/Users/nick/Documents/New project/blog/silver-storage-guide/ugc-script.md" | head -30
```

Validate the output:
```bash
python3 - <<'EOF'
import re

with open('/Users/nick/Documents/New project/blog/silver-storage-guide/ugc-script.md') as f:
    content = f.read()

checks = {
    'has VARIANT A':    'VARIANT A' in content,
    'has VARIANT B':    'VARIANT B' in content,
    'has HOOK section': '### HOOK' in content,
    'has CTA section':  '### CTA' in content,
    'no em dashes':     '—' not in content,
    'no % in narration': not re.search(r'\d+%', content),
}

for check, passed in checks.items():
    print(f"{'PASS' if passed else 'FAIL'}: {check}")
EOF
```

All checks must PASS.

- [ ] **Step 4: Verify Gemma queue dry run produces new fields**

```bash
python3 - <<'EOF'
import json

# Simulate for all 4 topics from today's existing queue if present
import glob, os
from datetime import date

queue_path = f"/Users/nick/Documents/New project/blog/research/{date.today()}-queue.json"
if os.path.exists(queue_path):
    q = json.load(open(queue_path))
    for p in q['posts']:
        print(p['slug'], '|', p.get('ad_formats', 'MISSING'), '|', p.get('ugc_angle', 'MISSING'))
else:
    print("No queue for today yet — will be generated tonight")
EOF
```

Note: today's queue won't have the new fields (was generated before this change). Gemma generates tomorrow's queue at 11pm — that's when new fields appear. If `MISSING`, that's expected for today.

- [ ] **Step 5: Commit smoke test slug output files**

```bash
cd "/Users/nick/Documents/New project"
git add blog/silver-storage-guide/
git commit -m "test: social-ad + ugc-script smoke test on silver-storage-guide"
```

- [ ] **Step 6: Deploy**

```bash
CLOUDFLARE_API_TOKEN="REDACTED_ROTATE_ME" npx wrangler deploy
```
