# Pricing Realign + Pricing Page Upgrade (2026-11-02)

Status: design approved in chat by Nick 2026-11-02. Draft built on branch `pricing-realign-2026-11`. Not committed to main, not pushed, not deployed.

## Decisions (approved)

| Topic | Decision |
|---|---|
| Foundation | Unchanged: $99/mo, $1,000/yr |
| Standard | $499/mo, $4,990/yr (save $998). Now "Best Value" |
| Standard volume | 8 blog posts + 8 reels per month. Page states volume and price can grow |
| Features moved down to Standard | Managed newsletter, monthly AI brand images, 1 hour monthly 1:1, standard (generic) workflow setup for leads/notifications/follow ups, monthly results report |
| Expansion | From $999/mo, from $9,990/yr. CTA "Book a scoping call". Custom workflows, custom AI agents, 1:1 project management, staff training + written guides, higher volume up to daily, missed call text back, quarterly shoot, ad copy/landing pages/translation, competitor report. Setup included, subject to scope |
| Hosting | Hosted by Fused, or self hosted pipeline on client machine. Website stays on Cloudflare either way |
| Self hosted setup fee | $499 one time on monthly Standard, free with annual, included in Expansion subject to scope. May change as client count grows |
| Hardware note | Apple Silicon Mac with 32GB memory, or comparable PC with a modern GPU |
| Existing clients | Keep current rates. No page mention |
| Value adds (all approved) | Fact checked content, client approval window (48 hour auto approve), cloned voice reels, auto Google Business posts, review request automation, missed call text back (Expansion), plain English monthly report, client owns everything, charts in posts/reels, quarterly shoot (Expansion), staff guides (Expansion) |

## Page layout (option 1: cards + deep sections)

1. Hero (refreshed copy)
2. Billing toggle with animated price swap
3. Three cards; Standard featured with animated border; "Full feature list" details under Standard
4. Note strip (style rule fixes)
5. "How your content gets made": 9 step animated pipeline, live counts, sample reel player
6. Cost calculator (posts/reels sliders, separate vendor range vs Fused plan)
7. Hosted or self hosted panels
8. What Expansion can include (6 tiles)
9. Comparison table (new columns/rows)
10. FAQ (updated + 4 new)
11. CTA strip

Visual upgrades: nav wrap fix, Space Grotesk + JetBrains Mono, scroll reveal (reduced motion respected).

## Live counts

- Posts: runtime fetch of `/blog/posts.json` (array length).
- Reels: `public/data/pipeline-stats.json` from `scripts/build-pipeline-stats.mjs`. Fallback numbers in markup if fetch fails.
- Wiring the stats script into the daily pipeline is a separate non-content change; ask Nick first.

## Calculator ranges (sources in docs/pricing-realign-2026-11/research_raw.md)

- Managed website + hosting: $99 to $250/mo
- Blog post: $65 to $185 each (8 post packages at $500 to $1,500)
- Reel: $31 to $75 each (VidChops ~$31, freelancers up to $75)
- AI chat assistant: $30 to $100/mo
- Plan pick: up to 8 posts and 8 reels = Standard; above = Expansion from $999

## Other pages to align (phase after pricing page approval)

Homepage, /faq/ (+ JSON-LD), /projects/faq/, /process/, /about/, llms.txt. Fix style rule violations on edited pages.

## Copy rules

No em dashes, no hyphenated compound words in visible copy, no buzzword list (see memory feedback_writing_style). Plain first person.

## Ship gate

Local preview + screenshots to Nick. Commit/push/deploy only after explicit approval. Pricing is non-content, so standing push permission does not apply.
