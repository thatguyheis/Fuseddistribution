# Book Factory Daily Report - 2026-07-31

- Active title: `richest-man-in-babylon`
- Status before pass: `ready-for-kdp`
- Status after pass: `ready-for-kdp`
- Gate reached: human KDP package review

## Commands Run

- `node book-factory/scripts/book-factory.mjs status`
- focused KDP AI-disclosure normalization pass for `richest-man-in-babylon`
- `npm run test:book`

## What Advanced

- Clarified how local review placeholders map to the live Amazon KDP AI-disclosure form so the uploader does not have to improvise yes-or-no answers during submission.
- Tightened the existing review packet by making `not-finalized` an explicit submission blocker and `not-applicable` a local-only state for unused image slots.
- Kept the title at `ready-for-kdp` and did not cross the human package-review or final AI-disclosure gates.

## Files Changed

- `book-factory/books/richest-man-in-babylon.json`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_ai_answer_matrix.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_submission_field_map.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_upload_checklist.md`
- `book-factory/PRODUCTION_MEMORY.md`
- `book-factory/reports/2026-07-31-richest-dev-kdp-ai-normalization.md`

## Rights Status

- `richest-man-in-babylon`: confirmed U.S. public domain. Source year `1926`, so the 1930+ secondary-rights hold does not apply.
- `how-to-win-friends-and-influence-people`: still blocked in research pending double-checked U.S. public-domain evidence with source citations.
- `think-and-grow-rich`: still blocked in research pending double-checked U.S. public-domain evidence with source citations.

## Blocked Items

- `richest-man-in-babylon` cannot move past `ready-for-kdp` until a human completes KDP package review, records the final upload file paths, and confirms the final AI-generated-content disclosure answers from the exact publication assets.
- `art-of-public-speaking`, `how-to-live-on-24-hours-a-day`, `way-to-wealth`, `the-go-getter`, and `game-of-life-and-how-to-play-it` remain blocked at human `draft` approval.

## Next Human Approval Needed

- Human KDP package review for `richest-man-in-babylon`, using `kdp_review_packet.md`, `kdp_submission_field_map.md`, `kdp_submission_worksheet.md`, `kdp_ai_answer_matrix.md`, and `kdp_final_signoff.md`.

## Next Safe Automation Action

- Hold `richest-man-in-babylon` at `ready-for-kdp` until the human reviewer confirms the exact upload assets and resolves the live KDP AI-disclosure answers from those files.
