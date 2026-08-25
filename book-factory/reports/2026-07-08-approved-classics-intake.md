# Approved Classics Intake

- Date: 2026-07-08
- Workspace: `/Users/nick/projects/fuseddistribution`
- Scope: approved public-domain classics for Book Factory development

## User-Approved Titles Added

- `art-of-public-speaking`: *The Art of Public Speaking* by Dale Carnegie and J. Berg Esenwein, 1915
- `way-to-wealth`: *The Way to Wealth* by Benjamin Franklin, 1758
- `game-of-life-and-how-to-play-it`: *The Game of Life and How to Play It* by Florence Scovel Shinn, 1925

## Operator-Selected Additions

- `how-to-live-on-24-hours-a-day`: *How to Live on 24 Hours a Day* by Arnold Bennett, 1908
  - Rationale: best fit for modern technical language around attention, deep work, notification load, side projects, and knowledge-worker self-development.
- `the-go-getter`: *The Go-Getter* by Peter B. Kyne, 1921 or 1922
  - Rationale: best fit for modern operator language around execution, technical sales, implementation ownership, customer success, and reliability.

## Commands Run

- `npm run books:discover`
- `npm run books:verify-rights -- art-of-public-speaking`
- `npm run books:verify-rights -- way-to-wealth`
- `npm run books:verify-rights -- game-of-life-and-how-to-play-it`
- `npm run books:verify-rights -- how-to-live-on-24-hours-a-day`
- `npm run books:verify-rights -- the-go-getter`
- `node book-factory/scripts/book-factory.mjs status`
- `npm run test:book`

## Current Rank And Status

1. `richest-man-in-babylon`: `ready-for-kdp`, score `9.86`
2. `art-of-public-speaking`: `rights-cleared`, score `9.48`
3. `how-to-live-on-24-hours-a-day`: `rights-cleared`, score `9.28`
4. `way-to-wealth`: `rights-cleared`, score `9.26`
5. `the-go-getter`: `rights-cleared`, score `8.76`
6. `as-a-man-thinketh`: `ready-for-kdp`, score `8.3`
7. `acres-of-diamonds`: `ready-for-kdp`, score `8.24`
8. `how-to-win-friends-and-influence-people`: `researched`, rights blocked, score `8.22`
9. `game-of-life-and-how-to-play-it`: `rights-cleared`, score `8.12`
10. `think-and-grow-rich`: `researched`, rights blocked, score `7.58`

## Verification

- `npm run test:book` passed: 6 tests, 0 failures.
- The 1936 and 1937 candidates remain blocked at `researched`.

## Next Safe Automation Action

- The daily owner loop should generate the blueprint for `art-of-public-speaking` next, then stop for blueprint review.
