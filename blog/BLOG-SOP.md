# Blog Post SOP — Fused Distribution

> Reference material (CSS, HTML template): **BLOG-REF.md** — copy verbatim, never re-read.


## Setup (one-time)

**Pexels API key** — required for blog images and reel backgrounds.

Key is exported from `~/.zprofile` automatically in every new shell. No manual export needed.

If the key is ever missing, add it to `~/.zprofile`:
```bash
echo 'export PEXELS_API_KEY=your_key_here' >> ~/.zprofile
source ~/.zprofile
```

To verify it is active:
```bash
echo $PEXELS_API_KEY
```

---

## 0. Quick Checklist

- [ ] Decide brand: Silver/Reserve OR Tech/Technology Solutions
- [ ] Add entry to `posts.json` (top of array)
- [ ] Create `blog/[slug]/` folder
- [ ] **Use `blog-write` skill** to draft post body — enforces E-E-A-T, sourced stats, 5-gate delivery contract, and all §9 writing rules automatically
- [ ] **Use `blog-seo-check` skill** after draft — validates on-page SEO signals before building HTML
- [ ] **Use `seo-local` skill** if post covers local business, Google, or map pack topics
- [ ] Write `index.html` — HTML from BLOG-REF.md "Section 1", CSS from BLOG-REF.md "Section 2", fill all [SLOTS]
- [ ] Write `hero.svg` — design rules in §7
- [ ] Body: min 1 custom graphic + min 1 Pexels photo, max 5 total (§8)
- [ ] Run: `node blog/scripts/fetch-pexels.mjs --post=[slug] --queries="q1|q2"`
- [ ] Paste attributions into `<figcaption>` tags
- [ ] Write `reel-data.md` with 3 reel sections (§11)
- [ ] Write `photo-post.svg` (§15)
- [ ] Write `social-copy.json` (§14)
- [ ] `git add blog/posts.json blog/[slug]/` then commit

---

## 1. Brand Routing

| Topic | Brand sub-line | Nav CTA | Article CTA |
|---|---|---|---|
| Silver / investing / Reserve | `Distribution` | Reserve Silver → `/reserve/` | `/reserve/` |
| Websites / tech / local business | `Technology Solutions` | Get Started → `/#contact` | `/#contact` |

---

## 2. posts.json Entry

Insert at **top** of array (newest first):

```json
{
  "slug": "your-slug-here",
  "title": "Your Post Title",
  "date": "YYYY-MM-DD",
  "excerpt": "One or two sentences. Under 160 characters.",
  "tags": ["Tag One", "Tag Two"],
  "author": "Nick",
  "image": "/blog/your-slug-here/hero.svg",
  "imageAlt": "Descriptive alt text"
}
```

- `slug` must match folder name exactly
- `image` path must be unique across all entries — check before setting

---

## 3. Folder Structure

```
blog/
  [slug]/
    index.html
    hero.svg
    reel-data.md        ← required (§11) — 3 reel sections
    reel-script.md      ← written by REEL-SOP workflow
    photo-post.svg      ← required (§15) — 1200×1200 square
    social-copy.json    ← required (§14) — captions per platform
    images/
      pexels-0.jpg      ← from fetch-pexels script
      pexels-1.jpg
```

Silver posts with coin photos: add `images/coins-spread.jpg` etc. alongside Pexels files.

---

## 4. HTML Template

Copy the full template from **BLOG-REF.md "Section 1"** and fill every `[SLOT]`:

| Slot | Fill with |
|------|-----------|
| `[POST TITLE]` | Title from posts.json |
| `[slug]` | Folder name |
| `[SEO description, 140-160 chars]` | Unique meta description |
| `[Short og description]` | ≤100 char OG description |
| `[Descriptive alt text]` | Hero image alt |
| `YYYY-MM-DD` | ISO date |
| `[Month D, YYYY]` | Human date in `<time>` |
| `[Tag One] · [Tag Two]` | Eyebrow tags |
| `[Distribution OR Technology Solutions]` | Brand sub-line |
| Silver nav CTA: `Reserve Silver` / Tech: `Get Started` | Uncomment correct CTA |
| Silver article CTA: `/reserve/` / Tech: `/#contact` | Uncomment correct block |

---

## 5. CSS

Copy the full CSS block from **BLOG-REF.md "Section 2"** verbatim into `<style>`. Post-specific styles (`.coin-grid`, `.math-box`, `.watch-list`) go at the bottom before `</style>`.

---

## 6. Content Components

Use inside `.article-body`. Pick from these — each has its own CSS requirement:

| Component | When to use | Extra CSS needed |
|-----------|-------------|-----------------|
| Horizontal bar chart (`.chart-wrap`) | Comparing categories | No |
| Vertical bar chart (`.chart-wrap`) | Time series / severity | No |
| Stat row (`.stat-row`) | 3 callout numbers | No |
| Inline article photo (`.article-photo`) | Pexels or coin photos | No |
| Math / formula box (`.math-box`) | Silver content math | Yes — add at bottom of `<style>` |
| Coin grid (`.coin-grid`) | Spec cards per coin type | Yes |
| Watch-out list (`.watch-list`) | Numbered warning items | Yes |
| Sources block (`.sources-block`) | Research-backed posts | No |

Chart math:
- Horizontal bar: `width = round(pct / 100 * 447)`, label x = `188 + width + 6`
- Vertical bar: `height = round(pct / 100 * 198)`, bar top y = `228 - height`

---

## 7. Hero SVG

File: `blog/[slug]/hero.svg` — `width="1200" height="630" viewBox="0 0 1200 630"`

**Required elements:**
- Background: `#041018` fill + cyan radial glow center + green radial glow top-left
- Grid: 6 vertical lines at x=170,340,510,680,850,1020 — `rgba(255,255,255,0.022)`
- Rings: two `<circle>` at (600,315), r=255 and r=170, stroke `#58d6ff` at 0.07 and 0.11 opacity
- Scatter dots: 8–12 at varied positions, r=1–1.5, `#58d6ff` or `#4dffb8`, opacity 0.15–0.30

**Layout zones:**
- Center (primary): x=340–860, y=180–450
- Left cards: x=42–337
- Right cards: x=863–1158

**Star paths (define in `<defs>`):**
- Small (reviews): `<path id="star-sm" d="M 0,-7 L 1.76,-2.43 L 6.66,-2.16 L 2.85,0.93 L 4.11,5.66 L 0,3 L -4.11,5.66 L -2.85,0.93 L -6.66,-2.16 L -1.76,-2.43 Z"/>`
- Large (ratings): `<path id="star-lg" d="M 0,-26 L 6.47,-8.90 L 24.73,-8.03 L 10.46,3.40 L 15.28,21.03 L 0,11 L -15.28,21.03 L -10.46,3.40 L -24.73,-8.03 L -6.47,-8.90 Z"/>`
- 5 small stars spacing: 18px centers. 5 large: 68px centers at x=464,532,600,668,736.

HTML placement: between `.article-meta` and `.article-divider`. No figcaption.

---

## 8. Inline Images

**Rule:** every post must have **min 1 custom graphic** AND **min 1 Pexels photo**. Max **5 total** visuals.

Custom graphics count: chart-wrap, stat-row, math-box, coin-grid, watch-list.
Pexels photos: `<figure class="article-photo">` placed between body paragraphs.

**Workflow:**
1. Decide how many Pexels photos (1–4, leaving room for at least 1 graphic within the 5-total cap)
2. Write a 5–7 word search query per photo, specific to that paragraph's content
3. Run the fetch script:
   ```bash
   node blog/scripts/fetch-pexels.mjs --post=[slug] --queries="query one|query two"
   ```
4. Copy printed attribution lines into each `<figcaption>`:
   ```html
   <figure class="article-photo">
     <img src="images/pexels-0.jpg" alt="[specific alt text]" loading="lazy" />
     <figcaption>Photo by Jane Smith on Pexels</figcaption>
   </figure>
   ```
5. Record the same queries in `reel-data.md` under `## pexels_queries` (§11)

---

## 9. Writing Style

> **Skills:** `blog-write` enforces all rules in this section via a 5-gate 100-point delivery contract. It blocks any draft scoring below 90 and iterates up to 3× automatically. `blog-seo-check` validates on-page signals after the draft passes. Use both before building the HTML.

### Hard formatting rules (violations = rewrite, no exceptions)

- **No em dashes (—).** Replace with a comma, period, or two sentences. Never use an em dash to parenthetically expand a clause.
- **No rhetorical question hooks.** Never open a post or section with a question like "Have you ever wondered...?"
- **No passive voice** when active is clearer.
- **Lead with the main point.** No long warm-up intros.

---

### Banned words and phrases

Every item below is a hard ban. If any appear in a draft, rewrite the sentence from scratch.

**AI buzzwords — inflated verbs:**
leverage, utilize, streamline, facilitate, foster, harness, empower, elevate, transform, optimize, spearhead, navigate, unlock, revolutionize, embark, pave the way, capitalize on, lay the groundwork, drive synergies

**AI buzzwords — dramatic nouns:**
tapestry, landscape, realm, journey, beacon, cornerstone, catalyst, nuance, ecosystem, synergy, paradigm, testament, watershed, nexus

**Corporate filler:**
robust, seamlessly, cutting-edge, game-changing, best-in-class, unparalleled, scalable, holistic, comprehensive, end-to-end, value-add, best practices

**Significance inflation:**
crucial, vital, significant, intricate, paramount, transformative, impactful, groundbreaking, innovative, dynamic, vibrant

**Hedging phrases (sounds like a disclaimer, not a person):**
it's important to note, it's worth noting, it should be mentioned, it's worth mentioning, one might argue, it could be suggested, it is important to understand, needless to say, as a matter of fact, in light of the fact that

**Filler transitions (AI's crutch words):**
moreover, furthermore, additionally, consequently, subsequently, accordingly, notably, thus, indeed, certainly, undoubtedly, in conclusion, to summarize, to recap, first and foremost, last but not least

**Polished openers (instant AI tell):**
In today's digital landscape, In an era of, In the modern era, When it comes to, At the end of the day, In today's world, As we navigate, In recent years

**Specific banned phrases (full strings):**
dive in, delve into, delve deeper, unlock the power, unleash the potential, take it to the next level, push the boundaries, bridge the gap, a testament to, embark on a journey, master the art of, in this article, in this blog post, in this guide

---

### Write like a person

- Short sentences. Mix with longer ones. Vary deliberately — same length every sentence is an AI tell.
- Use "you" and "your" directly. No third-person distance.
- Numbers beat vague claims. "76% of visitors check your contact page" beats "most visitors look for contact info."
- Say what something does, not what it "enables" or "allows."
- Use contractions where natural: "it's" not "it is," "you're" not "you are."
- If a sentence could appear in a brochure or press release, rewrite it.
- No filler at the start of sentences: "Basically," "Simply," "Just," "Really," "Essentially," "Actually" — cut them.
- One idea per sentence when making a key point. Do not stack three clauses with commas.
- Opinions are allowed. "This approach works better" beats "this approach may be considered more effective."

---

### Tone

- Helpful and direct. Not enthusiastic, not corporate.
- Treat the reader as smart and busy.
- No hype, no urgency tricks, no scarcity language.
- Silver/investing posts: matter-of-fact, like a knowledgeable buyer talking to a new buyer.
- Tech/website posts: like a local contractor who has seen what works and what doesn't.

---

## 10. Slug Rules

Lowercase, hyphens only. Short and descriptive. No dates. Example: `how-to-set-up-google-business`.

---

## 11. reel-data.md

**Required.** Create this file before git commit. The reel renderer reads it — never re-reads index.html.
Contains **3 independent reel sections** (reel-1, reel-2, reel-3), each a different hook angle from the same blog post.

File path: `blog/[slug]/reel-data.md`

```markdown
# Reel Data: [slug]
topic: silver|tech

## reel-1
angle: lead_stat
hook: Strongest number from the post. Contrarian Stat or Pain Point formula (see REEL-SOP.md §Hook Formulas). Must land without audio.
hook_type: contrarian_stat|pain_point

### stats
- text: 42% LABEL IN 5 WORDS MAX
  narration: 2–4 sentences. Match blog wording closely.
- text: 73% SHORT LABEL HERE
  narration: 2–3 sentences.

### chart
title: Chart heading — copy from blog chart exactly
bars:
  - Label: XX%
  - Label: XX%
narration: Explain the data the same way the blog does.

### cta
text: Full breakdown — link in comments.
narration: One sentence. End with save ask or share ask.

---

## reel-2
angle: concept
hook: "How it works" or "why this matters" angle. Immediate Value or Contradiction formula.
hook_type: immediate_value|contradiction

### stats
- text: [Different stat from post — not reused from reel-1]
  narration: 2–4 sentences.

### cta
text: Full breakdown — link in comments.
narration: One sentence. End with discussion question ask.

---

## reel-3
angle: cta_direct
hook: Direct offer/action angle. Pain Point or Immediate Value formula.
hook_type: pain_point|immediate_value

### stats
- text: [Third angle stat or takeaway from post]
  narration: 2–4 sentences.

### cta
text: Full breakdown — link in comments.
narration: One sentence. End with share ask.

---

## shared
discussion_question: One short opinion-inviting question for caption close.
hashtags: #Tag1 #Tag2 #Tag3

## pexels_queries
- reel: 1
  segment: 0
  query: "specific pexels search query"
- reel: 2
  segment: 0
  query: "second specific query"
- reel: 3
  segment: 0
  query: "third specific query"
```

Rules:
- Each reel must use a **different stat or angle** — no repeated numbers across reels
- `### chart` — include in reel-1 only if post has a chart; omit from reel-2 and reel-3
- `### stats` — 2–3 entries max per reel
- All 3 reels target Express format (25–40s) unless content clearly needs Standard
- `## shared` block — one discussion_question and hashtag set, shared across all 3 reels
- pexels_queries — one entry per reel minimum, segment 0 (hook background)
- Target 60–80 lines total

---

## 12. topic-history.md

File path: `blog/topic-history.md` — shared file, committed with every new post.

**Purpose:** The cron agent reads this before picking a topic to avoid repeating angles. You append after each post.

**Format:**

```markdown
## Tech Posts

| Date | Slug | Broad Category | Angle |
|------|------|----------------|-------|
| YYYY-MM-DD | slug-here | Category | One-line angle description |

## Silver Posts

| Date | Slug | Broad Category | Angle |
|------|------|----------------|-------|
| YYYY-MM-DD | slug-here | Category | One-line angle description |
```

**Rules:**
- Append to the correct section (Tech Posts or Silver Posts) after each post
- `Broad Category` is a short label: `Websites`, `Google`, `Marketing`, `Social Media`, `General` (tech) or `Buying`, `Storing`, `Pricing`, `Types`, `General` (silver)
- `Angle` is one sentence — specific enough to detect near-duplicates
- No post same angle within 180 days; no post same broad category within 7 days

---

## 13. Publish

### Step 1 — Commit and push to GitHub
```bash
git add blog/posts.json blog/[slug]/ blog/topic-history.md
git commit -m "feat(blog): [Post Title]"
git push origin main
```

### Step 2 — Deploy to Cloudflare
Push does NOT auto-deploy. Run wrangler after every push:
```bash
npx wrangler deploy
```

Verify the post is live at `https://fuseddistribution.com/blog/[slug]/` before posting to social media.

### Step 3 — Social media (automated via Postiz — see SOCIAL-SOP.md)

Postiz reads `social-copy.json` and schedules all posts at optimal times. Nothing to do manually.

Assets consumed by Postiz:
- `video/out/[slug]/[slug]-reel-1.mp4`, `-reel-2.mp4`, `-reel-3.mp4`
- `blog/[slug]/photo-post.svg`
- `blog/[slug]/social-copy.json`

> **Postiz not yet configured:** Until Postiz is set up on the Windows PC, skip this step.
> Manually post reels using captions from `social-copy.json`.

---

## 14. social-copy.json

**Required.** Claude writes this during pipeline run. Consumed by Postiz when scheduling posts.

File path: `blog/[slug]/social-copy.json`

```json
{
  "slug": "post-slug",
  "topic": "silver|tech",
  "blog_url": "https://fuseddistribution.com/blog/post-slug/",
  "reels": {
    "reel-1": {
      "angle": "lead_stat",
      "facebook": "2-4 sentences. No hashtags. Ends with discussion_question on its own line.",
      "instagram": "Punchier version. Hashtags at end.",
      "linkedin": "Professional tone. 2-3 sentences. Include blog URL.",
      "x": "Under 280 chars including blog URL. Direct and punchy."
    },
    "reel-2": {
      "angle": "concept",
      "facebook": "...",
      "instagram": "...",
      "linkedin": "...",
      "x": "..."
    },
    "reel-3": {
      "angle": "cta_direct",
      "facebook": "...",
      "instagram": "...",
      "linkedin": "...",
      "x": "..."
    }
  },
  "photo": {
    "facebook": "3-5 sentences. Longer-form. No hashtags. Include discussion_question.",
    "instagram": "Caption + hashtags block.",
    "linkedin": "Professional framing. 2-3 sentences. Blog link."
  },
  "hashtags": "#Tag1 #Tag2 #Tag3",
  "discussion_question": "One opinion-inviting question for caption close."
}
```

**Caption rules by platform:**
- **Facebook:** Conversational, 2-5 sentences, no hashtags in body, discussion question at end
- **Instagram:** Punchy opener, 2-3 sentences, hashtags block at end (8-12 tags max)
- **LinkedIn:** Professional, lead with insight not hype, include blog link, 2-3 sentences
- **X:** Under 280 chars total including URL, direct claim or stat, blog link at end

Do NOT use em dashes in any caption. Follow same writing style rules as blog posts.

---

## 15. photo-post.svg

**Required.** One per blog post. Posted to Facebook + Instagram + LinkedIn as a feed photo.

File path: `blog/[slug]/photo-post.svg`
Canvas: `width="1200" height="1200" viewBox="0 0 1200 1200"`

**Design rules:**
- Same dark brand theme as hero SVG: `#041018` background, cyan/green accent palette
- Same radial glows, grid lines, and scatter dots as hero SVG
- Top zone (y=0-200): post category eyebrow + brand mark "FUSED"
- Center zone (y=200-850): post title (large Impact font) + one key stat (very large number)
- Bottom zone (y=850-1200): short excerpt (1 sentence) + blog URL CTA button shape
- No profile photos, no stock imagery — pure SVG graphic

**Key stat display:**
- Pull the single strongest stat from the blog post
- Display number in Impact at ~180px, centered
- Short label below in Arial at ~24px, muted color

**CTA shape:**
- Rounded rect at bottom center, cyan border, dark fill
- Text: "Full breakdown at fuseddistribution.com"

**Color rules — identical to hero SVG:**
- Background: `#041018`
- Accent cyan: `#58d6ff`
- Accent green: `#4dffb8`
- Muted text: `rgba(175,198,207,0.75)`
- Body text: `#ecf8fb`
