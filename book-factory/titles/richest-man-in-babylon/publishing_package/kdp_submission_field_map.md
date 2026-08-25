# KDP Submission Field Map

- Title: The Richest Dev in the Valley
- Source: The Richest Man in Babylon by George S. Clason
- Source year: 1926
- Status: ready-for-kdp
- Prepared on: 2026-07-26
- Purpose: map each KDP upload field to the exact local source file the human uploader should reference during submission, with one locked listing snapshot for the live copy step

## KDP Listing Fields

### Book Title

- KDP field: Book title
- Expected value: `The Richest Dev in the Valley`
- Source of truth: `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_listing_snapshot.md`
- Supporting file: `book-factory/titles/richest-man-in-babylon/publishing_package/package_identity_record.md`
- Human check: confirm the upload form exactly matches the identity record and final cover.

### Subtitle

- KDP field: Subtitle
- Expected value: `Ancient Wealth Laws Rewritten for the Age of Startups, AI, and Bitcoin`
- Source of truth: `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_listing_snapshot.md`
- Supporting file: `book-factory/titles/richest-man-in-babylon/publishing_package/package_identity_record.md`
- Human check: confirm the upload form, manuscript title page, print file, and final cover all match.

### Contributor And Source Framing

- KDP field: Contributor fields and any edition notes
- Expected value: contributor framing must present the book as a fictionalized modern adaptation of George S. Clason's 1926 public-domain classic, not as original-author text.
- Source of truth: `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_listing_snapshot.md`
- Supporting files: `book-factory/titles/richest-man-in-babylon/publishing_package/package_identity_record.md`, `book-factory/titles/richest-man-in-babylon/publishing_package/metadata.md`
- Human check: confirm the KDP entry does not imply endorsement, collaboration, or newly authored Clason material.

### Book Description

- KDP field: Description
- Expected value: use the reviewed copy in `kdp_description.md`.
- Source of truth: `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_listing_snapshot.md`
- Supporting file: `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_description.md`
- Human check: confirm the uploaded description still matches the manuscript and does not overpromise financial outcomes.

### Keywords

- KDP field: Keyword boxes
- Expected value: use the reviewed keyword set in `keywords.md`.
- Source of truth: `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_listing_snapshot.md`
- Supporting file: `book-factory/titles/richest-man-in-babylon/publishing_package/keywords.md`
- Human check: confirm the final entered keywords avoid active brand confusion and match the approved positioning.

## Publication Files

### Ebook Manuscript File

- KDP field: Ebook manuscript upload
- Expected value: the exact exported ebook file intended for upload.
- Source of truth: `book-factory/titles/richest-man-in-babylon/publishing_package/publication_export_record.md`
- Supporting files: `book-factory/titles/richest-man-in-babylon/manuscript.md`, `book-factory/titles/richest-man-in-babylon/publishing_package/publication_file_manifest.md`
- Human check: confirm the uploaded ebook file path is recorded in the export record and matches the reviewed manuscript source.

### Print Interior File

- KDP field: Paperback interior upload
- Expected value: the exact exported print-interior file intended for upload.
- Source of truth: `book-factory/titles/richest-man-in-babylon/publishing_package/publication_export_record.md`
- Supporting files: `book-factory/titles/richest-man-in-babylon/print_package/print_master.md`, `book-factory/titles/richest-man-in-babylon/publishing_package/publication_file_manifest.md`
- Human check: confirm the uploaded print file path is recorded in the export record and matches the reviewed print master.

### Cover File

- KDP field: Cover upload
- Expected value: the exact final cover file path recorded before submission.
- Source of truth: `book-factory/titles/richest-man-in-babylon/publishing_package/cover_and_marketing_asset_record.md`
- Supporting file: `book-factory/titles/richest-man-in-babylon/publishing_package/cover_brief.md`
- Human check: confirm the uploaded cover path is recorded, final, and matches the approved title and subtitle.

### Interior And Marketing Images

- KDP field: Interior image and A+ or marketing image uploads, if used
- Expected value: exact local file paths recorded before submission, or an explicit record that no such images are included.
- Source of truth: `book-factory/titles/richest-man-in-babylon/publishing_package/cover_and_marketing_asset_record.md`
- Supporting file: `book-factory/titles/richest-man-in-babylon/publishing_package/ai_disclosure_review.md`
- Human check: record every uploaded image path or explicitly record that none are used.

## AI Disclosure Fields

### AI Generated Text

- KDP field: AI-generated text disclosure
- Expected value: answer from the human review of the exact publication files.
- Source of truth: `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_ai_answer_matrix.md`
- Supporting file: `book-factory/titles/richest-man-in-babylon/publishing_package/ai_disclosure_review.md`
- Human check: do not answer from memory. Review the exact manuscript and listing text used in submission.

### AI Generated Cover, Interior, And Marketing Images

- KDP field: AI-generated image disclosures
- Expected value: answers from the human review of the exact uploaded image assets.
- Source of truth: `book-factory/titles/richest-man-in-babylon/publishing_package/kdp_ai_answer_matrix.md`
- Supporting files: `book-factory/titles/richest-man-in-babylon/publishing_package/ai_disclosure_review.md`, `book-factory/titles/richest-man-in-babylon/publishing_package/cover_and_marketing_asset_record.md`
- Human check: do not submit until every uploaded image asset has a recorded AI answer or is explicitly marked not applicable.
- Live entry rule: `not-finalized` and `not-applicable` are local review states, not live KDP answers.
- Live entry rule: when no interior or marketing image file is uploaded, keep `not-applicable` in the local review packet and enter `no` in KDP if the form asks whether uploaded images were AI-generated.
- Live entry rule: when an image file is uploaded, enter only `yes` or `no` in KDP based on the exact uploaded asset.

## Submission Order

1. Review the package in the order listed in `kdp_review_packet.md`.
2. Keep `kdp_listing_snapshot.md` open while entering KDP title, subtitle, contributor framing, description, and keywords.
3. Use this field map while entering data into KDP so each form field is matched to the correct local file.
4. Use `kdp_ai_answer_matrix.md` before answering any KDP AI-disclosure field.
5. Record the exact entered values and selected files in `kdp_submission_worksheet.md` during the live session.
6. Complete `kdp_final_signoff.md` after the field-by-field review is done.

## Reviewer Record

- Reviewer:
- Review date:
- Title and subtitle fields confirmed:
- Contributor framing confirmed:
- Description confirmed:
- Keywords confirmed:
- Ebook export confirmed:
- Print export confirmed:
- Cover path confirmed:
- Image paths confirmed:
- AI disclosure answers confirmed:
- Notes:
