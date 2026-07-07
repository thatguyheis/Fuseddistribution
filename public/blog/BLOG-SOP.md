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

**Skill order matters — run in this sequence:**

- [ ] Decide brand: Silver/Reserve OR Tech/Technology Solutions
- [ ] **`seo-plan` skill** — target keyword, search intent, competitor gap. Slug comes from keyword. Run FIRST.
- [ ] **`blog-write` skill** — pass "Target keyword: [kw]. Intent: [intent]. Competitor gap: [gap]." Enforces E-E-A-T, sourced stats, 5-gate delivery, all §9 writing rules.
- [ ] **`blog-seo-check` skill** — on-page signals: title, meta, H1, H2s, canonical, OG tags.
- [ ] **`seo-schema` skill** — validate/generate FAQPage + Article JSON-LD schema.
- [ ] **`seo-local` skill** — only for local business, Google, or map pack posts.
- [ ] Create `public/blog/[slug]/` folder, write `index.html` from BLOG-REF.md template
- [ ] Write `hero.svg` (§7 — numeric XML entities only, no HTML entities)
- [ ] Generate `hero.jpg`:
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --disable-gpu --screenshot=/tmp/hero-tmp.png --window-size=1200,630 \
    "file://$(pwd)/blog/[slug]/hero.svg" 2>/dev/null && \
  sips -s format jpeg /tmp/hero-tmp.png --out public/blog/[slug]/hero.jpg -s formatOptions 85 && \
  rm /tmp/hero-tmp.png
  # Verify: ls -lh public/blog/[slug]/hero.jpg — must be > 50 KB
  ```
- [ ] Run: `node public/blog/scripts/fetch-pexels.mjs --post=[slug] --queries="q1|q2"`
- [ ] Write `reel-data.md` (§11) — all stats, chart if present, question, media_queries
- [ ] Run `public/blog/scripts/build-reel.sh [slug] --brand=silver|tech --keyword="..."` to write `reel-data.md` and `reel-script.md (Long Form, 8-12 body segments, QUESTION close, 180-240s)
- [ ] Write `photo-post.svg` (§15 — 1200×1200 canvas)
- [ ] Generate `photo-post.jpg`:
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --disable-gpu --screenshot=/tmp/photo-post-tmp.png --window-size=1200,1200 \
    "file://$(pwd)/blog/[slug]/photo-post.svg" 2>/dev/null && \
  sips -s format jpeg /tmp/photo-post-tmp.png --out public/blog/[slug]/photo-post.jpg -s formatOptions 85 && \
  rm /tmp/photo-post-tmp.png
  ```
- [ ] Write `social-copy.json` (§14) — apply §9 writing rules to every caption field
- [ ] Run `social-ad` skill — generates 2 SVG ad templates -> JPEG, updates `organic_ads[]` in social-copy.json
- [ ] Run `ugc-script` skill — writes 2 A/B UGC script variants to `ugc-script.md`, validated
- [ ] Add entry to `posts.json` top of array — `"image"` must use `.jpg` not `.svg`
- [ ] Add 2-3 INLINE links inside body paragraphs + Related block + Read next (§9 Internal Linking — Related block alone does NOT pass)
- [ ] Append to `public/blog/topic-history.md`
- [ ] Validate reel-script.md (§3.4 checks) + social-copy.json (no em dashes)
- [ ] **SVG entity check** — run for EVERY slug before commit:
  ```bash
  grep -En "&[a-zA-Z]+;" public/blog/[slug]/hero.svg public/blog/[slug]/photo-post.svg
  ```
  Must return zero matches. If any found: replace with numeric entity (`&middot;`→`&#183;`, `&nbsp;`→`&#160;`, `&bull;`→`&#8226;`, `&mdash;`→`&#8212;`, `&ndash;`→`&#8211;`) then regenerate the `.jpg`.
- [ ] Run `node public/blog/scripts/generate-sitemap.mjs`
- [ ] **Secret check** — no literal tokens/keys in any staged file, env var references only (§17). Pre-commit hook enforces.
- [ ] Commit locally only: `git add public/blog/ public/sitemap.xml && git commit -m "feat(blog): [Post Title]"`
- [ ] Claude reviews the local commit, then pushes, deploys, and verifies live status after approval.

---

## 1. Brand Routing

| Topic | Brand sub-line | Nav CTA | Article CTA |
|---|---|---|---|
| Silver / investing / Reserve | `Distribution` | Reserve Silver → `/reserve/` | `/reserve/` |
| Websites / tech / local business | `Technology Solutions` | Get Started → `/#contact` | `/#contact` |
| AI / artificial intelligence / AI tools / automation | `Technology Solutions` | Get Started → `/#contact` | `/#contact` |

**AI topic examples:** how to start with AI, AI tools for small business, ChatGPT for business owners, AI prompting basics, how to use AI for customer service, AI writing tools, AI scheduling tools, what AI can and can't do for your business, AI training for teams, automating repetitive tasks with AI.

---

## 1b. Live Spot Price — Required for All Silver Posts

**Before writing any silver post**, fetch current spot price from the site API:

```bash
curl -s https://fuseddistribution.com/api/spot
# Returns: {"silver": 64.85, "gold": 4155.60}
```

**Rules (hard — no exceptions):**
- Every price used as a hypothetical example in a silver post MUST use current spot, not a round number or assumed price.
- Always quote the date alongside the price: `"$64.85/oz as of June 22, 2026"` or `"at current spot ($64.85/oz, June 22, 2026)"`.
- Round to 2 decimal places. Do NOT round to a "nice" number like $65 — use the actual fetched value.
- For **premium examples** (e.g., "$X above spot"): keep the premium range accurate ($4–$8, $1–$3), but compute the example dollar amount from actual spot. e.g. "at $64.85 spot, an American Silver Eagle runs about $68–$73."
- For **position-size examples** (e.g., "at $X/oz, $5,000 buys Y oz"): compute Y from actual spot.
- For **gold-silver ratio** mentions: compute from actual fetched gold and silver prices.
- Historical prices (2024 averages, record highs, etc.) stay unchanged — only forward-looking/hypothetical values use the live price.
- Do NOT quote spot price in the article title, h1, or meta description — prices change and those are indexed.

**In body text, use this phrasing pattern:**
> "At today's spot of $64.85 per ounce (June 22, 2026), a $5,000 position buys approximately 77 ounces."

**Content refresh trigger:** If spot price moves more than 15% from the quoted price, refresh the post per §16.

---

## 1a. Silver Topic Expansion

Silver posts should rotate through ALL categories below — not just Buying/Storage/Types. The cron agent must check topic-history.md and pick from underrepresented categories.

### Broad Categories for Silver Posts (topic-history `Broad Category` values)

| Category | When to use |
|---|---|
| `Buying Guide` | How to buy, where to buy, product comparisons, premiums |
| `Investing` | DCA, portfolio allocation, gold-silver ratio, ETF vs physical |
| `Storage` | Home safe, vault, insurance, tarnish, organization |
| `Types` | Coin/round/bar deep dives, specific product guides |
| `History` | Silver's monetary history, historical events, famous squeezes |
| `Market` | Spot price drivers, supply/demand, COMEX, futures |
| `News & Outlook` | Current silver price moves, recent industry news, price forecasts |
| `Tax & Legal` | Capital gains, IRS reporting, 1099-B rules, state taxes on silver |
| `Selling` | When/how/where to sell silver, buy-back programs, private sale vs dealer |
| `Mining & Stocks` | Silver mining stocks vs physical, top miners, royalty companies |
| `Retirement` | Silver IRA, self-directed IRA, 401k rollover to precious metals |
| `Coin Guides` | Morgan dollars, Peace dollars, Britannias, Kangaroos, Philharmonics, Maple Leafs |
| `COMEX & Futures` | Paper silver, short positions, COMEX delivery, manipulation claims |
| `Dealer Reviews` | APMEX, JM Bullion, SD Bullion, Gainesville Coins, Provident Metals |
| `Tools & Tracking` | Portfolio trackers, apps, spot price alerts, premium calculators |
| `International` | Buying silver abroad, VAT on silver, international mints |
| `Estate & Inheritance` | Inheriting silver, what to do, valuation, selling inherited coins |
| `General` | Beginner overviews, mindset, anything that doesn't fit above |

### Silver Topic Seeds (ready to use — verify not already posted)

**News & Outlook (zero coverage):**
- silver price prediction 2026 what analysts expect
- why silver price dropped this month explained
- silver vs gold performance comparison 2025-2026
- COMEX silver inventory update what it means for stackers
- solar panel demand driving silver prices higher in 2026

**Tax & Legal (zero coverage):**
- silver capital gains tax how it works
- IRS rules for selling silver coins and reporting
- do you have to report silver coin purchases to IRS
- state sales tax on silver coins by state
- silver in an LLC vs personal name tax implications
- 1099-B rules when does your dealer have to report your silver sale

**Selling (zero coverage):**
- best places to sell silver coins for highest price
- how to sell silver coins without getting ripped off
- APMEX sell-back price vs local coin shop which pays more
- when should you sell your silver stack
- how to sell inherited silver coins and bars
- private silver sale vs dealer buy-back pros and cons

**Retirement (zero coverage):**
- silver IRA how to set one up step by step
- can you put physical silver in an IRA
- self-directed IRA for silver what you need to know
- silver IRA vs physical silver at home comparison
- best silver IRA custodians compared

**Coin Guides — specific coins (underrepresented):**
- Morgan silver dollar complete buying guide
- Peace silver dollar value and buying guide
- Austrian silver Philharmonic complete guide
- Perth Mint silver Kangaroo buying guide
- British silver Britannia vs American Eagle comparison
- Mexican silver Libertad coins buying guide

**COMEX & Futures (zero coverage):**
- what is COMEX silver and how does it affect spot price
- paper silver vs physical silver the difference explained
- silver short squeeze is it possible in 2026
- how silver futures work for physical stackers

**Dealer Reviews (zero coverage):**
- APMEX review 2026 is it worth buying from
- JM Bullion vs SD Bullion which is better
- Gainesville Coins review premiums and selection
- Provident Metals review 2026

**Tools & Tracking (zero coverage):**
- best apps to track silver portfolio value
- how to set silver spot price alerts for free
- silver premium calculator how to use one
- CoinTracking vs Delta for silver portfolio tracking

**Estate & Inheritance (zero coverage):**
- what to do when you inherit silver coins
- how to value inherited silver for estate purposes
- selling inherited silver coins probate and tax basics

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
  "image": "/blog/your-slug-here/hero.jpg",
  "imageAlt": "Descriptive alt text"
}
```

- `slug` must match folder name exactly
- `image` path must be unique across all entries — check before setting

---

## 3. Folder Structure

```
public/blog/
  [slug]/
    index.html
    hero.svg
    hero.jpg            ← generated from hero.svg (Chrome headless) — OG tags + reel segment-0
    reel-data.md        ← required (§11) — single long-form section
    reel-script.md      ← written by REEL-SOP workflow
    ugc-script.md           ← 2 A/B UGC script variants for real-person filming
    ad-stat-card.svg/.jpg   ← generated organic ad (stat-card template)
    ad-google-search.svg/.jpg ← generated organic ad (google-search template)
    photo-post.svg      ← required (§15) — 1200×1200 square
    photo-post.jpg      ← generated from photo-post.svg (Chrome headless) — Postiz/social upload
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

File: `public/blog/[slug]/hero.svg` — `width="1200" height="630" viewBox="0 0 1200 630"`

**SVG XML rules (critical — browser will show parse error if violated):**
- NEVER use `&nbsp;` — SVG is XML, HTML entities are not defined. Use `&#160;` for non-breaking space.
- NEVER use `&middot;`, `&bull;`, `&mdash;`, etc. Use numeric entities: `&#183;`, `&#8226;`, `&#8212;`
- Only valid XML entities are: `&amp;` `&lt;` `&gt;` `&quot;` `&apos;` — everything else must be numeric (`&#NNN;`)

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

## 7a. Keyword Research (Required Before Drafting)

Before invoking `blog-write`, identify the post's target keyword using the `seo-plan` skill.

**What to produce:**
- **Primary keyword:** One specific search phrase (e.g., "how to buy silver coins" not "silver")
- **Search intent:** Informational / Navigational / Commercial / Transactional
- **Competitor gap:** One angle that top-ranking pages don't fully cover — this is the post's information gain
- **Secondary keywords:** 2-4 related phrases to work into headers and body naturally

**Rules:**
- Target keywords with clear informational intent for silver posts and local search intent for tech posts
- Pick keywords with realistic competition for a domain at this authority level — broad finance terms are unwinnable
- The primary keyword must appear in: `<title>`, `<h1>`, meta description, first paragraph, and at least one `<h2>`
- Do not keyword-stuff — one natural placement per element is enough

**Pass to `blog-write`:** "Target keyword: [keyword]. Intent: [intent]. Competitor gap: [gap]."

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
   node public/blog/scripts/fetch-pexels.mjs --post=[slug] --queries="query one|query two"
   ```
4. Copy printed attribution lines into each `<figcaption>`:
   ```html
   <figure class="article-photo">
     <img src="images/pexels-0.jpg" alt="[specific alt text]" loading="lazy" />
     <figcaption>Photo by Jane Smith on Pexels</figcaption>
   </figure>
   ```
5. Record the same queries in `reel-data.md` under `## media_queries` (§11)

**If fetch-pexels returns 0 images for any query:** re-run with a shorter 3-word query. Never leave empty `<figcaption>` or placeholder `<img src>` tags — these break layout and will confuse the reel pipeline.

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
- AI posts: patient and plain. The reader is a business owner who has heard AI hype and is skeptical. Skip the excitement. Focus on what the tool actually does, what the limitation is, and what a realistic first step looks like. No "revolutionary" or "game-changing" framing.

---

### Internal Linking

Every post links to 2-3 existing posts from `posts.json`. Do not publish islands.

**HARD REQUIREMENT: 2-3 links must be INLINE, inside `<p>` body paragraphs, wrapping natural anchor text. A bottom "Related" list or "Read next" line does NOT count toward this. A post with zero `href="/blog/..."` links before the `<h2>Related</h2>` heading FAILS this section.**

Three required placements:

- **Intro link (inline):** In the first or second body paragraph, link to a related post that provides context. Anchor text = descriptive phrase, not "click here" or "read more."
- **Body link (inline):** Mid-article, link to a post in the same broad category covering a closely related angle. Example of correct form:
  ```html
  <p>We recommend <a href="/blog/how-to-store-silver-at-home-safely/">storing your silver</a> in airtight containers.</p>
  ```
  Wrong form (does not satisfy this section): appending the same link to the Related list at the bottom.
- **Next-read link:** Just before or inside the CTA block, add: `<p>Read next: <a href="/blog/[related-slug]/">[Related Post Title]</a></p>`

**Related block (bottom of article, after body, before CTA):** Keep the existing site-wide format — this is IN ADDITION to the inline links above, never a substitute:

```html
<h2>Related</h2>
<ul>
<li><a href="/blog/[slug-1]/">[Title 1]</a></li>
<li><a href="/blog/[slug-2]/">[Title 2]</a></li>
<li><a href="/blog/[slug-3]/">[Title 3]</a></li>
</ul>
<p>Read next: <a href="/blog/[slug-1]/">[Title 1]</a></p>
```

Process:
1. Read `posts.json` — scan `title`, `tags`, `slug` fields for topically related entries
2. Pick 2-3 most relevant (same broad category or shared keyword)
3. Weave anchor links into existing body sentences — only where the link reads naturally; never force-fit; never bolt a bare URL or slug into prose
4. Only link to posts already live — verify: `curl -o /dev/null -s -w "%{http_code}" https://fuseddistribution.com/blog/[slug]/` must return 200. Never link to any slug committed in the same pipeline run.
5. Self-check before commit — must return 2 or more:
   ```bash
   sed -n '/<div class="article-body">/,/<h2>Related<\/h2>/p' public/blog/[slug]/index.html | grep -c 'href="/blog/'
   ```
6. Also verify no bare internal paths in prose (e.g. literal `/reserve/` as plain text) — every internal reference in body text must be an `<a>` tag:
   ```bash
   sed -n '/<div class="article-body">/,/<\/article>/p' public/blog/[slug]/index.html | grep -n '[^"=]/reserve/\|\[Link to' && echo "FAIL: bare path or placeholder" || echo "OK"
   ```

---

## 10. Slug Rules

Lowercase, hyphens only. Short and descriptive. No dates. Example: `how-to-set-up-google-business`.

---

## 11. reel-data.md

**Required.** Create this file before git commit. The reel renderer reads it — never re-reads index.html.
Contains **one long-form section** covering the full blog post arc (180–240s, 8–12 body segments).

> **Short-form (3-reel) format** is documented in `video/REEL-SOP-SHORTFORM.md` for reference only. Do not use it unless explicitly instructed.

File path: `public/blog/[slug]/reel-data.md`

```markdown
# Reel Data: [slug]
topic: silver|tech
format: long-form

hook: Strongest number or claim from the post. Must land without audio. Use Contrarian Stat or Pain Point formula.
hook_type: contrarian_stat|pain_point|immediate_value|contradiction

## stats
List every significant stat from the post — each becomes one Stat segment.
- text: 42% LABEL IN 5 WORDS MAX
  explanation: One plain sentence — what this number means without audio
  graphic_type: percent_fill
  graphic:
    value: 42
    label: Category
    remainder_label: Other
  narration: 2–4 sentences. Match blog wording closely.
- text: 73% SHORT LABEL HERE
  explanation: One plain sentence context
  graphic_type: percent_fill
  graphic:
    value: 73
    label: Category
    remainder_label: Other
  narration: 2–3 sentences.
[continue for all major stats — aim for 5–10 entries covering the full post]

## chart
title: Chart heading — copy from blog chart exactly
bars:
  - Label: XX%
  - Label: XX%
narration: Explain the data the same way the blog does.
[omit this section if the post has no chart]

## question
text: One controversial or opinion-inviting question that closes the long-form reel.
subtext: Optional short line below the question text (cyan, 2–5 words).
narration: Follow for more silver news.

## shared
discussion_question: One short opinion-inviting question for caption close. THIS IS THE SINGLE SOURCE OF TRUTH — the pipeline copies this value into social-copy.json. Do not create a separate "## DISCUSSION QUESTION" in reel-script.md.
hashtags: #Tag1 #Tag2 #Tag3 #Tag4 #Tag5

## media_queries
- segment: 0
  query: "hook background query"
  prefer: video
- segment: 2
  query: "query for this stat segment"
  prefer: video
[one entry per major segment — prefer video for hook/stats, photo for chart/question]
```

Rules:
- Cover the **full blog post arc** — every major section, not just top stats
- Include the chart if the post has one — required
- End with `## question` (not cta) — long-form always closes with the Question slide
- pexels_queries — one entry per segment recommended; hook (segment 0) required
- Target 80–120 lines total
- Every stat entry requires `explanation:`, `graphic_type:`, and `graphic:` block — see REEL-SOP.md §11b for all 8 graphic types and their fields
- Use `graphic_type: none` only when no type fits — `explanation:` is always required on every stat
- Use `media_queries` (not the legacy `pexels_queries`) — add `prefer: video` (default) or `prefer: photo` per segment

---

## 12. topic-history.md

File path: `public/blog/topic-history.md` — shared file, committed with every new post.

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

## AI Posts

| Date | Slug | Broad Category | Angle |
|------|------|----------------|-------|
| YYYY-MM-DD | slug-here | Category | One-line angle description |
```

**Rules:**
- Append to the correct section (Tech Posts, Silver Posts, or AI Posts) after each post
- `Broad Category` is a short label:
  - Tech: `Websites`, `Google`, `Marketing`, `Social Media`, `General`
  - Silver: `Buying`, `Storing`, `Pricing`, `Types`, `General`
  - AI: `Getting Started`, `Tools`, `Automation`, `Business Use Cases`, `Prompting`, `General`
- `Angle` is one sentence — specific enough to detect near-duplicates
- No post same angle within 180 days; no post same broad category within 7 days
- AI posts count separately from Tech posts for the 7-day same-category rule

---

## 13. Publish

### Step 0 — SVG entity validation (run BEFORE commit — blocks deploy on failure)

Check every SVG for illegal named HTML entities:
```bash
grep -En "&[a-zA-Z]+;" public/blog/[slug]/hero.svg public/blog/[slug]/photo-post.svg
```
Zero matches required. Named entities (`&middot;`, `&nbsp;`, `&bull;`, `&mdash;`, `&ndash;`, etc.) are not defined in XML/SVG — browsers throw a parse error and the image won't render.

Replace any matches with their numeric equivalents:

| Named entity | Numeric |
|---|---|
| `&middot;` | `&#183;` |
| `&nbsp;` | `&#160;` |
| `&bull;` | `&#8226;` |
| `&mdash;` | `&#8212;` |
| `&ndash;` | `&#8211;` |
| `&copy;` | `&#169;` |
| `&trade;` | `&#8482;` |
| `&reg;` | `&#174;` |

After fixing, regenerate the `.jpg` for any SVG that changed (Chrome headless, same command as §7/§15).

### Step 1 — Verify posts.json entry exists (REQUIRED before commit)

```bash
grep -q '"slug": "[slug]"' public/blog/posts.json && echo "OK" || echo "MISSING — add entry before committing"
```

If missing: add entry at top of array per §2. Do not commit until this passes.
`"image"` must reference `hero.jpg` (not `hero.svg`).

### Step 2 — Commit locally for review
```bash
git add public/blog/posts.json public/blog/[slug]/ public/blog/topic-history.md public/sitemap.xml
git commit -m "feat(blog): [Post Title]"
```

**Auto-publish enabled 2026-06-29.** The launchd plist (`~/Library/LaunchAgents/com.nick.daily-blog-reel.plist`) sets `EnvironmentVariables.BLOG_AUTO_DEPLOY=1`, so the 9 AM run does Steps 3–4 automatically: after each local commit it runs `git push origin main`, `npx wrangler deploy`, and curl-verifies each slug returns 200. QA-failed or deferred posts (e.g. Claude brain-stage outage) are still NOT registered and NOT pushed — they stay local for retry.

To revert to manual review, remove `BLOG_AUTO_DEPLOY` from the plist (or set to `0`) and reload: `launchctl bootout gui/$(id -u)/com.nick.daily-blog-reel && launchctl bootstrap gui/$(id -u) <plist>`. With it off, the run stops after local commit and writes `PUBLISH PENDING` to `~/Library/Logs/daily-blog-reel.log` for Claude review.

### Step 3 — Push and deploy (auto when BLOG_AUTO_DEPLOY=1; else Claude after approval)
When auto-deploy is off, push does NOT auto-deploy. Run manually after review and approval:
```bash
git push origin main
```

Then deploy:
```bash
npx wrangler deploy
```

### Step 4 — Verify live
```bash
curl -s -o /dev/null -w "%{http_code}" https://fuseddistribution.com/blog/[slug]/
# Must return 200 before declaring publish complete
```

"Published" means all 4 steps above complete + 200 verified. Git push alone is not a publish.

Also verify `https://fuseddistribution.com/sitemap.xml` includes the new slug. If the slug is absent, the sitemap is static — log the gap and notify Nick to add sitemap generation to the build pipeline.

### Step 3 — Social media (automated via Postiz — see SOCIAL-SOP.md)

Postiz reads `social-copy.json` and schedules all posts at optimal times. Nothing to do manually.

Assets consumed by Postiz:
- `video/out/[slug]/[slug].mp4` (single long-form reel)
- `public/blog/[slug]/photo-post.jpg` (not the SVG — social platforms reject SVG)
- `public/blog/[slug]/social-copy.json`

> **Postiz not yet configured:** Until Postiz is set up on the Windows PC, skip this step.
> Manually post reels using captions from `social-copy.json`.

---

## 14. social-copy.json

**Required.** Claude writes this during pipeline run. Consumed by Postiz when scheduling posts.

File path: `public/blog/[slug]/social-copy.json`

```json
{
  "slug": "post-slug",
  "topic": "silver|tech",
  "blog_url": "https://fuseddistribution.com/blog/post-slug/",
  "reel": {
    "facebook": "2-4 sentences. Lead with the hook stat from the reel. Close with: 'Send this to someone who needs to hear it.' No hashtags.",
    "instagram": "Punchy opener matching reel hook. 2-3 sentences. Close with: 'Send this to someone who needs to hear it.' 5 hashtags max at end — separated by line breaks.",
    "linkedin": "Professional framing. Lead with the data insight. 2-3 sentences. Include blog URL. Close with share CTA adapted for professional context.",
    "x": "Under 280 chars including blog URL. Lead stat or claim. Blog link at end."
  },
  "photo": {
    "facebook": "3-5 sentences. Longer-form context. Close with discussion_question on its own line. No hashtags.",
    "instagram": "2-3 sentences. 5 hashtags max at end.",
    "linkedin": "Professional. 2-3 sentences. Blog link."
  },
  "hashtags": "#Tag1 #Tag2 #Tag3 #Tag4 #Tag5",
  "discussion_question": "One opinion-inviting question for caption close.",
  "disclaimer": "Silver and precious metals markets involve risk. This content is for informational purposes only and is not financial advice."
}
```

**Platform rules (hard limits):**

| Platform | Hashtag max | CTA | Notes |
|----------|------------|-----|-------|
| Instagram | **5 max** | "Send this to someone who needs to hear it." | Hashtags below fold, separated by 3 line breaks |
| Facebook | 0 in body | "Send this to someone who needs to hear it." | Hashtags suppress organic reach on FB |
| LinkedIn | 3-5 | Share CTA adapted to professional context | Always include blog URL |
| X | 2 max | None — URL carries the CTA | Under 280 chars total including URL |

**Share CTA rule:** Every reel caption on Facebook and Instagram must close with "Send this to someone who needs to hear it." or a direct variant ("Share this with someone who stacks silver." for silver posts). DM shares are the #1 Instagram distribution signal — outweigh likes 5:1.

**Finance disclaimer rule:** If any caption mentions price, return, gain, profit, or performance, append the `disclaimer` field as the last line of that caption. Always include it in the `disclaimer` JSON field regardless. **Exception for X:** X captions are capped at 280 chars including URL — if adding the disclaimer would exceed 280 chars, omit it from the X field only.

The `organic_ads` key is added by the `social-ad` skill after post build. It is additive — existing platform keys (facebook, instagram, twitter, linkedin) are not modified.

```json
"organic_ads": [
  { "type": "stat-card",     "file": "/blog/[slug]/ad-stat-card.jpg" },
  { "type": "google-search", "file": "/blog/[slug]/ad-google-search.jpg" }
]
```

**No em dashes anywhere.** Same writing style rules as blog posts apply to all captions.

**Instagram hashtag set (silver posts — rotate and test):**
`#SilverInvesting #PreciousMetals #SilverBugs #HardAssets #InflationHedge`

**Instagram hashtag set (tech/local business posts):**
`#LocalBusiness #SmallBusinessTips #DigitalMarketing #GoogleMyBusiness #WebDesign`

**Instagram hashtag set (AI posts):**
`#AIForBusiness #ArtificialIntelligence #AITools #SmallBusiness #AITips`

---

## 15. photo-post.svg

**Required.** One per blog post. Posted to Facebook + Instagram + LinkedIn as a feed photo.

File path: `public/blog/[slug]/photo-post.svg`
Canvas: `width="1200" height="1200" viewBox="0 0 1200 1200"`

**SVG XML rules (identical to §7 — critical):**
- NEVER use `&nbsp;` — SVG is XML, HTML entities are not defined. Use `&#160;` for non-breaking space.
- NEVER use `&middot;`, `&bull;`, `&mdash;`, etc. Use numeric entities: `&#183;`, `&#8226;`, `&#8212;`
- Only valid XML entities: `&amp;` `&lt;` `&gt;` `&quot;` `&apos;` — everything else must be numeric (`&#NNN;`)

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

**JPEG conversion (required — social platforms don't accept SVG):**

After writing `photo-post.svg`, generate `photo-post.jpg`:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu \
  --screenshot=/tmp/photo-post-tmp.png \
  --window-size=1200,1200 \
  "file://$(pwd)/blog/[slug]/photo-post.svg" 2>/dev/null && \
sips -s format jpeg /tmp/photo-post-tmp.png --out public/blog/[slug]/photo-post.jpg -s formatOptions 85 && \
rm /tmp/photo-post-tmp.png
```

Postiz reads `photo-post.jpg` — not the SVG.

---

## 16. Content Refresh

Finance and silver content goes stale. Quarterly refresh keeps YMYL ranking signals active.

**Trigger:** Any post where Google Search Console shows declining impressions month-over-month, or where prices/stats in the body are more than 6 months old.

**Refresh steps:**
1. Update any price references, stats, or data points to current values
2. Add a visible "Last updated: [Month YYYY]" line in the article meta block (below the date `<time>` element):
   ```html
   <span class="article-updated">Updated [Month YYYY]</span>
   ```
3. Update `dateModified` in the JSON-LD schema. Add or update `<meta property="article:modified_time" content="YYYY-MM-DDT00:00:00Z" />` in `<head>` — this tag is not in the base template, insert it manually after `article:published_time`. Do NOT change `article:published_time` — that is the original publish date and must stay unchanged.
4. Commit with message: `"refresh([slug]): update stats to [Month YYYY]"`
5. Push + deploy — Google re-crawls on `dateModified` change

---

## 17. Secrets & Deploy Failure Recovery (Proactive Fix Protocol)

### Secrets — hard rules
1. **Never write literal API tokens, keys, or passwords into any tracked file** — including plan docs, specs, SOPs, and code comments. Always reference env vars: `CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN"`.
2. A pre-commit hook at `.git/hooks/pre-commit` scans staged changes for credential patterns and blocks the commit. Do not bypass with `--no-verify` unless the match is a verified false positive.
3. If a secret reaches a commit: it lives in EVERY subsequent commit's tree, not just the one that introduced it.

### Recovery — secret in unpushed commits (no force push needed)
```bash
# 1. Confirm the bad commit is unpushed
git log --oneline origin/main..main
# 2. Scrub across all unpushed commits (script seds the file, exits 0)
git stash push -m pre-scrub
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --tree-filter /path/to/scrub.sh -- <last-pushed-sha>..main
git stash pop
# 3. Verify zero hits, then normal push
git log -p origin/main..main | grep -c '<token-pattern>'
git push origin main
```
If the secret was ALREADY pushed: rotate it immediately, then decide on history rewrite (force push — requires Nick's explicit approval).
Either way, **rotate the leaked credential** — it was transmitted even if the push was blocked.

### Recovery — wrangler deploy auth failure
Symptom: `Failed to automatically retrieve account IDs` / `Authentication error [code: 10000]`.
1. Check the real error: latest log in `~/Library/Preferences/.wrangler/logs/`.
2. Code 10000 on API calls = OAuth session revoked server-side, even if `~/Library/Preferences/.wrangler/config/default.toml` shows a future `expiration_time`.
3. First fallback (automated): API token stored in macOS Keychain under service `cloudflare-api-token`:
   ```bash
   CLOUDFLARE_API_TOKEN=$(security find-generic-password -s cloudflare-api-token -w) npx wrangler deploy
   ```
   Never echo this token or write it to any file. To rotate: roll the "Edit Cloudflare Workers" token in the Cloudflare dashboard, then `security add-generic-password -U -s cloudflare-api-token -a wrangler -w` (interactive prompt).
4. Second fallback (manual): `npx wrangler login` (interactive — Nick must complete in browser). Then re-run `npx wrangler deploy`.
5. `account_id` is pinned in `wrangler.jsonc` so account lookup can't block deploys.

### Pipeline blocker policy
When the 9 AM pipeline hits a blocker (push rejected, deploy auth, blog QA fail):
1. Attempt automated recovery first (this section + render log review).
2. If recovery requires Nick (browser auth, force push, secret rotation): log exact one-line instruction to `~/Library/Logs/daily-blog-reel.log` and stop that step only — continue all steps that don't depend on it.
3. Never leave posts in "committed but not deployed" state silently — the log must state which slugs are NOT live.

## 18. Claude usage-limit handling (DEFER, never quarantine)

A claude usage/session limit is an **outage**, not a quality failure. The pipeline
must DEFER the post (leave artifacts in place, schedule a retry) — never move it to
`.workflow-blocked/` and never count it as a FAIL. Quarantining a limit-hit is the
historical cause of "tech posts stopped appearing": the silver post runs first, burns
the quota, then the tech post hits the limit and gets thrown away.

**The hard rule:** any stage that shells out to `claude -p` and runs under
`set -e`/`set -o pipefail` MUST neutralize the pipeline exit so the limit-detect guard
can run. `claude -p` exits **non-zero** on a limit, so an un-guarded
`... | claude -p ... > out` aborts the whole script *before* the guard, leaving the
limit message on disk and returning a generic failure that the caller mislabels.

```bash
# WRONG — set -e aborts here on a limit, guard below never runs:
{ prompt; } | run_claude > "$OUT.raw"
if head -40 "$OUT.raw" | is_limit; then exit 4; fi   # unreachable on a limit

# RIGHT — keep going so the guard classifies and DEFERS (exit 4):
{ prompt; } | run_claude > "$OUT.raw" || true
if head -40 "$OUT.raw" | is_limit; then rm -f "$OUT.raw"; exit 4; fi
```

**Status contract (`_status.json` `stages[]`):**
- `write-deferred` / `qa-deferred` = claude outage. Caller keeps artifacts, retries. NOT a fail.
- `write-warn` = a real lint-failing article exists on disk (`verified.md` present, no limit
  text). Only legitimate when content was actually written. A `write-warn` with no usable
  `verified.md` is a bug — `build-post.sh` reclassifies it to `write-deferred`.

**Limit sentinels** (keep `write-article.sh` and `build-post.sh` in sync):
`hit your limit | usage limit | session limit | rate limit | your limit has been reached | limit reached | resets [0-9]`

**After ANY change to the claude-calling stages**, prove the defer guard is still
reachable before relying on it:
```bash
bash -n public/blog/scripts/write-article.sh
# repro: a `set -euo pipefail` script with a non-zero pipeline + `|| true` must still
# reach the line after the pipeline. If it doesn't, the defer path is dead code.
```

**Recovering a wrongly-quarantined post:** dirs in `.workflow-blocked/<date>/<slug>-HHMMSS/`
whose `_status.json` shows `write-warn`/`qa-fail` with a `verified.md.raw` containing a
limit message were outages, not quality failures. Re-run the post once quota resets:
`public/blog/scripts/build-post.sh <slug> --brand=tech --keyword="..."` then publish per §13.
