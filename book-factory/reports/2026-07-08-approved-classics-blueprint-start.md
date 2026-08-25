# Approved Classics Blueprint Start

- Date: 2026-07-08
- Workspace: `/Users/nick/projects/fuseddistribution`
- Scope: start production on newly approved public-domain classics

## Commands Run

- `npm run books:blueprint -- art-of-public-speaking`
- `npm run books:blueprint -- how-to-live-on-24-hours-a-day`
- `npm run books:blueprint -- way-to-wealth`
- `npm run books:blueprint -- the-go-getter`
- `npm run books:blueprint -- game-of-life-and-how-to-play-it`
- `node book-factory/scripts/book-factory.mjs status`
- `npm run test:book`

## Blueprints Generated

- `book-factory/titles/art-of-public-speaking/adaptation_blueprint.md`
- `book-factory/titles/how-to-live-on-24-hours-a-day/adaptation_blueprint.md`
- `book-factory/titles/way-to-wealth/adaptation_blueprint.md`
- `book-factory/titles/the-go-getter/adaptation_blueprint.md`
- `book-factory/titles/game-of-life-and-how-to-play-it/adaptation_blueprint.md`

## Current Gate State

- `art-of-public-speaking`: `editor-review`, pending `blueprint`
- `how-to-live-on-24-hours-a-day`: `editor-review`, pending `blueprint`
- `way-to-wealth`: `editor-review`, pending `blueprint`
- `the-go-getter`: `editor-review`, pending `blueprint`
- `game-of-life-and-how-to-play-it`: `editor-review`, pending `blueprint`

## Blocked Titles

- `how-to-win-friends-and-influence-people`: remains `researched`, rights `needs-review`
- `think-and-grow-rich`: remains `researched`, rights `needs-review`

## Verification

- `npm run test:book` passed: 6 tests, 0 failures.

## Next Human Approval

Review the five blueprint files. If approved, run:

```bash
npm run books:approve -- art-of-public-speaking blueprint
npm run books:approve -- how-to-live-on-24-hours-a-day blueprint
npm run books:approve -- way-to-wealth blueprint
npm run books:approve -- the-go-getter blueprint
npm run books:approve -- game-of-life-and-how-to-play-it blueprint
```

After blueprint approval, the next safe production step is back-cover sample generation for each title.
