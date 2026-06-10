# Proactive Fix Protocol — Pipeline Self-Healing

Date: 2026-06-10
Status: Phase 1 implemented, Phase 2-3 planned

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
- Alert channel: failures push a message via OpenClaw so Nick sees blockers on his phone same-day

## Decision — RESOLVED 2026-06-10

Nick granted standing permission for pipeline-originated pushes to `main`, **content commits only** (blog posts, reels, sitemap, posts.json, topic-history, social-copy). Recorded in `~/.claude/CLAUDE.md` hard rules. Force pushes, rewrites of pushed history, and non-content pushes still require explicit permission each time.
