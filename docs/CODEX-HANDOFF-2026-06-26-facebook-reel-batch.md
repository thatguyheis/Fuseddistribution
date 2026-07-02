# Codex Handoff: Facebook Reel Batch

**Date:** 2026-06-26  
**Owner:** Nick  
**Status:** Implemented and verified locally. Claude should review before any commit/push.

## What Changed

Added a compact Facebook Professional Mode handoff workflow for manual browser posting in batches of 7.

Primary command:

```bash
npm run social:facebook:batch
```

This writes local, gitignored files:

- `.facebook-reels-batch.md`
- `.facebook-reels-batch.json`

The Markdown output is intentionally minimal for lower token usage when using it as a browser-posting reference. It includes only:

- section grouped by `Silver` and `Technology`
- title
- matching blog URL
- Facebook text
- short reel text sample

It intentionally does not include MP4 paths, hosted URLs, source script paths, upload instructions, or checklists.

## Files Changed

- `public/blog/scripts/prepare-facebook-reel-batch.mjs`
- `package.json`
- `.gitignore`
- `SOCIAL-SOP.md`
- `video/REEL-SOP.md`

## Current Generated Batch

Current generated `.facebook-reels-batch.md` has 7 posts:

- Silver: 5
- Technology: 2

Current skipped items are missing rendered MP4s:

- `silver-as-emergency-money-why-it-works`
- `mobile-website-speed-why-it-matters-for-local-business`
- `is-silver-a-good-hedge-against-inflation`
- `silver-etf-vs-physical-silver-tax-differences`

The generated files are ignored by git and are for local working use only.

## Nick Workflow

1. Run:

```bash
npm run social:facebook:batch
```

2. Open `.facebook-reels-batch.md`.
3. Use the grouped copy reference while posting through the Facebook browser tool.
4. After posting a batch, mark completed slugs:

```bash
npm run social:facebook:batch -- --mark-posted=slug-one,slug-two
```

This updates `.facebook-reels-posted.json`, so future batches skip those reels.

## Claude Review Notes

Before committing:

1. Read `AGENTS.md` and `CLAUDE.md`.
2. Do not push.
3. Review the changed files listed above.
4. Verify:

```bash
node --check public/blog/scripts/prepare-facebook-reel-batch.mjs
npm run social:facebook:batch
```

5. Confirm `.facebook-reels-batch.md` is grouped by `Silver` then `Technology`.
6. Confirm generated batch files remain gitignored.

Suggested local commit message if approved:

```text
feat(social): add grouped facebook reel batch handoff
```
