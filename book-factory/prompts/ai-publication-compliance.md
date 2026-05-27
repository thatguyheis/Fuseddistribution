# AI Publication Compliance Prompt

Use this review for every title before KDP packaging or republication.

## Classify AI Use

Record whether AI tools created or materially transformed any of the following:

- Manuscript text
- Cover image
- Interior images
- Translation
- Book description
- A+ content or marketing images

## KDP Upload Note

KDP currently distinguishes AI-generated content from AI-assisted content. If an AI-based tool created text, images, or translations that appear in the book, treat it as AI-generated for disclosure. If AI only helped brainstorm, edit, refine, or error-check human-created content, treat it as AI-assisted.

## Human Review Checklist

- Check factual claims and financial claims.
- Check source rights and public-domain evidence.
- Check that generated prose is not thin, repetitive, or misleading.
- Check that the description matches the actual manuscript.
- Check that public-domain differentiation is clear.
- Check for real-person, celebrity, brand, or trademark risk.

## Output

Create a compliance note with:

- `ai_text_status`: `none`, `assisted`, or `generated`
- `ai_image_status`: `none`, `assisted`, or `generated`
- `kdp_disclosure_required`: `yes` or `no`
- `human_review_completed_by`
- `blocking_issues`
- `final_upload_notes`
