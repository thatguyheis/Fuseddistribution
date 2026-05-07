# Photo Venture Implementation Spec

## Purpose

This document turns the business plan into a simple working system you can build and operate inside the current `fuseddistribution.com` project.

The goal is to launch fast with a small, maintainable setup:

- a photo subdomain or photo section
- a clean image catalog
- reusable templates
- light automation for repetitive work
- a manual quality gate before anything goes live

## Recommended Launch Model

Start with:

- `photos.fuseddistribution.com` as the public home
- 25 to 50 strong outdoor images
- 3 collections
- 2 journal posts
- direct licensing inquiry flow instead of a full e-commerce system

This keeps build time low and lets you validate demand before adding checkout, print fulfillment, or deeper marketplace sync.

## Folder Structure

Create this structure in the repo:

```text
photos/
  content/
    journal/
  data/
    images.csv
    collections.json
  derived/
    marketplace/
    social/
    web/
  originals/
  pages/
    collections/
    images/
  scripts/
  templates/
    collection-page.html
    image-page.html
  uploads/
```

## What Each Folder Is For

- `photos/originals/`: your untouched source images
- `photos/derived/web/`: optimized web images
- `photos/derived/social/`: cropped social-share versions
- `photos/derived/marketplace/`: marketplace-ready exports
- `photos/data/images.csv`: master catalog and publishing control file
- `photos/data/collections.json`: grouping rules and collection metadata
- `photos/pages/images/`: generated image detail pages
- `photos/pages/collections/`: generated collection pages
- `photos/content/journal/`: written articles and photo stories
- `photos/templates/`: page templates for generation
- `photos/scripts/`: automation scripts
- `photos/uploads/`: temporary staging folder for newly imported images

## Minimum Catalog Schema

Your first version of `photos/data/images.csv` should use these columns:

| Column | Required | Purpose |
|---|---|---|
| `id` | Yes | Stable unique identifier |
| `filename` | Yes | Original file name |
| `slug` | Yes | URL-safe page slug |
| `title` | Yes | Public title |
| `alt_text` | Yes | Accessibility and SEO |
| `caption` | Yes | Short human-readable image caption |
| `description` | Yes | Unique body copy for image page |
| `location` | Yes | Search relevance and organization |
| `state_region` | No | Geography filtering |
| `country` | No | Geography filtering |
| `tags` | Yes | Comma-separated searchable terms |
| `orientation` | Yes | `landscape`, `portrait`, or `square` |
| `license_status` | Yes | `commercial-safe`, `editorial-only`, or `restricted` |
| `license_type` | Yes | `direct`, `marketplace`, `both`, or `none` |
| `model_release` | No | `yes` or `no` |
| `property_release` | No | `yes` or `no` |
| `collection` | Yes | Primary collection slug |
| `featured` | Yes | `yes` or `no` |
| `published` | Yes | `yes` or `no` |
| `date_captured` | No | Shoot date |
| `date_published` | No | Go-live date |
| `notes` | No | Internal-only notes |

## Collection Schema

Your first version of `photos/data/collections.json` should store:

- `slug`
- `name`
- `description`
- `hero_image_id`
- `tags`
- `featured`
- `sort_order`

Example shape:

```json
[
  {
    "slug": "pacific-northwest-lakes",
    "name": "Pacific Northwest Lakes",
    "description": "Outdoor lake and shoreline photography suited for travel, editorial, and brand use.",
    "hero_image_id": "img-001",
    "tags": ["lake", "water", "pnw"],
    "featured": true,
    "sort_order": 1
  }
]
```

## Page Types To Build First

Only build these first four page types:

1. Photo homepage
2. Individual image page
3. Collection page
4. Licensing page

Do not build advanced filters, search, customer accounts, or print checkout in version one.

## Page Requirements

### 1. Photo homepage

Must include:

- brand promise
- featured collections
- latest images
- link to licensing
- link to journal
- clear connection to Fused in footer/about copy

### 2. Individual image page

Must include:

- image
- title
- unique description
- usage guidance
- location
- tags
- related images
- licensing CTA
- structured data

### 3. Collection page

Must include:

- collection description
- image grid
- internal links to image pages
- related collections
- optional journal links

### 4. Licensing page

Must include:

- license categories
- allowed use examples
- restricted use examples
- inquiry CTA
- link back to business-use content on `fuseddistribution.com`

## URL Structure

Use clean, stable URLs:

- `/`
- `/licenses/`
- `/journal/`
- `/collections/{collection-slug}/`
- `/images/{image-slug}/`

If this is deployed as a subdirectory before a subdomain, use:

- `/photos/collections/{collection-slug}/`
- `/photos/images/{image-slug}/`

## Metadata Rules

Every published image needs:

- a unique title
- a unique description
- useful alt text
- a location reference if safe to share
- at least 5 relevant tags
- a defined license status

Do not publish:

- duplicate images with near-identical framing
- image pages with blank descriptions
- images with uncertain rights status

## SEO Requirements

Every page should include:

- canonical tag
- title tag
- meta description
- Open Graph tags
- Twitter large-image tags
- breadcrumb schema where relevant

Every image page should include:

- `ImageObject` schema
- descriptive filename
- linked related collection
- at least one path to a conversion action

## Backlink Rules

Use the photo site to create relevant, useful links back to Fused.

Allowed internal link patterns:

- photo about page -> `fuseddistribution.com/`
- licensing/business-use pages -> `fuseddistribution.com/pricing/`
- image usage guidance posts -> `fuseddistribution.com/process/`
- case-study style articles -> `fuseddistribution.com/projects/`

Do not add forced links on every image page. Use links where they help the user and make contextual sense.

## First Automation Scripts

Build these scripts first:

### 1. `photos/scripts/prepare-images.mjs`

Purpose:

- normalize filenames
- generate web versions
- generate thumbnails
- create social crops
- output a simple processing report

### 2. `photos/scripts/validate-catalog.mjs`

Purpose:

- validate required fields in `images.csv`
- detect duplicate slugs
- detect missing files
- detect unpublished featured images

### 3. `photos/scripts/build-pages.mjs`

Purpose:

- generate image detail pages from template
- generate collection pages from template
- update sitemap entries

## Manual Versus Automated Work

### Keep manual

- selecting final images
- deciding what is commercially safe
- approving titles and descriptions
- selecting homepage features
- sending outreach emails
- approving final social captions

### Automate

- file renaming
- image resizing
- image format generation
- metadata validation
- page generation
- sitemap updates
- recurring reporting

## Simple Working Instructions

Use this checklist each time you add a batch of photos.

### Step 1. Upload originals

- Put new source images into `photos/uploads/`
- Review the batch manually
- Delete weak, duplicate, or unusable shots before cataloging

### Step 2. Choose winners

- Pick only the best images for publishing
- Move approved source files into `photos/originals/`
- Assign a working collection for each image

### Step 3. Fill in metadata

- Add a row to `photos/data/images.csv` for each approved image
- Write the title, alt text, caption, description, tags, and license status
- Mark `published` as `no` until the page is ready

### Step 4. Run image prep

- Run the image-prep script
- Confirm that web, social, and thumbnail versions were created
- Check that filenames and slugs match

### Step 5. Validate the catalog

- Run the catalog-validation script
- Fix any missing fields, duplicate slugs, or missing files
- Do not continue until validation is clean

### Step 6. Generate pages

- Run the page-build script
- Review generated image and collection pages locally
- Confirm copy, layout, and links look correct

### Step 7. Publish

- Set approved images to `published=yes`
- deploy the updated pages
- verify sitemap and internal links

### Step 8. Promote

- post selected images on social
- link to one collection or journal page, not just the raw homepage
- add outreach targets for any especially strong location or seasonal content

## Weekly Operator Routine

Use this simple weekly rhythm:

1. Add one new batch of images
2. Publish one collection or 5 to 10 image pages
3. Publish one supporting journal post every two weeks
4. Review traffic and inquiries
5. Add one new backlink or outreach push tied to the best content

## What You Should Work On First

Your immediate next tasks should be:

1. Create the `photos/` folder structure
2. Create `photos/data/images.csv`
3. Create `photos/data/collections.json`
4. Create the first image-page template
5. Create the first collection-page template
6. Build the validation script before the page generator

## Definition Of Done For Version One

Version one is complete when:

- 25 or more image pages are live
- 3 collections are live
- the licensing page is live
- the metadata catalog is the source of truth
- image prep and catalog validation are script-driven
- the photo venture links cleanly back to `fuseddistribution.com`

## Recommended Next Build Step

After this document, the next best implementation task is:

Create the `photos/` folder structure and starter data files so the workflow becomes real and you can begin cataloging immediately.
