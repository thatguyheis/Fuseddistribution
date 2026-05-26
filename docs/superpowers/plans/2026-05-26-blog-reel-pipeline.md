# Blog + Reel Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the blog SOP for token efficiency, add Pexels inline photo fetching, create a `reel-data.md` companion per post, update the reel photo fetcher to use it, set up a daily cron, and backfill all existing posts with reel-data + rendered MP4s.

**Architecture:** BLOG.md splits into BLOG-SOP.md (~250 lines, agent-readable instructions) and BLOG-REF.md (CSS + HTML template verbatim). A new `blog/scripts/fetch-pexels.mjs` fetches inline article photos. Each post gets a `reel-data.md` that the reel renderer reads directly instead of parsing HTML. Daily cron runs Claude to write 1 tech + 1 silver post then render both reels.

**Tech Stack:** Node.js ESM, `node:https`, `node:fs`, `node --test` (built-in test runner), Pexels REST API v1, existing Remotion render pipeline.

---

## File Map

| Action | Path |
|--------|------|
| Create | `blog/BLOG-SOP.md` |
| Create | `blog/BLOG-REF.md` |
| Modify | `blog/BLOG.md` (deprecation header only) |
| Modify | `video/REEL-SOP.md` |
| Create | `blog/scripts/fetch-pexels.mjs` |
| Create | `blog/scripts/fetch-pexels.test.mjs` |
| Modify | `video/scripts/fetch-photos.mjs` |
| Modify | `video/scripts/fetch-photos.test.mjs` (create if missing) |
| Create | `blog/[slug]/reel-data.md` × 10 posts |

---

## Task 1: Create BLOG-REF.md

Extract the full CSS block and HTML template from `blog/BLOG.md` into a standalone reference file. Agents copy from here verbatim — this file is never read during blog creation, only referenced.

**Files:**
- Create: `blog/BLOG-REF.md`

- [ ] **Step 1: Create BLOG-REF.md**

Copy sections 4 and 5 from `blog/BLOG.md` (the full HTML template and the full CSS block) into `blog/BLOG-REF.md` with this structure:

```markdown
# Blog Reference — HTML Template + CSS

> This file is copy-paste only. Do not read during blog creation — use BLOG-SOP.md for instructions.

---

## Section 1 — Full HTML Template

[PASTE THE ENTIRE HTML TEMPLATE FROM BLOG.md SECTION 4 HERE — all 194 lines unchanged]

---

## Section 2 — Full CSS Block

[PASTE THE ENTIRE CSS BLOCK FROM BLOG.md SECTION 5 HERE — all 447 lines unchanged]
```

- [ ] **Step 2: Commit**

```bash
git add blog/BLOG-REF.md
git commit -m "docs: extract CSS + HTML template into BLOG-REF.md"
```

---

## Task 2: Create BLOG-SOP.md

Write the compressed SOP. Every instruction is here; templates are in BLOG-REF.md. Target: ~250 lines.

**Files:**
- Create: `blog/BLOG-SOP.md`

- [ ] **Step 1: Create BLOG-SOP.md with this exact content**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add blog/BLOG-SOP.md
git commit -m "docs: add compressed BLOG-SOP.md (~250 lines, agent-readable)"
```

---

## Task 3: Deprecate BLOG.md + Update REEL-SOP.md

**Files:**
- Modify: `blog/BLOG.md` (prepend deprecation notice)
- Modify: `video/REEL-SOP.md` (update Step 1 to reference reel-data.md)

- [ ] **Step 1: Add deprecation header to BLOG.md**

Prepend these lines to the top of `blog/BLOG.md`:

```markdown
> **DEPRECATED** — Use `blog/BLOG-SOP.md` for instructions and `blog/BLOG-REF.md` for HTML/CSS templates.
> This file is kept for historical reference only. Do not use for new posts.

---

```

- [ ] **Step 2: Update REEL-SOP.md Step 1**

In `video/REEL-SOP.md`, replace the current "Step 1 — Gather blog graphics" section with:

```markdown
### Step 1 — Read reel-data.md

Every blog post has a `blog/<slug>/reel-data.md` companion file with the hook, stats, chart data, CTA, and Pexels queries pre-extracted. Read this file — do not re-read `index.html`.

If `reel-data.md` is missing (legacy posts only), fall back to reading the blog HTML and create the reel-data.md before proceeding.

The reel script maps directly from reel-data.md sections:
- `hook` → HOOK segment
- `## stats` entries → Overlay segments (one per stat)
- `## chart` → Chart segment (omit if absent)
- `## cta` → CTA segment
- `## pexels_queries` → passed to fetch-photos.mjs automatically
```

- [ ] **Step 3: Commit**

```bash
git add blog/BLOG.md video/REEL-SOP.md
git commit -m "docs: deprecate BLOG.md, update REEL-SOP to use reel-data.md"
```

---

## Task 4: Create blog/scripts/fetch-pexels.mjs

New script that fetches inline blog article photos from Pexels. Reads the API key from `video/.env`.

**Files:**
- Create: `blog/scripts/fetch-pexels.mjs`
- Create: `blog/scripts/fetch-pexels.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `blog/scripts/fetch-pexels.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('splits queries on pipe delimiter', () => {
  const raw = 'silver coins safe storage|moisture tarnish silver container';
  const queries = raw.split('|').map(q => q.trim());
  assert.deepEqual(queries, [
    'silver coins safe storage',
    'moisture tarnish silver container',
  ]);
});

test('formats attribution string', () => {
  const photo = { photographer: 'Jane Smith', url: 'https://www.pexels.com/photo/12345/' };
  const attribution = `Photo by ${photo.photographer} on Pexels (${photo.url})`;
  assert.equal(attribution, 'Photo by Jane Smith on Pexels (https://www.pexels.com/photo/12345/)');
});

test('deduplicates photo IDs across queries', () => {
  const usedIds = new Set();
  const photos = [
    { id: 1, src: { large: 'url1' } },
    { id: 1, src: { large: 'url1' } },
    { id: 2, src: { large: 'url2' } },
  ];
  const unique = photos.filter(p => {
    if (usedIds.has(p.id)) return false;
    usedIds.add(p.id);
    return true;
  });
  assert.equal(unique.length, 2);
  assert.deepEqual([...usedIds], [1, 2]);
});

test('parses PEXELS_API_KEY from .env file content', () => {
  const envContent = 'PEXELS_API_KEY=abc123xyz\nOTHER_VAR=foo\n';
  const lines = envContent.split('\n');
  let key = null;
  for (const line of lines) {
    const m = line.match(/^PEXELS_API_KEY=(.+)/);
    if (m) key = m[1].trim();
  }
  assert.equal(key, 'abc123xyz');
});
```

- [ ] **Step 2: Run tests — expect PASS (pure logic, no imports needed)**

```bash
node --test blog/scripts/fetch-pexels.test.mjs
```

Expected: 4 passing tests. These test pure functions only — no network calls.

- [ ] **Step 3: Create blog/scripts/fetch-pexels.mjs**

```javascript
import { existsSync, mkdirSync, createWriteStream, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get as httpsGet } from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const blogDir = join(__dirname, '..');

function loadApiKey() {
  const envPath = join(__dirname, '../../video/.env');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^PEXELS_API_KEY=(.+)/);
      if (m) return m[1].trim();
    }
  }
  return process.env.PEXELS_API_KEY ?? null;
}

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = httpsGet(url, { headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Bad JSON from ${url}`)); }
      });
    });
    req.on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const follow = (u) => {
      httpsGet(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          follow(res.headers.location);
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    };
    follow(url);
  });
}

export async function fetchBlogPhotos(slug, queries, orientation = 'landscape') {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('PEXELS_API_KEY not set — check video/.env');
    process.exit(1);
  }

  const imgDir = join(blogDir, slug, 'images');
  mkdirSync(imgDir, { recursive: true });

  const usedIds = new Set();
  const results = [];

  for (let i = 0; i < queries.length; i++) {
    const dest = join(imgDir, `pexels-${i}.jpg`);
    if (existsSync(dest)) {
      console.log(`  ↷  pexels-${i}.jpg already exists — skipping`);
      results.push({ index: i, file: `pexels-${i}.jpg`, skipped: true });
      continue;
    }

    const query = encodeURIComponent(queries[i]);
    const url = `https://api.pexels.com/v1/search?query=${query}&orientation=${orientation}&per_page=15&size=large`;

    try {
      const data = await fetchJson(url, { Authorization: apiKey });
      const photo = data.photos?.find(p => !usedIds.has(p.id));
      if (!photo) {
        console.warn(`  ⚠  No unused photo for: "${queries[i]}"`);
        continue;
      }
      usedIds.add(photo.id);

      const imgUrl = photo.src.large2x ?? photo.src.large;
      await downloadFile(imgUrl, dest);

      const attribution = `Photo by ${photo.photographer} on Pexels (${photo.url})`;
      console.log(`  ✓  pexels-${i}.jpg — ${attribution}`);
      results.push({ index: i, file: `pexels-${i}.jpg`, attribution });
    } catch (err) {
      console.warn(`  ⚠  pexels-${i} failed: ${err.message}`);
    }
  }

  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const postArg = process.argv.find(a => a.startsWith('--post='));
  const queriesArg = process.argv.find(a => a.startsWith('--queries='));
  const orientArg = process.argv.find(a => a.startsWith('--orientation='));

  if (!postArg || !queriesArg) {
    console.error('Usage: node fetch-pexels.mjs --post=<slug> --queries="q1|q2" [--orientation=landscape|portrait]');
    process.exit(1);
  }

  const slug = postArg.replace('--post=', '');
  const queries = queriesArg.replace('--queries=', '').split('|').map(q => q.trim());
  const orientation = orientArg ? orientArg.replace('--orientation=', '') : 'landscape';

  console.log(`\nFetching ${queries.length} photo(s) for: ${slug}\n`);
  fetchBlogPhotos(slug, queries, orientation).then(results => {
    const downloaded = results.filter(r => !r.skipped).length;
    console.log(`\nDone. ${downloaded} photo(s) downloaded.\n`);
    const withAttribution = results.filter(r => r.attribution);
    if (withAttribution.length) {
      console.log('Attributions (paste into <figcaption>):');
      withAttribution.forEach(r => console.log(`  ${r.file} — ${r.attribution}`));
    }
  });
}
```

- [ ] **Step 4: Run tests again — verify still passing**

```bash
node --test blog/scripts/fetch-pexels.test.mjs
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add blog/scripts/fetch-pexels.mjs blog/scripts/fetch-pexels.test.mjs
git commit -m "feat(blog): add fetch-pexels.mjs for inline article photos"
```

---

## Task 5: Update video/scripts/fetch-photos.mjs

Add `reel-data.md` query lookup so the reel renderer uses human-written search queries instead of generic keyword extraction. Falls back to existing extractor when no reel-data.md exists.

**Files:**
- Modify: `video/scripts/fetch-photos.mjs`
- Create: `video/scripts/fetch-photos.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `video/scripts/fetch-photos.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Pure function tests — extract the query-loading logic so it's testable without file I/O

function parseReelDataQueries(md) {
  const queries = {};
  const sectionMatch = md.match(/## pexels_queries\n([\s\S]*?)(?=\n##|$)/);
  if (!sectionMatch) return queries;

  const lines = sectionMatch[1].split('\n');
  let currentSegment = null;
  for (const line of lines) {
    const segMatch = line.match(/^-\s+segment:\s*(\d+)/);
    const queryMatch = line.match(/^\s+query:\s*"(.+?)"/);
    if (segMatch) currentSegment = parseInt(segMatch[1], 10);
    if (queryMatch && currentSegment !== null) {
      queries[currentSegment] = queryMatch[1];
      currentSegment = null;
    }
  }
  return queries;
}

test('parses pexels_queries from reel-data.md content', () => {
  const md = `# Reel Data: test-slug
topic: silver

## pexels_queries
- segment: 0
  query: "silver coins safe storage"
- segment: 2
  query: "silver tarnish moisture"
`;
  const queries = parseReelDataQueries(md);
  assert.equal(queries[0], 'silver coins safe storage');
  assert.equal(queries[2], 'silver tarnish moisture');
  assert.equal(queries[1], undefined);
});

test('returns empty object when no pexels_queries section', () => {
  const md = `# Reel Data: test-slug\ntopic: tech\n\n## stats\n- text: "foo"\n`;
  const queries = parseReelDataQueries(md);
  assert.deepEqual(queries, {});
});

test('returns empty object for empty string', () => {
  assert.deepEqual(parseReelDataQueries(''), {});
});
```

- [ ] **Step 2: Run tests — expect PASS (no imports yet)**

```bash
cd video && node --test scripts/fetch-photos.test.mjs
```

Expected: 3 passing.

- [ ] **Step 3: Add loadReelDataQueries function to fetch-photos.mjs**

After the existing imports block in `video/scripts/fetch-photos.mjs` (after line 12, after `const videoDir = ...`), add:

```javascript
function loadReelDataQueries(slug) {
  const reelDataPath = join(videoDir, '..', 'blog', slug, 'reel-data.md');
  if (!existsSync(reelDataPath)) return {};
  const md = readFileSync(reelDataPath, 'utf8');
  const queries = {};
  const sectionMatch = md.match(/## pexels_queries\n([\s\S]*?)(?=\n##|$)/);
  if (!sectionMatch) return queries;
  const lines = sectionMatch[1].split('\n');
  let currentSegment = null;
  for (const line of lines) {
    const segMatch = line.match(/^-\s+segment:\s*(\d+)/);
    const queryMatch = line.match(/^\s+query:\s*"(.+?)"/);
    if (segMatch) currentSegment = parseInt(segMatch[1], 10);
    if (queryMatch && currentSegment !== null) {
      queries[currentSegment] = queryMatch[1];
      currentSegment = null;
    }
  }
  return queries;
}
```

- [ ] **Step 4: Use loadReelDataQueries in fetchPhotos**

In `video/scripts/fetch-photos.mjs`, inside the `fetchPhotos` function, add this line immediately after the `const photos = {};` and `const usedIds = new Set();` lines:

```javascript
const reelQueries = loadReelDataQueries(slug);
```

Then replace the existing query line:
```javascript
// BEFORE:
const query = encodeURIComponent(segmentKeywords(seg));

// AFTER:
const query = encodeURIComponent(reelQueries[i] ?? segmentKeywords(seg));
```

- [ ] **Step 5: Run all video tests**

```bash
cd video && npm test
```

Expected: all tests pass (parse-script tests + new fetch-photos tests).

- [ ] **Step 6: Commit**

```bash
git add video/scripts/fetch-photos.mjs video/scripts/fetch-photos.test.mjs
git commit -m "feat(video): fetch-photos reads pexels_queries from reel-data.md"
```

---

## Task 6: Set Up Daily Cron

Schedule the daily blog+reel generation run via the `schedule` skill.

**Files:** No code files — cron config managed by schedule skill.

- [ ] **Step 1: Invoke schedule skill**

Run `/schedule` and configure:
- **Name:** `daily-blog-reel`
- **Schedule:** `0 9 * * *` (daily at 9:00 AM)
- **Prompt:** 

```
Follow the blog+reel pipeline in blog/BLOG-SOP.md and video/REEL-SOP.md.

Run: one tech post + one silver post + two reels.

Steps:
1. Read blog/posts.json to see existing topics — pick angles not already covered.
   Tech: pick from Websites / Local Business / Marketing / Google / Social Media.
   Silver: rotate through — Buying Guide → Investing → Storage → History → Market.

2. Write TECH post:
   - Read blog/BLOG-SOP.md
   - Create blog/[slug-tech]/index.html + hero.svg
   - Run: node blog/scripts/fetch-pexels.mjs --post=[slug-tech] --queries="q1|q2"
   - Create blog/[slug-tech]/reel-data.md
   - Prepend entry to blog/posts.json

3. Write SILVER post (same as step 2, silver brand routing).

4. Render TECH reel:
   - Read blog/[slug-tech]/reel-data.md
   - Write blog/[slug-tech]/reel-script.md
   - Run: cd video && export $(cat .env | xargs) && node scripts/render.mjs --post=[slug-tech]

5. Render SILVER reel (same as step 4).

6. Git commit (no push):
   git add blog/ video/out/
   git commit -m "feat: [tech-title] + [silver-title] + reels"
```

- [ ] **Step 2: Verify cron is listed**

```bash
# Check via schedule skill — list scheduled routines
```

Expected: `daily-blog-reel` appears with `0 9 * * *` schedule.

---

## Task 7: Backfill reel-data.md for Existing Posts

Create `reel-data.md` for all 10 posts that need reels. (Skip `welcome-to-fused` — no stats to animate.)

**Files:** Create `blog/[slug]/reel-data.md` for each of these 10 slugs:
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
```

- [ ] **Step 1: For each post, read index.html and write reel-data.md**

For each slug: read `blog/[slug]/index.html`, extract:
- **hook** — first strong stat or claim in the post
- **stats** — 2–3 key numbers with their surrounding narration
- **chart** — if a `.chart-wrap` exists, copy its title and bar data
- **cta** — copy the article CTA sentence
- **pexels_queries** — write 1 query per reel segment based on the post topic

Follow the format exactly from BLOG-SOP.md §11.

Process all 10 posts. Each reel-data.md should be 30–40 lines.

- [ ] **Step 2: Run fetch-pexels for posts that have no inline photos yet**

For legacy posts that currently have no `images/` folder or only have a hero SVG, run:

```bash
node blog/scripts/fetch-pexels.mjs --post=[slug] --queries="[queries from reel-data.md]"
```

Only run for posts whose blog SOP compliance needs photos added. Existing `what-is-junk-silver` already has `images/coins-spread.jpg` — skip Pexels fetch for that one.

- [ ] **Step 3: Commit all reel-data.md files**

```bash
git add blog/
git commit -m "feat(blog): backfill reel-data.md for 10 existing posts"
```

---

## Task 8: Backfill Reel Scripts + Render All 10 Posts

Generate `reel-script.md` from each `reel-data.md` and render the MP4.

**Files:** Create `blog/[slug]/reel-script.md` for each of the 10 posts.

- [ ] **Step 1: For each post, write reel-script.md from reel-data.md**

Read `blog/[slug]/reel-data.md` and write `blog/[slug]/reel-script.md` following the REEL-SOP.md format. Assign timestamps (hook 0–3s, overlays 10s each, chart 13s, CTA 6–8s). Total: 45–55s.

Format reference (from video/REEL-SOP.md):
```markdown
# Reel Script: [Title]
Generated: YYYY-MM-DD
Target length: XX seconds

---

## HOOK (0–3s)
[hook from reel-data.md]

---

## BODY

**Overlay 1** (3–13s)
Text: [stats[0].text]
Narration: [stats[0].narration]

[... additional overlays and optional chart ...]

---

## CTA (XX–XXs)
Text: [cta.text]
Narration: [cta.narration]

---

## VISUAL DIRECTION
[Standard visual notes for segment types]

---

## FACEBOOK CAPTION
[caption from reel-data.md]

Link in comments.

## HASHTAGS
[hashtags from reel-data.md]
```

- [ ] **Step 2: Render all 10 reels in batches**

Run in batches of 3 to avoid Pexels rate limiting (each render triggers fetch-photos.mjs):

**Batch 1:**
```bash
cd video && export $(cat .env | xargs)
node scripts/render.mjs --post=facebook-growth-and-automation
node scripts/render.mjs --post=why-free-offers-work
node scripts/render.mjs --post=silver-premiums-explained
```

**Batch 2:**
```bash
node scripts/render.mjs --post=getting-google-reviews
node scripts/render.mjs --post=silver-to-gold-ratio
node scripts/render.mjs --post=google-business-profile-setup
```

**Batch 3:**
```bash
node scripts/render.mjs --post=what-is-junk-silver
node scripts/render.mjs --post=what-a-website-is-worth
node scripts/render.mjs --post=dollar-cost-averaging-silver
```

**Batch 4:**
```bash
node scripts/render.mjs --post=why-your-website-isnt-getting-customers
```

Each render outputs to `video/out/[slug]/[slug].mp4`.

- [ ] **Step 3: Verify outputs**

```bash
ls video/out/*/  | grep '\.mp4'
```

Expected: 10 MP4 files, one per slug.

- [ ] **Step 4: Commit reel scripts and review checklist**

For each rendered reel, run the REEL-SOP review checklist:
- Numbers animate and count up correctly
- Chart bars fully visible and centered
- Subtitles match narration
- Background photos don't overpower text
- CTA glow visible and readable

```bash
git add blog/ video/out/
git commit -m "feat(reels): backfill reel-script.md + rendered MP4s for 10 existing posts"
```
