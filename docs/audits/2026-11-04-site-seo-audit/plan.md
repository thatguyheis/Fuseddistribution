# Fix plan, 2026-11-04 ("do all 4")

Status: [x] done locally · [~] needs Nick

## 1. Quick fixes
- [x] Worker: www host 301s to apex (code + test)
- [~] www DNS: add `www.fuseddistribution.com` as a Custom Domain on the fuseddistribution Worker (Cloudflare dashboard > Workers > fuseddistribution > Settings > Domains). That one step creates the DNS record and the cert. The Worker code then redirects.
- [x] Worker: CSP allows Google Fonts (style-src + font-src)
- [x] Worker: injects favicon and manifest links into any HTML head that lacks them
- [x] Assets: og-image.png 1200x630, favicon.svg/.ico, apple-touch-icon.png, icon-192/512, site.webmanifest
- [x] Fixed 19 broken or invented links in 21 posts (www links, /contact, /silver*, /tax-resources, silverandpreciousmetals.com, /web-design/, /local-seo/)
- [x] Sitemap regenerated: +13 missing posts, -3 retired posts, -5 demos (488 URLs)

## 2. Stale GBP posts + demos
- [x] Worker 301s the 3 GBP posts to /blog/google-business-profile-setup/
- [x] Removed them from posts.json (404 → 401). Folders kept; deleting them needs Nick's ok
- [x] noindex on 5 demo pages; Plainsman Restaurant/AggregateRating schema removed

## 3. Mobile nav
- [x] One canonical menu served on all 496 topbar pages (src/site-nav.js, rewritten at the edge)
- [x] Hamburger at 1180px and below; dropdowns expand inline; Escape closes; legacy reserve hamburger hidden
- [x] Desktop stays on one row with Get Started
- [x] Header on mobile: ~310px → ~80px. No horizontal overflow on the tested pages (/process/ table wrapped, homepage decorative ring clipped)

## 4. Copy drafts
- [x] copy_drafts.md: homepage title/meta/badge/H1/lead, llms.txt fixes, /web-design/ and /local-seo/ drafts, author page. [NICK] items flagged inside

## Gates
- [x] npm run test:worker: 29/29 pass
- [x] Local wrangler dev: routes, redirects, icons and nav checked at 1440/1280/1024/390
- [ ] Push + deploy: waiting on Nick (non-content changes)
