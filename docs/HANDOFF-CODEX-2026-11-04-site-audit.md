# Codex handoff: site audit changes and follow ups (2026-11-04)

From: Claude, working with Nick. Nick approved every change listed here in chat on 2026-11-04.
Full audit: `docs/audits/2026-11-04-site-seo-audit/` (start with `NICK-TODO.md` and `ACTION-PLAN.md`).

## 0. What changed on main (so the pipeline doesn't undo it)

| Area | Where | Note |
|---|---|---|
| Shared primary nav | `src/site-nav.js`, `public/assets/site-nav.{css,js}` | The Worker replaces `.nav-pages` on every `header.topbar` page and adds a mobile menu button. **Edit the menu in `src/site-nav.js`, not in templates.** Template nav markup is overwritten at the edge. |
| Redirects | `src/redirects.js` | 301s for 3 retired Google Business posts, 13 weak silver posts, and the old `/Fused Technology Solutions/` page. Add future retirements here. |
| Blog archive | `src/blog-archive.js` | `/blog/` gets a server-rendered list of every post in `posts.json`, so crawlers that don't run JS can reach all of them. |
| Head tags | `src/worker.js` | Adds favicon and manifest links when a page has none. The CSP now allows Google Fonts. |
| Analytics | `src/worker.js` | GA4 uses Consent Mode v2. It always loads with storage denied, and grants `analytics_storage` only after the visitor clicks Accept. |
| Admin | `src/admin-gate.js` | `/admin/*` needs Basic auth against the `ADMIN_PASSWORD` Worker secret. With no secret set, it returns 404. |
| www | `src/worker.js` | `www.fuseddistribution.com` 301s to the apex. Nick is adding the www custom domain in the dashboard. |
| Removed posts | `public/blog/posts.json` | 3 GBP posts (folders deleted) and 13 silver posts (folders kept) removed. **Do not regenerate these topics.** Add the slugs to the topic blocklist / `topic-history`. |
| New pages | `public/web-design/`, `public/local-seo/` | Service pages, linked from the menu and `llms.txt`. |
| Copy | homepage, About, FAQ, Projects FAQ, Process, `llms.txt`, `projects.json` | New headline, client reviews, Vancouver/Portland/remote service area, 24 to 48 hour first draft, client owns the site, Warhammer sunset, demos labeled "Concept Build". |

Tests: `npm run test:worker` (36 pass).

## 1. Refresh the deployment baseline (urgent, do first)

The live site is built from `main` with `npx wrangler deploy`. `.workflow-state/deployment-baseline` is stale: it still has the old $299/$300 pricing on `/faq/` and `/projects/faq/`, the old `llms.txt`, an older `src/worker.js`, and none of today's changes. **Running `scripts/deploy-approved-blog.mjs` now would roll the live site back.**

After Nick's deploy of today's commits:
1. Rebuild the baseline from `main` (`public/`, `src/`, `wrangler.jsonc`) using your normal procedure. Keep any intentional holds, such as future dated or held posts.
2. Diff the baseline against `main` and against live (`curl ...?cb=$(date +%s)`) for `/`, `/pricing/`, `/faq/`, `/projects/faq/`, `/llms.txt`, `/blog/posts.json`.
3. Consider making `deploy-approved-blog.mjs` refuse to run when the baseline's `src/` or core pages differ from `main`, so this can't happen silently again.

## 2. Blog template: titles, author, brand (`public/blog/scripts/build-html.mjs`)

Nick approved these. The brand naming follows the recommendation in section 3. **Confirm with Nick before running the full rebuild if he hasn't said yes to section 3.**

- **Title suffix.** Today it is `${title} | Fused ${d.sub}`, and 351 of 392 titles run over 60 characters. Change it to `| Fused Reserve` for `brand: "silver"` and `| Fused` for tech, or drop the suffix when the title is already over 50 characters.
- **Author.** Change `"name": "Nick"` to `"name": "Nick Hughes"` and keep `url` as `/about/`. Make `knowsAbout` follow the brand: silver/coins posts get coins, precious metals and numismatics; tech posts get web design, local SEO, AI automation and video marketing.
- **Silver brand.** For `brand: "silver"`: change `sub` to `"Reserve"` so the logo reads FUSED / RESERVE, and add `"brand": {"@type": "Brand", "name": "Fused Reserve"}` to the BlogPosting. Keep `publisher` as the parent `#organization` (Fused Distribution).
- **Rebuild.** Rebuild every existing post and split commits under the 250 file hook limit. Don't change `datePublished`. Set `dateModified` to the rebuild date only if the body content changed.

## 3. Move silver posts under Fused Reserve

`docs/audits/2026-11-04-site-seo-audit/silver_posts_for_reserve_brand.txt` lists 172 live silver/investing posts. Each needs `brand: "silver"` in its `meta.json` and `posts.json` entry; today most entries have no brand. Then rebuild with the section 2 template. Coin history posts already use the silver brand.

## 4. Fix or retire the posts with no sources (Tier 2)

`docs/audits/2026-11-04-site-seo-audit/silver_tier2_no_sources.md` lists 134 live money-topic posts with no Sources section. These are weak for Google on financial topics. For each one, add primary sources through the existing claim map and fact check gate, or retire it with a 301 in `src/redirects.js`. Work shortest first. Report the count of fixed, retired and remaining posts to Nick.

## Delivery rules

These are code and template changes, so Nick approves each push and deploy. Deploy with `npx wrangler deploy` from the repo root, never from the stale baseline. Verify with cache-busted curls.
