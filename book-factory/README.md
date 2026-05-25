# Book Factory

This subsystem turns classic-book adaptation work into a repeatable, reviewable pipeline for public-domain titles.

## Workflow

1. `npm run books:discover`
   Refresh candidate rankings and write `candidate_brief.md` files.
2. `npm run books:verify-rights -- <slug>`
   Confirm a title is safe to move forward under the current rights record.
3. `npm run books:blueprint -- <slug>`
   Generate `adaptation_blueprint.md` and move the title into editorial review.
4. `npm run books:approve -- <slug> blueprint`
   Human approval gate for the blueprint.
5. `npm run books:draft -- <slug>`
   Generate manuscript assets and move the title back into editorial review.
6. `npm run books:approve -- <slug> draft`
   Human approval gate for the manuscript.
7. `npm run books:package -- <slug>`
   Generate the KDP-facing package after approval.

## Directory Layout

- `books/*.json`: machine-readable registry records
- `prompts/*.md`: reusable prompt templates and style rules
- `scripts/book-factory.mjs`: CLI for the workflow
- `tests/*.mjs`: pipeline regression tests
- `titles/<slug>/`: generated artifacts per book

## Statuses

- `researched`
- `rights-cleared`
- `blueprint-ready`
- `drafting`
- `editor-review`
- `approved-for-packaging`
- `ready-for-kdp`

## Notes

- Rights verification is a hard gate. The script will not generate blueprints or drafts for titles without a confirmed U.S. public-domain record and verified source availability.
- The generation logic is deterministic and file-backed. It is designed to work without external APIs, while the prompt files support future Codex or LLM-driven refinement.
- The current house style is based on the user's existing modernized adaptation samples: faithful core lessons, a sharper contemporary voice, and builder-oriented examples.
