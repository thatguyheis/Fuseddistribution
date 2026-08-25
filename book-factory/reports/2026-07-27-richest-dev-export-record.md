# Book Factory Daily Report - 2026-07-27

- Active title: `richest-man-in-babylon`
- Status before pass: `ready-for-kdp`
- Status after pass: `ready-for-kdp`
- Gate reached: human KDP package review

## Commands Run

- `node book-factory/scripts/book-factory.mjs status`
- `node book-factory/scripts/book-factory.mjs owner-loop`
- `npm run test:book`

## What Advanced

- Added a dedicated publication export record so the human uploader can record the exact ebook and print files intended for KDP upload, not just the source Markdown masters.
- Wired the export checkpoint into the Babylon review packet, submission field map, upload checklist, final signoff sheet, and publication manifest.
- Kept the title at `ready-for-kdp` and did not cross the human package-review or AI-disclosure gates.

## Files Changed

- `book-factory/titles/richest-man-in-babylon/publishing_package/publication_export_record.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_review_packet.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_submission_field_map.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_final_signoff.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/publication_file_manifest.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_upload_checklist.md`
- `book-factory/reports/2026-07-27-richest-dev-export-record.md`

## Rights Status

- `richest-man-in-babylon`: confirmed U.S. public domain. Source year `1926`, so the 1930+ secondary-rights hold does not apply.
- `how-to-win-friends-and-influence-people`: still blocked in research pending double-checked U.S. public-domain evidence with source citations.
- `think-and-grow-rich`: still blocked in research pending double-checked U.S. public-domain evidence with source citations.

## Blocked Items

- `richest-man-in-babylon` cannot move past `ready-for-kdp` until a human completes KDP package review, records the final export and image asset paths, and confirms the final AI-generated-content disclosure answers.
- `art-of-public-speaking`, `how-to-live-on-24-hours-a-day`, `way-to-wealth`, `the-go-getter`, and `game-of-life-and-how-to-play-it` remain blocked at human `draft` approval.

## Next Human Approval Needed

- Human KDP package review for `richest-man-in-babylon`, using `kdp_review_packet.md`, `publication_export_record.md`, and `kdp_final_signoff.md`.

## Next Safe Automation Action

- Hold `richest-man-in-babylon` at `ready-for-kdp` until the human review packet, exact export paths, exact image asset paths, and final AI-disclosure answers are completed.
