# Approved Classics Back-Cover Samples

- Date: 2026-07-08
- Workspace: `/Users/nick/projects/fuseddistribution`
- Scope: generate back-cover samples for newly approved classics

## Commands Run

- `npm run books:approve -- art-of-public-speaking blueprint`
- `npm run books:approve -- how-to-live-on-24-hours-a-day blueprint`
- `npm run books:approve -- way-to-wealth blueprint`
- `npm run books:approve -- the-go-getter blueprint`
- `npm run books:approve -- game-of-life-and-how-to-play-it blueprint`
- `node book-factory/scripts/book-factory.mjs back-cover-sample art-of-public-speaking`
- `node book-factory/scripts/book-factory.mjs back-cover-sample how-to-live-on-24-hours-a-day`
- `node book-factory/scripts/book-factory.mjs back-cover-sample way-to-wealth`
- `node book-factory/scripts/book-factory.mjs back-cover-sample the-go-getter`
- `node book-factory/scripts/book-factory.mjs back-cover-sample game-of-life-and-how-to-play-it`
- `node book-factory/scripts/book-factory.mjs status`
- `npm run test:book`

## Back-Cover Samples Generated

- `book-factory/titles/art-of-public-speaking/chapter_manuscripts/01_back_cover.md`
- `book-factory/titles/how-to-live-on-24-hours-a-day/chapter_manuscripts/01_back_cover.md`
- `book-factory/titles/way-to-wealth/chapter_manuscripts/01_back_cover.md`
- `book-factory/titles/the-go-getter/chapter_manuscripts/01_back_cover.md`
- `book-factory/titles/game-of-life-and-how-to-play-it/chapter_manuscripts/01_back_cover.md`

## Generator Fix

The back-cover generator previously inherited finance-specific Babylon language for all titles. It now uses each record's source summary, modern world, target audience, first core lesson, and marketing angles so non-finance titles produce appropriate samples.

## Current Gate State

- `art-of-public-speaking`: `editor-review`, pending `back-cover-sample`
- `how-to-live-on-24-hours-a-day`: `editor-review`, pending `back-cover-sample`
- `way-to-wealth`: `editor-review`, pending `back-cover-sample`
- `the-go-getter`: `editor-review`, pending `back-cover-sample`
- `game-of-life-and-how-to-play-it`: `editor-review`, pending `back-cover-sample`

## Verification

- `npm run test:book` passed: 6 tests, 0 failures.

## Next Human Approval

Review the five back-cover samples. If approved, run:

```bash
npm run books:approve -- art-of-public-speaking back-cover-sample
npm run books:approve -- how-to-live-on-24-hours-a-day back-cover-sample
npm run books:approve -- way-to-wealth back-cover-sample
npm run books:approve -- the-go-getter back-cover-sample
npm run books:approve -- game-of-life-and-how-to-play-it back-cover-sample
```

After approval, the next safe production step is full draft generation.
