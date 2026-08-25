# Book Factory

This subsystem turns classic-book adaptation work into a repeatable, reviewable pipeline for public-domain titles.

## Workflow

1. `npm run books:discover`
   Refresh candidate rankings and write `candidate_brief.md` files.
2. `npm run books:verify-rights -- <slug>`
   Confirm a title is safe to move forward under the current rights record.
3. `npm run books:blueprint -- <slug>`
   Generate `adaptation_blueprint.md`, including the source-aligned cast map, and move the title into editorial review.
4. `npm run books:approve -- <slug> blueprint`
   Human approval gate for the blueprint.
5. `node book-factory/scripts/book-factory.mjs back-cover-sample <slug>`
   Generate the back-cover sample and stop for review before full drafting.
6. `npm run books:approve -- <slug> back-cover-sample`
   Human approval gate for the positioning, promise, and reader fit before drafting.
7. `npm run books:draft -- <slug>`
   Generate manuscript assets and move the title back into editorial review.
8. `npm run books:approve -- <slug> draft`
   Human approval gate for the manuscript.
9. Complete source-fidelity and AI/publication compliance review.
   Compare the manuscript against the source lesson map, verify differentiation, record AI-use classification, and resolve public-figure or trademark risks before packaging.
10. `npm run books:package -- <slug>`
   Generate the KDP-facing package after approval.
11. `node book-factory/scripts/assemble-print-master.mjs <slug>`
   Build the print master after KDP package review.

## Directory Layout

- `books/*.json`: machine-readable registry records
- `prompts/*.md`: reusable prompt templates and style rules
- `reviews/*.md`: human review reports, source comparisons, and SOP audits
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
- Public-domain publishing also requires differentiation evidence. The pipeline should record how the title is transformed, annotated, illustrated, translated, or otherwise value-added before KDP packaging.
- AI-generated text, images, or translation must be classified and disclosed according to the current KDP form. AI-assisted editing still requires human review for quality, rights, accuracy, and customer experience.
- Character names should stay visibly connected to the source work wherever practical. Use parody through fictional composite archetypes, modern roles, and setting details, not direct public-figure names or near-likenesses.
- The generation logic is deterministic and file-backed. It is designed to work without external APIs, while the prompt files support future Codex or LLM-driven refinement.
- The current house style is based on the user's existing modernized adaptation samples: faithful core lessons, a sharper contemporary voice, and builder-oriented examples.
- For recurring runs, `node book-factory/scripts/book-factory.mjs owner-loop` advances exactly one safe deterministic step and stops at rights, back-cover, draft, or packaging review gates.

## Daily Drafting Pace

- Work one active title per daily production run unless Nick explicitly asks for a broader pass.
- Prioritize the highest-ranked title that is not blocked by rights or review gates.
- For ChatGPT Plus-friendly usage, a daily run should complete one substantial move: one blueprint, one back-cover sample, one draft package, one manuscript chapter expansion, or one focused QA/package pass.
- Do not attempt to fully rewrite multiple books in one run. Keep context concentrated so the title quality improves instead of producing thin volume.
- Current approved drafting queue starts with `art-of-public-speaking`, then `how-to-live-on-24-hours-a-day`, `way-to-wealth`, `the-go-getter`, and `game-of-life-and-how-to-play-it`.
