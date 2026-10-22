# Fused Distribution — Codex Agent Instructions

## Start here (blog, reel, Buffer, publishing)

1. Read `docs/SOURCE-OF-TRUTH.md`. It is the single source of truth for scope, standards, schedule, workflow and git policy, and it wins over every other SOP.
2. Read `docs/HANDOFF-GPT-2026-10-22.md` for what changed on 2026-10-22 and your ordered task list.
3. Current scope: **coin history only, 3 finished blog and reel pairs per day.** Switch: `ops/content-scope.json`.
4. Episode rules: `docs/COIN-HISTORY-SOP.md`. Render detail: `video/REEL-SOP.md`.
5. To change a rule, edit SOURCE-OF-TRUTH and the enforcing code in the same commit. Do not add dated banners to other files.

The rest of this file covers the photo library only. It lives under `public/photos/`. The `npm run photos:*` scripts `cd public` first, because the photo scripts resolve `photos/` from the current directory.

## Hard Rules

- **Codex owns repository delivery.** Commit after scoped validation. Push follows `docs/SOURCE-OF-TRUTH.md` section 7: content commits may go to `origin main` without asking; code, SOP, config and photo library changes need Nick's explicit approval each time. Never force push. Claude is not a required reviewer or deployment dependency.
- **Never delete files** without explicit instruction.
- **Never manually edit generated pages** — `public/photos/images/*/index.html` and `public/photos/collections/*/index.html` are built by script. Edit the script or data, then rebuild.
- **Never touch these hand-crafted files**: `public/photos/index.html`, `public/photos/browse/index.html`.

---

## Adding New Photos to the Library

### Step 1 — Place images

Processed web-ready JPGs go in:

```
public/photos/derived/web/img-XXXX-img-ORIGINALNAME.jpg
```

Naming convention: `img-0021-img-1234.jpg` (increment the sequence number from the last entry in `public/photos/data/images.csv`).

Images must be JPEG, web-optimized, 2400px on the long edge.

### Step 2 — Update the catalog

Edit `public/photos/data/images.csv`. Add one row per image. Follow this column structure exactly:

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
| `collection` | Must match a `slug` in `public/photos/data/collections.json` |
| `featured` | `yes` only if explicitly requested |
| `published` | `no` until reviewed |

### Step 3 — Add to a collection (if new collection needed)

Edit `public/photos/data/collections.json`. Add an object with:

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

This regenerates every file under `public/photos/images/*/index.html` and `public/photos/collections/*/index.html`. Do not manually edit those outputs.

### Step 5 — Commit

Stage and commit:

```bash
git add public/photos/derived/web/ public/photos/data/ public/photos/images/ public/photos/collections/
git commit -m "feat: add [N] images to [collection-name] collection"
```

Run `npm run photos:validate` before committing. Push only with Nick's explicit approval (see Hard Rules).

---

## What the Build Script Generates

The script (`public/photos/scripts/build-pages.mjs`) reads `images.csv` and `collections.json` and writes:

- `public/photos/images/<slug>/index.html` — one per image
- `public/photos/collections/<slug>/index.html` — one per collection

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
public/photos/
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
    ingest-uploads.mjs   ← processes raw uploads from public/photos/uploads/
    prepare-images.mjs   ← resizes/exports images
```

---

## Quick Reference — Adding Photos

```
1. Place JPGs in public/photos/derived/web/
2. Add rows to public/photos/data/images.csv
3. npm run photos:build
4. npm run photos:validate
5. git add public/photos/derived/web/ public/photos/data/ public/photos/images/ public/photos/collections/
6. git commit -m "feat: add N images to collection-name"
# Push only with Nick's explicit approval.
```
