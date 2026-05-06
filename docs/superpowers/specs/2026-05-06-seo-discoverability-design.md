# SEO Discoverability — Design Spec
**Date:** 2026-05-06
**Scope:** Track A — Search visibility for fuseddistribution.com

---

## Problem

Nine blog posts are live but invisible to search engines in practice:
- None are in sitemap.xml
- None have Article/BlogPosting structured data (no rich-result eligibility)
- All have `og:type: "website"` instead of `"article"`
- None link to relevant service pages (missed conversion paths)

Alt text: already complete — no action needed.
LocalBusiness schema: not applicable (national targeting confirmed).

---

## Scope

Five changes across sitemap, blog post HTML files, and nothing else.

---

## Changes

### 1. sitemap.xml — Add blog post URLs

Add all 9 blog posts under the existing entries:

| URL | lastmod | changefreq | priority |
|-----|---------|-----------|----------|
| /blog/ | 2026-05-06 | monthly | 0.8 |
| /blog/welcome-to-fused/ | 2026-04-18 | monthly | 0.7 |
| /blog/why-your-website-isnt-getting-customers/ | 2026-04-18 | monthly | 0.7 |
| /blog/dollar-cost-averaging-silver/ | 2026-04-21 | monthly | 0.7 |
| /blog/what-a-website-does-for-your-business/ | 2026-04-22 | monthly | 0.7 |
| /blog/what-a-website-is-worth/ | 2026-04-23 | monthly | 0.7 |
| /blog/what-is-junk-silver/ | 2026-04-25 | monthly | 0.7 |
| /blog/google-business-profile-setup/ | 2026-04-30 | monthly | 0.7 |
| /blog/silver-to-gold-ratio/ | 2026-05-01 | monthly | 0.7 |
| /blog/getting-google-reviews/ | 2026-05-04 | monthly | 0.7 |

### 2. BlogPosting schema — All 9 posts

Each post gets a JSON-LD block added to `<head>` (after existing meta, before `<style>`):

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "<page title minus site suffix>",
  "description": "<existing meta description content>",
  "url": "<canonical href>",
  "datePublished": "<existing datePublished from JSON-LD>",
  "dateModified": "<same as datePublished unless known otherwise>",
  "author": {
    "@type": "Person",
    "name": "Nick",
    "url": "https://fuseddistribution.com/about/"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Fused Distribution",
    "@id": "https://fuseddistribution.com/#organization",
    "logo": {
      "@type": "ImageObject",
      "url": "https://fuseddistribution.com/og-image.png"
    }
  },
  "image": "https://fuseddistribution.com/og-image.png",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "<canonical href>"
  }
}
```

Values sourced from existing meta tags on each page — nothing invented.

### 3. og:type — All 9 posts

Change `<meta property="og:type" content="website" />` to `"article"` on each post.

Add two new tags alongside:
```html
<meta property="article:published_time" content="<datePublished>T00:00:00Z" />
<meta property="article:author" content="https://fuseddistribution.com/about/" />
```

### 4. Internal CTAs — Per post

Each post gets a styled CTA block injected before `</main>`. Two variants:

**Tech CTA** (6 posts: welcome-to-fused, why-your-website-isnt-getting-customers, what-a-website-does-for-your-business, what-a-website-is-worth, google-business-profile-setup, getting-google-reviews):
```html
<div class="post-cta">
  <p>Fused Technology Solutions builds custom websites for local businesses. 
     You see the finished site before paying anything.</p>
  <a href="/pricing/">See Plans</a>
  <a href="/#contact">Get Started</a>
</div>
```

**Silver CTA** (3 posts: dollar-cost-averaging-silver, silver-to-gold-ratio, what-is-junk-silver):
```html
<div class="post-cta">
  <p>Fused Reserve is a monthly silver subscription with low-premium sourcing 
     and flexible shipping.</p>
  <a href="/reserve/">Learn More</a>
  <a href="/reserve/#join">Join Reserve</a>
</div>
```

Styling: matches existing `.cta-strip` pattern from other pages (dark panel, accent border, two buttons).

---

## What This Does Not Change

- No changes to page copy or headings
- No changes to existing JSON-LD blocks (additive only)
- No changes to worker.js or any other file outside blog posts and sitemap.xml
- No new dependencies

---

## Success Criteria

- All 9 blog posts appear in sitemap.xml
- Google Rich Results Test passes BlogPosting schema on each post
- og:type is "article" on all blog posts
- Each post links to the relevant service section
