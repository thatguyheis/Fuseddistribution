# Proactive Fix Protocol — Pipeline Self-Healing

Date: 2026-06-10
Status: Phases 1-3 implemented 2026-06-11 (see Implementation Log below)

## Goal

The daily blog + reel pipeline should detect, diagnose, and fix its own failures wherever a fix needs no human credential or irreversible action. When a human IS needed, the log must contain one exact instruction, and everything not blocked must still complete.

## Incident that triggered this (2026-06-10)

1. GitHub Secret Scanning blocked push — live Cloudflare API token in plan doc committed `2df8f14`.
2. Pipeline stopped at the blocker, reported "force push required" (wrong — commit was unpushed, local rewrite sufficed).
3. Reel render for the day's 2 posts never started.
4. Separately: wrangler OAuth session revoked server-side (`Authentication error [code: 10000]`) — deploy impossible without interactive `wrangler login`.

## Authority boundaries (from CLAUDE.md hard rules)

| Action | Allowed autonomously? |
|---|---|
| Local history rewrite of UNPUSHED commits | Yes (reversible via reflog) |
| `git push origin main` | Only with standing permission for pipeline runs (see Phase 2 decision) |
| Force push / rewrite of pushed history | Never — explicit ask each time |
| Deleting files | Never — explicit ask each time |
| Posting to social / external services | Never — explicit ask each time |
| Restarting render / retry / clearing locks / re-running scripts | Yes |
| Rotating credentials | No — flag to Nick with exact dashboard path |

## Phase 1 — DONE (2026-06-10)

- [x] Pre-commit secret scan hook at `.git/hooks/pre-commit` (grep-based, blocks staged credential patterns, `--no-verify` escape for false positives)
- [x] BLOG-SOP §17: secrets rules, unpushed-secret scrub recipe, wrangler auth-failure recovery, pipeline blocker policy
- [x] `account_id` pinned in `wrangler.jsonc` (removes account-lookup as a failure mode)
- [x] Token scrubbed from 7 unpushed commits via `filter-branch`, clean history pushed

## Phase 2 — Pipeline self-healing (next)

1. **Wrap deploy step in `daily-blog-reel.sh`** with retry + diagnosis:
   - On push failure: parse stderr; if secret-scanning block → check `origin/main..main`, if bad commit unpushed → auto-scrub (recipe in SOP §17) → retry push once.
   - On wrangler code 10000 → log `RUN: npx wrangler login` instruction, mark slugs NOT LIVE in log, continue to reel render anyway (render doesn't need deploy).
2. **Decouple reel render from deploy success** — render uses local files; today it silently skipped because the watcher keyed off overall exit. Render should run whenever post folders exist.
3. **Post-run verification step**: curl each new slug for HTTP 200 + sitemap count; write PASS/FAIL per slug as the last log lines.
4. **Session-limit retry**: 2 of last 4 runs (Jun 7, Jun 9) died on Claude session limit at 9:00 AM. Parse "resets Xpm" from output, schedule one-shot retry via `launchctl` or `at` for reset time + 10 min.

## Phase 3 — Hardening (later)

- gitleaks (brew) replacing grep hook for better pattern coverage
- Weekly wrangler auth canary: `npx wrangler whoami` in a Monday pre-flight; alert before the 9 AM run fails
- Log rotation for `~/Library/Logs/daily-blog-reel.log`
- Alert channel: failures surface same-day (OpenClaw no longer installed — pick: macOS notification via osascript, email, or SMS/messaging service; TBD)

## Implementation Log — 2026-06-11

**Phase 2 (in `~/bin/daily-blog-reel.sh`):**
- 2.1 Push/deploy remediation: post-run shell block pushes unpushed commits (secret-scan block → logged scrub instruction + macOS alert, no auto-scrub — too risky unattended), retries `wrangler deploy` once if any slug 404s.
- 2.2 Render decoupling: already satisfied by `render-missing-reels.sh` at 11 AM (renders anything with reel-script.md + no MP4, independent of 9 AM outcome).
- 2.3 Post-run verification: curls every queue slug live (PASS/FAIL per slug), live-vs-local sitemap `<loc>` parity, `RESULT:` summary as last log lines, macOS alert on any FAIL.
- 2.4 Session-limit retry: parses "resets N(am|pm)" from Claude output, schedules one-shot retry at reset + 10 min (6h fallback).

**Phase 3:**
- gitleaks 8.30.1 installed; pre-commit hook uses it (`protect --staged --redact`) with the old grep as fallback; grep gained `cfut_` pattern. KNOWN LIMIT: gitleaks default rules missed a low-entropy `cfut_` test token — custom rule TODO below.
- Auth canary: daily script verifies CLOUDFLARE_API_TOKEN against `/user/tokens/verify` (curl, 30s cap) before the run; alert + continue on failure.
- Log rotation: daily-blog-reel.log rotates at 5 MB (one generation).
- Alert channel: macOS notifications via `osascript` (`notify()` in both `~/bin` scripts) — render fails, push fails, deploy fails, auth canary, FD pressure, verification fails.
- FD guard: `render.mjs` `assertFdHeadroom()` fails fast when kern.num_files > 80% of kern.maxfiles (Node ≥ 24 self-raises per-proc limits, so kernel table is the real failure mode; matches 2026-06-10 crash signatures). `--concurrency=4` cap on remotion render. gemma-nightly has the same pre-flight + stale chrome/workerd cleanup.

**TODO (open):**
- [x] Custom gitleaks rules in `.gitleaks.toml` (cfut_ prefix + known credential var assignments) — hook re-tested, blocks correctly.
- [ ] TCC: keep Full Disk Access granted for /bin/bash + /bin/zsh (Jun 8 exit-126 cause).

## Decision — RESOLVED 2026-06-10

Nick granted standing permission for pipeline-originated pushes to `main`, **content commits only** (blog posts, reels, sitemap, posts.json, topic-history, social-copy). Recorded in `~/.claude/CLAUDE.md` hard rules. Force pushes, rewrites of pushed history, and non-content pushes still require explicit permission each time.
