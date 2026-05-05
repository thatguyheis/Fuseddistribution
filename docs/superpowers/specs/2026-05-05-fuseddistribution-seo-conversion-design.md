# fuseddistribution.com — SEO, AI Citations & Conversion Design

**Date:** 2026-05-05
**Scope:** SEO infrastructure, AI citation readiness, homepage conversion
**Target:** Nationwide online small businesses
**Repo:** https://github.com/thatguyheis/Fuseddistribution.git
**Deploy:** git push → live

---

## Goal

Make fuseddistribution.com easy to find on Google and AI answer engines (ChatGPT, Perplexity, Gemini, Claude), and convert visitors who land on the site into clients.

---

## Execution Order

1. robots.txt + sitemap.xml + llms.txt
2. /faq/ — FAQPage schema + AI-targeted questions
3. /pricing/ — Offer schema + comparison table + bottom FAQ
4. Homepage — hub cards, trust row, CTAs, phone, testimonials
5. /about/ — founder entity page (new file)

---

## Section 1: Crawl Infrastructure

### robots.txt
Replace current minimal file with:

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /.wrangler/

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

### sitemap.xml
Add missing high-intent URLs and update all lastmod dates:

| URL | Priority | lastmod |
|-----|----------|---------|
| / | 1.0 | 2026-05-05 |
| /pricing/ | 1.0 | 2026-05-05 |
| /process/ | 0.9 | 2026-05-05 |
| /projects/ | 0.8 | 2026-05-05 |
| /faq/ | 0.7 | 2026-05-05 |
| /reserve/ | 0.7 | 2026-05-05 |
| /education/ | 0.6 | 2026-05-05 |
| /about/ | 0.6 | 2026-05-05 |
| /privacy/ | 0.2 | 2026-05-05 |

### llms.txt
New file at domain root. ~40 lines covering:
- What Fused Distribution is (operator-led multi-division company)
- Division 1: Fused Technology Solutions — custom small-business websites, $99/mo, built before payment
- Division 2: Fused Reserve — silver subscription, low-premium bullion
- Division 3: Fused Education — books, coaching, training for operators
- Canonical service list with prices
- Contact info
- Key pages with one-line descriptions

---

## Section 2: /faq/ Page

### FAQPage JSON-LD
Wrap all existing Q&As in `FAQPage` schema. This is the #1 signal AI answer engines use to cite a page verbatim.

### New AI-targeted questions (5)
Add questions written to match how people ask AI engines:
1. "How much does a small business website cost?"
2. "Is Fused Technology Solutions better than Wix or Squarespace for a small business?"
3. "Do I have to pay before my website is built?"
4. "What's included in the $99/month website plan?"
5. "How long does it take to build a small business website?"

### Question grouping
Reorganize existing flat list into categories:
- Pricing
- Build Process
- Technical
- After Launch

---

## Section 3: /pricing/ Page

### Offer schema
Add `Offer` + `priceSpecification` JSON-LD for each plan (Foundation / Standard / Expansion or current plan names). This enables price cards in Google rich results and direct price quotes from AI engines.

### Comparison table
Add HTML table comparing Fused vs Wix vs Squarespace vs GoDaddy across: price, custom design, hosting, support, ownership. Schema: standard `<table>` markup — AI engines parse and cite these directly.

### Bottom FAQ accordion
5 questions with `FAQPage` schema:
1. "What if I want to cancel?"
2. "Can I upgrade my plan?"
3. "Do you build e-commerce sites?"
4. "What happens to my site if I stop paying?"
5. "Is there a setup fee?"

### Other changes
- "Total first-year cost" line under each plan (kills hidden-cost objection)
- Risk-reversal line near each CTA: "No charge until you approve the build."

---

## Section 4: Homepage Conversion

### Three-card division hub
Replace or supplement current hero with three cards:
- **Fused Technology Solutions** — "Custom websites from $99/mo. Built before you pay." → CTA: See Pricing
- **Fused Reserve** — "Silver subscriptions with direct sourcing." → CTA: Learn More
- **Fused Education** — "Books and coaching for operators." → CTA: Explore

### Trust row (above fold)
One horizontal row with 3–4 trust signals:
- "X websites built" (use actual number or conservative estimate)
- "Cloudflare-hosted — 99.9% uptime"
- "Built before you pay — guaranteed"
- Optional: "Serving small businesses nationwide"

### Hero CTA split
- Primary CTA: "See Pricing" → /pricing/
- Secondary CTA: "See It Built First" → /process/
- Remove or demote current form anchor as primary CTA

### Pricing anchor in hero
Add one line in hero copy: "From $99/mo — site fully built before you pay anything."

### Phone number
Add clickable `tel:` link in header and footer. Small-business owners call.

### Testimonials
Pull one quote snippet from each existing project page (Plainsman, Cascade) to homepage. If no real quotes exist, use a result statement: "Plainsman — new site live in 7 days."

---

## Section 5: /about/ Page (new file)

New page at `/about/index.html`.

### Content
- Founder name + short bio (2–3 sentences)
- Photo (or placeholder div if no photo yet)
- What Fused Distribution is and who it serves
- Same NAP (name, address if applicable, phone) as rest of site

### Schema
- `Person` schema for founder
- `Organization` schema linking back to fuseddistribution.com/#organization
- `foundingDate` if known

### Why this matters
AI entity graphs need named humans attached to organizations. Without an /about/ page, AI engines treat the brand as anonymous and deprioritize it in trust-sensitive queries.

---

## Success Metrics

After shipping, verify with:
1. Google Rich Results Test — run /faq/, /pricing/, /about/
2. Schema Markup Validator — validate all JSON-LD
3. Google Search Console — watch impressions on /pricing/ and /faq/ (should move within 2–4 weeks)
4. Query Perplexity/ChatGPT: "affordable small business website design" — log whether Fused appears
5. `curl https://fuseddistribution.com/llms.txt` — verify file exists and is correct

---

## Files Changed

| File | Change |
|------|--------|
| `/robots.txt` | Rewrite with AI-bot directives |
| `/sitemap.xml` | Add /pricing/, /faq/, /education/, /about/ |
| `/llms.txt` | New file |
| `/faq/index.html` | FAQPage schema + 5 new questions + grouping |
| `/pricing/index.html` | Offer schema + comparison table + bottom FAQ |
| `/index.html` | Hub cards + trust row + CTA split + phone + testimonials |
| `/about/index.html` | New file — founder entity page |
