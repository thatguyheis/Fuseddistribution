# Photo Workflow

This is the working folder for the outdoor photo venture.

## Fast Start

1. Download your images from iCloud on your PC.
2. Copy the files into `photos/uploads/`.
3. Run `npm run photos:workflow`.
4. Review the draft rows added to `photos/data/images.csv`.
5. Fix any titles, locations, and collections that still need manual cleanup.
6. Run `npm run photos:enrich` again if you changed metadata fields that drive automation.
7. Run `npm run photos:build` if you want to refresh the public photo pages after catalog edits.

## Simple Rule

Only put images in `photos/uploads/` that you actually want reviewed for the stock site.

Do not dump your full archive in at once. Start with 10 to 20 good images per batch.

## iCloud Download Guidance

On your PC, export the highest-quality originals you can get from iCloud Photos.

- keep the original filenames if possible
- avoid screenshots, duplicates, or heavily edited social exports
- move one batch at a time into `photos/uploads/`

## What The Scripts Do

### `npm run photos:workflow`

- runs ingest, enrich, prepare, build, and validate in order
- this is the normal command to use for a new batch
- it leaves you with updated assets and refreshed public pages under `photos/`

### `npm run photos:ingest`

- scans `photos/uploads/`
- copies image files into `photos/originals/`
- normalizes saved filenames
- creates draft metadata rows in `photos/data/images.csv`
- drafts starter tags from filename words, orientation, and capture season when available

### `npm run photos:prepare`

- creates web-ready JPEG files in `photos/derived/web/`
- creates smaller social-share JPEG files in `photos/derived/social/`
- creates marketplace copies in `photos/derived/marketplace/`

### `npm run photos:validate`

- checks required catalog fields
- checks for duplicate ids, slugs, and saved filenames
- checks that source images exist

### `npm run photos:enrich`

- applies global import defaults from `photos/data/import-defaults.json`
- applies batch rules such as known location/date presets
- infers collections from tag patterns
- regenerates alt text, captions, and descriptions from the latest metadata

### `npm run photos:build`

- regenerates the public collection pages in `photos/collections/`
- regenerates the image detail pages in `photos/images/`
- keeps the photo section in sync with `photos/data/images.csv` and `photos/data/collections.json`

## Your Manual Job

The system can draft metadata, but you still need to approve:

- title quality
- real location
- final tags
- collection assignment

The best way to improve automation is to keep `photos/data/import-defaults.json` up to date with:

- known locations
- repeat batch patterns
- common collection rules
- any tags you want auto-applied by date or filename pattern

This workflow now defaults new imports to `commercial-safe` because you are pre-clearing rights before upload.
If a specific image later looks questionable, downgrade it manually in the catalog.

## Folder Summary

- `photos/uploads/`: new files you dropped in from iCloud or another source
- `photos/originals/`: renamed master copies used by the workflow
- `photos/derived/web/`: web-ready assets
- `photos/derived/social/`: smaller assets for posts
- `photos/derived/marketplace/`: export-ready assets for stock platforms
- `photos/data/images.csv`: the master catalog
- `photos/data/collections.json`: collection definitions

## Recommended First Batch

For your first pass:

- choose 10 to 20 strong outdoor images
- group them into 2 or 3 obvious themes
- keep weak or uncertain files out of the system

This keeps the catalog clean and makes the first review manageable.
