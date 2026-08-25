# Fused Distribution — Codex Agent Instructions

## Hard Rules

- **Codex owns repository delivery** — commit and push only after scoped validation and explicit user authorization. Claude is not a required reviewer or deployment dependency.
- **Never delete files** without explicit instruction.
- **Never manually edit generated pages** — `photos/images/*/index.html` and `photos/collections/*/index.html` are built by script. Edit the script or data, then rebuild.
- **Never touch these hand-crafted files**: `photos/index.html`, `photos/browse/index.html`.

---

## Adding New Photos to the Library

### Step 1 — Place images

Processed web-ready JPGs go in:

```
photos/derived/web/img-XXXX-img-ORIGINALNAME.jpg
```

Naming convention: `img-0021-img-1234.jpg` (increment the sequence number from the last entry in `photos/data/images.csv`).

Images must be JPEG, web-optimized, 2400px on the long edge.

### Step 2 — Update the catalog

Edit `photos/data/images.csv`. Add one row per image. Follow this column structure exactly:

```
id,filename,asset_filename,slug,title,alt_text,caption,description,location,state_region,country,tags,orientation,license_status,license_type,model_release,property_release,collection,featured,published,date_captured,date_published,notes
```

**Critical rules for each field:**

| Field | Rule |
|---|---|
| `id` | `img-XXXX` — next in sequence |
| `slug` | `img-XXXX-img-ORIGINALNAME` — matches filename without `.jpg` |
| `title` | Short descriptive title. No keyword stuffing. |
| `alt_text` | **Title only.** Do NOT append tags, location, or collection. |
| `location` | Real place name only (`Lake Oswego, Oregon`). **Leave blank if unknown** — never write "Unspecified X". |
| `tags` | Comma-separated. Specific to THIS image only. Do not copy tags from other images in the same collection. |
| `orientation` | `landscape` or `portrait` based on actual pixel dimensions |
| `license_status` | `commercial-safe` |
| `license_type` | `free-use` |
| `model_release` | `no` (unless confirmed) |
| `property_release` | `no` (unless confirmed) |
| `collection` | Must match a `slug` in `photos/data/collections.json` |
| `featured` | `yes` only if explicitly requested |
| `published` | `no` until reviewed |

### Step 3 — Add to a collection (if new collection needed)

Edit `photos/data/collections.json`. Add an object with:

```json
{
  "slug": "my-new-collection",
  "name": "My New Collection",
  "description": "One sentence. User-facing. No internal planning language.",
  "hero_image_id": "img-XXXX",
  "tags": ["tag1", "tag2"],
  "featured": false,
  "sort_order": 5
}
```

Do not create a collection for fewer than 3 images unless instructed.

### Step 4 — Build all pages

```bash
npm run photos:build
```

This regenerates every file under `photos/images/*/index.html` and `photos/collections/*/index.html`. Do not manually edit those outputs.

### Step 5 — Commit

Stage and commit:

```bash
git add photos/derived/web/ photos/data/ photos/images/ photos/collections/
git commit -m "feat: add [N] images to [collection-name] collection"
```

Push only after the generated output, tests, and working tree scope have been reviewed. Codex may push when the user explicitly authorizes it.

---

## What the Build Script Generates

The script (`photos/scripts/build-pages.mjs`) reads `images.csv` and `collections.json` and writes:

- `photos/images/<slug>/index.html` — one per image
- `photos/collections/<slug>/index.html` — one per collection

It uses root-relative hrefs (`/photos/`, `/projects/`, etc.) and the full site nav with dropdowns. Do not override this.

---

## Navigation and Path Rules

All hrefs in any HTML file in this project must be **root-relative**:

```html
<!-- Correct -->
<a href="/photos/">Photos</a>
<a href="/photos/browse/">Browse</a>
<a href="/">Home</a>

<!-- Wrong — breaks on Cloudflare -->
<a href="../../index.html">Home</a>
<a href="../photos/index.html">Photos</a>
```

---

## Brand Rules

| Element | Value |
|---|---|
| Brand mark | `Fused` |
| Brand sub | `Distribution` |
| Never use | `Original Photo Library` |
| Accent color | `#58d6ff` |

---

## Copy Rules

- No em-dashes (`—`). Use a plain dash or rewrite the sentence.
- No hyphenated words where avoidable.
- No AI filler: "dive into", "leverage", "seamless", "unlock", "revolutionize".
- No internal planning language visible to users: "Phase 1", "launch-stage", "day one", "batch".
- Location fields: real places only. Blank if unknown. Never "Unspecified suburban roadway".

---

## File Map

```
photos/
  data/
    images.csv           ← catalog of all images (edit this)
    collections.json     ← collection definitions (edit this)
  derived/web/           ← web-ready JPGs (add images here)
  images/<slug>/         ← generated detail pages (do not edit)
  collections/<slug>/    ← generated collection pages (do not edit)
  index.html             ← hand-crafted landing page (do not edit)
  browse/index.html      ← hand-crafted full library page (do not edit)
  scripts/
    build-pages.mjs      ← page generator (edit only if structure needs changing)
    ingest-uploads.mjs   ← processes raw uploads from photos/uploads/
    prepare-images.mjs   ← resizes/exports images
```

---

## Quick Reference — Adding Photos

```
1. Place JPGs in photos/derived/web/
2. Add rows to photos/data/images.csv
3. npm run photos:build
4. git add photos/derived/web/ photos/data/ photos/images/ photos/collections/
5. git commit -m "feat: add N images to collection-name"
# Stop here. Do not push.
```
