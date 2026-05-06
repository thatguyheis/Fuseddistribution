# SEO Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all blog posts to sitemap, fix BlogPosting schema on all 9 posts, add article Open Graph meta tags, and add service CTA blocks at the bottom of each post.

**Architecture:** Pure HTML/XML edits. Python scripts handle bulk transformations. No build step, no new dependencies — edit files in place, verify with grep/python, commit.

**Tech Stack:** Python 3 (stdlib only), git

---

## Files Changed

| File | Change |
|------|--------|
| `sitemap.xml` | Add blog index + 9 post URLs |
| `blog/*/index.html` (×9) | Fix BlogPosting schema author/image/mainEntityOfPage, add article:published_time + article:author meta, add CTA block |

---

### Task 1: Add blog URLs to sitemap.xml

**Files:**
- Modify: `sitemap.xml`

- [ ] **Step 1: Verify blog URLs are missing**

```bash
grep "blog" "/Users/nick/Documents/New project/sitemap.xml"
```
Expected: no output (confirms nothing to de-dup)

- [ ] **Step 2: Add blog URLs**

Open `sitemap.xml`. After the last `</url>` entry and before `</urlset>`, insert:

```xml
  <url>
    <loc>https://fuseddistribution.com/blog/</loc>
    <lastmod>2026-05-06</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://fuseddistribution.com/blog/welcome-to-fused/</loc>
    <lastmod>2026-04-18</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://fuseddistribution.com/blog/why-your-website-isnt-getting-customers/</loc>
    <lastmod>2026-04-18</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://fuseddistribution.com/blog/dollar-cost-averaging-silver/</loc>
    <lastmod>2026-04-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://fuseddistribution.com/blog/what-a-website-does-for-your-business/</loc>
    <lastmod>2026-04-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://fuseddistribution.com/blog/what-a-website-is-worth/</loc>
    <lastmod>2026-04-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://fuseddistribution.com/blog/what-is-junk-silver/</loc>
    <lastmod>2026-04-25</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://fuseddistribution.com/blog/google-business-profile-setup/</loc>
    <lastmod>2026-04-30</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://fuseddistribution.com/blog/silver-to-gold-ratio/</loc>
    <lastmod>2026-05-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://fuseddistribution.com/blog/getting-google-reviews/</loc>
    <lastmod>2026-05-04</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
```

- [ ] **Step 3: Verify XML is valid and blog URLs are present**

```bash
python3 -c "
import xml.etree.ElementTree as ET
tree = ET.parse('/Users/nick/Documents/New project/sitemap.xml')
urls = [el.text for el in tree.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
blog_urls = [u for u in urls if '/blog/' in u]
print(f'{len(blog_urls)} blog URLs found:')
for u in blog_urls: print(' ', u)
"
```
Expected: 10 blog URLs listed (blog index + 9 posts)

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add sitemap.xml
git commit -m "seo: add blog index and all 9 posts to sitemap"
```

---

### Task 2: Fix BlogPosting schema on all 9 posts

**Files:**
- Modify: `blog/*/index.html` (×9) — update existing `BlogPosting` JSON-LD block

Current schema is missing: `image`, `mainEntityOfPage`, `dateModified`. Author is `Organization` ("Fused Team") — should be `Person` ("Nick"). Fix all with a Python script.

- [ ] **Step 1: Verify current author type**

```bash
grep -r '"author"' /Users/nick/Documents/New project/blog/*/index.html | grep -v "BLOG.md"
```
Expected: all lines show `"@type": "Organization"` or similar — none show `"@type": "Person"`

- [ ] **Step 2: Run fix script**

```python
# Save as /tmp/fix_schema.py and run: python3 /tmp/fix_schema.py
import re, json, os

BLOG_ROOT = "/Users/nick/Documents/New project/blog"

POSTS = {
    "welcome-to-fused":                      {"date": "2026-04-18"},
    "why-your-website-isnt-getting-customers": {"date": "2026-04-18"},
    "dollar-cost-averaging-silver":           {"date": "2026-04-21"},
    "what-a-website-does-for-your-business":  {"date": "2026-04-22"},
    "what-a-website-is-worth":                {"date": "2026-04-23"},
    "what-is-junk-silver":                    {"date": "2026-04-25"},
    "google-business-profile-setup":          {"date": "2026-04-30"},
    "silver-to-gold-ratio":                   {"date": "2026-05-01"},
    "getting-google-reviews":                 {"date": "2026-05-04"},
}

PUBLISHER = {
    "@type": "Organization",
    "name": "Fused Distribution",
    "@id": "https://fuseddistribution.com/#organization",
    "logo": {
        "@type": "ImageObject",
        "url": "https://fuseddistribution.com/og-image.png"
    }
}

for slug, meta in POSTS.items():
    path = os.path.join(BLOG_ROOT, slug, "index.html")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract canonical URL
    url_m = re.search(r'<link rel="canonical" href="([^"]+)"', content)
    url = url_m.group(1) if url_m else f"https://fuseddistribution.com/blog/{slug}/"

    # Extract description from meta tag
    desc_m = re.search(r'<meta name="description" content="([^"]+)"', content)
    description = desc_m.group(1) if desc_m else ""

    # Extract headline from <title>
    title_m = re.search(r'<title>([^<]+)</title>', content)
    headline = title_m.group(1).split(" | ")[0] if title_m else slug

    # Build replacement schema block
    schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": headline,
        "description": description,
        "url": url,
        "datePublished": meta["date"],
        "dateModified": meta["date"],
        "author": {
            "@type": "Person",
            "name": "Nick",
            "url": "https://fuseddistribution.com/about/"
        },
        "publisher": PUBLISHER,
        "image": "https://fuseddistribution.com/og-image.png",
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": url
        }
    }

    schema_json = json.dumps(schema, indent=6, ensure_ascii=False)

    # Replace existing BlogPosting script block
    old_block_re = re.compile(
        r'<script type="application/ld\+json">\s*\{[^<]*"@type":\s*"BlogPosting"[^<]*\}\s*</script>',
        re.DOTALL
    )
    new_block = f'<script type="application/ld+json">\n    {schema_json}\n    </script>'

    if old_block_re.search(content):
        content = old_block_re.sub(new_block, content, count=1)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed: {slug}")
    else:
        print(f"WARNING: no BlogPosting block found in {slug}")
```

Run:
```bash
python3 /tmp/fix_schema.py
```
Expected: "Fixed: <slug>" printed for all 9 posts, no WARNING lines

- [ ] **Step 3: Verify schema is valid JSON and has Person author**

```bash
python3 << 'EOF'
import re, json, os

BLOG_ROOT = "/Users/nick/Documents/New project/blog"
posts = [d for d in os.listdir(BLOG_ROOT) if os.path.isfile(os.path.join(BLOG_ROOT, d, "index.html"))]

for slug in posts:
    path = os.path.join(BLOG_ROOT, slug, "index.html")
    with open(path) as f:
        content = f.read()
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', content, re.DOTALL)
    for block in blocks:
        try:
            data = json.loads(block)
            if data.get("@type") == "BlogPosting":
                author_type = data.get("author", {}).get("@type", "MISSING")
                has_image = "image" in data
                has_main = "mainEntityOfPage" in data
                ok = author_type == "Person" and has_image and has_main
                print(f"{'OK' if ok else 'FAIL'} {slug}: author={author_type} image={has_image} mainEntity={has_main}")
        except json.JSONDecodeError as e:
            print(f"INVALID JSON in {slug}: {e}")
EOF
```
Expected: "OK" for all 9 posts

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add blog/*/index.html
git commit -m "seo: fix BlogPosting schema — Person author, image, mainEntityOfPage on all 9 posts"
```

---

### Task 3: Add article:published_time and article:author meta tags

**Files:**
- Modify: `blog/*/index.html` (×9) — add two `<meta>` tags after existing `og:type`

- [ ] **Step 1: Verify tags are absent**

```bash
grep -r "article:published_time" /Users/nick/Documents/New project/blog/*/index.html
```
Expected: no output

- [ ] **Step 2: Run injection script**

```python
# Save as /tmp/fix_og_meta.py and run: python3 /tmp/fix_og_meta.py
import re, os

BLOG_ROOT = "/Users/nick/Documents/New project/blog"

POSTS = {
    "welcome-to-fused":                        "2026-04-18",
    "why-your-website-isnt-getting-customers":  "2026-04-18",
    "dollar-cost-averaging-silver":             "2026-04-21",
    "what-a-website-does-for-your-business":    "2026-04-22",
    "what-a-website-is-worth":                  "2026-04-23",
    "what-is-junk-silver":                      "2026-04-25",
    "google-business-profile-setup":            "2026-04-30",
    "silver-to-gold-ratio":                     "2026-05-01",
    "getting-google-reviews":                   "2026-05-04",
}

for slug, date in POSTS.items():
    path = os.path.join(BLOG_ROOT, slug, "index.html")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    new_tags = (
        f'<meta property="article:published_time" content="{date}T00:00:00Z" />\n'
        f'    <meta property="article:author" content="https://fuseddistribution.com/about/" />'
    )

    # Insert after og:type line
    content = re.sub(
        r'(<meta property="og:type" content="article" />)',
        r'\1\n    ' + new_tags,
        content,
        count=1
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated: {slug}")
```

Run:
```bash
python3 /tmp/fix_og_meta.py
```
Expected: "Updated: <slug>" for all 9 posts

- [ ] **Step 3: Verify tags present**

```bash
grep -c "article:published_time" /Users/nick/Documents/New project/blog/*/index.html
```
Expected: each file shows count of 1

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add blog/*/index.html
git commit -m "seo: add article:published_time and article:author Open Graph meta to all blog posts"
```

---

### Task 4: Add service CTA blocks to all 9 posts

**Files:**
- Modify: `blog/*/index.html` (×9) — inject CTA div before closing `</main>`

Tech posts (6) link to web design service. Silver posts (3) link to Reserve.

- [ ] **Step 1: Verify no CTAs exist**

```bash
grep -r "post-cta" /Users/nick/Documents/New project/blog/*/index.html
```
Expected: no output

- [ ] **Step 2: Run CTA injection script**

```python
# Save as /tmp/add_ctas.py and run: python3 /tmp/add_ctas.py
import re, os

BLOG_ROOT = "/Users/nick/Documents/New project/blog"

TECH_POSTS = {
    "welcome-to-fused",
    "why-your-website-isnt-getting-customers",
    "what-a-website-does-for-your-business",
    "what-a-website-is-worth",
    "google-business-profile-setup",
    "getting-google-reviews",
}

SILVER_POSTS = {
    "dollar-cost-averaging-silver",
    "silver-to-gold-ratio",
    "what-is-junk-silver",
}

TECH_CTA = '''      <div class="post-cta" style="margin: 48px 0 0; padding: 32px; background: rgba(97,255,215,0.06); border: 1px solid rgba(97,255,215,0.2); border-radius: 16px; text-align: center;">
        <p style="margin: 0 0 20px; color: #afc6cf; font-size: 1rem; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto;">Fused Technology Solutions builds custom websites for local businesses. You see the finished site before paying anything.</p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="/pricing/" style="display:inline-block; padding: 10px 24px; background: #58d6ff; color: #040d12; font-weight: 700; border-radius: 10px; text-decoration: none; font-size: 0.92rem;">See Plans</a>
          <a href="/#contact" style="display:inline-block; padding: 10px 24px; background: rgba(88,214,255,0.08); color: #58d6ff; border: 1px solid rgba(88,214,255,0.28); font-weight: 700; border-radius: 10px; text-decoration: none; font-size: 0.92rem;">Get Started</a>
        </div>
      </div>'''

SILVER_CTA = '''      <div class="post-cta" style="margin: 48px 0 0; padding: 32px; background: rgba(97,255,215,0.06); border: 1px solid rgba(97,255,215,0.2); border-radius: 16px; text-align: center;">
        <p style="margin: 0 0 20px; color: #afc6cf; font-size: 1rem; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto;">Fused Reserve is a monthly silver subscription with low-premium sourcing and flexible shipping. No commitment required to browse plans.</p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="/reserve/" style="display:inline-block; padding: 10px 24px; background: #58d6ff; color: #040d12; font-weight: 700; border-radius: 10px; text-decoration: none; font-size: 0.92rem;">Learn More</a>
          <a href="/reserve/#join" style="display:inline-block; padding: 10px 24px; background: rgba(88,214,255,0.08); color: #58d6ff; border: 1px solid rgba(88,214,255,0.28); font-weight: 700; border-radius: 10px; text-decoration: none; font-size: 0.92rem;">Join Reserve</a>
        </div>
      </div>'''

all_posts = TECH_POSTS | SILVER_POSTS
for slug in all_posts:
    path = os.path.join(BLOG_ROOT, slug, "index.html")
    if not os.path.isfile(path):
        print(f"MISSING: {slug}")
        continue

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    cta = TECH_CTA if slug in TECH_POSTS else SILVER_CTA

    if "post-cta" in content:
        print(f"SKIP (already has CTA): {slug}")
        continue

    content = content.replace("    </main>", f"\n{cta}\n    </main>", 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Added {'tech' if slug in TECH_POSTS else 'silver'} CTA: {slug}")
```

Run:
```bash
python3 /tmp/add_ctas.py
```
Expected: "Added tech CTA:" for 6 posts, "Added silver CTA:" for 3 posts

- [ ] **Step 3: Verify CTAs present and correct**

```bash
python3 << 'EOF'
import os, re

BLOG_ROOT = "/Users/nick/Documents/New project/blog"
TECH = {"welcome-to-fused","why-your-website-isnt-getting-customers","what-a-website-does-for-your-business","what-a-website-is-worth","google-business-profile-setup","getting-google-reviews"}
SILVER = {"dollar-cost-averaging-silver","silver-to-gold-ratio","what-is-junk-silver"}

for slug in TECH | SILVER:
    path = os.path.join(BLOG_ROOT, slug, "index.html")
    with open(path) as f:
        content = f.read()
    has_cta = "post-cta" in content
    if slug in TECH:
        correct_link = "/pricing/" in content and "See Plans" in content
    else:
        correct_link = "/reserve/#join" in content and "Join Reserve" in content
    print(f"{'OK' if has_cta and correct_link else 'FAIL'} {slug}")
EOF
```
Expected: "OK" for all 9 posts

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add blog/*/index.html
git commit -m "seo: add service CTA blocks to all 9 blog posts (tech → /pricing/, silver → /reserve/)"
```

---

### Task 5: Push and verify

- [ ] **Step 1: Push to GitHub**

```bash
cd "/Users/nick/Documents/New project"
git push origin main
```

- [ ] **Step 2: Verify sitemap live**

```bash
curl -s https://fuseddistribution.com/sitemap.xml | grep -c "blog"
```
Expected: 10 (or close — may take a few minutes post-deploy)

- [ ] **Step 3: Verify one post schema**

```bash
curl -s https://fuseddistribution.com/blog/welcome-to-fused/ | python3 -c "
import sys, re, json
html = sys.stdin.read()
blocks = re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', html, re.DOTALL)
for b in blocks:
    d = json.loads(b)
    if d.get('@type') == 'BlogPosting':
        print('author type:', d['author']['@type'])
        print('has image:', 'image' in d)
        print('has mainEntityOfPage:', 'mainEntityOfPage' in d)
"
```
Expected: `author type: Person`, `has image: True`, `has mainEntityOfPage: True`
