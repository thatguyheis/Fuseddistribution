# Art Of Public Speaking Manuscript QA

- Date: 2026-07-13
- Active title: `art-of-public-speaking`
- Working title: *Speak So People Ship*
- Production move: focused manuscript QA pass

## Commands Run

- `node book-factory/scripts/book-factory.mjs status`
- `npm run test:book`

## QA Scope

- Chapter continuity across the Nia Vale storyline and supporting cast
- Repetition across chapter lessons and closing frameworks
- Source fidelity against the adaptation blueprint and lesson order
- Draft readiness for the pending human `draft` gate

## What Changed

- Reviewed all six chapter manuscripts, front matter, back-cover sample, blueprint, and registry record for continuity and source-aligned lesson progression.
- Tightened `chapter_06_the-talk-that-ships.md` so the closing chapter focuses on naming one concrete decision instead of repeating chapter 5's ask-to-proof framing too closely.
- Confirmed the manuscript still preserves the intended lesson sequence: fear, structure, concreteness, presence, persuasion, then action.

## QA Findings

- Continuity: pass. Nia, Marcus, Ivy, Lena, Devon, and the Northstar thread progress in a coherent order from failed demo to signed account and stronger internal communication.
- Repetition: minor issue corrected in chapter 6. Remaining repetition reads intentional rather than accidental because the manuscript keeps returning to clarity, proof, and action from different speaking angles.
- Source fidelity: pass for draft review. The manuscript preserves the source book's practical emphasis on preparation, structure, illustration, delivery, persuasion, and action while clearly reframing the setting for modern builders.
- Marketplace risk: low for the current draft. The manuscript consistently frames itself as a modern adaptation and avoids real-person, celebrity, trademark, or original-author endorsement confusion.
- Draft readiness: ready for human draft review. No blocking manuscript-quality defects were found in this pass.

## Files Changed

- `book-factory/titles/art-of-public-speaking/chapter_manuscripts/chapter_06_the-talk-that-ships.md`
- `book-factory/PRODUCTION_MEMORY.md`
- `book-factory/reports/2026-07-13-art-public-speaking-manuscript-qa.md`

## Gate Reached

- Status: `editor-review`
- Pending gate: `draft`

## Rights Status

- `art-of-public-speaking` remains confirmed U.S. public domain based on its 1915 publication year and recorded Project Gutenberg source.
- `how-to-win-friends-and-influence-people` and `think-and-grow-rich` remain blocked in research until their 1930+ rights evidence is double checked and documented with source citations.

## Verification

- `npm run test:book` passed.

## Next Human Approval Needed

- Draft review for `art-of-public-speaking`.

## Next Safe Automation Action

- Hold `art-of-public-speaking` at the human `draft` approval gate.
- After approval, run the source-fidelity, AI-publication-compliance, differentiation, and real-person/brand-risk review pass before any packaging step.
