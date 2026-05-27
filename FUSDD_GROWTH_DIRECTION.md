# FuSD Distribution — Growth Direction SOP
**Project:** fusddistribution.com + Fused Reserve  
**Version:** 1.0  
**Created:** 2026-05-27  
**Owner:** Nick / Fused Distribution  
**Review cadence:** Update at start of every monthly sprint

---

## How to Use This File

This is the master recall document for any AI session or project review. Load this file first. It tells you:

1. What the business is and what it sells
2. What has been built and what state it is in
3. What the current month's focus is
4. The standard monthly sprint procedure to follow

Always update the **Current Sprint** section at the start of each month. Always update **State Snapshot** when something significant ships or changes.

---

## Business Identity

**fusddistribution.com** runs two distinct revenue streams under one domain:

| Stream | What it is | Target customer |
|---|---|---|
| **Fused Reserve** | Physical silver subscription and on-demand sales. Monthly plans: Starter ($100/mo), Stacker ($250/mo), Collector Access ($500/mo) | First-time silver buyers, stackers, collectors |
| **Fused Technology Solutions** | Custom web development, digital infrastructure, e-commerce builds for small business and precious metals dealers | SMBs, coin/bullion dealers needing websites |

**Core positioning:** Two distinct offerings, one brand. Silver side = recurring revenue and physical product trust. Web side = high-ticket project revenue. Each audience is different. They share the domain but must have separate conversion paths.

**Key files:**
- Brand brief: `fused-reserve-brand-brief.md`
- Silver SOP: `fused-reserve-sop.md`
- Reserve page: `reserve/index.html`
- Site root: `/Users/nick/Documents/New project/`
- GitHub: `https://github.com/thatguyheis/Fuseddistribution.git`
- Deploy: git push to origin → live

**Writing rules:** No em-dashes. No hyphenated words. No AI buzzwords. Plain first-person tone.

---

## State Snapshot

Update this table when something ships or changes.

| Item | Status | Notes |
|---|---|---|
| fusddistribution.com domain | Live | Confirm DNS + SSL active |
| Reserve page | Live | `reserve/index.html` |
| Google Analytics 4 | Not installed | Priority: Month 1 |
| Google Search Console | Not installed | Priority: Month 1 |
| Microsoft Clarity | Not installed | Priority: Month 1 |
| Google Business Profile | Not created | Priority: Month 1 |
| Email list (silver) | Starting | Free shipping on first order incentive |
| Email list (web) | Not started | Free 15-min consultation incentive |
| Homepage two-door layout | Not built | Visitors can't self-segment |
| Blog content | Started | Needs buyer-intent keyword targeting |
| Social media / Reels | Active | Driving ~100 visits/day |
| Traffic source data | Unknown | Cannot analyze until GA4 installed |
| Schema / JSON-LD | Not deployed | Priority: Month 1 |
| Backlinks | 0 known | Priority: Month 2 |
| First paying customer | 0 | Primary goal |

---

## The Two-Door Architecture (Core UX Rule)

Homepage must segment visitors within 3 seconds. Two clear paths:

```
[ I need a website built ]       [ I want to buy silver ]
  → /services landing page          → /reserve or shop page
```

Each path has its own:
- Value proposition headline
- Trust signals specific to that audience
- Primary CTA (consultation booking vs. free shipping signup)
- Email capture segmented by interest tag

**Never send both audiences to the same CTA.**

---

## Analytics Stack (Install in This Order)

### 1. Google Search Console — free
Shows organic search queries, page rankings, indexing errors.
- Setup: https://search.google.com/search-console
- Choose "URL prefix" → enter full domain with https://
- Verify via HTML tag in `<head>` or DNS record
- Submit sitemap at `fusddistribution.com/sitemap.xml`

### 2. Google Analytics 4 — free
Shows all traffic sources, page behavior, conversion events.
- Setup: https://analytics.google.com
- Create property → web data stream → copy Measurement ID (G-XXXXXXXX)
- Add `gtag.js` snippet to `<head>` of every page
- Link Search Console: Admin → Search Console Links
- Key events to mark as conversions: contact form submit, email signup, consultation booking

### 3. Microsoft Clarity — free, unlimited
Heatmaps and session recordings. Shows exactly where users click, scroll, rage-click, and leave.
- Setup: https://clarity.microsoft.com
- Add tracking snippet to `<head>`
- After 48 hours: watch 5 session recordings — you will see the drop-off point immediately
- Use over Hotjar until traffic exceeds 10,000 sessions/month

### 4. UTM Tags for All Social Links
Every reel, post, or bio link must carry UTM parameters so GA4 can attribute social traffic:
```
https://fusddistribution.com/?utm_source=instagram&utm_medium=reel&utm_campaign=silver_launch
```
Build tags free at: https://ga-dev-tools.google/campaign-url-builder/

### Weekly Analytics Checks (15 minutes)
1. Search Console → Performance → filter last 7 days → any new queries gaining impressions?
2. GA4 → Acquisition → Traffic Acquisition → what is top source this week?
3. GA4 → Engagement → Landing Page → which page has highest bounce?
4. Clarity → watch 3 new session recordings

---

## Conversion Targets

| Page type | Target conversion rate |
|---|---|
| Homepage → path selection click | 40%+ |
| Silver landing page → email signup | 5–8% |
| Web services page → consultation booking | 3%+ |
| Focused single-CTA landing page | 8–10% |

**Current baseline:** approximately 0.03% (1 contact from ~3,000 monthly visits).  
Gap is almost certainly UX confusion, not traffic quality. Fix conversion before scaling traffic.

**Mobile rule:** 70%+ of traffic is likely mobile. CTA must be reachable in 3 taps. Test on a real phone before marking any page complete.

---

## Email List Procedures

**Tool:** Mailchimp (free to 500 contacts) or Kit / ConvertKit (free to 10,000 contacts)

**Segment at signup — never merge lists:**

| Tag | Trigger | Audience |
|---|---|---|
| `silver-buyer` | Free shipping signup | Precious metals customers |
| `web-prospect` | Consultation CTA | Potential web clients |

**Silver email sequence:**
1. Welcome → free shipping code delivery
2. Day 3 → what makes Fused Reserve sourcing different (trust build)
3. Day 7 → social proof / first subscriber story
4. Day 14 → spot price alert or new inventory drop
5. Monthly → cycle update, what was sourced, subscriber content

**Web prospect sequence:**
1. Confirm consultation booking → what to prepare
2. After call → written recap + proposal link within 24 hours
3. Day 5 no reply → single follow-up: "Any questions before I send the proposal?"
4. Day 10 no reply → close loop: "Happy to revisit when the timing is right"

---

## SEO and Content Procedures

**Timeline reality:** Initial ranking movement at 3–6 months. Meaningful traffic growth at 6–12 months. Reliable lead generation at 12–24 months. Content published now compounds over time — start immediately.

### Silver side — target buyer-intent searches

| Keyword | Intent |
|---|---|
| buy silver online safe | Transactional |
| best way to buy silver bullion small amounts | Transactional |
| silver dealer free shipping | Transactional |
| silver subscription service | Commercial |
| junk silver coins buy online | Transactional |

### Web side — target commercial searches

| Keyword | Intent |
|---|---|
| precious metals website builder | Commercial |
| silver dealer ecommerce platform | Commercial |
| how to sell silver online website | Commercial |
| website design for coin dealers | Commercial |

### Content rules
- Every blog post targets one primary keyword
- Every post ends with a CTA matching its audience (silver post → free shipping signup, web post → consultation booking)
- Posts use clear H1/H2/H3 hierarchy — no walls of text
- Internal links: each post links to at least one other relevant page on the site

### Monthly backlink targets
- Minimum: 5 new referring domains per month
- Priority channels: coin blogs, financial independence communities, local business directories, chamber of commerce
- Track: if rate is flat or negative for 3 months, link-building strategy needs revision

---

## Schema / JSON-LD (Deploy Month 1)

Add to homepage `<head>`:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://fusddistribution.com/#organization",
      "name": "Fused Distribution",
      "url": "https://fusddistribution.com",
      "description": "Physical silver subscription service and custom web development for small business and precious metals dealers.",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "sales",
        "areaServed": "US",
        "availableLanguage": "en"
      }
    },
    {
      "@type": "Service",
      "name": "Precious Metals E-Commerce and Secure Digital Infrastructure",
      "provider": {
        "@id": "https://fusddistribution.com/#organization"
      },
      "serviceType": "Custom Web Development and API Integration",
      "areaServed": "Worldwide",
      "description": "High-security custom web and e-commerce development with live spot price feeds, ACH payment structures, and high-value logistics insurance."
    }
  ]
}
```

Add Product schema to each silver listing. Add Service schema to web services page.

---

## AI and Automation Toolkit

| Task | Tool | Cost |
|---|---|---|
| Keyword research and clustering | Google Keyword Planner + ChatGPT/Claude | Free |
| Technical SEO audit (up to 500 URLs) | Screaming Frog | Free tier |
| Rank tracking | Google Search Console | Free |
| Heatmaps and session recordings | Microsoft Clarity | Free |
| Email automation | Mailchimp or Kit | Free tier |
| Spot price automation | Metals-API (JSON endpoint) | Free tier |
| Buy window alerts | OpenClaw + script → phone notification | Existing setup |
| Content drafting | Claude Code | Existing |
| Site performance audit | PageSpeed Insights | Free |
| Schema validation | Google Rich Results Test | Free |
| UTM link builder | Google Campaign URL Builder | Free |

**AI augmentation rules:**
- Use AI to draft, cluster keywords, and analyze data
- All public-facing copy requires human review and edit before publish
- Do not publish AI-generated content unreviewed — E-E-A-T compliance requires demonstrated human expertise and experience
- AI speeds research; humans establish brand voice and trust

Reference: [AI SEO Automation Guide 2026](https://www.orangemantra.com/blog/seo-automation-guide/) | [Automated SEO Tools](https://www.trysight.ai/blog/automated-seo-tools)

---

## Monthly Sprint Framework

Each month follows this structure. Update **Current Sprint** section with the month's specific tasks.

### Sprint Week Breakdown

**Week 1 — Measure and Diagnose**
- Pull GA4 traffic report: top sources, top landing pages, engagement rate
- Pull Search Console: queries gaining impressions, any coverage errors
- Watch 5 Clarity session recordings — note drop-off points
- Review email list growth: new subscribers, open rates, unsubscribes
- Review conversion events: how many consultations booked, how many silver signups
- Write a 5-bullet monthly diagnosis before touching anything

**Week 2 — Fix Highest-Leverage Problem**
- Address the single biggest drop-off or conversion gap identified in Week 1
- One focused fix only — do not multi-task improvements
- Deploy and validate the fix (check PageSpeed, check mobile, check CTA visibility)

**Week 3 — Content and Acquisition**
- Publish 1–2 blog posts targeting buyer-intent keywords for current month's focus
- Publish reels / social content referencing the blog (drives social → site traffic loop)
- Outreach to 3–5 niche directories or blogs for backlink placement
- Check backlink count in Search Console → Links report

**Week 4 — Review and Plan Next Sprint**
- Measure: did the Week 2 fix move the conversion metric?
- Document what worked and what did not in the State Snapshot above
- Set next month's single highest-leverage priority
- Update this file with new state

### Monthly KPI Scorecard

Track these numbers every month end:

| KPI | Target | Actual |
|---|---|---|
| Monthly visits | +10% MoM | |
| Email signups (silver) | +20 per month | |
| Consultation bookings (web) | 2+ per month | |
| Silver subscribers | +1 per month | |
| Web projects closed | 1 per quarter (check quarterly) | |
| Avg session duration | >2 minutes | |
| New referring domains | 5+ | |
| Top organic keyword position | Track top 5 | |

---

## Current Sprint

**Month:** May–June 2026  
**Focus:** Infrastructure and first conversion

**This month's priority tasks:**

- [ ] Install Google Analytics 4 on all pages
- [ ] Install Google Search Console, submit sitemap
- [ ] Install Microsoft Clarity
- [ ] Build homepage two-door layout (web path / silver path)
- [ ] Create Google Business Profile
- [ ] Set up email list with two segments (silver-buyer, web-prospect)
- [ ] Deploy JSON-LD Organization schema on homepage
- [ ] Run PageSpeed Insights — fix any LCP over 2.5 seconds
- [ ] Add UTM parameters to all social bio links and reel links
- [ ] Write and publish one buyer-intent blog post (silver side)
- [ ] Write and publish one commercial-intent blog post (web side)

**Success criteria for this sprint:**  
GA4 showing traffic source data. Homepage has two clear paths. Email list has first 10 subscribers. At least one consultation booked or silver subscriber acquired.

---

## Competitive Landscape Summary

| Competitor | Gap they leave open |
|---|---|
| Gomega AI | No real brand strategy; automated content risks quality penalties; locks clients in |
| B12 | No e-commerce or precious metals capability |
| Durable | Too simple for B2B or transactional e-commerce |
| AmeriCommerce | High complexity; potential integration partner for dealer clients |
| APMEX / JM Bullion | Impersonal; no subscription flexibility; high premiums |

**Uncontested position:** High-trust local silver sourcing with subscription flexibility + custom web development for precious metals and SMB clients. No direct competitor occupies both.

---

## Key Reference Links

- [GA4 Small Business Setup Guide](https://www.20minutemarketing.com.au/blog/google-analytics-4-small-business-setup-guide)
- [Search Console to GA4 Link Guide](https://analytify.io/link-google-search-console-to-google-analytics/)
- [Conversion Rate Benchmarks Small Business 2026](https://logoswebdesigns.com/blog/website-conversion-rate-benchmarks-small-business-2026/)
- [Microsoft Clarity vs Hotjar 2026](https://www.uxheat.com/blog/hotjar-vs-clarity)
- [SEO Timeline Expectations Small Business](https://firstepbusiness.com/blog/seo-best-practices-for-a-small-business-2026-guide)
- [AI SEO Automation Guide](https://www.orangemantra.com/blog/seo-automation-guide/)
- [AI Project Management for Small Business 2026](https://blog.orangescrum.com/how-ai-is-transforming-project-management-for-small-businesses-in-2026/)
- [SEO Monthly Workflow Framework](https://monday.com/blog/marketing/seo-workflow/)
- [Conversion Optimization Guide 2026](https://www.luckyorange.com/blog/posts/conversion-rate-optimization-guide)
- [Automated SEO Tools 2026](https://www.trysight.ai/blog/automated-seo-tools)

---

## How to Start a New Session With This File

When starting a new Claude Code session on this project, say:

> "Load FUSDD_GROWTH_DIRECTION.md and tell me what the current sprint focus is and what still needs to be done."

Claude will read this file, orient to the current state, and pick up exactly where work left off without needing a full context re-explanation.
