# Blog Post SOP — Fused Distribution

> Reference material (CSS, HTML template): **BLOG-REF.md** — copy verbatim, never re-read.

---

## 0. Quick Checklist

- [ ] Decide brand: Silver/Reserve OR Tech/Technology Solutions
- [ ] Add entry to `posts.json` (top of array)
- [ ] Create `blog/[slug]/` folder
- [ ] Write `index.html` — HTML from BLOG-REF.md §1, CSS from BLOG-REF.md §2, fill all [SLOTS]
- [ ] Write `hero.svg` — design rules in §7
- [ ] Body: min 1 custom graphic + min 1 Pexels photo, max 5 total (§8)
- [ ] Run: `node blog/scripts/fetch-pexels.mjs --post=[slug] --queries="q1|q2"`
- [ ] Paste attributions into `<figcaption>` tags
- [ ] Write `reel-data.md` (§11)
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
    reel-data.md        ← required (§11)
    images/
      pexels-0.jpg      ← from fetch-pexels script
      pexels-1.jpg
```

Silver posts with coin photos: add `images/coins-spread.jpg` etc. alongside Pexels files.

---

## 4. HTML Template

Copy the full template from **BLOG-REF.md §1** and fill every `[SLOT]`:

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

Copy the full CSS block from **BLOG-REF.md §2** verbatim into `<style>`. Post-specific styles (`.coin-grid`, `.math-box`, `.watch-list`) go at the bottom before `</style>`.

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

**Never use em dashes (—).** Rewrite with comma or period.

**Banned words:** leverage, utilize, streamline, robust, seamlessly, cutting-edge, game-changing, dive in, delve into, it's important to note, in today's digital landscape, first and foremost, in conclusion, unlock, empower, harness, elevate, transform, comprehensive, holistic, synergy, ecosystem.

**Write like a person:**
- Short sentences. Mix with longer ones.
- Use "you" and "your business" directly.
- Numbers beat generalizations.
- No rhetorical question hooks.
- No passive voice when active is clearer.
- Lead with the main point — no long intros.

---

## 10. Slug Rules

Lowercase, hyphens only. Short and descriptive. No dates. Example: `how-to-set-up-google-business`.

---

## 11. reel-data.md

**Required.** Create this file before git commit. The reel renderer reads it — never re-reads index.html.

File path: `blog/[slug]/reel-data.md`

```markdown
# Reel Data: [slug]
topic: silver|tech
hook: One punchy line — stat or bold claim from post opening

## stats
- text: "Stat as shown in the post (one line)"
  narration: 2–4 sentences. Match blog wording closely.
- text: "Second stat"
  narration: 2–3 sentences.

## chart
title: Chart heading — copy from blog chart exactly
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

Rules:
- `## chart` — omit if post has no chart
- `## stats` — 2–3 entries max, pulled from post stat-cards or key numbers
- `pexels_queries` — segment index matches the reel segment order (0=hook, 1=overlay1, etc.)
- Target 30–40 lines total

---

## 12. Publish to GitHub

```bash
git add blog/posts.json blog/[slug]/
git commit -m "feat(blog): [Post Title]"
git push origin main
```
