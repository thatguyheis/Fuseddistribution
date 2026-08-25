# Book Factory Owner Loop Status

- Date: 2026-07-21
- Workspace: `/Users/nick/projects/fuseddistribution`
- Active title reviewed: `richest-man-in-babylon`
- Active adaptation: *The Richest Dev in the Valley*

## Commands Run

- `node book-factory/scripts/book-factory.mjs status`
- `npm run test:book`

## State Changes

- Advanced `richest-man-in-babylon` by one safe package/compliance move while keeping the title at `ready-for-kdp`.
- Added a publication file manifest that identifies the exact local manuscript and package files the uploader must verify before KDP submission.
- Refreshed the registry review summary so the package-review gate now points to the new manifest in addition to the upload checklist and AI disclosure worksheet.

## Files Changed

- `book-factory/books/richest-man-in-babylon.json`
- `book-factory/titles/richest-man-in-babylon/publishing_package/publication_file_manifest.md`
- `book-factory/PRODUCTION_MEMORY.md`
- `book-factory/reports/2026-07-21-richest-dev-publication-manifest.md`

## Gate Reached

- `richest-man-in-babylon` remains `ready-for-kdp`.
- `art-of-public-speaking`, `how-to-live-on-24-hours-a-day`, `way-to-wealth`, `the-go-getter`, and `game-of-life-and-how-to-play-it` remain `editor-review` with pending gate `draft`.

## Rights Status

- `richest-man-in-babylon`: rights confirmed. Source year 1926, so no 1930+ secondary-rights hold applies.
- `how-to-win-friends-and-influence-people`: remains blocked in `researched` until title-specific 1936 U.S. public-domain evidence with dated citations is recorded.
- `think-and-grow-rich`: remains blocked in `researched` until title-specific 1937 U.S. public-domain evidence with dated citations is recorded.

## Next Approval Needed

- Human KDP package review for `richest-man-in-babylon`.
- Human confirmation of the final AI-generated-content answers using the upload checklist, AI disclosure worksheet, and publication file manifest.
- Human `draft` approval for every title in the current approved drafting queue before any further manuscript or packaging work.

## Next Safe Automation Action

- Hold `richest-man-in-babylon` at `ready-for-kdp` until Nick completes package review and confirms the final AI-disclosure posture from the exact publication files.
- Do not advance the approved drafting queue until a human approves one title at the `draft` gate.
