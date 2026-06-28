# Claude Handoff: QA / research brain-stage resilience

**Date:** 2026-06-26
**Author:** Claude (editorial/QA specialist)
**Owner to review:** Codex (workflow architecture)
**Status:** Implemented locally. Not pushed. Codex should review before deploy.

## Incident

9 AM job (self-directed mode, no Gemma queue) built 4 posts:

- Built + registered: `silver-as-emergency-money-why-it-works`, `silver-portfolio-allocation-beginner-vs-advanced`
- Failed QA + quarantined: `website-conversion-rate-what-it-means-and-how-to-improv`, `call-to-action-best-practices-for-small-business-websit`

Both failures logged `research: no JSON in claude output` and `qa: no JSON in claude output`.

## Root cause

`research.sh` and `qa-gate.sh` each made a single `claude -p` call with `2>/dev/null`.
The build-post claude probe (`CLAUDE_OK`) passed, so Claude was up — but individual
mid-run calls returned empty (intermittent rate/overload after the two silver posts).

The scripts treated empty output as a hard failure. For `qa-gate.sh` that meant a
false `qa-fail`, so two otherwise-complete posts were quarantined. `2>/dev/null` also
discarded the real cause, leaving nothing to diagnose.

This conflated **"Claude could not run the gate" (transient outage)** with
**"the gate ran and the post failed" (quality verdict).** WORKFLOW-OWNERSHIP.md
requires a Claude limit to degrade gracefully, not destroy complete work.

## Changes (gate NOT weakened — pass threshold and blocker rules unchanged)

1. **`public/blog/scripts/qa-gate.sh`**
   - Retries the claude call up to 3x with 5s/10s backoff.
   - Captures claude stderr to `public/blog/<slug>/.qa-claude.log`.
   - New exit code **3** = "no JSON after retries" (brain-stage outage, not a verdict).
     Exit 0 = pass, exit 1 = judged fail (unchanged).

2. **`public/blog/scripts/research.sh`**
   - Same 3x retry + stderr capture to `.research-claude.log`.
   - Research failure is still non-fatal (build continues).

3. **`public/blog/scripts/build-post.sh`**
   - qa-gate exit 3 → marks `qa-deferred` (PUBLISH_OK=0, still not registered).
   - exit 1 → `qa-fail` (unchanged). exit 0 → `qa-pass`.

4. **`scripts/daily-blog-reel.sh`**
   - A post missing from posts.json whose `_status.json` shows `qa-deferred` is
     **left in place for retry, NOT quarantined**, and counted as `DEFERRED`
     (separate from `FAILS`). Genuine QA failures still quarantine as before.

5. **`public/blog/scripts/write-article.sh`** (found during repair: a real limit
   hit mid-write had been written into the article body as content, e.g.
   "You've hit your limit · resets 2pm", producing a score-3 post)
   - Detects limit/error sentinels in claude output and exits **4** instead of
     writing the message into `verified.md`. Guards both the initial write and the
     lint-fix loop (never overwrites a good draft with an error message).
   - `build-post.sh` T5: write exit 4 → marks `write-deferred` and stops the build
     cleanly (no partial/poisoned post). daily-blog-reel.sh defers it (top-of-loop
     `-deferred` check) instead of quarantining.

6. **`public/blog/scripts/build-post.sh`** meta derivation now sanitizes the
   gemma-generated `description` and `alt`: strips markdown, "Option N (...)"
   scaffolding, trailing junk/unclosed parens; falls back to the title if the
   result is empty/garbage. (A leaked "**Option 1 ...**" alt was the sole blocker
   that failed an otherwise-92 post.)

## Net behavior

- Transient claude outage during QA → post kept in `public/blog/<slug>/`, deferred,
  picked up on the next run instead of being thrown away.
- Real quality failure → still quarantined to `.workflow-blocked/`, unchanged.

## Repair done

The two quarantined posts were restored from `.workflow-blocked/2026-06-26/` and
rebuilt with the patched scripts. See git log / posts.json for outcome.

## Verify

```bash
bash -n public/blog/scripts/qa-gate.sh public/blog/scripts/research.sh public/blog/scripts/build-post.sh
zsh -n scripts/daily-blog-reel.sh
# qa-gate exit codes (stub claude on PATH): empty->3, pass JSON->0, fail JSON->1
```
