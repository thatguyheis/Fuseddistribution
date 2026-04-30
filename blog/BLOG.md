# Blog Post Skill — Fused Distribution

Complete procedure for writing, building, and publishing a blog post at fuseddistribution.com/blog/.

---

## 1. Before You Start

Decide which site section the post belongs to. This controls the brand name, nav CTA, and article CTA:

| Post topic | Brand sub-line | Nav CTA | Article CTA target |
|---|---|---|---|
| Silver / investing / Reserve | `Distribution` | Reserve Silver → `/reserve/` | `/reserve/` |
| Websites / tech / local business | `Technology Solutions` | Get Started → `/#contact` | `/#contact` |

Posts must follow the writing style rules in section 8. Never use em dashes, filler buzzwords, or rhetorical question hooks.

---

## 2. Add to posts.json

Insert a new object at the **top** of the array (newest first):

```json
{
  "slug": "your-slug-here",
  "title": "Your Post Title",
  "date": "YYYY-MM-DD",
  "excerpt": "One or two sentences. Shown on the blog listing page. Under 160 characters.",
  "tags": ["Tag One", "Tag Two"],
  "author": "Fused Team"
}
```

- `slug` must match the folder name exactly
- Tags: Title Case, pick from existing ones or add new ones

---

## 3. Create the post folder and file

```
blog/
  [slug]/
    index.html
    hero.jpg          ← tech posts only (one Unsplash image)
    images/           ← silver posts only (multiple inline photos)
      photo-name.jpg
```

Copy the full HTML template from section 4 below. Do not copy from an existing post — the template here is the authoritative version.

---

## 4. Full HTML Template

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>[POST TITLE] | Fused [Distribution OR Technology Solutions]</title>
    <meta name="description" content="[SEO description, 140-160 chars]" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="https://fuseddistribution.com/blog/[slug]/" />
    <meta property="og:title" content="[POST TITLE]" />
    <meta property="og:description" content="[Short og description]" />
    <meta property="og:image" content="https://fuseddistribution.com/blog/[slug]/hero.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://fuseddistribution.com/blog/[slug]/hero.jpg" />
    <link rel="canonical" href="https://fuseddistribution.com/blog/[slug]/" />
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "[POST TITLE]",
      "datePublished": "YYYY-MM-DD",
      "author": { "@type": "Organization", "name": "Fused Team" },
      "publisher": { "@type": "Organization", "name": "Fused [Distribution OR Technology Solutions]", "url": "https://fuseddistribution.com/" },
      "url": "https://fuseddistribution.com/blog/[slug]/",
      "description": "[SEO description]"
    }
    </script>
    <style>
      /* ── PASTE THE FULL CSS BLOCK FROM SECTION 5 HERE ── */
    </style>
  </head>
  <body>
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="/">
          <span class="brand-mark">Fused</span>
          <span class="brand-sub">[Distribution OR Technology Solutions]</span>
        </a>
        <nav class="nav" aria-label="Primary">
          <div class="nav-pages">
            <a href="/">Home</a>

            <div class="nav-item" id="nav-tech">
              <button class="nav-toggle" aria-expanded="false" aria-controls="dropdown-tech">
                Technology Solutions <span class="nav-caret" aria-hidden="true">▾</span>
              </button>
              <div class="nav-dropdown" id="dropdown-tech" role="menu">
                <a href="/projects/" role="menuitem">Overview</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/process/" role="menuitem">How It Works</a>
                <a href="/pricing/" role="menuitem">Pricing</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/projects/faq/" role="menuitem">FAQ</a>
              </div>
            </div>

            <div class="nav-item" id="nav-reserve">
              <button class="nav-toggle" aria-expanded="false" aria-controls="dropdown-reserve">
                Silver Reserve <span class="nav-caret" aria-hidden="true">▾</span>
              </button>
              <div class="nav-dropdown" id="dropdown-reserve" role="menu">
                <a href="/reserve/" role="menuitem">Overview</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/reserve/#how-it-works" role="menuitem">How It Works</a>
                <a href="/reserve/#plans" role="menuitem">Plans</a>
                <a href="/reserve/#benefits" role="menuitem">Benefits</a>
                <a href="/reserve/#inventory" role="menuitem">Inventory</a>
                <a href="/reserve/#join" role="menuitem">Join</a>
                <div class="nav-dropdown-divider"></div>
                <a href="/reserve/faq/" role="menuitem">FAQ</a>
              </div>
            </div>

            <a href="/education/">Education</a>
            <a href="/blog/" class="active">Blog</a>
          </div>
          <div class="nav-actions">
            <!-- Silver post: -->
            <a class="nav-cta" href="/reserve/">Reserve Silver</a>
            <!-- Tech post: -->
            <!-- <a class="nav-cta" href="/#contact">Get Started</a> -->
          </div>
        </nav>
      </header>

      <main class="main">
        <div class="article-wrap">
          <a class="back-link" href="/blog/">&larr; Back to Blog</a>

          <div class="eyebrow">[Tag One] &middot; [Tag Two]</div>

          <h1>[POST TITLE]</h1>

          <div class="article-meta">
            <time datetime="YYYY-MM-DD">[Month D, YYYY]</time>
            <span class="pill">[Tag One]</span>
            <span class="pill">[Tag Two]</span>
          </div>

          <!-- HERO IMAGE (tech posts only) — insert between article-meta and article-divider -->
          <figure class="article-hero">
            <img src="hero.jpg" alt="[Descriptive alt text]" width="1200" height="630" />
            <figcaption>Photo by <a href="https://unsplash.com/@[handle]" target="_blank" rel="noreferrer">[Photographer Name]</a> on <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a></figcaption>
          </figure>

          <div class="article-divider"></div>

          <div class="article-body">

            <!-- BODY CONTENT GOES HERE — see section 6 for all component patterns -->

          </div>

          <!-- CTA BLOCK -->
          <div class="article-cta">
            <p>[One sentence inviting the reader to take action.]</p>
            <!-- Silver post: -->
            <a class="btn btn-primary" href="https://fuseddistribution.com/reserve/">See Fused Reserve Plans</a>
            <!-- Tech post: -->
            <!-- <a class="btn btn-primary" href="/#contact">Talk to Fused</a> -->
          </div>

        </div>
      </main>

      <footer class="footer">
        &copy; 2026 Fused [Distribution OR Technology Solutions]. All rights reserved.
        &nbsp;&middot;&nbsp;
        <a href="/privacy/" style="color:inherit;opacity:0.7;text-decoration:underline;">Privacy Policy</a>
      </footer>
    </div>
  </body>
</html>
```

---

## 5. Full CSS Block

Paste this entire `<style>` block into every new post. Do not modify it — post-specific styles (like `.coin-grid`, `.math-box`) are added at the bottom before the closing `</style>`.

```css
:root {
  --bg: #07131a;
  --panel: rgba(11, 24, 32, 0.82);
  --line: rgba(87, 219, 255, 0.16);
  --text: #ecf8fb;
  --muted: #afc6cf;
  --accent: #58d6ff;
  --accent-2: #4dffb8;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }

body {
  margin: 0;
  min-height: 100vh;
  color: var(--text);
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at 10% 12%, rgba(88, 214, 255, 0.12), transparent 24%),
    radial-gradient(circle at 84% 14%, rgba(77, 255, 184, 0.08), transparent 18%),
    linear-gradient(180deg, #041018 0%, #07131a 48%, #040b10 100%);
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  background:
    linear-gradient(120deg, rgba(88, 214, 255, 0.05), transparent 28%, transparent 68%, rgba(77, 255, 184, 0.05)),
    repeating-linear-gradient(90deg, transparent 0, transparent 94px, rgba(255, 255, 255, 0.02) 95px);
  pointer-events: none;
}

a { color: inherit; text-decoration: none; }

.shell {
  width: min(1220px, calc(100% - 32px));
  margin: 18px auto 40px;
  border-radius: 28px;
  overflow: visible;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: linear-gradient(180deg, rgba(7, 17, 23, 0.96), rgba(5, 12, 17, 0.98));
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.42);
  position: relative;
}

.shell::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 72% 18%, rgba(88, 214, 255, 0.1), transparent 18%),
    radial-gradient(circle at 26% 54%, rgba(77, 255, 184, 0.06), transparent 24%);
  pointer-events: none;
}

.topbar, .main, .footer { position: relative; z-index: 1; }

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 30px;
  background: rgba(7, 16, 22, 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.brand { display: flex; flex-direction: column; line-height: 1; }
.brand-mark {
  color: var(--accent);
  font-size: 1.95rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-shadow: 0 0 16px rgba(88, 214, 255, 0.3);
}
.brand-sub {
  margin-top: 4px;
  color: rgba(236, 248, 251, 0.72);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.nav { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.nav-pages, .nav-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.nav-pages {
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid rgba(88, 214, 255, 0.18);
  background: rgba(7, 15, 23, 0.56);
}
.nav a { font-size: 0.95rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.nav-pages a { padding: 9px 14px; border-radius: 999px; }
.nav a:hover, .nav a:focus-visible, .nav a.active { color: var(--accent); }
.nav-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 160px;
  padding: 12px 18px;
  border-radius: 14px;
  border: 1px solid rgba(88, 214, 255, 0.28);
  background: rgba(88, 214, 255, 0.08);
  color: var(--accent);
}

.main { padding: 52px 54px 60px; }

.article-wrap { max-width: 760px; margin: 0 auto; }

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 32px;
}
.back-link:hover { color: var(--accent); }

.eyebrow {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(88, 214, 255, 0.08);
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 18px 0 24px;
}

.article-meta time {
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pill {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(88, 214, 255, 0.18);
  background: rgba(88, 214, 255, 0.08);
  color: rgba(236, 248, 251, 0.88);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 4px;
  font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
  font-size: clamp(2.2rem, 5vw, 3.6rem);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.05;
}

/* Hero image (tech posts) */
.article-hero {
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  margin: 28px 0 0;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.article-hero img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 420px;
  object-fit: cover;
}
.article-hero figcaption {
  padding: 10px 14px;
  font-size: 0.78rem;
  color: rgba(175, 198, 207, 0.55);
  background: rgba(7, 15, 23, 0.6);
  letter-spacing: 0.04em;
}
.article-hero figcaption a { color: rgba(175, 198, 207, 0.55); text-decoration: underline; }

/* Inline article photos (silver posts) */
.article-photo {
  margin: 32px 0;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.article-photo img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 480px;
  object-fit: cover;
  object-position: center;
}
.article-photo figcaption {
  padding: 10px 16px;
  font-size: 0.78rem;
  color: rgba(175, 198, 207, 0.55);
  letter-spacing: 0.04em;
  background: rgba(7, 16, 22, 0.6);
}

.article-divider {
  height: 1px;
  background: rgba(88, 214, 255, 0.12);
  margin: 32px 0;
}

.article-body {
  color: var(--muted);
  font-size: 1.08rem;
  line-height: 1.82;
}

.article-body h2 {
  font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
  font-size: 1.55rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--text);
  margin: 40px 0 14px;
}

.article-body p { margin: 0 0 20px; }
.article-body ul { margin: 0 0 20px; padding-left: 20px; }
.article-body ul li { margin-bottom: 8px; }
.article-body strong { color: var(--text); }
.article-body a { color: var(--accent); text-decoration: underline; }

/* Charts */
.chart-wrap {
  background: rgba(7, 20, 28, 0.8);
  border: 1px solid rgba(88, 214, 255, 0.14);
  border-radius: 16px;
  padding: 28px 20px 18px;
  margin: 36px 0;
}
.chart-title {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  text-align: center;
  margin-bottom: 18px;
}
.chart-note {
  font-size: 0.72rem;
  color: rgba(175, 198, 207, 0.45);
  text-align: center;
  margin-top: 10px;
  letter-spacing: 0.04em;
}

/* Stat row */
.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 32px 0;
}
.stat-card {
  background: rgba(88, 214, 255, 0.04);
  border: 1px solid rgba(88, 214, 255, 0.14);
  border-radius: 14px;
  padding: 22px 18px;
  text-align: center;
}
.stat-card .stat-number {
  font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
  font-size: 2.4rem;
  letter-spacing: 0.03em;
  color: var(--accent);
  line-height: 1;
  margin-bottom: 8px;
}
.stat-card .stat-label { font-size: 0.82rem; color: var(--muted); line-height: 1.5; }

/* Sources */
.sources-block {
  margin-top: 48px;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgba(88, 214, 255, 0.1);
  background: rgba(7, 18, 26, 0.6);
}
.sources-block h3 {
  font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
  font-size: 1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 0 14px;
}
.sources-block ol {
  margin: 0;
  padding-left: 20px;
  color: rgba(175, 198, 207, 0.5);
  font-size: 0.78rem;
  line-height: 1.7;
}
.sources-block ol li { margin-bottom: 6px; }
.sources-block a { color: rgba(88, 214, 255, 0.6); text-decoration: underline; }

/* CTA */
.article-cta {
  margin-top: 48px;
  padding: 28px;
  border-radius: 22px;
  border: 1px solid rgba(88, 214, 255, 0.2);
  background: rgba(88, 214, 255, 0.05);
  text-align: center;
}
.article-cta p { margin: 0 0 18px; color: var(--muted); }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 22px;
  border-radius: 16px;
  border: 1px solid transparent;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.btn-primary {
  color: #041117;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 0 34px rgba(88, 214, 255, 0.18);
}

.footer {
  padding: 24px 28px 34px;
  color: rgba(175, 198, 207, 0.74);
  text-align: center;
  font-size: 0.92rem;
}

/* Dropdown navigation */
.nav-item { position: relative; }
.nav-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 9px 14px;
  border-radius: 999px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(239, 252, 255, 0.9);
  transition: color 0.15s;
}
.nav-toggle:hover,
.nav-toggle:focus-visible,
.nav-toggle.active,
.nav-item:hover .nav-toggle,
.nav-item:focus-within .nav-toggle { color: var(--accent); outline: none; }
.nav-caret { font-size: 0.68rem; transition: transform 0.2s ease; display: inline-block; }
.nav-item:hover .nav-caret,
.nav-item:focus-within .nav-caret { transform: rotate(180deg); }
.nav-dropdown {
  display: flex;
  flex-direction: column;
  position: absolute;
  top: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%) translateY(-6px);
  min-width: 210px;
  padding: 8px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 16, 24, 0.97);
  backdrop-filter: blur(20px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
  z-index: 200;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.25s ease 0.35s, visibility 0.25s ease 0.35s, transform 0.25s ease 0.35s;
}
.nav-item:hover .nav-dropdown,
.nav-item:focus-within .nav-dropdown {
  transition: opacity 0.18s ease 0s, visibility 0.18s ease 0s, transform 0.18s ease 0s;
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}
.nav-dropdown a {
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 0.88rem;
  letter-spacing: 0.04em;
  color: rgba(220, 240, 248, 0.78);
  transition: background 0.12s, color 0.12s;
}
.nav-dropdown a:hover,
.nav-dropdown a:focus-visible,
.nav-dropdown a.active { background: rgba(97, 255, 215, 0.08); color: var(--accent); }
.nav-dropdown-divider { height: 1px; background: rgba(255, 255, 255, 0.07); margin: 4px 6px; }

@media (max-width: 1080px) {
  .topbar { flex-direction: column; align-items: flex-start; }
  .main { padding-left: 24px; padding-right: 24px; }
}
@media (max-width: 900px) {
  .nav-dropdown { left: 0; transform: translateY(-6px); }
  .nav-item:hover .nav-dropdown,
  .nav-item:focus-within .nav-dropdown { transform: translateY(0); }
}
@media (max-width: 680px) {
  .shell { width: calc(100% - 16px); margin: 8px auto 18px; border-radius: 22px; }
  .topbar { padding: 16px; }
  h1 { font-size: 2rem; }
  .stat-row { grid-template-columns: 1fr; }
}
```

---

## 6. Content Components

### Horizontal bar chart

Used when comparing categories against each other (e.g., "how customers find businesses").

```html
<div class="chart-wrap">
  <div class="chart-title">Chart Title Here</div>
  <svg viewBox="0 0 700 310" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;" aria-label="[Describe the chart for screen readers]">
    <defs>
      <!-- Primary bar (top/most important value) -->
      <linearGradient id="bar-grad-1" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#58d6ff" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#4dffb8" stop-opacity="0.7"/>
      </linearGradient>
      <!-- Secondary bars -->
      <linearGradient id="bar-grad-2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#58d6ff" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#58d6ff" stop-opacity="0.3"/>
      </linearGradient>
    </defs>

    <!-- Y axis labels — x="178" text-anchor="end", spaced 45px apart starting at y="52" -->
    <text x="178" y="52"  text-anchor="end" font-family="Arial" font-size="12" fill="rgba(175,198,207,0.8)">Label One</text>
    <text x="178" y="97"  text-anchor="end" font-family="Arial" font-size="12" fill="rgba(175,198,207,0.8)">Label Two</text>
    <text x="178" y="142" text-anchor="end" font-family="Arial" font-size="12" fill="rgba(175,198,207,0.8)">Label Three</text>

    <!-- Bars start at x="188". Max width = 447px = 100%. Height 26, gap 19 (next rect y = prev y + 45). -->
    <!-- Top bar uses bar-grad-1, rest use bar-grad-2 -->
    <!-- Bar width = (value / 100) * 447, rounded to nearest integer -->
    <rect x="188" y="36"  width="447" height="26" rx="5" fill="url(#bar-grad-1)"/>
    <text x="641" y="54" font-family="Arial" font-size="12" font-weight="bold" fill="#4dffb8">100%</text>

    <rect x="188" y="81"  width="268" height="26" rx="5" fill="url(#bar-grad-2)"/>
    <text x="462" y="99" font-family="Arial" font-size="12" font-weight="bold" fill="#58d6ff">60%</text>
  </svg>
  <div class="chart-note">Source attribution here.</div>
</div>
```

**Bar width formula:** `width = round(percentage / 100 * 447)`
**Value label x position:** `x = 188 + bar_width + 6`
**Row y positions (label/bar):** 52/36, 97/81, 142/126, 187/171, 232/216, 277/261

---

### Vertical bar chart

Used for time series or severity progressions (e.g., bounce rate by load time).

```html
<div class="chart-wrap">
  <div class="chart-title">Chart Title Here</div>
  <svg viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;" aria-label="[Screen reader description]">
    <defs>
      <!-- Good/positive value -->
      <linearGradient id="bar-ok" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4dffb8" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="#4dffb8" stop-opacity="0.35"/>
      </linearGradient>
      <!-- Bad/negative value -->
      <linearGradient id="bar-danger" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff6b6b" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="#ff6b6b" stop-opacity="0.35"/>
      </linearGradient>
      <!-- Neutral teal gradient -->
      <linearGradient id="bar-teal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4dffb8" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#58d6ff" stop-opacity="0.6"/>
      </linearGradient>
    </defs>

    <!-- Horizontal grid lines — y values at 30, 80, 130, 180 (top to bottom = 100%, 75%, 50%, 25%) -->
    <line x1="72" y1="30"  x2="660" y2="30"  stroke="rgba(88,214,255,0.08)" stroke-width="1"/>
    <line x1="72" y1="80"  x2="660" y2="80"  stroke="rgba(88,214,255,0.08)" stroke-width="1"/>
    <line x1="72" y1="130" x2="660" y2="130" stroke="rgba(88,214,255,0.08)" stroke-width="1"/>
    <line x1="72" y1="180" x2="660" y2="180" stroke="rgba(88,214,255,0.08)" stroke-width="1"/>

    <!-- Y axis labels -->
    <text x="64" y="34"  text-anchor="end" font-family="Arial" font-size="11" fill="rgba(175,198,207,0.55)">100%</text>
    <text x="64" y="84"  text-anchor="end" font-family="Arial" font-size="11" fill="rgba(175,198,207,0.55)">75%</text>
    <text x="64" y="134" text-anchor="end" font-family="Arial" font-size="11" fill="rgba(175,198,207,0.55)">50%</text>
    <text x="64" y="184" text-anchor="end" font-family="Arial" font-size="11" fill="rgba(175,198,207,0.55)">25%</text>

    <!-- Baseline -->
    <line x1="72" y1="228" x2="660" y2="228" stroke="rgba(88,214,255,0.2)" stroke-width="1"/>

    <!-- Bars: width 90, gap 24. First bar x=90, then +114 each. Bar top y = 228 - height. -->
    <!-- height = round(percentage / 100 * 198). Max bar fills from y=30 to y=228 = 198px. -->
    <!-- Value label: text-anchor="middle" at bar center x, y = bar top y - 6 -->
    <!-- X label: text-anchor="middle" at bar center x, y = 246 -->
    <rect x="90"  y="211" width="90" height="17"  rx="5" fill="url(#bar-ok)"/>
    <text x="135" y="207" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#4dffb8">9%</text>
    <text x="135" y="246" text-anchor="middle" font-family="Arial" font-size="11" fill="rgba(175,198,207,0.65)">Label</text>
  </svg>
  <div class="chart-note">Source attribution.</div>
</div>
```

**Vertical bar math:**
- Chart area: y=30 (top, 100%) to y=228 (baseline) = 198px total height
- Bar height = `round(value / 100 * 198)`
- Bar top y = `228 - bar_height`
- Bar centers (5 bars): x = 135, 249, 363, 477, 591
- Bar x starts: 90, 204, 318, 432, 546 (width 90 each, gap 24)

---

### Stat row (3 callout numbers)

```html
<div class="stat-row">
  <div class="stat-card">
    <div class="stat-number">76%</div>
    <div class="stat-label">Short description of what this number means for the reader</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">28%</div>
    <div class="stat-label">Short description</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">46%</div>
    <div class="stat-label">Short description</div>
  </div>
</div>
<p style="font-size:0.78rem;color:rgba(175,198,207,0.45);margin-top:-12px;margin-bottom:24px;">Source: [Attribution]</p>
```

---

### Inline article photo (silver posts)

Put photos inside `.article-body`, placed between paragraphs. Load the first one normally, rest with `loading="lazy"`.

```html
<figure class="article-photo">
  <img src="images/photo-name.jpg" alt="[Specific, descriptive alt text]" loading="lazy" />
  <figcaption>[What is pictured, and image credit if applicable]</figcaption>
</figure>
```

Images go in `blog/[slug]/images/`. Filename should be descriptive (`coins-spread.jpg`, not `IMG_4521.jpg`).

For Wikimedia Commons images, credit as: `Image: Wikimedia Commons (public domain)` or `(CC BY-SA 4.0)`.

---

### Math / formula callout box

```html
<div class="math-box">
  <div class="math-label">Section Label</div>
  <div class="math-line">$1 face value = ~0.715 troy oz of silver</div>
  <div class="math-line">At 15x face: $1 face bag costs $15.00</div>
  <p>Explanatory sentence that gives context to the numbers above. Keep it one or two sentences.</p>
</div>
```

Add this CSS to the post's `<style>` block when using it:

```css
.math-box {
  background: rgba(77, 255, 184, 0.04);
  border: 1px solid rgba(77, 255, 184, 0.18);
  border-radius: 16px;
  padding: 26px 28px;
  margin: 32px 0;
}
.math-box .math-label {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-2);
  margin-bottom: 10px;
}
.math-box .math-line {
  font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
  font-size: 1.3rem;
  letter-spacing: 0.03em;
  color: var(--text);
  margin-bottom: 8px;
}
.math-box p { font-size: 0.92rem; color: var(--muted); margin: 0 !important; line-height: 1.6; }
```

---

### Coin grid (2-column spec cards)

```html
<div class="coin-grid">
  <div class="coin-card">
    <div class="coin-name">Item Name</div>
    <div class="coin-oz">0.0723 oz</div>
    <p class="coin-desc">One or two sentences of context.</p>
  </div>
  <div class="coin-card">
    <div class="coin-name">Item Name</div>
    <div class="coin-oz">0.1808 oz</div>
    <p class="coin-desc">One or two sentences of context.</p>
  </div>
</div>
```

Add this CSS when using it:

```css
.coin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 28px 0;
}
.coin-card {
  background: rgba(88, 214, 255, 0.04);
  border: 1px solid rgba(88, 214, 255, 0.12);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.coin-card .coin-name {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}
.coin-card .coin-oz {
  font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
  font-size: 1.55rem;
  letter-spacing: 0.04em;
  color: var(--text);
  line-height: 1;
}
.coin-card .coin-desc { font-size: 0.88rem; color: var(--muted); margin: 0; line-height: 1.55; }
@media (max-width: 680px) { .coin-grid { grid-template-columns: 1fr; } }
```

---

### Watch out / callout list

```html
<div class="watch-list">
  <div class="watch-item">
    <div class="watch-label">Label</div>
    <p>Body text explaining this item. One to three sentences.</p>
  </div>
  <div class="watch-item">
    <div class="watch-label">Label</div>
    <p>Body text.</p>
  </div>
</div>
```

Add this CSS when using it:

```css
.watch-list { display: flex; flex-direction: column; gap: 14px; margin: 28px 0; }
.watch-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px 18px;
  align-items: start;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(11, 24, 32, 0.6);
}
.watch-item .watch-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  white-space: nowrap;
  padding-top: 2px;
}
.watch-item p { margin: 0 !important; font-size: 0.95rem; color: var(--muted); line-height: 1.65; }
```

---

### Sources block

Always include at the end of any research-backed post. Put it inside `.article-body`, before closing `</div>`.

```html
<div class="sources-block">
  <h3>Sources</h3>
  <ol>
    <li><a href="[URL]" target="_blank" rel="noreferrer">[Author/Organization]</a>, "[Title]" — [one-line summary of what the citation supports].</li>
    <li>[Author/Organization], <em>[Publication]</em> — [one-line summary].</li>
  </ol>
</div>
```

---

## 7. Hero Image (Tech Posts)

Fetch from Unsplash CDN — no API key needed:

```bash
curl -s "https://images.unsplash.com/photo-[PHOTO_ID]?auto=format&fit=crop&w=1200&q=82" \
  -o "blog/[slug]/hero.jpg"
```

Known photo IDs by topic:

| Topic | Unsplash Photo ID | Photographer |
|---|---|---|
| Analytics / data | `1460925895917-afdab827c52f` | Isaac Smith |
| Local business / retail | `1556742049-0cfed4f6a45d` | Blake Wisz |
| Office / tech work | `1551434678-e076c223a692` | Bench Accounting |
| AI / automation | Search Unsplash for relevant image |  |
| Finance / money | `1579621970563-ebec7560ff3e` | Precondo CA |

Update `og:image` and `twitter:image` meta tags to:
```
https://fuseddistribution.com/blog/[slug]/hero.jpg
```

HTML placement — between `.article-meta` and `.article-divider`:

```html
<figure class="article-hero">
  <img src="hero.jpg" alt="[Descriptive alt text]" width="1200" height="630" />
  <figcaption>Photo by <a href="https://unsplash.com/@[handle]" target="_blank" rel="noreferrer">[Name]</a> on <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a></figcaption>
</figure>
```

---

## 8. Writing Style Rules

The goal is to sound like a knowledgeable local person talking to a business owner — not a marketing team or a chatbot.

**Never use em dashes (—).** Use a comma, a period, or rewrite the sentence.

**Never use these words or phrases:**
- leverage, utilize, streamline, robust, seamlessly, cutting-edge, game-changing
- dive in, delve into, it's important to note, it's worth noting
- in today's digital landscape, in the modern era, at the end of the day
- first and foremost, in conclusion, to summarize, to recap
- unlock, empower, harness, elevate, transform
- comprehensive, holistic, synergy, ecosystem

**Write like a person:**
- Short sentences work. Mix them with longer ones.
- Use "you" and "your business" directly.
- Be specific. Numbers beat generalizations.
- Say what something actually does, not what it "enables" or "allows."
- If a sentence sounds like it came from a brochure, rewrite it.
- Never start a post with a rhetorical question as a hook.
- Avoid passive voice when active voice is clearer.

**Tone:**
- Helpful and direct, not enthusiastic
- No hype, no urgency tricks
- Treat the reader like they are smart and busy

**Structure:**
- Lead with the main point. No long intros.
- Use `<h2>` for section headings inside `.article-body`
- Use `<p>`, `<ul>`, `<li>`, `<strong>`, `<a>` for body content
- Keep posts focused on one practical topic

---

## 9. Slug Naming Convention

- Lowercase, hyphens only: `how-to-set-up-google-business`
- Keep it short and descriptive
- No dates in the slug

---

## 10. Publish to GitHub

After creating all files:

```bash
# Stage new post files
git add blog/posts.json blog/[slug]/

# Commit
git commit -m "Add blog post: [Post Title]"

# Push to deploy
git push origin main
```

The site deploys automatically on push to `origin main`.

Remote: `https://github.com/thatguyheis/Fuseddistribution.git`
