# Action Plan: fuseddistribution.com (2026-11-04)

Each item names the owner area and its effort: S is under 1 hour, M is half a day, L is 1+ days. Nothing here has been changed yet. All of it needs Nick's go-ahead. Codex owns editorial and pipeline delivery under `CLAUDE.md`.

## Critical (this week)
1. **Make `public/og-image.png`** (1200x630, branded) and a favicon set: `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` (180), `site.webmanifest`. Add `<link rel="icon">` tags to the shared head. Fixes 422 pages. *S*
2. **Add a `www` DNS record** (proxied CNAME to apex) and a 301 redirect from www to the apex domain, using a Cloudflare redirect rule or the Worker. *S*
3. **Remove the stale GBP posts.** 301 `google-business-profile-messaging` and `google-business-profile-messaging-setup-and-tips` to `/blog/google-business-profile-setup/`. Rewrite or 301 `google-business-profile-q-and-a-how-to-use-it`. Remove them from `posts.json`, the sitemap and `topic-history`, then fix the 2 internal links. *S*
4. **Client demo pages.** Strip the `AggregateRating` and `Restaurant` schema from `/plainsman/`. Add `noindex` to all 5 demos (`plainsman`, `cascade`, `anoush-deli`, `boba-tree`, `world-construction`), or canonical them to each client's real domain. Remove them from the sitemap. *S*
5. **Lock `/admin/`** with Cloudflare Access or a Worker auth check (open since 10-22). *S*

## High (within 2 weeks)
6. **Fix the CSP for fonts.** Add `https://fonts.googleapis.com` to `style-src` and `https://fonts.gstatic.com` to `font-src` in `src/worker.js`, or self-host the fonts (better for speed and privacy). *S*
7. **Mobile nav.** Add a hamburger below 768px, keep the dropdowns inside the viewport, and keep Get Started on the same row as the nav on desktop. Use one shared nav (same items and logo lockup) on every page. *M*
8. **Bing Webmaster Tools.** Verify the site (an import from GSC works) and submit the sitemap. Turn on IndexNow from the deploy step so new posts reach Bing and ChatGPT within hours. *S*
9. **Analytics.** Switch to GA4 Consent Mode v2 (default denied, cookieless pings), and turn on Cloudflare Web Analytics as the cookieless baseline. Move the banner so it does not cover the hero CTA. *M*
10. **Blog index in server HTML.** Generate the full post list, or paginated `/blog/page/2/` pages, as static HTML at build time, so AI crawlers can reach every post. *M*
11. **LocalBusiness schema.** Add a `ProfessionalService` entity with address, phone, areaServed, geo, hours, priceRange and sameAs (Facebook, Instagram, GBP). Use the same `@id` and one consistent name across all pages. *S*
12. **Fix the 6 broken links.** Covers `/local-seo/`, `/web-design/`, and the 4 `href="www..."` links. *S*
13. **Sitemap.** Add the 13 missing posts. Use the real modified date for lastmod. Drop the demos and decide whether `/photos/images/*` pages stay. *S*
14. **Fix copy rule breaks** in the hero badge, homepage meta description and `llms.txt` ("operator-led", "multi-venture", "hands-on", "small-business"). *S*

## Medium (within 1 month)
15. **Homepage rewrite for search intent.** The H1 and first 150 words should say what you do and where. Example direction: "Custom websites for Vancouver small businesses. See it built before you pay." Keep the multi-venture story lower on the page. *M*
16. **Title and description lengths.** Shorten the blog title suffix to " | Fused Tech", or drop it, which fixes 351 titles. Cap descriptions at 155 characters. Trim the homepage and `/process/` titles. *S*, scripted
17. **Service landing pages:** `/web-design/` (Vancouver WA) and `/local-seo/`, built answer-first with prices, timeline, FAQ, and real client examples. Both URLs are already linked from posts. *L*
18. **Author / E-E-A-T.** Use your full name, add an author page with photo, background and client results, and put real testimonials on home, pricing and process. *M*
19. **Graphics pass.** Add a headshot, a client site screenshot strip, a process diagram, and per-section og-images. Wrap wide tables for mobile and raise any text under 12px on pricing. *M*
20. **Fact-check the silver and investing archive** (`/blog factcheck`). Remove or fix posts that still carry the fake citations flagged 2026-07-08. *L*
21. **Topical focus.** Decide on the 128 investing and 175 silver posts. Either move them under a Fused Reserve byline or section, or prune the thin ones. They dilute the web design authority signal. *Decision*
22. **Photos page weight.** Cut 2.3 MB with AVIF `srcset` and lazy loading. Add width and height to the 961 images that lack them. *M*

## Low (backlog)
23. Real `dateModified` on edited posts.
24. Delete or redirect the orphan `/Fused Technology Solutions/` page and the dead `/reels/` and `/reels-x/` folders.
25. Off-site mentions: claim a GBP for the web business if you don't have one, plus Clutch, UpCity and Yelp. Add a "Site by Fused" footer credit on client sites. Post genuine Reddit/Quora answers in local business threads.
26. AI visibility tracking: run a fixed set of 10 prompts monthly in ChatGPT, Perplexity, Claude and Gemini (e.g. "who builds small business websites in Vancouver WA") and log whether Fused is cited.
27. Index `/privacy/` (it is currently noindex). Indexing it is a small trust signal.
