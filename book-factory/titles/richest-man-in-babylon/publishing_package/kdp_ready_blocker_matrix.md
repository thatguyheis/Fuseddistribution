# KDP Ready Blocker Matrix

- Title: The Richest Dev in the Valley
- Source: The Richest Man in Babylon by George S. Clason
- Source year: 1926
- Status: ready-for-kdp
- Prepared on: 2026-08-02
- Purpose: show the uploader the exact blockers that still prevent KDP submission, the local file to resolve each blocker, and the condition that clears it

## Current Submission State

- Local package review is complete enough to hold the title at `ready-for-kdp`.
- Submission is still blocked on human review and final asset-specific AI disclosure confirmation.
- No 1930+ rights hold applies because the source year is 1926.

## Blocking Matrix

| Blocker | What must be confirmed | Source of truth | Clear when | Live KDP impact |
| --- | --- | --- | --- | --- |
| Human package review | The reviewer walked the package in the approved order and confirmed identity, copy, source framing, exports, and upload assets. | `kdp_review_packet.md`, `kdp_final_signoff.md` | Reviewer name, date, and signoff fields are filled in. | Do not submit until the package review is complete. |
| Exact ebook upload file | The final ebook upload file path matches the reviewed manuscript source. | `publication_export_record.md` | Exact ebook path is recorded, marked final, and checked against `manuscript.md`. | Required before ebook upload. |
| Exact print upload file | The final print upload file path matches the reviewed print source. | `publication_export_record.md` | Exact print path is recorded, marked final, and checked against `print_master.md`. | Required before paperback upload. |
| Exact cover upload file | The final cover file path is known and the file matches the approved title and subtitle. | `cover_and_marketing_asset_record.md`, `cover_brief.md` | Exact cover path is recorded and marked final. | Required before cover upload and before the cover AI answer is locked. |
| Interior-image inventory | Either every uploaded interior image path is recorded or the package explicitly records that none are used. | `cover_and_marketing_asset_record.md` | Interior image section is completed with exact paths or an explicit none-used record. | Needed before answering image AI questions in KDP. |
| Marketing-image inventory | Either every uploaded marketing or A+ image path is recorded or the package explicitly records that none are used. | `cover_and_marketing_asset_record.md` | Marketing image section is completed with exact paths or an explicit none-used record. | Needed before answering image AI questions in KDP. |
| Final AI text answer | The uploader confirmed whether AI-generated or materially AI-rewritten text appears in the uploaded manuscript or listing text. | `kdp_ai_answer_matrix.md`, `ai_disclosure_review.md` | The human answer is recorded and matches the final uploaded text assets. | Required for the text disclosure question. |
| Final AI image answers | The uploader confirmed the cover, interior-image, and marketing-image answers from the exact uploaded assets. | `kdp_ai_answer_matrix.md`, `ai_disclosure_review.md`, `cover_and_marketing_asset_record.md` | Every uploaded image slot has a final human answer and any no-image slot is explicitly recorded locally. | Required for the image disclosure questions. |
| Live KDP entry record | The actual values and file paths entered in KDP match the reviewed package. | `kdp_submission_worksheet.md`, `kdp_listing_snapshot.md`, `kdp_submission_field_map.md` | The live session worksheet is filled in during submission. | Required to prove the live KDP draft matches local review. |

## Completion Order

1. Review the package in the order listed in `kdp_review_packet.md`.
2. Record the exact ebook and print upload files in `publication_export_record.md`.
3. Record the exact cover and any image upload files in `cover_and_marketing_asset_record.md`.
4. Choose the AI answers from `kdp_ai_answer_matrix.md` and copy them into `ai_disclosure_review.md`.
5. Enter the live KDP fields using `kdp_listing_snapshot.md` and `kdp_submission_field_map.md`.
6. Record the exact live session values in `kdp_submission_worksheet.md`.
7. Finish human approval in `kdp_final_signoff.md`.

## Blocking Rule

- Do not move this title beyond `ready-for-kdp` until every blocker above is cleared by a human reviewer from the exact upload assets.
