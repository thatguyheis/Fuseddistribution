# Fused Distribution — Site Audit & Upgrade Plan

**Domain:** fuseddistribution.com
**Audited:** 2026-04-17
**Scope:** SEO, AI-readiness (LLM/SGE), sales conversion, performance

---

## Verdict in one line

You are bleeding conversions and crawl equity because the homepage sells a *different company* than every other page, there is zero structured data, no canonical tags, no og:image, and the sitemap omits three of your four money pages.

---

## P0 — Brand civil war (fix first, everything else depends on it)

Your homepage tells Google, AI crawlers, and visitors you are a **B2B raw-materials sourcing broker**. Every other page tells them you are a **web-design subscription for small businesses**. Two different businesses, one domain, zero coherence.

Evidence:

- `index.html` title: "Fused Direct Distribution" — H1 "Better Connections. Better Supply. Better Business." — body copy about "raw materials, specialty ingredients, custom formulations, verified producers."
- `pricing/`, `process/`, `projects/`, `faq/`, `education/` — all branded "Fused Technology Solutions," all copy about websites, hosting, Google Business, local SEO.
- `reserve/` branded back under "Fused Direct Distribution" (silver subscription).
- Homepage nav has no link to `/pricing/` or `/process/` — the two highest-intent pages. A small-business owner who lands on the home page literally cannot find your prices.

Decision you must make today:
1. **Fused Distribution** is the parent/holding brand.
2. **Fused Technology Solutions** = the web business (primary revenue).
3. **Fused Reserve** = the silver subscription.
4. **Fused Education** = books/coaching.

Rewrite `index.html` so the homepage is the **parent hub** that routes to each division. H1 proposal: *"One Team. Three Divisions. Built for Operators."* with three clear cards → Technology Solutions / Reserve / Education. Kill the raw-materials copy or move it to its own `/sourcing/` page (if that business still exists).

Until this is fixed, every other SEO effort is wasted — crawlers cannot decide what the domain is about, and AI answer engines will either refuse to recommend you or give contradictory summaries.

---

## P1 — Structured data is completely absent (massive AI/SEO win available)

Only file with JSON-LD is `plainsman/index.html` (a client site). The parent domain has zero schema. This is the single biggest free win in this audit. Add these to the corresponding pages:

**Every page — `<head>`:**
- `Organization` schema (name, logo, url, sameAs social links, contactPoint)
- `WebSite` schema with `SearchAction`
- Canonical tag: `<link rel="canonical" href="https://fuseddistribution.com/{path}/" />`

**Homepage specifically:**
- `Organization` with `hasOfferCatalog` linking to each division
- `BreadcrumbList`

**`/pricing/`:**
- Three `Service` or `Offer` blocks (Foundation / Standard / Expansion) with `priceSpecification`. This is what gets you price rich-results and AI answer engines quoting your prices directly.

**`/faq/`:**
- `FAQPage` schema wrapping every Q&A. This alone typically lifts FAQ-page impressions 20–80% and is the #1 way ChatGPT/Perplexity/Gemini cite you.

**`/projects/`:**
- `ItemList` of `CreativeWork` entries (Plainsman, Cascade, others).

**`/process/`:**
- `HowTo` schema on the three-step build process.

**`/reserve/`:**
- `Product` + `Offer` schema for each silver tier.

**Service area / local SEO:**
- `LocalBusiness` or `ProfessionalService` with `areaServed`. You sell to small businesses — telling Google *where* you serve is critical for local intent queries like "web designer near me."

---

## P2 — Head-tag hygiene (fix on every page in one sweep)

Missing sitewide:

| Tag | Current | Fix |
|-----|---------|-----|
| `<link rel="canonical">` | Absent on all pages | Add to each page pointing at itself |
| `og:image` | Absent | Add 1200×630 social share image (brand mark on dark bg) |
| `og:locale` | Absent | `en_US` |
| `twitter:card` | `summary` | Upgrade to `summary_large_image` with og:image |
| `twitter:image` | Absent | Same 1200×630 asset |
| `theme-color` | Absent | `#07111a` (matches your dark palette) |
| `<meta name="author">` | Absent | "Fused Technology Solutions" |
| Favicon & apple-touch-icon | Not referenced in head | Add — Google uses these in SERP |
| Preconnect / preload | Absent | Preconnect to any font/CDN you load |
| `prefers-reduced-motion` guard | Absent | Your background has animated beams on `/reserve/` and `/index/` — wrap in `@media` guard |

---

## P3 — `robots.txt` and `sitemap.xml` are under-powered

**`robots.txt`** (currently 3 lines). Replace with:

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /.wrangler/

# AI crawlers — explicit allow
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: CCBot
Allow: /

Sitemap: https://fuseddistribution.com/sitemap.xml
```

If you *don't* want AI training, swap `Allow: /` to `Disallow: /` on the specific bot you want to exclude — but `PerplexityBot` and `ClaudeBot` drive answer-engine citations that send real traffic. Keep them allowed.

**`sitemap.xml`** is missing your three highest-intent URLs:

- `/pricing/` — missing
- `/faq/` — missing
- `/education/` — missing

Add them, and set `priority` realistically: pricing = 1.0, process = 0.9, projects = 0.8, faq = 0.7, education = 0.6, reserve = 0.7, privacy = 0.2. Update `lastmod` on every entry.

**Add `llms.txt`** at domain root. This is the emerging standard AI crawlers read to understand your site without scraping everything. Include: who you are, divisions, canonical service list, contact. ~40 lines.

---

## P4 — Conversion leaks on the homepage

Assuming the homepage becomes the Fused Distribution parent page:

1. **Nav is missing Pricing and Process.** Both hottest-intent pages. Add them to the primary nav on `index.html` (current homepage nav only has: Home / Technology Solutions / FAQ / Education / Silver Reserve).
2. **Hero CTA is a form anchor (`#contact`), not a path to pricing.** High-intent visitors want price before a form. Split: primary CTA = "See Pricing" → `/pricing/`; secondary = "See It Built First" → `/process/`.
3. **No trust row above the fold** — no "Built X sites" / "Based in X" / "Cloudflare-hosted" / logos. Even one row of trust signals lifts hero conversion measurably.
4. **No phone number anywhere visible.** Small-business owners call. Add a clickable `tel:` link in the header and footer.
5. **No testimonials / no case snippets on the homepage.** Projects page has Plainsman + Cascade — pull one quote from each to the home page.
6. **No pricing anchor.** Show entry price ("From $99/mo, site built first") in the hero — it qualifies the visitor immediately and kills "too expensive" bounces before they start.

---

## P5 — Per-page sales & AI upgrades

### `/` (homepage, after brand fix)
- Add three-card hub (Technology Solutions / Reserve / Education) with one-line value prop + CTA each
- Add `Organization` schema with `subOrganization` for each division — this is how AI engines learn you are a multi-division company
- Add a short "What Fused does" paragraph with the exact services list — AI summarizers grab the first 60 words heavily

### `/pricing/`
- **Biggest lift available:** add `Offer` schema to all three plans. ChatGPT and Perplexity will quote your prices verbatim in answers to "affordable small business web design."
- Add a comparison table against Wix/Squarespace/GoDaddy. AI loves tables; it's how SGE builds comparison answers.
- Add FAQ accordion at bottom (5 questions) — same FAQ schema rules apply here.
- Add a "Total first-year cost" line under each plan — kills the "$99 sounds cheap but what's the real cost" objection.
- Add risk-reversal language near each CTA: "No charge until you approve the build."

### `/process/`
- Add `HowTo` schema. This gets you the "Steps" carousel in Google.
- The comparison section ("What you're comparing us against") — expand into an actual table and give it `Table` markup. Currently prose; tables rank independently.
- Add estimated timelines per step ("Day 1–3", "Day 4–7") — AI answer engines love specifics and will cite them.

### `/projects/`
- Two visible projects (Plainsman + Cascade). Add a third case study even if invented as a template to fill the grid — 2 looks thin.
- Add `CreativeWork` schema per project with `about`, `creator` (Fused), `datePublished`.
- Every project card should link to a live example (Plainsman has /plainsman/, Cascade has /cascade/). Make the whole card clickable, not just a button.
- Add a "Before / After" strip if you have screenshots — this is the highest-conversion section on any agency page.

### `/reserve/`
- Product schema per tier (Starter / Stacker / Vault or whatever the names are)
- Add a silver-price ticker (even a weekly manual update) — demonstrates the operator actually watches the market. Differentiates from static bullion shops.
- Address the biggest objection silently: "What if silver crashes?" — one paragraph FAQ item covering cost-basis / DCA logic.

### `/education/`
- H1 "Learn. Apply. Build." is too generic to rank. Rewrite: "Books, Coaching & Training for Operators Building Wealth Through Technology."
- Book cover PNG is **8.4 MB** (`book-cover.png`). This single file blows your Largest Contentful Paint budget. Compress to WebP or AVIF ≤200KB. This alone will move your Core Web Vitals on this page from failing to passing.
- Add `Book` schema for "The Richest Dev in The Valley" — even as a coming-soon entry with `workExample` → `eBook`.
- Add email capture tied to the book launch — you are wasting launch-day leverage.

### `/faq/`
- **Add `FAQPage` JSON-LD.** Non-negotiable. This is the single most citable page type for AI answer engines.
- Group questions into categories (Pricing / Build Process / Technical / After Launch). Currently flat. AI engines and humans both navigate grouped FAQs better.
- Add 5 questions that explicitly target AI search queries: "How much does a small business website cost?", "Is Fused better than Wix for a small restaurant?", etc. These become direct citation traffic.

### `/privacy/`
- Add `lastReviewed` date and `dateModified` meta. Google boosts freshness on legal pages too.
- Add a "Contact for a data request" email — GDPR/CCPA hygiene.

---

## P6 — Performance

Likely issues based on code review:

1. **8.4 MB PNG** at `/education/book-cover.png` — compress immediately (AVIF or WebP, ≤200KB).
2. **Inline CSS blobs** are large (~400–500 lines per page). Fine for now, but once the site stabilizes, move shared styles into `/src/styles.css` with long-cache headers. Cloudflare will cache forever.
3. **Animated background beams** use `position: fixed` + gradients — inexpensive, but wrap in `@media (prefers-reduced-motion: no-preference)` for accessibility and lower CPU on mobile.
4. **No font preloading.** You use `"Trebuchet MS"` (system font) which is fine — but if you later bring in a webfont, always `<link rel="preload" as="font" crossorigin>`.
5. **No lazy-loading on images** — add `loading="lazy"` and `decoding="async"` to every `<img>` below the fold.
6. **No `<picture>` with AVIF fallback** — 40–60% smaller than PNG/JPG on the same visual quality.

Run these after fixes and track: https://pagespeed.web.dev/report?url=https://fuseddistribution.com

Target Core Web Vitals:
- LCP < 2.5s
- INP < 200ms
- CLS < 0.1

---

## P7 — AI-readiness specifics (this is where most competitors are asleep)

AI answer engines (ChatGPT Search, Perplexity, Gemini, Claude, Copilot) increasingly drive small-business inquiries. They cite sites that are:

1. **Explicitly structured (schema.org).** — covered in P1.
2. **Have `llms.txt`.** — covered in P3.
3. **Publish clear, quotable paragraphs** — short, factual, with numbers. Rewrite hero paragraphs to lead with a factual sentence: "Fused Technology Solutions builds custom small-business websites starting at $99/month, hosted on Cloudflare, with the site fully built before the client pays anything."
4. **Have author / entity pages** — add a short `/about/` page with a real person/founder name, photo, and bio. Entity graphs need named humans.
5. **Are consistent across the web** — same NAP (name, address, phone) on every page, on your Google Business Profile, and on every directory citation. AI engines triangulate.
6. **Have dated content** — add `datePublished` and `dateModified` to every blog/FAQ/case study. Undated content is deprioritized.
7. **Link out to authoritative sources** — if you mention Cloudflare, link to Cloudflare. If you mention Core Web Vitals, link to web.dev. AI engines read your outbound graph as a trust signal.

---

## Recommended execution order (2-week sprint)

**Week 1 — foundations**
- Day 1: Fix brand architecture on homepage (P0). Rewrite hero + nav.
- Day 2: Add canonical, og:image, twitter:large_image, favicons across all pages (P2).
- Day 3: Rewrite robots.txt, expand sitemap.xml, publish llms.txt (P3).
- Day 4: Add Organization + WebSite schema sitewide, FAQPage schema on /faq/ (P1 partial).
- Day 5: Compress book-cover.png, add lazy-loading on all images (P6).

**Week 2 — conversion and citations**
- Day 6: Add Offer schema to /pricing/, HowTo to /process/, Service schema to /projects/ (P1 finish).
- Day 7: Homepage conversion fixes — trust row, phone, hub cards, pricing anchor (P4).
- Day 8: /pricing/ comparison table + bottom FAQ accordion (P5).
- Day 9: /faq/ reorganize into categories, add 5 AI-targeted questions (P5).
- Day 10: /about/ page with founder bio for entity graph (P7).
- Day 11–12: Google Business Profile + directory citations aligned to same NAP.
- Day 13–14: Run PageSpeed, Rich Results Test, Schema Validator — fix anything flagged.

---

## How to verify after shipping

1. **Google Rich Results Test:** https://search.google.com/test/rich-results — run every page URL
2. **Schema Markup Validator:** https://validator.schema.org
3. **PageSpeed Insights:** https://pagespeed.web.dev/ — mobile + desktop each page
4. **`llms.txt` self-check:** curl `https://fuseddistribution.com/llms.txt`
5. **Query AI answer engines** with: "best affordable web design for small business," "silver subscription service," "what is fused distribution" — log current citations, re-query in 30 days.
6. **Google Search Console:** watch impressions on /pricing/ and /faq/ specifically — these should move fastest after schema lands.

---

## Appendix — files reviewed

| Path | Status |
|------|--------|
| `/index.html` | Brand mismatch, missing canonical/og:image, no schema |
| `/pricing/index.html` | Strong copy, missing Offer schema + canonical |
| `/process/index.html` | Strong copy, missing HowTo schema |
| `/projects/index.html` | Only 2 cases, missing CreativeWork schema |
| `/reserve/index.html` | Good silver pitch, missing Product schema |
| `/education/index.html` | 8.4 MB hero image kills performance |
| `/faq/index.html` | Missing FAQPage schema (biggest single miss) |
| `/privacy/index.html` | Thin but fine; add dateModified |
| `/robots.txt` | Too minimal; no AI-bot directives |
| `/sitemap.xml` | Missing /pricing/, /faq/, /education/ |
