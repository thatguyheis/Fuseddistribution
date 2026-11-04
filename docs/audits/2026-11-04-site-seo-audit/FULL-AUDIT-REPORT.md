# fuseddistribution.com: Full SEO, AI Search and UI Audit

**Date:** 2026-11-04 · **Auditor:** Claude (Opus 5.5) · **Scope:** live site and repo `public/`, 483 sitemap URLs crawled, 1,934 linked URLs and image URLs checked, 16 pages screenshotted on desktop (1440) and mobile (390)
**Method notes:** The PageSpeed API quota was used up, so performance numbers come from local Playwright with mobile throttling, not CrUX field data. The Chrome extension was offline, so screenshots come from headless Playwright. I had no access to the Search Console or GA4 dashboards. Raw data is in `crawl.json`, `ui.json` and `screenshots/`.

---

## Executive summary

**SEO Health Score: 62 / 100**

| Category | Weight | Score |
|---|---|---|
| Technical SEO | 22% | 62 |
| Content quality | 23% | 60 |
| On-page SEO | 20% | 58 |
| Schema | 10% | 60 |
| Performance | 10% | 92 |
| AI search readiness | 10% | 50 |
| Images / graphics | 5% | 55 |

**Business type:** hybrid. The main revenue line is local web design for small businesses (a service area business in Vancouver, WA). The site also runs silver subscriptions, a stock photo library, education, and a blog with 404 posts.

The site is fast, clean, and fully indexable, with good security headers. Its weak points are **identity and trust signals**: the og:image and logo file is missing, there is no favicon, `www.` does not resolve, the brand name is split, and there is no LocalBusiness entity. It also has **stale or invalid blog content** and a **mobile navigation** that takes up about a third of the screen. AI crawlers can see only 9 of the 404 blog posts from the blog index.

### Top 5 critical issues
1. **`/og-image.png` returns 404.** 422 pages reference it: 13 pages use it as their og:image, and every BlogPosting uses it as the publisher logo. Shared links show no image, and Article structured data has a broken logo.
2. **`www.fuseddistribution.com` has no DNS record.** Anyone who types www gets a dead page. 15 blog pages link to `www.` URLs.
3. **No favicon at all** (`/favicon.ico`, apple-touch-icon and manifest are all 404). Google shows the favicon next to every mobile result, so the site gets a generic globe icon. Every page load also logs a 404 console error.
4. **Stale Google Business posts that advise using features Google removed.** `google-business-profile-messaging` and `google-business-profile-messaging-setup-and-tips` cover GBP chat, which Google shut down in July 2024. `google-business-profile-q-and-a-how-to-use-it` covers Q&A, which has been retired for Ask Maps. These are the "old blog post and Google business chat" references you asked to remove.
5. **Client demo pages are indexed on your domain with someone else's review markup.** `/plainsman/` carries `Restaurant` schema with `AggregateRating 4.4 / 926 reviews` and an empty `url`. Google's review snippet policy forbids marking up ratings that are not your own. `/anoush-deli/`, `/boba-tree/`, `/cascade/` and `/world-construction/` are also in the sitemap with no canonical, no schema and thin content. These read as doorway or duplicate pages for real local businesses.

### Top 5 quick wins
1. Create `og-image.png` (1200x630) and a favicon set. One commit fixes 422 pages.
2. Add a `www` CNAME on Cloudflare with a 301 redirect to the apex domain.
3. Allow `fonts.googleapis.com` and `fonts.gstatic.com` in the Worker CSP, or self-host the fonts. Pricing, Projects and Coin History Talk currently render in fallback fonts because the CSP blocks their stylesheet.
4. Verify the site in Bing Webmaster Tools and submit the sitemap. ChatGPT search pulls from Bing's index.
5. Fix 6 broken internal links: `/local-seo/` and `/web-design/` (2 posts), plus 4 silver posts with `href="www..."` that has no scheme.

---

## 1. Technical SEO

| Check | Result |
|---|---|
| HTTPS, HTTP to HTTPS 301 | Pass |
| HSTS, CSP with nonce, X-Frame, Referrer-Policy, Permissions-Policy | Pass |
| robots.txt | Pass. Allows all major AI crawlers, blocks `/api/` |
| Sitemap | 483 URLs, all return 200, no redirects. **Gaps below** |
| Canonicals | 5 core pages have none (all client demo pages) |
| Custom 404 | Pass (returns a real 404) |
| `www` host | **Fail: no DNS** |
| Favicon / manifest | **Fail: 404** |
| `/admin/` | **Publicly served (200)**. Still open from the 10-22 audit |
| `/Fused Technology Solutions/` (folder with a space) | **Served live (200)** as an old standalone page. Orphan duplicate |
| `/reels/`, `/reels-x/` | Folders exist in `public/` but return 404 |

**Sitemap issues**
- 13 posts listed in `posts.json` are missing from the sitemap, including `ai-reels-for-beginners-part-1` and `ai-reels-workflow-part-2`.
- 74 URLs share `lastmod 2026-05-07`. Lastmod should change only when content changes, otherwise search engines learn to ignore it.
- 63 `/photos/images/*` pages are in the sitemap. Each is thin (median 183 words) with no schema. Either add ImageObject schema and real captions, or drop them from the sitemap.
- The client demo pages should come out (see critical issue 5).

**Analytics / Search Console**
- Search Console is verified by DNS TXT. Pass.
- GA4 (`G-3J56X9V708`) loads only after a visitor clicks Accept, so most US visitors are never measured. Fix: implement **Google Consent Mode v2** with default denied, so GA gets cookieless pings and modeled data, and/or turn on **Cloudflare Web Analytics** for cookieless baseline counts. The consent banner also covers the hero CTA on the first screen on both desktop and mobile.
- No Bing Webmaster verification (`BingSiteAuth.xml` 404, no `msvalidate` meta, no TXT).

## 2. Content quality

**Blog:** 404 posts. All posts are written by "Nick", first name only, published under "Fused Technology Solutions". Median length is 1,375 words.

Topic mix by tag: Silver 175, Local Business 132, Investing 128, Marketing 116, Coin history 11. Silver investing sits under a web design brand's byline, which dilutes topical authority. The May 2026 update rewarded focused depth over volume. Per `SOURCE-OF-TRUTH.md`, the pipeline now produces coin history only, so the existing silver and investing archive is the main dilution.

**Stale or wrong posts (remove or redirect):**

| Post | Problem | Action |
|---|---|---|
| `/blog/google-business-profile-messaging/` | GBP chat was shut down July 2024 | 301 to the GBP setup guide |
| `/blog/google-business-profile-messaging-setup-and-tips/` | Same | 301 to the same target |
| `/blog/google-business-profile-q-and-a-how-to-use-it/` | Q&A retired for Ask Maps | Rewrite as "Ask Maps and your profile", or 301 |

When removing these posts: drop them from `posts.json` and the sitemap, delete or redirect the folders, and edit the 2 sibling posts that link to them. Prefer 301s over 404s so any backlinks carry over.

**Known fake citations:** the memory note `blog_pipeline_hardening` (2026-07-08) says older posts still carry unsourced citations. This is a YMYL risk for the investing posts. Run `/blog factcheck` over the silver and investing archive before the next core update.

**E-E-A-T gaps**
- The author is "Nick" with no last name, photo, credentials, or bio page. Use your full name and build an `/about/nick-hughes/` author page with your experience, client results, and photo. Point every BlogPosting `author.url` at it.
- No reviews or testimonials appear on the homepage, pricing page or process page. Add 3 to 5 real client quotes with names and business names, and link the live client sites as proof.
- Homepage copy is vague for search. The H1 "One Operator. Many Ventures. Everything Built to Move." never says what you sell or where. Nobody searches "operator". Lead with the service and the city.

**Copy rule breaks found (your style rules):** the hero badge reads "OPERATOR-LED. MULTI-VENTURE." The meta description says "operator-led" and "small-business", and `llms.txt` says "operator-led" and "hands-on". All of these are hyphenated or on the banned list.

## 3. On-page SEO

| Issue | Count |
|---|---|
| Blog titles over 60 characters | **351 / 392**. The suffix " \| Fused Technology Solutions" (30 chars) causes most of these |
| Core page titles over 60 characters | 9. The homepage is 78, `/process/` is 86 |
| Meta descriptions over 160 characters | 12 core pages and 46 blog posts. The homepage is 392 |
| Missing meta description | `/cascade/`, `/plainsman/` |
| Duplicate titles | 0 |
| H1 count not equal to 1 | 0 (pass) |
| Pages with no og:image / Twitter card | 7 core pages |

**Brand split:** the homepage says "Fused Distribution", the blog and pricing pages say "Fused Technology Solutions", and the `/process/` title says "Fused Tech". All of them share one `@id #organization` but use different names. Search engines and LLMs will see this as two or three entities. Pick one public name per page type and make the schema consistent. For example, "Fused Technology Solutions, a Fused Distribution company".

**Broken internal links (6):**
- `/blog/local-seo-for-small-business-beginner-guide/` and `/blog/what-is-nap-consistency-and-why-it-matters/` link to `/local-seo/` and `/web-design/`, which are both 404. That is a sign these service pages should exist (see roadmap).
- Four silver posts have `href="www.silverandpreciousmetals.com"` or `href="www.fuseddistribution.com"` with no `https://`, so the link resolves as a relative 404.
- `/projects/`: the "Open Full Site" button has `href="#"` until JS fills it in.

**Missing landing pages that searches would hit:** "web design Vancouver WA", "small business website Vancouver", "local SEO Vancouver WA" and "website for restaurants / contractors". Today, pricing and process pages have to do this job.

## 4. Schema / structured data

Present: Organization, WebSite, BreadcrumbList, WebPage, FAQPage (3 core + 22 posts), BlogPosting with Person and ImageObject on every post, Service/OfferCatalog on pricing, Product/Offer on reserve, HowTo on process, ImageGallery, Book. No JSON parse errors.

Gaps:
- **No LocalBusiness / ProfessionalService entity**, even though the NAP is on the page (Vancouver, WA · 503 847 9425 · nick@). Add `ProfessionalService` with `address`, `telephone`, `areaServed` (Vancouver WA, Portland OR metro), `geo`, `openingHours`, `priceRange`, and `sameAs`. Add your GBP Maps URL to `sameAs` when you have it.
- The publisher `logo` points to the missing og-image.png (see critical issue 1).
- `/plainsman/` has a third-party `AggregateRating`. Remove it (see critical issue 5).
- FAQPage no longer earns rich results (deprecated 2026-05-07). Keep it because AI systems parse it, but expect no SERP feature. HowTo on `/process/` is also legacy and harmless.
- `dateModified` equals `datePublished` on posts. Set a real `dateModified` when a post is edited, because freshness matters to Perplexity.

## 5. Performance

Lab test: mobile, 4x CPU throttle, 150ms latency.

| Page | LCP | CLS | Transfer |
|---|---|---|---|
| `/` | 0.61s | 0 | 139 KB |
| `/pricing/` | 0.42s | 0 | 376 KB |
| `/blog/` | 0.44s | 0 | 562 KB |
| blog post | 0.52s | 0 | 115 KB |
| `/photos/` | 0.37s | 0 | **2.3 MB** |
| `/reserve/` | 0.40s | 0 | 163 KB |

All pass with a wide margin. Watch items:
- `/photos/` weighs 2.3 MB. Use AVIF/WebP `srcset` and lazy-load below the fold.
- The blog index renders 404 `<img>` from JS, and only 9 have `loading="lazy"`.
- 961 images across the site have no width/height attributes. CLS is 0 today, but missing dimensions are a CLS risk if CSS changes.

## 6. AI search readiness (ChatGPT, Perplexity, Claude, AI Overviews)

| Check | Result |
|---|---|
| AI crawlers allowed in robots.txt | Pass |
| `llms.txt` | Present, but it repeats copy rule breaks and lists "Collectibles / Warhammer". Google says it does not use the file. Low value, keep it updated |
| Server-rendered content | **Fail for the blog index.** Only 9 post links are in the HTML. The other 395 load from `posts.json` by JS. AI crawlers don't run JS, so they can only reach most posts through the sitemap |
| Bing index (feeds ChatGPT) | Not verified |
| Answer-first content | Mixed. Blog posts mostly answer first. Core service pages lead with slogans |
| Entity clarity | Weak. Three brand names, no LocalBusiness, first-name-only author |
| Off-site mentions | Not measured. Needs GBP, directories (Clutch, UpCity, Yelp), Reddit/Quora answers, and client site footer credits ("Site by Fused Technology Solutions" linking back) |

## 7. UI, graphics and buttons

Screenshots are in `screenshots/`.

**Bugs**
- **CSP blocks Google Fonts** on `/pricing/`, `/projects/` and `/coin-history-talk/` (console error on every load). These pages render in fallback fonts, not the designed type.
- **Mobile nav has no hamburger.** At 390px, the nav, links and Get Started button fill about 310px (37%) of the first screen, so the hero sits below them. Dropdown menus overflow the viewport on mobile (the `nav-dropdown` overflow appears on 10 pages). The `/process/` nav and the 404 page nav overflow horizontally.
- **Desktop nav wraps**: "Get Started" drops to a second row under the pill nav on the homepage.
- **Inconsistent nav across pages**: the homepage shows Home, Photos, About, Blog. Pricing shows HOME, ABOUT, BLOG in caps with no Photos. The blog shows only HOME, BLOG. The logo lockup changes between "FUSED DISTRIBUTION" and "FUSED TECHNOLOGY SOLUTIONS".
- Wide tables overflow on mobile: the pricing `comparison-table` and the privacy table. Wrap them in a horizontal scroll container.
- `/coin-history-talk/` has elements overflowing horizontally on both viewports.
- Pricing on mobile has 22 text elements under 12px.
- The consent banner covers the primary CTA on the first screen.

**Graphics gaps**
- The homepage, `/about/` and `/process/` have **zero images**. Everything is gradient text. There is no photo of you, no client site screenshots, and no proof.
- Recommendations: put a real headshot on About and the homepage. Show a "Sites we built" strip with screenshots of the client builds you already have (Plainsman, Cascade, Boba Tree, World Construction, Anoush). Add a simple before and after or a 3-step graphic to `/process/`. Use a branded og-image per section.

## 8. Things missed in earlier versions

- The 2026-04-17 audit (`SITE_AUDIT_2026-04-17.md`) predates the move to `assets.directory=./public`. The missing og-image and favicon probably date from that restructure: `git log` shows `og-image.png` was never committed under `public/`.
- `/admin/` is still public (flagged 2026-10-22, decision pending).
- Pricing chat assistant placement is consistent: it is listed only under Expansion on pricing, FAQ and `llms.txt`. No fix needed.

## Sources

See `research_raw.md` for all URLs. Key ones:
- [Google Core Updates 2026: dataslayer](https://www.dataslayer.ai/blog/google-core-update-december-2025-what-changed-and-how-to-fix-your-rankings)
- [Google Core Update 2026 calendar: seomatic](https://seomatic.ai/resources/google-core-update-2026)
- [GEO playbook: Frase](https://www.frase.io/blog/how-to-get-cited-by-ai-search-engines-the-complete-geo-playbook)
- [GEO guide: ALM Corp](https://almcorp.com/blog/generative-engine-optimization-complete-guide-2/)
- [llms.txt and Google guidance: Passionfruit](https://www.getpassionfruit.com/blog/should-i-create-an-llms.txt-file-google-s-2026-guidance-explained)
- [FAQ rich results dropped: Search Engine Journal](https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/)
- [Core Web Vitals 2026: Meta Digital](https://www.metadigital.co.nz/core-web-vitals-in-2026-what-they-measure-and-whats-actually-worth-fixing/)
- [GBP Q&A removal: Search Engine Roundtable](https://www.seroundtable.com/google-maps-qa-feature-ask-40594.html)
