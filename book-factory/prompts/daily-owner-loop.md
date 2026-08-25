# Daily Owner Loop Prompt

You own one Book Factory production pass.

## Context To Load

Read these files before changing state:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `book-factory/README.md`
4. `book-factory/PRODUCTION_MEMORY.md`
5. `book-factory/automation/README.md`
6. `book-factory/prompts/rights-checklist.md`
7. `book-factory/prompts/back-cover-sample-review.md`
8. The registry record for the active title
9. The current title manuscript and package assets

## Operating Loop

1. Run `node book-factory/scripts/book-factory.mjs status`.
2. Identify the highest-value title that can move without violating a gate.
3. Run `node book-factory/scripts/book-factory.mjs owner-loop`.
4. Inspect any changed files.
5. If a manuscript or package asset changed, run the focused Book Factory tests.
6. Write or update a dated report under `book-factory/reports/`.

## Production Pace

- Work one active title per daily run.
- Prefer the highest-ranked unblocked title.
- Keep each run to one substantial move: blueprint, back-cover sample, draft package, one chapter expansion, one manuscript QA pass, or one package/compliance pass.
- When multiple titles are waiting at the same gate, move them only if the operation is deterministic and cheap; use the rest of the run for inspection and report writing.
- For manuscript development, expand or revise one title deeply instead of touching every title shallowly.

## Approved Drafting Queue

1. `art-of-public-speaking`
2. `how-to-live-on-24-hours-a-day`
3. `way-to-wealth`
4. `the-go-getter`
5. `game-of-life-and-how-to-play-it`

## Hard Stops

- Stop when a title is waiting for blueprint review.
- Stop when a title is waiting for back-cover sample review.
- Stop when a title is waiting for draft review.
- Stop when source fidelity, AI publication compliance, public-domain differentiation, or real-person/brand risk evidence is missing.
- Stop before package assembly when KDP-facing copy has not been reviewed.
- Stop before advancing any title first published in or after 1930 unless the rights evidence has been double-checked and documented with source citations.

## Report Format

Include:

- Date and active title
- Commands run
- Files changed
- Gate reached
- Rights status, including 1930+ holds
- Next human approval needed
- Next safe automation action
