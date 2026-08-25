# Book Factory Owner Loop Status

- Date: 2026-07-18
- Workspace: `/Users/nick/projects/fuseddistribution`
- Active title: `richest-man-in-babylon`
- Active adaptation: *The Richest Dev in the Valley*

## Commands Run

- `node book-factory/scripts/book-factory.mjs status`
- `npm run test:book`

## State Changes

- Completed a focused KDP upload-prep pass on the highest-ranked unblocked title, `richest-man-in-babylon`.
- Added a single upload checklist artifact that consolidates local rights status, differentiation evidence, package-review checkpoints, and the remaining AI-generated-content disclosure questions.
- Refreshed the Babylon registry record so the KDP package review note points to the new upload checklist instead of leaving the final review posture implicit.

## Files Changed

- `book-factory/books/richest-man-in-babylon.json`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_upload_checklist.md`
- `book-factory/PRODUCTION_MEMORY.md`
- `book-factory/reports/2026-07-18-richest-dev-kdp-upload-checklist.md`

## Gate Reached

- `richest-man-in-babylon` remains `ready-for-kdp`.
- The title is now better prepared for human KDP review, but it still stops at that approval gate and at final AI-disclosure confirmation.

## Rights Status

- `richest-man-in-babylon`: rights confirmed. Source year 1926, so no 1930+ secondary-rights hold applies.
- `how-to-win-friends-and-influence-people`: remains blocked in `researched` until title-specific 1936 U.S. public-domain evidence with dated citations is recorded.
- `think-and-grow-rich`: remains blocked in `researched` until title-specific 1937 U.S. public-domain evidence with dated citations is recorded.

## Next Approval Needed

- Human KDP package review for `richest-man-in-babylon`, with explicit confirmation of the final AI-generated-content answers before upload.

## Next Safe Automation Action

- Hold `richest-man-in-babylon` at `ready-for-kdp` until Nick reviews the KDP package and confirms the AI-disclosure posture using the new upload checklist.
- Do not advance drafting-queue titles past their human `draft` gates.
