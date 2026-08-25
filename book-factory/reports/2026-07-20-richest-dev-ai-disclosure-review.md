# Book Factory Owner Loop Status

- Date: 2026-07-20
- Workspace: `/Users/nick/projects/fuseddistribution`
- Active title: `richest-man-in-babylon`
- Active adaptation: *The Richest Dev in the Valley*

## Commands Run

- `node book-factory/scripts/book-factory.mjs status`

## State Changes

- Completed a focused AI disclosure prep pass on the highest-ranked unblocked title, `richest-man-in-babylon`.
- Added a dedicated review worksheet that separates manuscript, cover, interior-image, and marketing-image disclosure confirmations for the human KDP uploader.
- Refreshed the Babylon registry record so the package-review state points to the new AI disclosure worksheet as part of the final upload gate.

## Files Changed

- `book-factory/books/richest-man-in-babylon.json`
- `book-factory/titles/richest-man-in-babylon/publishing_package/ai_disclosure_review.md`
- `book-factory/PRODUCTION_MEMORY.md`
- `book-factory/reports/2026-07-20-richest-dev-ai-disclosure-review.md`

## Gate Reached

- `richest-man-in-babylon` remains `ready-for-kdp`.
- The title still stops at human KDP package review and final AI disclosure confirmation.

## Rights Status

- `richest-man-in-babylon`: rights confirmed. Source year 1926, so no 1930+ secondary-rights hold applies.
- `how-to-win-friends-and-influence-people`: remains blocked in `researched` until title-specific 1936 U.S. public-domain evidence with dated citations is recorded.
- `think-and-grow-rich`: remains blocked in `researched` until title-specific 1937 U.S. public-domain evidence with dated citations is recorded.

## Next Approval Needed

- Human KDP package review for `richest-man-in-babylon`.
- Human confirmation of the final AI-generated-content answers using the new worksheet and the existing upload checklist.

## Next Safe Automation Action

- Hold `richest-man-in-babylon` at `ready-for-kdp` until Nick reviews the package and the uploader records final AI disclosure answers.
- Do not advance drafting-queue titles past their human `draft` gates.
