# Book Factory Owner Loop Status

- Date: 2026-07-08
- Workspace: `/Users/nick/projects/fuseddistribution`
- Active title: `richest-man-in-babylon`
- Active adaptation: *The Richest Dev in the Valley*

## Commands Run

- `node book-factory/scripts/book-factory.mjs back-cover-sample richest-man-in-babylon`
- `node book-factory/scripts/assemble-print-master.mjs richest-man-in-babylon`
- `node book-factory/scripts/book-factory.mjs status`
- `npm run test:book`

## State Changes

- Added a formal `back-cover-sample` gate to the deterministic Book Factory CLI.
- Added `owner-loop`, which advances one safe step and stops at rights, review, or packaging gates.
- Updated daily and weekly automation specs to run in `/Users/nick/projects/fuseddistribution` instead of the prior sandbox path.
- Added the daily owner-loop automation spec and owner prompt context.
- Added the back-cover sample review prompt.
- Refreshed the Babylon back-cover sample.
- Continued the Babylon manuscript with `Afterword: The System Is Boring For A Reason`.
- Added the matching `13_afterword.md` chapter asset.
- Regenerated the Babylon print master so the print package includes the afterword.

## Current Registry Status

- `richest-man-in-babylon`: `ready-for-kdp`, rights confirmed, no pending review.
- `as-a-man-thinketh`: `ready-for-kdp`, rights confirmed, no pending review.
- `acres-of-diamonds`: `ready-for-kdp`, rights confirmed, no pending review.
- `how-to-win-friends-and-influence-people`: `researched`, rights need review, blocked from advancement.
- `think-and-grow-rich`: `researched`, rights need review, blocked from advancement.

## Rights Notes

- Duke Law's Public Domain Day 2026 summary states that works from 1930 entered the U.S. public domain on January 1, 2026, and notes that the site is addressing U.S. law only: https://web.law.duke.edu/cspd/publicdomainday/2026/
- The current 1930s candidates in this registry are 1936 and 1937 publications, not 1930 publications.
- Those later 1930s candidates remain `needs-review` and must not advance beyond research until title-specific U.S. public-domain evidence is documented with source citations.

## Verification

- `npm run test:book` passed: 6 tests, 0 failures.
- `node book-factory/scripts/book-factory.mjs status` completed and confirmed the 1936/1937 candidates remain blocked.

## Next Approval Needed

- Review the refreshed Babylon back-cover sample at `book-factory/titles/richest-man-in-babylon/chapter_manuscripts/01_back_cover.md`.
- Review the new Babylon afterword in `book-factory/titles/richest-man-in-babylon/manuscript.md` and `book-factory/titles/richest-man-in-babylon/chapter_manuscripts/13_afterword.md`.

## Next Safe Automation Action

- Codex automation `book-factory-daily-audit-and-status` has been updated to `Daily Book Factory Owner Loop`.
- On the next daily run, it should execute `node book-factory/scripts/book-factory.mjs owner-loop` and stop if no safe state transition is available.
