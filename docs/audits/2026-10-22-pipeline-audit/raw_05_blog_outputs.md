# Raw: Blog outputs (subagent report, 2026-10-22)

Main session check: `/admin/` and `/admin/data.json` both return 200 live with no auth. data.json (1.3MB, generated 2026-08-26) holds internal ops scores, penalties, Buffer state. No email/token/key fields found.

## Consistency
| Source | Count |
|---|---|
| public/blog subdirs | 430 (426 post-like) |
| posts.json | 396 (no dup slugs, all have index.html) |
| sitemap /blog/ URLs | 391 |
| topic-history.md unique slugs | 287 |

- 30 dirs not in index: 29 empty (e.g. 1925-fort-vancouver-half-dollar-tells-a-local-history, silver-supply-deficit-explained-2026, how-to-speed-up-your-small-business-website, capital-gains-tax-on-silver-how-it-works, walking-liberty-half-dollar-design-history) + `zzz-skill-test/` whose ad-*.jpg/svg deploy publicly.
- 5 newest posts missing from sitemap (Oct 20-21: 1909-lincoln-cent..., columbian-exposition..., 2021-american-eagle..., carver-washington..., kennedy-half-dollar...).
- 109 indexed posts missing from topic-history -> 180-day no-repeat check blind to >25% of catalog.
- topic-history miscategorized (coin posts under Tech) and out of order; 7-day category rule broken (13 posts on 10-01, 12 on 10-04, 12 on 09-28).
- .workflow-blocked kept outside public (good).

## Duplicates / drift
- contact-page-best-practices committed 4 times (6/27, 9/3, 9/4, 9/5), rewritten in place; topic-history still says 6/27.
- Near-duplicate clusters: website speed (4), GBP setup (3 + pairs), Google reviews (4+), Instagram (3 + stories pair), online booking (3), repeat customers (3), word of mouth (3); silver storage (6), supply deficit (4), premiums (3), ETF vs physical (3), allocation (4), silver as money (5), inflation hedge (3), outlook 2026 (3), fake detection (3). Exact pairs: silver-to-gold-ratio, what-moves-silver-price, dollar-cost-averaging-silver, hunt-brothers, silver-tarnish, peace-dollar, fort-vancouver, walking-liberty.
- Slugs truncated at 55 chars (`...-forecas`, `...-collecti`, `...-reques`, `...-websit`).

Topic mix (396): silver/coins 214 (54%), local business/web 154 (39%), AI 28 (7%).
| Month | Silver | Local biz | AI | Total |
|---|---|---|---|---|
| Jun | 41 | 37 | 0 | 78 |
| Jul | 52 | 44 | 13 | 109 |
| Aug | 37 | 21 | 1 | 59 |
| Sep | 41 | 26 | 5 | 72 |
| Oct | 31 | 11 | 8 | 50 |

FUSDD_GROWTH_DIRECTION.md says 1-2 posts/month, buyer-intent keywords (silver subscription, coin dealer websites). Actual: 50-109/month, October mostly informational coin trivia, accessibility, AI governance. No silver subscription or coin-dealer-website posts. "Current Sprint" still May-June.

## Quality (all 396 by month)
| Month | Posts | Avg words | <1100 | Em-dashes | Banned words | Hyphenated | Has Sources |
|---|---|---|---|---|---|---|---|
| Apr | 7 | 939 | 4 | 3 | 2 | 16 | 3 |
| May | 21 | 1056 | 16 | 72 | 29 | 152 | 21 |
| Jun | 78 | 1474 | 14 | 86 | 123 | 762 | 30 |
| Jul | 109 | 1342 | 9 | 0 | 507 | 749 | 10 |
| Aug | 59 | 1414 | 3 | 0 | 451 | 357 | 0 |
| Sep | 72 | 1121 | 30 | 0 | 69 | 170 | 5 |
| Oct | 50 | 810 | 50 | 0 | 56 | 64 | 44 |

- Em-dashes: 161 across 31 posts, all Apr-Jun (gate works for new posts, old never fixed).
- Banned words 1237: significant 463, crucial 261, optimize 67, journey 63, vital 56, dynamic 55, navigate 52 ... (some "significant" legit).
- Hyphenated tokens 2270 (upper bound).
- Aug 0/59 posts with sources; Jul 10/109. Most uncited stats here (e.g. online-booking-system "20% increase... 15% boost", contact-page "61% of callers", "78% of customers").
- All 50 Oct posts under 1100 words (SOP floor, BLOG-SOP.md:127). Coin-history posts (1909-lincoln-cent, kennedy-half-dollar) have no external sources, against COIN-HISTORY-SOP.
- imageAlt truncated in 4 posts.

## Deploy leakage
public/.assetsignore misses ~554 files (~22.9MB): social-video.json (172), chart.json (136), chart-rejected.json (61), qa-preflight.json (55), artwork-qa.json (32), production/plan JSONs, blog/data/topic-pool.json, content-plan.example.json, public/admin/data.json, public/photos/scripts/*.mjs incl. Finder "* 2.mjs" copies, "* 2.json/csv/html", zzz-skill-test images.

## Last 30 days
71 posts 2026-09-22..10-21, heavily batch-dated (12-13 on 9/28, 10/1, 10/4). Full list in subagent output; see posts.json.
