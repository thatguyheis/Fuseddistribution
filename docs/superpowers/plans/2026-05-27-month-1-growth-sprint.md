# Month 1 Growth Sprint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install analytics, fix homepage conversion path, add email capture, and publish two buyer-intent content pieces — completing all Month 1 sprint items in `FUSDD_GROWTH_DIRECTION.md`.

**Architecture:** Static HTML site deployed via git push to Cloudflare Pages. No build system for HTML pages — analytics and schema changes are applied via a Node.js injection script that modifies all HTML files in place. New blog posts follow the existing `blog/<slug>/index.html` pattern. Email capture uses Mailchimp embed code dropped into existing page HTML.

**Tech Stack:** Static HTML/CSS, Node.js (ESM scripts), Cloudflare Pages, Mailchimp (free tier), Google Analytics 4, Microsoft Clarity, Google Search Console

**Reference:** `FUSDD_GROWTH_DIRECTION.md` — the source spec for all tasks in this plan.

---

## Prerequisites — External Service Setup

Complete these before running any tasks. Each takes 5–10 minutes.

### P1: Create Google Analytics 4 Property

1. Go to https://analytics.google.com → click "Start measuring"
2. Account name: `Fused Distribution`
3. Property name: `fuseddistribution.com`
4. Reporting timezone: your local timezone. Currency: USD.
5. Business details: Small business, Other
6. Click "Create" → accept terms
7. Choose "Web" data stream → enter URL `https://fuseddistribution.com` → stream name `Fused Distribution Web`
8. Copy the **Measurement ID** — format is `G-XXXXXXXXXX`
9. Save it — you will enter it in Task 1.

### P2: Create Microsoft Clarity Project

1. Go to https://clarity.microsoft.com → Sign in with Microsoft account
2. Click "New project" → name: `fusddistribution.com` → URL: `https://fuseddistribution.com`
3. Click "Create" — you land on the Setup page
4. Copy the **Project ID** — format is a 10-character alphanumeric string (e.g., `abc1234xyz`)
5. Save it — you will enter it in Task 1.

### P3: Create Google Search Console Property

1. Go to https://search.google.com/search-console → "Start Now"
2. Choose "URL prefix" → enter `https://fuseddistribution.com`
3. Copy the **HTML meta tag** verification string — it looks like:
   `<meta name="google-site-verification" content="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />`
4. Save the full tag — you will add it in Task 2.

### P4: Create Mailchimp Account and Audience

1. Go to https://mailchimp.com → sign up free
2. Create Audience named `Fused Distribution`
3. Go to Audience → Manage Contacts → Tags → create two tags: `silver-buyer` and `web-prospect`
4. Go to Audience → Signup forms → Embedded forms
5. Create a minimal form with fields: Email (required), First Name (optional)
6. Copy the embed HTML code — you will paste it in Task 5.

---

## Task 1: Analytics Injection Script

**Files:**
- Create: `scripts/inject-analytics.mjs`

This script injects GA4 and Clarity tracking into every `index.html` file in the project in one pass. Run once, commit all changes.

- [ ] **Step 1: Confirm your IDs from prerequisites**

You need:
- GA4 Measurement ID: `G-XXXXXXXXXX` (from P1 above)
- Clarity Project ID: `abc1234xyz` (from P2 above)

- [ ] **Step 2: Create the injection script**

Create `/Users/nick/Documents/New project/scripts/inject-analytics.mjs` with the following content — replace `G-XXXXXXXXXX` and `YOUR_CLARITY_ID` with your actual IDs:

```javascript
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const GA4_ID = 'G-XXXXXXXXXX'; // Replace with your actual Measurement ID
const CLARITY_ID = 'YOUR_CLARITY_ID'; // Replace with your actual Clarity Project ID

const GA4_SNIPPET = `    <!-- Google Analytics 4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA4_ID}');
    </script>`;

const CLARITY_SNIPPET = `    <!-- Microsoft Clarity -->
    <script type="text/javascript">
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_ID}");
    </script>`;

const INJECTION_MARKER = '<!-- analytics-injected -->';

// Find all index.html files, skip node_modules and cloudflare-upload (client files)
const files = execSync(
  `find "${ROOT}" -name "index.html" -not -path "*/node_modules/*" -not -path "*/cloudflare-upload/*"`,
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

let injected = 0;
let skipped = 0;

for (const file of files) {
  const content = readFileSync(file, 'utf8');

  if (content.includes(INJECTION_MARKER)) {
    skipped++;
    continue;
  }

  if (!content.includes('</head>')) {
    console.warn(`SKIP (no </head>): ${file}`);
    skipped++;
    continue;
  }

  const updated = content.replace(
    '</head>',
    `${GA4_SNIPPET}\n${CLARITY_SNIPPET}\n    ${INJECTION_MARKER}\n  </head>`
  );

  writeFileSync(file, updated, 'utf8');
  injected++;
  console.log(`INJECTED: ${file.replace(ROOT, '.')}`);
}

console.log(`\nDone. Injected: ${injected} files. Skipped: ${skipped} files.`);
```

- [ ] **Step 3: Run the script**

```bash
cd "/Users/nick/Documents/New project"
node scripts/inject-analytics.mjs
```

Expected output: Lines beginning with `INJECTED:` for each modified file, then a summary line like `Done. Injected: 45 files. Skipped: 0 files.`

- [ ] **Step 4: Spot-check two files**

Open `index.html` and `reserve/index.html` in a text editor. Confirm both have the GA4 `<script async src="https://www.googletagmanager.com/gtag/...">` and Clarity `clarity("script", ...)` snippets just before `</head>`.

- [ ] **Step 5: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add scripts/inject-analytics.mjs
git add $(find . -name "index.html" -not -path "*/node_modules/*" -not -path "*/cloudflare-upload/*")
git commit -m "feat: inject GA4 and Clarity analytics into all pages"
```

---

## Task 2: Search Console Verification

**Files:**
- Modify: `index.html` (add one meta tag to `<head>`)

- [ ] **Step 1: Add the verification meta tag**

Open `index.html`. Find this line near the top of `<head>`:
```html
    <meta name="author" content="Fused Distribution" />
```

Add the Search Console verification tag directly after it (use your actual tag from P3):
```html
    <meta name="author" content="Fused Distribution" />
    <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE_HERE" />
```

- [ ] **Step 2: Commit and deploy**

```bash
cd "/Users/nick/Documents/New project"
git add index.html
git commit -m "feat: add Google Search Console verification meta tag"
git push
```

- [ ] **Step 3: Verify in Search Console**

1. Wait 2–3 minutes for Cloudflare to deploy (check https://fuseddistribution.com — the meta tag should appear in page source)
2. Go back to https://search.google.com/search-console
3. Click "Verify" on your property
4. Expected: "Ownership verified" confirmation

- [ ] **Step 4: Submit sitemap**

In Search Console: Sitemaps → enter `sitemap.xml` → click Submit.
Expected: Status changes to "Success" within a few minutes.

- [ ] **Step 5: Link Search Console to GA4**

In GA4: Admin (gear icon) → Property column → Search Console Links → Link → select your Search Console property → confirm.

---

## Task 3: Homepage Two-Door CTA

**Files:**
- Modify: `index.html` lines ~1129–1132 (hero-actions div)

The current hero has two generic buttons: "See Pricing" and "Explore Divisions." Replace with two distinct paths that segment visitors immediately.

- [ ] **Step 1: Find the hero-actions block**

Open `index.html`. Find this block (around line 1129):
```html
              <div class="hero-actions">
                <a class="btn btn-primary" href="/pricing/">See Pricing. Starts at $99/mo</a>
                <a class="btn btn-secondary" href="#divisions">Explore Divisions</a>
              </div>
```

- [ ] **Step 2: Replace with two-door layout**

Replace that block with:
```html
              <div class="hero-actions">
                <a class="btn btn-primary" href="/projects/">I Need a Website Built</a>
                <a class="btn btn-silver" href="/reserve/">I Want to Buy Silver</a>
              </div>
              <p class="hero-subtext">Two ways to work with Fused. Pick yours.</p>
```

- [ ] **Step 3: Add the btn-silver style**

In `index.html`, find the `.btn-secondary` CSS rule. Add this new rule directly after it:

```css
      .btn-silver {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 14px 28px;
        border-radius: 14px;
        font-weight: 700;
        font-size: 1rem;
        letter-spacing: 0.04em;
        cursor: pointer;
        transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
        border: 1px solid rgba(193, 192, 192, 0.45);
        background: rgba(180, 180, 180, 0.1);
        color: #d8d8d8;
        box-shadow: 0 0 18px rgba(200, 200, 200, 0.1);
      }

      .btn-silver:hover {
        background: rgba(200, 200, 200, 0.18);
        box-shadow: 0 0 28px rgba(200, 200, 200, 0.22);
        transform: translateY(-1px);
      }

      .hero-subtext {
        margin: 10px 0 0;
        font-size: 0.82rem;
        color: rgba(183, 212, 217, 0.55);
        letter-spacing: 0.08em;
      }
```

- [ ] **Step 4: Test on mobile**

Open `index.html` in a browser. Open DevTools → toggle mobile view (iPhone 14 or similar, 390px wide). Confirm:
- Both buttons are visible without scrolling
- Both buttons are finger-tap sized (at least 44px tall)
- "Two ways to work with Fused. Pick yours." text is readable

- [ ] **Step 5: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add index.html
git commit -m "feat: replace hero CTA with two-door layout for web vs silver paths"
git push
```

---

## Task 4: Projects Page Consultation CTA

**Files:**
- Modify: `projects/index.html` (inspect and add consultation CTA above fold)

- [ ] **Step 1: Read the current projects page top content**

Open `projects/index.html`. Find the hero or first content section. Check whether a free consultation offer exists above the fold (visible without scrolling on desktop and mobile).

- [ ] **Step 2: Add consultation CTA block**

Find the first `<section>` or hero block in `projects/index.html`. Immediately after the opening `<section>` tag (or equivalent container), add:

```html
        <div class="consult-banner">
          <p>Free 15-minute consultation. See your site before you pay anything.</p>
          <a class="btn btn-primary" href="#contact">Book a Free Call</a>
        </div>
```

- [ ] **Step 3: Add the consult-banner style**

In the `<style>` block of `projects/index.html`, add:

```css
      .consult-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 18px 28px;
        margin-bottom: 32px;
        border-radius: 16px;
        border: 1px solid rgba(97, 255, 215, 0.3);
        background: rgba(97, 255, 215, 0.07);
      }

      .consult-banner p {
        margin: 0;
        font-size: 1rem;
        color: rgba(239, 252, 255, 0.9);
        font-weight: 600;
      }

      @media (max-width: 600px) {
        .consult-banner {
          flex-direction: column;
          text-align: center;
        }
      }
```

- [ ] **Step 4: Verify mobile layout**

Open `projects/index.html` in browser. Toggle mobile view. Confirm the consultation banner is the first prominent thing visible after the nav.

- [ ] **Step 5: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add projects/index.html
git commit -m "feat: add above-fold free consultation CTA to projects page"
git push
```

---

## Task 5: Reserve Page Email Capture

**Files:**
- Modify: `reserve/index.html` (add email signup form with free shipping CTA)

- [ ] **Step 1: Get your Mailchimp embed code**

Complete prerequisite P4. From Mailchimp: Audience → Signup forms → Embedded forms → copy the form HTML. It will look similar to:

```html
<div id="mc_embed_signup">
  <form action="https://xxx.us14.list-manage.com/subscribe/post?u=XXXXX&amp;id=XXXXX" method="post" ...>
    <input type="email" name="EMAIL" placeholder="Your email" required>
    <input type="submit" value="Subscribe">
  </form>
</div>
```

- [ ] **Step 2: Find the reserve page hero or intro section**

Open `reserve/index.html`. Locate the first content section after the nav — the plan intro or subscription tiers section.

- [ ] **Step 3: Add email capture block above the plan tiers**

Insert this block immediately before the subscription plan cards (replace the Mailchimp form action URL with your actual URL from Step 1):

```html
        <div class="email-capture">
          <div class="email-capture-copy">
            <h2>Get Free Shipping on Your First Order</h2>
            <p>Join the list. We send you a free shipping code for your first silver order plus monthly sourcing updates when we find good deals.</p>
          </div>
          <div class="email-capture-form">
            <!-- Paste your Mailchimp embed form here -->
            <form action="https://YOUR_MAILCHIMP_URL_HERE/subscribe/post?u=XXXX&id=XXXX" method="post" class="silver-signup-form">
              <input type="email" name="EMAIL" placeholder="Your email address" required class="email-input" />
              <!-- hidden tag field for silver-buyer segment -->
              <input type="hidden" name="tags" value="YOUR_TAG_ID_HERE" />
              <input type="submit" value="Get Free Shipping" class="btn btn-primary" />
            </form>
          </div>
        </div>
```

- [ ] **Step 4: Add email-capture styles**

In the `<style>` block of `reserve/index.html`, add:

```css
      .email-capture {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 32px;
        align-items: center;
        padding: 36px 40px;
        margin-bottom: 40px;
        border-radius: 22px;
        border: 1px solid rgba(97, 255, 215, 0.25);
        background: rgba(97, 255, 215, 0.05);
      }

      .email-capture h2 {
        margin: 0 0 10px;
        font-size: 1.4rem;
        color: var(--text);
      }

      .email-capture p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .silver-signup-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .email-input {
        width: 100%;
        padding: 14px 16px;
        border-radius: 12px;
        border: 1px solid rgba(97, 255, 215, 0.3);
        background: rgba(7, 15, 23, 0.8);
        color: var(--text);
        font: inherit;
        font-size: 1rem;
      }

      .email-input::placeholder {
        color: rgba(183, 212, 217, 0.5);
      }

      @media (max-width: 700px) {
        .email-capture {
          grid-template-columns: 1fr;
          padding: 24px 20px;
        }
      }
```

- [ ] **Step 5: Test mobile form**

Open `reserve/index.html` in browser with mobile view. Confirm:
- Email form is visible without scrolling
- Input and button are full-width on mobile
- Button text "Get Free Shipping" is readable

- [ ] **Step 6: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add reserve/index.html
git commit -m "feat: add free shipping email capture form to reserve page"
git push
```

---

## Task 6: Add Product Schema to Reserve Page

**Files:**
- Modify: `reserve/index.html` (add JSON-LD schema in `<head>`)

The reserve page should have structured data so Google and LLMs understand it sells physical silver subscription products.

- [ ] **Step 1: Find the closing `</script>` of existing JSON-LD in reserve/index.html**

Open `reserve/index.html`. Locate the `<script type="application/ld+json">` block in `<head>`. Find where it ends (`</script>`).

- [ ] **Step 2: Add a second JSON-LD block immediately after the first**

Add this immediately after the closing `</script>` of the existing schema:

```html
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Fused Reserve Silver Subscription",
      "description": "Monthly silver subscription with physical delivery. Choose from junk silver, bullion rounds, silver dollars, numismatic coins, and world silver. Plans start at $100 per month.",
      "brand": {
        "@type": "Brand",
        "name": "Fused Reserve"
      },
      "url": "https://fuseddistribution.com/reserve/",
      "offers": [
        {
          "@type": "Offer",
          "name": "Starter",
          "price": "100.00",
          "priceCurrency": "USD",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "billingDuration": "P1M"
          },
          "availability": "https://schema.org/InStock",
          "url": "https://fuseddistribution.com/reserve/"
        },
        {
          "@type": "Offer",
          "name": "Stacker",
          "price": "250.00",
          "priceCurrency": "USD",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "billingDuration": "P1M"
          },
          "availability": "https://schema.org/InStock",
          "url": "https://fuseddistribution.com/reserve/"
        },
        {
          "@type": "Offer",
          "name": "Collector Access",
          "price": "500.00",
          "priceCurrency": "USD",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "billingDuration": "P1M"
          },
          "availability": "https://schema.org/InStock",
          "url": "https://fuseddistribution.com/reserve/"
        }
      ]
    }
    </script>
```

- [ ] **Step 3: Validate the schema**

1. Go to https://search.google.com/test/rich-results
2. Enter URL `https://fuseddistribution.com/reserve/` after deploying, OR paste the raw HTML into the "Code" tab
3. Expected: No errors. Product with 3 offers detected.

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add reserve/index.html
git commit -m "feat: add Product schema with subscription offers to reserve page"
git push
```

---

## Task 7: UTM Links Document

**Files:**
- Create: `UTM_LINKS.md` (reference doc for all UTM-tagged social links)

- [ ] **Step 1: Create the UTM links file**

Create `/Users/nick/Documents/New project/UTM_LINKS.md`:

```markdown
# UTM-Tagged Social Links

Update your bio links and post URLs to use these so GA4 can attribute social traffic.

## Bio Links (use in profile bio)

### Instagram bio link
```
https://fuseddistribution.com/?utm_source=instagram&utm_medium=social&utm_campaign=bio
```

### TikTok bio link
```
https://fuseddistribution.com/?utm_source=tiktok&utm_medium=social&utm_campaign=bio
```

### Facebook bio link
```
https://fuseddistribution.com/?utm_source=facebook&utm_medium=social&utm_campaign=bio
```

## Reel / Post Links

### Silver reel or post → reserve page
```
https://fuseddistribution.com/reserve/?utm_source=instagram&utm_medium=reel&utm_campaign=silver_content
```

### Web services reel or post → projects page
```
https://fuseddistribution.com/projects/?utm_source=instagram&utm_medium=reel&utm_campaign=web_content
```

### Blog post link shared in stories or posts
```
https://fuseddistribution.com/blog/<post-slug>/?utm_source=instagram&utm_medium=story&utm_campaign=blog_share
```
Replace `<post-slug>` with the actual post folder name.

## How to Build New UTM Links

Use Google's free builder: https://ga-dev-tools.google/campaign-url-builder/

Parameter guide:
- utm_source: instagram / tiktok / facebook / twitter / youtube
- utm_medium: reel / story / social / bio / email
- utm_campaign: silver_content / web_content / blog_share / launch / bio
```

- [ ] **Step 2: Update your actual social bio links**

Go to each social platform and update the bio/website link to use the UTM-tagged version from above. Instagram: Edit profile → Website. TikTok: Edit profile → Website. Facebook: Edit page → Website.

- [ ] **Step 3: Commit the reference file**

```bash
cd "/Users/nick/Documents/New project"
git add UTM_LINKS.md
git commit -m "docs: add UTM-tagged social link reference"
```

---

## Task 8: PageSpeed Audit and Fix

**Files:**
- Modify: `index.html` (apply fixes identified by audit)

- [ ] **Step 1: Run PageSpeed Insights on homepage**

Go to https://pagespeed.web.dev/ → enter `https://fuseddistribution.com` → Analyze.

Record:
- Mobile LCP score (target: under 2.5s)
- Mobile Performance score (target: 90+)
- Top 3 "Opportunities" listed

- [ ] **Step 2: Run on reserve page**

Same tool, enter `https://fuseddistribution.com/reserve/`. Record same metrics.

- [ ] **Step 3: Fix the top opportunity**

PageSpeed will list specific opportunities. The most common fixes for static HTML sites:

**If "Eliminate render-blocking resources" appears:**
Add `defer` to any `<script>` tags in `<head>` that are not `type="application/ld+json"`:
```html
<!-- Before -->
<script src="/some-script.js"></script>
<!-- After -->
<script src="/some-script.js" defer></script>
```

**If "Serve images in next-gen formats" appears:**
Find `<img>` tags in `index.html`. Add `loading="lazy"` to any image not in the hero:
```html
<img src="/path/to/image.jpg" alt="description" loading="lazy" width="800" height="600" />
```
Always include explicit `width` and `height` to prevent CLS.

**If "Largest Contentful Paint element" is a `<img>`:**
Add `fetchpriority="high"` to the hero image specifically:
```html
<img src="/hero-image.jpg" alt="description" fetchpriority="high" width="1200" height="630" />
```

- [ ] **Step 4: Re-run PageSpeed after fix**

After committing and deploying changes, re-run PageSpeed. Confirm the specific opportunity you fixed no longer appears or has improved.

- [ ] **Step 5: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add index.html
git commit -m "perf: apply PageSpeed audit fixes to homepage"
git push
```

---

## Task 9: Silver Buyer-Intent Blog Post

**Files:**
- Create: `blog/how-to-buy-silver-online/index.html`
- Create: `blog/how-to-buy-silver-online/hero.svg` (copy from another post)

Target keyword: `how to buy silver online` (transactional intent, low competition)

- [ ] **Step 1: Copy an existing blog post as template**

```bash
cp -r "/Users/nick/Documents/New project/blog/silver-coins-rounds-bars" "/Users/nick/Documents/New project/blog/how-to-buy-silver-online"
```

- [ ] **Step 2: Update the meta section**

Open `blog/how-to-buy-silver-online/index.html`. Replace the `<head>` meta section with:

```html
    <title>How to Buy Silver Online Safely: A Practical Guide for First-Time Buyers | Fused Distribution</title>
    <meta name="description" content="Buying silver online is straightforward when you know what to check. This guide covers where to buy, how to verify dealers, what premiums to expect, and how to receive your order safely." />
    <meta property="og:type" content="article" />
    <meta property="article:published_time" content="2026-05-28T00:00:00Z" />
    <meta property="article:author" content="https://fuseddistribution.com/about/" />
    <meta property="og:url" content="https://fuseddistribution.com/blog/how-to-buy-silver-online/" />
    <meta property="og:title" content="How to Buy Silver Online Safely: A Practical Guide for First-Time Buyers" />
    <meta property="og:description" content="Buying silver online is straightforward when you know what to check. Covers trusted dealers, premiums, shipping, and safe checkout." />
    <link rel="canonical" href="https://fuseddistribution.com/blog/how-to-buy-silver-online/" />
```

- [ ] **Step 3: Update the JSON-LD schema**

Find the `<script type="application/ld+json">` block. Replace the content with:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "How to Buy Silver Online Safely: A Practical Guide for First-Time Buyers",
  "description": "Buying silver online is straightforward when you know what to check. This guide covers where to buy, how to verify dealers, what premiums to expect, and how to receive your order safely.",
  "url": "https://fuseddistribution.com/blog/how-to-buy-silver-online/",
  "datePublished": "2026-05-28",
  "dateModified": "2026-05-28",
  "author": {
    "@type": "Person",
    "name": "Nick",
    "url": "https://fuseddistribution.com/about/"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Fused Distribution",
    "url": "https://fuseddistribution.com"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://fuseddistribution.com/blog/how-to-buy-silver-online/"
  }
}
```

- [ ] **Step 4: Add inline-cta style**

In the `<style>` block of `blog/how-to-buy-silver-online/index.html`, find the existing link styles and add:

```css
      .inline-cta {
        color: var(--accent);
        font-weight: 700;
        border-bottom: 1px solid rgba(97, 255, 215, 0.4);
        padding-bottom: 1px;
        transition: border-color 0.2s;
      }
      .inline-cta:hover { border-color: var(--accent); }
```

- [ ] **Step 5: Write the article body**

Replace the article body content with the following structure. Write each section in plain, direct language. No em-dashes. No AI buzzwords. First-person where appropriate.

```html
        <article class="post-body">
          <h1>How to Buy Silver Online Safely: A Practical Guide for First-Time Buyers</h1>
          <p class="post-meta">Published May 28, 2026 · Fused Reserve</p>

          <p>Buying silver online is not complicated once you understand a few basics. The main things to get right are choosing a trustworthy seller, understanding what you are paying above spot price, and knowing what to expect when your package arrives. This guide covers all three.</p>

          <h2>Step 1: Choose What Form of Silver You Want</h2>
          <p>Silver comes in three main forms for online buyers: bullion rounds, silver bars, and coins. Rounds are the most affordable per ounce and easy to store. Bars offer the lowest premiums at larger weights. Coins from government mints (like American Eagles or Canadian Maple Leafs) carry higher premiums but are the easiest to resell later.</p>
          <p>If this is your first purchase, start with a few 1-ounce generic rounds. They are inexpensive, easy to verify, and let you learn the process without a large commitment.</p>

          <h2>Step 2: Know What You Are Paying Over Spot</h2>
          <p>Silver has a "spot price" — the current market price per ounce traded on commodity exchanges. Every physical product you buy will cost more than spot because the dealer needs to cover manufacturing, shipping, and a margin. That extra amount is called the premium.</p>
          <p>Reasonable premiums for online silver purchases in 2026:</p>
          <ul>
            <li>Generic 1 oz rounds: spot + $2 to $4 (roughly 7–13% over spot)</li>
            <li>Government mint coins (Eagles, Maples): spot + $4 to $8</li>
            <li>90% junk silver (pre-1965 US coins): spot + $0 to $3 per dollar face value</li>
            <li>10 oz bars: spot + $1.50 to $3 per ounce</li>
          </ul>
          <p>Anything well above these ranges means you are overpaying. Check live spot price at kitco.com before ordering.</p>

          <h2>Step 3: Verify the Dealer Before You Pay</h2>
          <p>Large national dealers like APMEX, JM Bullion, and SD Bullion are established and safe. For smaller dealers or subscription services, check these before you buy:</p>
          <ul>
            <li>Real business address and phone number — not just a contact form</li>
            <li>Clear return and authentication policy</li>
            <li>Verifiable customer reviews (not just on their own site)</li>
            <li>Transparent pricing tied to live spot price</li>
          </ul>

          <h2>Step 4: Understand Payment Methods and Fees</h2>
          <p>Most silver dealers charge lower prices if you pay by check or ACH bank transfer instead of credit card. Credit card purchases typically add 3–4% to the total. On a $500 order that is $15–20 extra. If the dealer offers ACH or check payment, use it.</p>

          <h2>Step 5: Know What to Expect on Delivery</h2>
          <p>Reputable dealers ship silver in padded mailers or small boxes with discreet packaging — no silver or coin imagery on the outside. Most ship with tracking and require a signature on orders over $500. Inspect your order when it arrives and photograph the package before opening if you plan to file any damage claims.</p>

          <h2>Where Fused Reserve Fits In</h2>
          <p>Fused Reserve is a subscription-based sourcing service. Instead of placing individual orders on a large dealer site, you set a monthly budget and we source the best available silver at the lowest premium we can find — using local coin shows, estate sales, and secondary-market channels that national dealers do not access. Starter plans begin at $100 per month with free shipping on your first order.</p>
          <p><a href="/reserve/" class="inline-cta">See how Fused Reserve works →</a></p>
        </article>
```

- [ ] **Step 6: Add the post to the blog index**

Open `blog/posts.json`. Add an entry for the new post following the existing format in that file.

- [ ] **Step 7: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add blog/how-to-buy-silver-online/
git add blog/posts.json
git commit -m "content: add buyer-intent post 'How to Buy Silver Online Safely'"
git push
```

---

## Task 10: Web Commercial-Intent Blog Post

**Files:**
- Create: `blog/website-design-for-coin-dealers/index.html`

Target keyword: `website design for coin dealers` (commercial intent, very low competition)

- [ ] **Step 1: Copy template**

```bash
cp -r "/Users/nick/Documents/New project/blog/silver-coins-rounds-bars" "/Users/nick/Documents/New project/blog/website-design-for-coin-dealers"
```

- [ ] **Step 2: Update the meta section**

Replace the `<head>` meta content:

```html
    <title>Website Design for Coin Dealers: What Your Site Needs to Build Trust and Convert Buyers | Fused Distribution</title>
    <meta name="description" content="Coin dealer websites fail when they look generic and lack trust signals. This guide covers the pages, features, and design elements your site needs to turn browsers into buyers." />
    <meta property="og:type" content="article" />
    <meta property="article:published_time" content="2026-05-29T00:00:00Z" />
    <meta property="article:author" content="https://fuseddistribution.com/about/" />
    <meta property="og:url" content="https://fuseddistribution.com/blog/website-design-for-coin-dealers/" />
    <meta property="og:title" content="Website Design for Coin Dealers: What Your Site Needs" />
    <meta property="og:description" content="What pages, features, and design elements a coin dealer website needs to build trust and convert buyers." />
    <link rel="canonical" href="https://fuseddistribution.com/blog/website-design-for-coin-dealers/" />
```

- [ ] **Step 3: Update the JSON-LD schema**

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Website Design for Coin Dealers: What Your Site Needs to Build Trust and Convert Buyers",
  "description": "Coin dealer websites fail when they look generic and lack trust signals. This guide covers the pages, features, and design elements your site needs to turn browsers into buyers.",
  "url": "https://fuseddistribution.com/blog/website-design-for-coin-dealers/",
  "datePublished": "2026-05-29",
  "dateModified": "2026-05-29",
  "author": {
    "@type": "Person",
    "name": "Nick",
    "url": "https://fuseddistribution.com/about/"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Fused Distribution",
    "url": "https://fuseddistribution.com"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://fuseddistribution.com/blog/website-design-for-coin-dealers/"
  }
}
```

- [ ] **Step 4: Add inline-cta style**

In the `<style>` block of `blog/website-design-for-coin-dealers/index.html`, add:

```css
      .inline-cta {
        color: var(--accent);
        font-weight: 700;
        border-bottom: 1px solid rgba(97, 255, 215, 0.4);
        padding-bottom: 1px;
        transition: border-color 0.2s;
      }
      .inline-cta:hover { border-color: var(--accent); }
```

- [ ] **Step 5: Write the article body**

```html
        <article class="post-body">
          <h1>Website Design for Coin Dealers: What Your Site Needs to Build Trust and Convert Buyers</h1>
          <p class="post-meta">Published May 29, 2026 · Fused Technology Solutions</p>

          <p>Most coin dealer websites share the same problem: they look like they were built ten years ago and updated once since. That design gap costs sales. A buyer who cannot tell whether your business is legitimate will not hand over $500 for a Morgan dollar. This guide covers what a working coin dealer site actually needs.</p>

          <h2>The Trust Problem in Precious Metals Retail</h2>
          <p>Coin and silver buyers are cautious. They are sending real money to receive physical assets through the mail. Your website has to resolve their doubt before they ever contact you. Generic templates and stock photos do not accomplish that. Specific trust signals do.</p>

          <h2>Pages Every Coin Dealer Site Must Have</h2>

          <h3>Homepage with clear inventory signal</h3>
          <p>Your homepage needs to tell visitors in one sentence what you sell and give them a reason to believe you have inventory worth buying. A live or recently-updated "what we have now" section outperforms a static product list because it signals an active business.</p>

          <h3>About page with a real person</h3>
          <p>A coin business run by a named person with a face photo converts at a higher rate than one with a generic "our team" page. Buyers are trusting a person, not a logo. Include how long you have been in the hobby or business, where you source inventory, and what makes your buying process different.</p>

          <h3>Secure checkout with low-friction payment</h3>
          <p>Credit card processing fees eat margin on high-ticket silver and gold sales. Offer ACH bank transfer or check payment options alongside card payments. A $2,000 coin purchase loses $60 to card fees — most serious buyers will use ACH if you make it easy. Explain the ACH process clearly on your checkout page.</p>

          <h3>Authentication and return policy</h3>
          <p>State your authentication process clearly. Do you use a Sigma Metalytics verifier? Do you test with acid? Say so. A clear return policy for authenticity disputes removes a major barrier for first-time buyers.</p>

          <h2>Features That Separate Working Sites from Broken Ones</h2>

          <h3>Live or regularly updated spot price reference</h3>
          <p>Show buyers the current silver or gold spot price near your product listings. This removes the "am I being ripped off" doubt and positions you as transparent. Even a simple line like "Spot price today: $31.40/oz — our rounds are spot + $2.50" builds more trust than a static price list.</p>

          <h3>Shipping and insurance details</h3>
          <p>High-value coin shipments should be insured. State your shipping carrier, insurance level, and whether signature confirmation is included. Buyers researching this on your site are buyers close to purchasing.</p>

          <h3>Mobile performance</h3>
          <p>At least 60% of browsing happens on phones. A slow or poorly-laid-out mobile site loses those visitors before they see a single product. If your site takes more than 3 seconds to load on a phone, you are losing sales.</p>

          <h2>What We Build at Fused Technology Solutions</h2>
          <p>We build custom websites for coin dealers and precious metals sellers — designed from scratch to match your inventory, your sourcing approach, and the customers you want to reach. Every site we build is yours outright. No subscription lock-in, no platform dependency.</p>
          <p>We offer a free 15-minute call to review your current site and tell you exactly what it needs. No pitch, no obligation.</p>
          <p><a href="/projects/" class="inline-cta">Book a free consultation →</a></p>
        </article>
```

- [ ] **Step 6: Add post to blog index**

Open `blog/posts.json`. Add an entry for `website-design-for-coin-dealers` following the existing format.

- [ ] **Step 7: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add blog/website-design-for-coin-dealers/
git add blog/posts.json
git commit -m "content: add commercial-intent post 'Website Design for Coin Dealers'"
git push
```

---

## Task 11: Google Business Profile (Manual)

This task cannot be done in code. It takes 10–15 minutes on the web.

- [ ] **Step 1: Create the profile**

1. Go to https://business.google.com → click "Manage now"
2. Sign in with the Google account you used for GA4 and Search Console
3. Business name: `Fused Distribution`
4. Business type: Online retail / Service business
5. Category: choose `E-commerce service` or `Website designer` — you can add a second category later
6. Add your service area (city or state you operate from)
7. Website: `https://fuseddistribution.com`
8. Phone: add your business phone

- [ ] **Step 2: Complete the profile**

After creating:
- Add business description (2–3 sentences, no em-dashes, plain language): "Fused Distribution runs two businesses from one base. We build custom websites for small businesses starting at $99 per month, and we run Fused Reserve, a physical silver subscription service with low premiums and free shipping on your first order."
- Add business hours
- Upload at least one photo (logo or site screenshot)

- [ ] **Step 3: Verify**

Google will send a postcard, call, or offer video verification depending on your account history. Complete verification to make the profile live on Google Maps and Search.

---

## Month 1 Sprint Completion Checklist

Run this at end of sprint to confirm all State Snapshot items are updated in `FUSDD_GROWTH_DIRECTION.md`.

- [ ] GA4 installed and receiving data (check Real-time report in GA4)
- [ ] Search Console verified and sitemap submitted
- [ ] Microsoft Clarity recording sessions
- [ ] Homepage has two-door CTA layout
- [ ] Projects page has consultation CTA above fold
- [ ] Reserve page has email capture form
- [ ] Mailchimp list has `silver-buyer` and `web-prospect` tags
- [ ] Product schema on reserve page validates in Rich Results Test
- [ ] UTM links added to all social bio links
- [ ] PageSpeed mobile score above 80 on homepage
- [ ] Two new blog posts published and appearing in blog index
- [ ] Google Business Profile created (verification may be pending)
- [ ] `FUSDD_GROWTH_DIRECTION.md` State Snapshot updated to reflect all completed items
- [ ] Month 2 focus set in `FUSDD_GROWTH_DIRECTION.md` Current Sprint section
