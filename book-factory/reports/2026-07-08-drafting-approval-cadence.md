# Drafting Approval And Cadence

- Date: 2026-07-08
- Workspace: `/Users/nick/projects/fuseddistribution`
- Scope: user approved drafting for the five newly approved public-domain classics

## User Direction

Nick approved drafting for:

- `art-of-public-speaking`
- `how-to-live-on-24-hours-a-day`
- `way-to-wealth`
- `the-go-getter`
- `game-of-life-and-how-to-play-it`

Nick also asked to pick a pace appropriate for ChatGPT Plus limits, schedule it in the SOP, save the plan to memory, and get it done.

## Pace Chosen

- One active title per daily production run.
- Highest-ranked unblocked title first.
- One substantial move per daily run: one blueprint, one back-cover sample, one draft package, one chapter expansion, one manuscript QA pass, or one package/compliance pass.
- For manuscript development, expand one title deeply instead of touching every title shallowly.

## Queue

1. `art-of-public-speaking`
2. `how-to-live-on-24-hours-a-day`
3. `way-to-wealth`
4. `the-go-getter`
5. `game-of-life-and-how-to-play-it`

## Commands Run

- `npm run books:approve -- art-of-public-speaking back-cover-sample`
- `npm run books:approve -- how-to-live-on-24-hours-a-day back-cover-sample`
- `npm run books:approve -- way-to-wealth back-cover-sample`
- `npm run books:approve -- the-go-getter back-cover-sample`
- `npm run books:approve -- game-of-life-and-how-to-play-it back-cover-sample`
- `npm run books:draft -- art-of-public-speaking`
- `npm run books:draft -- how-to-live-on-24-hours-a-day`
- `npm run books:draft -- way-to-wealth`
- `npm run books:draft -- the-go-getter`
- `npm run books:draft -- game-of-life-and-how-to-play-it`
- `node book-factory/scripts/book-factory.mjs status`
- `npm run test:book`

## State Reached

All five titles are now:

- `editor-review`
- pending `draft`

## Manuscript Progress Started

- Expanded `book-factory/titles/art-of-public-speaking/chapter_manuscripts/chapter_01_the-fear-of-the-room.md` from scaffold text into a full opening chapter draft.
- Chapter 1 now has a concrete founder demo scene, a clear explanation of fear as a structure problem, and the core lesson: clear speech begins with clear thinking.

## SOP And Automation Updates

- Added daily drafting pace to `book-factory/README.md`.
- Added production pace and queue to `book-factory/prompts/daily-owner-loop.md`.
- Updated `book-factory/automation/daily-owner-loop.toml`.
- Updated installed Codex automation `book-factory-daily-audit-and-status`.
- Added durable memory file: `book-factory/PRODUCTION_MEMORY.md`.

## Verification

- `npm run test:book` passed: 6 tests, 0 failures.

## Next Safe Action

Continue deep draft expansion for `art-of-public-speaking` with chapter 2, `Think Before You Talk`, one section or chapter at a time, then report progress.
