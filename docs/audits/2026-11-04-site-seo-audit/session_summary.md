# Session summary, 2026-11-04

## Done
- Researched SEO and AI search practice as of 11/2026 (`research_raw.md`).
- Audited the live site: 483 sitemap URLs crawled, 1,934 link targets checked, 16 pages x 2 viewports in Playwright (`FULL-AUDIT-REPORT.md`, `ACTION-PLAN.md`). Score 62/100.
- Fixes committed on `main`: e5e4541c, e38f5669, plus the archive/schema commit.
  - Worker: www to apex 301, retired GBP post 301s, orphan folder 301, CSP for Google Fonts, favicon injection, shared nav (src/site-nav.js), blog archive (src/blog-archive.js)
  - Assets: og-image, favicon set, manifest, shared nav CSS/JS
  - Content: 19 link fixes in 21 posts, 3 posts out of posts.json, 5 demos noindexed, Plainsman schema removed, ProfessionalService schema, privacy indexable, sitemap regenerated
- I briefly patched `.workflow-state/deployment-baseline`, then found it is stale (old $299 pricing on the FAQ pages) and is not what the live site is built from. I restored it exactly as I found it. Full site deploys go out with `npx wrangler deploy` from the repo root, and the dry run passes.
- Batch 3 (Nick's answers): homepage headline and reviews, /web-design/, /local-seo/, Warhammer sunset, Concept Build labels, ownership and 24 to 48 hour answers, full name, llms.txt.
- Wrote copy drafts for review (`copy_drafts.md`).

## Skipped / blocked
- `git push` and deploy (`npx wrangler deploy`) were blocked by the permission classifier. Nick runs them (`NICK-TODO.md` step 1).
- The www custom domain needs the Cloudflare dashboard (`NICK-TODO.md` step 2).
- Not done, waiting on decisions: /admin lock, Consent Mode v2, brand name, silver archive, fact check, deleting retired folders, blog title suffix and author name (Codex template).
- Not done, lower priority: photos page weight, image width/height, real dateModified.
- I kept your last name out of live schema until you confirm.

## Needs review
- `NICK-TODO.md` (start here), then `copy_drafts.md`.
- After the deploy: verify live with `?cb=`, re-run the crawl, then submit the sitemap in Search Console and Bing Webmaster Tools.
