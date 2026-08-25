# Book Factory Daily Report - 2026-07-25

- Active title: `richest-man-in-babylon`
- Working title: *The Richest Dev in the Valley*

## Summary

- Advanced `richest-man-in-babylon` by one safe package/compliance move while keeping the title at `ready-for-kdp`.
- Added a dedicated KDP review packet so the human uploader can review the local package in one fixed order before final signoff.
- Refreshed the registry and package-review checklists so the new review packet is part of the required human upload flow.

## Commands Run

- `node book-factory/scripts/book-factory.mjs status`
- `npm run test:book`

## Files Changed

- `book-factory/books/richest-man-in-babylon.json`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_review_packet.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/publication_file_manifest.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_upload_checklist.md`
- `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_final_signoff.md`
- `book-factory/reports/2026-07-25-richest-dev-kdp-review-packet.md`

## Gate Reached

- `richest-man-in-babylon` remains `ready-for-kdp`.
- Human `kdpPackageReview` is still the blocking gate.

## Rights Status

- `richest-man-in-babylon`: U.S. public domain confirmed. Source year `1926`, so no 1930+ second-review hold applies.
- `how-to-win-friends-and-influence-people`: remains research-only because it was first published in `1936` and still needs the documented second U.S. rights review with dated source citations.
- `think-and-grow-rich`: remains research-only because it was first published in `1937` and still needs the documented second U.S. rights review with dated source citations.

## Next Human Approval Needed

- Nick or the uploader must complete the KDP package review and fill in:
  - `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_review_packet.md`
  - `book-factory/titles/richest-man-in-babylon/publishing_package/cover_and_marketing_asset_record.md`
  - `book-factory/titles/richest-man-in-babylon/publishing_package/ai_disclosure_review.md`
  - `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_final_signoff.md`

## Next Safe Automation Action

- Hold `richest-man-in-babylon` at `ready-for-kdp` until the human KDP review packet is completed and the final AI-disclosure answers are confirmed from the exact upload assets.
- Keep `art-of-public-speaking` and the rest of the approved drafting queue stopped at the human `draft` gate.
