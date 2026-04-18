# Sales Pages — How to Add a New Client Demo

Each sales page is a fully built site prototype for a prospective client. They live at `fuseddistribution.com/[slug]/` and appear on the Projects page automatically.

---

## What to add for a new page

### 1. Create the client folder

```
Documents/New project/[slug]/
  client-info.md
  index.html
  landscape1.jpg
  landscape2.jpg
  detail1.jpg
  detail2.jpg
```

**Slug rules:** Lowercase, hyphens only, no dates. Example: `river-city-plumbing`

**Client ID format:** `10-[5-digit-zip]-[MMDDYY]-[slug]`
Example: `10-97201-041826-river-city-plumbing`

---

### 2. Write client-info.md

```markdown
# Client Profile: [Business Name]

- **Client ID**: [client-id]
- **Category**: [e.g., Restaurants / Cafes, Auto Body, Retail, Plumbing]
- **Address**: [full street address including city, state, zip]
- **Phone**: [formatted phone number]
- **Current Website**: [URL or "None Found"]
- **Web Presence**: [describe current online state honestly]
- **Opportunity/Goal**: [what would a website actually do for this business]
- **Vibe/Brand Soul**: [character, tone, who they serve]
```

---

### 3. Build index.html

Copy from: `_templates/sales-page-template.html`

Update every field marked with `<!-- CHANGE: -->` comments.

The page structure:
- **Nav:** Logo (business name abbreviation), 1-2 nav links, 1 CTA button
- **Hero:** Eyebrow tagline, H1 headline (2 lines), hero photo panel, feature list (3 items)
- **Section:** Content cards — 2 product/service cards + 1 express CTA card
- **Footer:** Business name, address, phone, "Prototype conceptualized by Fused Technical Solutions."

**Accent color:** Pick one that fits the brand. The template defaults to gold (`#d4af37`). For other options:
- Tech / service: `#58d6ff` (cyan)
- Food / warm: `#e8874a` (orange)
- Nature / eco: `#4dffb8` (mint)
- Luxury: `#d4af37` (gold, default)

---

### 4. Add placeholder images

Download 4 images from Unsplash. No API key needed.

```bash
curl -s "https://images.unsplash.com/photo-[PHOTO_ID]?auto=format&fit=crop&w=1200&q=82" \
  -o "[slug]/landscape1.jpg"
```

**Photo IDs by category:**

| Category | landscape1 | landscape2 | detail1 | detail2 |
|---|---|---|---|---|
| Restaurant / deli | `1414235077040-9b66b84e6af8` | `1555396273-b2b5b4b5b4b5` | `1540189711706-7c7b8d814823` | `1565299715199-866b4c1d3a08` |
| Auto / service | `1503376780353-7e6692767b70` | `1486262715619-67b85e0b08d3` | `1558618666-fcd25c85cd64` | `1568605114967-8130f3a36994` |
| Café / beverage | `1509042239860-f550ce710b93` | `1556909114-f6e7ad7d3136` | `1495474472287-4d71bcdd2085` | `1497935586351-b67a49e012bf` |
| Retail / shop | `1556742049-0cfed4f6a45d` | `1441986300917-64674bd600d8` | `1472851294608-ac5e5ba7b8e6` | `1490818715691-e3b99e87b5db` |
| Plumbing / trades | `1504307651254-35680f356dfd` | `1581092918056-0c4c3acd3789` | `1524749292144-d52d0dcf2e54` | `1585771724684-38269d6639fd` |

If none of these match, search Unsplash manually and note the photo ID here for future use.

---

### 5. Add entry to projects.json

File: `projects.json`

Add a new entry at the **top** of the array (newest first):

```json
{
  "slug": "[slug]",
  "name": "[Business Name]",
  "tags": ["[Category Label]", "Customer Work-Up"],
  "description": "[1-2 sentences: what was built and why it matters for this business.]",
  "scope_label": "Scope",
  "scope_title": "[Short title for what was built, e.g., 'Local plumbing service page']",
  "scope_body": "[2-3 sentences describing the page's structure and purpose.]",
  "detail_label": "Opportunity",
  "detail_title": "[Short title for the business opportunity, e.g., 'No website to first call']",
  "detail_body": "[2-3 sentences describing the specific gap this page addresses.]",
  "cta1": "Open Live Page",
  "cta2": "Request Similar Build",
  "iframe_title": "[Business type] website design for [Business Name], [City State]"
}
```

Keep `description` and `scope_body` under 160 characters each. Be specific — say what the page actually does.

---

### 6. Update JSON-LD in projects/index.html

File: `projects/index.html`

Find the `@graph[2].itemListElement` array in the `<script type="application/ld+json">` block.

Add a new entry at position 1 and increment all existing positions:

```json
{ "@type": "ListItem", "position": 1, "item": { "@type": "CreativeWork", "name": "[Business Name]", "url": "https://fuseddistribution.com/[slug]/", "creator": { "@id": "https://fuseddistribution.com/#organization" }, "about": "[one sentence about the page]" } }
```

---

### 7. Commit and push

```bash
cd "/Users/nick/Documents/New project"
git add [slug]/ projects.json projects/index.html
git commit -m "Add sales page: [Business Name]"
git push origin main
```

Cloudflare deploys automatically on push. Page is live within 1-2 minutes.

---

## Writing style rules

Same rules as BLOG.md. Short version:

- Write like a person, not a marketer
- No em dashes. Use commas, periods, or rewrite the sentence.
- No hype words: leverage, streamline, robust, seamlessly, cutting-edge, game-changing, unlock, empower, transform, comprehensive, holistic
- Short sentences. Specific numbers beat vague claims.
- Treat the business owner like they're smart and busy.

---

## Slug naming convention

- Lowercase, hyphens only: `valley-auto-glass`
- Keep it short and descriptive
- Match the folder name exactly — this becomes the URL
