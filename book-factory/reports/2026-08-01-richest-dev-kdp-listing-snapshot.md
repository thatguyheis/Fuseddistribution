# Book Factory Daily Report - 2026-08-01

- Active title: `richest-man-in-babylon`
- Status before pass: `ready-for-kdp`
- Status after pass: `ready-for-kdp`
- Gate reached: human KDP package review

## Commands Run

- `node book-factory/scripts/book-factory.mjs status`
- focused KDP listing snapshot pass for `richest-man-in-babylon`
- `npm run test:book`

## What Advanced

- Added one locked KDP listing snapshot so the uploader can copy the approved title, subtitle, contributor framing, description, and keywords from one reviewed artifact during the live submission session.
- Wired that snapshot into the Babylon review packet, submission field map, submission worksheet, metadata, upload checklist, final signoff, registry artifact list, and package-review summary.
- Kept the title at `ready-for-kdp` and did not cross the human package-review or final AI-disclosure gates.

## Files Changed

- `book-factory/books/richest-man-in-babylon.json`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_listing_snapshot.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_review_packet.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_submission_field_map.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_submission_worksheet.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_upload_checklist.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_final_signoff.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/metadata.md`
- `book-factory/PRODUCTION_MEMORY.md`
- `book-factory/reports/2026-08-01-richest-dev-kdp-listing-snapshot.md`

## Rights Status

- `richest-man-in-babylon`: confirmed U.S. public domain. Source year `1926`, so the 1930+ secondary-rights hold does not apply.
- `how-to-win-friends-and-influence-people`: still blocked in research pending double-checked U.S. public-domain evidence with source citations.
- `think-and-grow-rich`: still blocked in research pending double-checked U.S. public-domain evidence with source citations.

## Blocked Items

- `richest-man-in-babylon` cannot move past `ready-for-kdp` until a human completes KDP package review, records the final upload file paths, and confirms the final AI-generated-content disclosure answers from the exact publication assets.
- `art-of-public-speaking`, `how-to-live-on-24-hours-a-day`, `way-to-wealth`, `the-go-getter`, and `game-of-life-and-how-to-play-it` remain blocked at human `draft` approval.

## Next Human Approval Needed

- Human KDP package review for `richest-man-in-babylon`, using `kdp_review_packet.md`, `kdp_listing_snapshot.md`, `kdp_submission_field_map.md`, `kdp_submission_worksheet.md`, `kdp_ai_answer_matrix.md`, and `kdp_final_signoff.md`.

## Next Safe Automation Action

- Hold `richest-man-in-babylon` at `ready-for-kdp` until Nick completes package review and confirms the final AI-disclosure posture from the exact upload assets.
