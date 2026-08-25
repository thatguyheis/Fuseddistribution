# KDP AI Answer Matrix

- Title: The Richest Dev in the Valley
- Source: The Richest Man in Babylon by George S. Clason
- Source year: 1926
- Status: ready-for-kdp
- Prepared on: 2026-07-29
- Purpose: give the human uploader one decision sheet for the exact AI-generated-content answers that must be entered in KDP from the final publication assets

## How To Use This Matrix

1. Open the exact manuscript, cover, interior-image, and marketing-image files intended for upload.
2. Open `cover_and_marketing_asset_record.md`, `publication_export_record.md`, and `ai_disclosure_review.md`.
3. Use the decision rules below to choose the answer for each KDP AI field from the final files, not from memory.
4. Record the chosen answers in `ai_disclosure_review.md`, `kdp_submission_worksheet.md`, and `kdp_final_signoff.md`.

## Local Review Terms Vs Live KDP Answers

- `not-finalized` is a local blocker state only. It means the exact uploaded file path is still unknown, so do not answer the live KDP field yet.
- `not-applicable` is a local bookkeeping state only. Use it in the local review when no interior or marketing image file will be uploaded for that slot.
- The live KDP form still needs a final yes-or-no answer for every image disclosure field that appears in the submission flow.
- When no interior or marketing image is being uploaded, keep `not-applicable` in the local package records and enter `no` in KDP if the form asks whether uploaded images were AI-generated.
- When an image file is being uploaded, the final live KDP answer must be `yes` or `no`, never `not-applicable`.

## Decision Rules

### 1. Book Text AI Answer

- Review these files:
  - `book-factory/titles/richest-man-in-babylon/manuscript.md`
  - `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_description.md`
  - `book-factory/titles/richest-man-in-babylon/publishing_package/publication_export_record.md`
- Answer `yes` when any AI-based tool generated or materially rewrote text that appears in the uploaded manuscript or listing text.
- Answer `no` only when the published text was written and revised without AI-generated or AI-rewritten text appearing in the final upload.
- Blocking rule: if the uploaded manuscript file is not yet finalized in `publication_export_record.md`, do not lock this answer.

### 2. Cover Image AI Answer

- Review these files:
  - final cover file intended for upload
  - `book-factory/titles/richest-man-in-babylon/publishing_package/cover_and_marketing_asset_record.md`
- Answer `yes` when the final cover image was created or materially transformed by an AI-based image tool.
- Answer `no` only when the final uploaded cover image was not AI-generated or AI-transformed.
- Answer `not-finalized` when the exact uploaded cover file path is still blank or may change.
- Blocking rule: do not mark the KDP disclosure ready until the exact cover path and answer are recorded together.

### 3. Interior Image AI Answer

- Review these files:
  - final print interior file intended for upload
  - any interior image asset files, if present
  - `book-factory/titles/richest-man-in-babylon/publishing_package/cover_and_marketing_asset_record.md`
- Answer `not-applicable` in the local review when no interior image assets are part of the publication package.
- Answer `yes` when any uploaded interior image was created or materially transformed by AI.
- Answer `no` when interior images are present but none were AI-generated or AI-transformed.
- Live KDP entry rule: if no interior image assets are uploaded, enter `no` in KDP when the form asks whether uploaded interior images were AI-generated.
- Blocking rule: if interior images are later added, update this matrix, the asset record, and the AI disclosure review before submission.

### 4. Marketing Or A+ Image AI Answer

- Review these files:
  - any A+ or marketing image files intended for upload
  - `book-factory/titles/richest-man-in-babylon/publishing_package/cover_and_marketing_asset_record.md`
- Answer `not-applicable` in the local review when no A+ or marketing images will be uploaded.
- Answer `yes` when any uploaded marketing image was created or materially transformed by AI.
- Answer `no` when marketing images are present but none were AI-generated or AI-transformed.
- Live KDP entry rule: if no A+ or marketing image files are uploaded, enter `no` in KDP when the form asks whether uploaded marketing images were AI-generated.
- Blocking rule: do not submit if image uploads are planned but their exact paths and AI answers are not recorded.

## Final Ready Check

- KDP disclosure is ready only when:
  - `publication_export_record.md` names the exact ebook and print upload files
  - `cover_and_marketing_asset_record.md` names the exact uploaded cover and any image assets, or explicitly records none
  - `ai_disclosure_review.md` contains the final human answers
  - `kdp_submission_worksheet.md` records the answers actually entered in the live KDP session
  - `kdp_final_signoff.md` confirms the reviewer used this matrix

## Reviewer Record

- Reviewer:
- Review date:
- Book text AI answer chosen:
- Cover image AI answer chosen:
- Interior image AI answer chosen:
- Marketing image AI answer chosen:
- KDP disclosure ready:
- Notes:
