# Daily Pipeline Incident Review + Hardening Plan

> **For agentic workers:** This is an incident-analysis + ops-hardening plan, not a greenfield feature build. Tasks 1-3 are operational actions (run once, verify, done). Tasks 4-6 are code patches to `scripts/daily-blog-reel.sh` — apply with `superpowers:executing-plans` discipline (one change, verify, commit) rather than `subagent-driven-development`, since this is a single 643-line file with sequencing dependencies, not independent parallelizable units.

**Goal:** Fix two live production defects found while auditing the last 24-72h of pipeline logs — today's blog run silently stalled after 09:00, and `git push` to GitHub has been silently broken since 2026-07-14 09:06 — and close the observability gaps that let both run undetected for hours/days, without weakening the deliberate design that keeps a GitHub outage from blocking Cloudflare deploys.

**Architecture:** Two independent root causes: (1) a git credential-helper mismatch (`osxkeychain` has no GitHub entry; `gh` has a valid token that was never wired to git), (2) a same-day "catch-up" retry mechanism in `daily-blog-reel.sh` that self-schedules via `launchctl bootstrap` and fails silently on its first-ever production use. Neither corrupted any data — the deterministic QA gates and the pending/complete checkpoint files worked exactly as designed. The gap is entirely in *notification*: nothing told Nick either failure had happened.

**Tech Stack:** zsh, launchd (`launchctl bootstrap`/`bootout`/`list`), git + `gh` CLI, Cloudflare Wrangler, Ollama (`gemma3:4b-it-qat`).

---

## Incident Summary

### Timeline (last 72h, PDT)

| When | Event |
|---|---|
| 2026-07-14 09:06:12 | Last commit successfully pushed to `origin/main` (`5b69f0e1`) |
| 2026-07-14 (later that day) | `git push` starts failing: `fatal: Authentication failed` → `fatal: could not read Username for 'https://github.com': Device not configured`. Recovery commits `428fa365`/`055a1217` show a session manually intervened on a stuck run that same day. |
| 2026-07-14 through 2026-07-17 12:20 | 16 commits accumulate locally, never pushed. Wrangler deploy (separate credential, unaffected) keeps publishing every post live. |
| 2026-07-16 09:00-09:0x | Normal run builds and deploys 4 posts successfully. Final step, live sitemap count reads 264 vs local 265 (one-off CDN propagation lag) → run is marked "1 verification failure," the day's pending marker is retained instead of cleared. |
| 2026-07-17 09:00:01 | Run starts, checkpoints today's real queue (4 new posts) into `2026-07-17-pending.json`, then picks up 2026-07-16's retained marker as "oldest pending" (by design — see BLOG-SOP.md "Automated crash recovery"). All 4 of yesterday's posts re-verify fine (sitemap count had caught up overnight). Today's queue is deferred to a self-scheduled follow-up. |
| 2026-07-17 09:00:0x | `schedule_retry` writes `com.nick.daily-blog-reel.retry.plist` (fires 09:05, `BLOG_RUN_DATE=2026-07-17`) and calls `launchctl bootstrap`. Log shows the scheduling message; **no error is logged**. |
| 2026-07-17 09:05 → 13:28 | Nothing happens. No new log entry. The retry plist sits on disk, unloaded (confirmed via `launchctl list`) and un-deleted (confirmed the file's own top-of-script self-cleanup never ran). Today's 4 researched, queued posts (`magnet-test-for-silver-does-it-work`, `ice-test-for-silver-explained`, `content-marketing-ideas-for-local-business`, `how-often-should-a-small-business-blog`) never get built. |
| 2026-07-17 13:28 | This audit starts. Manually re-running the exact `launchctl bootstrap` command from an interactive shell succeeds immediately — the plist and command are valid; whatever failed was specific to that morning's in-agent invocation. |

### Bug 1 — Same-day catch-up retry fails silently (CRITICAL, time-sensitive)

**Symptom:** `public/blog/research/2026-07-17-pending.json` still lists all 4 of today's posts as `remaining` as of 13:28. `posts.json`'s newest entry is still `blogging-for-small-business-does-it-work` dated 2026-07-16. Nothing published today.

**Root cause (confirmed):** `schedule_retry()` in `scripts/daily-blog-reel.sh:66-123` calls `launchctl bootstrap "gui/$(id -u)" "$retry_plist"` and unconditionally logs "Retry scheduled" immediately after, with no check that the job actually loaded. This is the **first-ever production firing** of this code path (only one occurrence in the entire log history). Whatever went wrong left zero trace in a log file that captures both stdout and stderr of everything else in the run — meaning either `bootstrap` returned success without the job actually registering, or something unloaded it before 09:05 without writing to the log. Re-running the identical command by hand right now works, so the plist content and permissions are not the defect; the defect is that the script never verifies its own scheduling succeeded.

**Compounding gap found while tracing this:** even if the retry *had* fired, it would have run with the wrong writer model. The retry plist's `EnvironmentVariables` (lines 104-112) preserve `BLOG_AUTO_DEPLOY`, `BLOG_RUN_DATE`, `CLAUDE_ENABLED`, `HERMES_TAKEOVER`, and `LOCAL_LLM` — but not `HERMES_LOCAL_MODEL`. The main plist pins this to `gemma3:4b-it-qat`. Without it, `daily-blog-reel.sh:15` falls back to `HERMES_LOCAL_MODEL="${HERMES_LOCAL_MODEL:-granite4.1:3b}"`, and granite4.1:3b is the model [[blog_pipeline_hardening]] already identified as producing undersized articles (526 words vs. the 1200-1800 word requirement) that auto-quarantine. A fixed retry mechanism would have silently reproduced the exact model-mismatch incident from 2026-07-07/08.

**Impact if unfixed:** every time the "oldest pending" backlog absorbs the whole run (which is by design whenever yesterday's verification hiccups), today's real queue silently waits for tomorrow's run to treat it as *its* backlog — a one-day-permanent lag with no alert, discovered only by manual audit.

### Bug 2 — `git push` to GitHub has been broken since 2026-07-14 (CRITICAL, not site-breaking)

**Symptom:** 16 local commits sit unpushed (`git log origin/main..HEAD` = 16, oldest 2026-07-14 09:22, newest today 12:20). `git push --dry-run origin main` failed with `fatal: could not read Username for 'https://github.com': Device not configured`.

**Root cause (confirmed):** git's `credential.helper` is `osxkeychain`, and the macOS keychain has no stored GitHub credential (`security find-internet-password -s github.com` / `find-generic-password -s github.com` both return "item not found"). Separately, the `gh` CLI has a fully valid, active token (`gh auth status` → logged in as `thatguyheis`, scopes `gist, read:org, repo`) — but `gh`'s credential store was never wired up as git's credential helper, so plain `git push` never sees it. In a non-interactive script context there's no TTY to prompt for a username, so it fails immediately with "Device not configured" instead of hanging.

**This is not a design bug.** BLOG-SOP.md §"Automated crash recovery" explicitly documents the intended split: *"GitHub synchronization and website deployment are separate outcomes. A GitHub authentication failure is logged as a source-sync warning but must not block Cloudflare deployment... Codex does not push; Claude reviews and pushes the local commits."* The pipeline correctly kept publishing through this outage. What's missing is that no one has performed the "Claude reviews and pushes" step in 3+ days, and there's nothing that would have told anyone it was overdue.

**Fix applied already (safe, reversible, zero blast radius):** ran `gh auth setup-git`, which wires git's credential helper to use `gh`'s existing valid token. Verified with `git push --dry-run origin main` (no mutation) — now returns a clean `5b69f0e1..1be046a0  main -> main`, confirming the push would succeed. **Nothing has actually been pushed yet** — see Task 2, needs your go-ahead per the standing git-push rule.

### What's healthy (no action needed)

- **Spot price KV pipeline:** quota-fix commit `0fd38f2b` is live and pushed (predates the Jul 14 outage). Live `/api/spot` returns the fixed `prev`-field shape. [[spot_price_kv_pipeline]] memory is correct and current.
- **Nightly research queue-prep (`gemma-research`, 23:00):** exit 0 every night this week, queue written on schedule including tonight's (2026-07-17) file for tomorrow.
- **`render-missing-reels` (11am):** working as designed, hit its daily render budget (4) and logged "remaining stale reels will continue tomorrow." Current backlog ≈10 posts without a rendered MP4 — steady lag, not runaway; worth a glance if it keeps growing but not urgent.
- **Deterministic QA gates:** correctly quarantined 4 bad posts in the last week (`silver-standard-vs-gold-standard-explained` — incomplete discussion question; `why-silver-was-used-as-currency-for-5000-years` — too few body chunks for a reel; `silver-and-the-bretton-woods-collapse-explained` and `silver-monetary-history-complete-guide` — brain QA fail). All quarantined to `.workflow-blocked/`, none published bad content. The gates are doing their job.
- **Cloudflare/Wrangler auth:** healthy throughout — every deploy this week succeeded, no token-canary warnings in the log. Only GitHub auth is broken, not Cloudflare.
- **Cosmetic only, no action needed:** `gemma-research.log` still prints "Claude picks this up at 9 AM" even though `HERMES_TAKEOVER=1` means local Gemma picks it up, not Claude. Stale log text from before the local-LLM takeover; harmless.

---

## Immediate Decisions Needed (see chat reply for the numbered list)

Three things are ready to go but each is a visible/production action, so they're gated behind your go-ahead rather than applied automatically:

1. **Push the 16-commit backlog to GitHub** (Task 2) — auth is fixed and dry-run verified clean.
2. **Run today's 4 stuck posts now** (Task 3) — catches up the 2026-07-17 queue using the SOP's own documented replay command.
3. **Who applies the code patches** (Tasks 4-6) — these touch `scripts/daily-blog-reel.sh`, which is Codex's file per `WORKFLOW-OWNERSHIP.md`. Patches are fully specified below either way.

---

## Task 1: Restore GitHub push auth — DONE

**Files:** none (global git/gh config only, not repo-tracked)

- [x] Ran `gh auth setup-git`
- [x] Verified with `git push --dry-run origin main` (no mutation) — clean result, no errors

No further action needed on this task.

---

## Task 2: Push the 3-day content backlog

**Owner:** Claude (this is explicitly the documented "Claude reviews and pushes the local commits" role from BLOG-SOP.md). **Needs Nick's go-ahead** per the standing git-push rule — the automatic-push exception covers the cron's own run, not an ad hoc 16-commit catch-up push.

**Review already done as part of this audit:** all 16 unpushed commits are QA-passed, live-verified posts and reel renders (see timeline above) — nothing quarantined or QA-failed is in this range.

- [ ] **Step 1: Push**

```bash
cd /Users/nick/projects/fuseddistribution
git push origin main
```

Expected: `5b69f0e1..1be046a0  main -> main`, exit 0.

- [ ] **Step 2: Verify**

```bash
git log origin/main..HEAD --oneline | wc -l
```

Expected: `0` (nothing left unpushed).

---

## Task 3: Catch up today's 4 stuck posts

**Owner:** automation (same script, run manually instead of waiting for a fixed retry). **Needs Nick's go-ahead** — this auto-publishes 4 new live posts + reels today, same as the normal 9am behavior, just delayed and hand-triggered.

- [ ] **Step 1: Kick the existing loaded job**

```bash
launchctl kickstart -k "gui/$(id -u)/com.nick.daily-blog-reel"
```

`2026-07-17-pending.json` is now the oldest pending marker (2026-07-16's was cleared this morning), so the script's existing "resume oldest pending" logic picks it up with no override needed. Runs for roughly 20-40 minutes for 4 full posts (write, links, hooks, svg, html, pexels, chart, reel, social, QA, deploy×4, verify×4).

- [ ] **Step 2: Watch it land**

```bash
tail -f ~/Library/Logs/daily-blog-reel.log
```

Expected: four `--- Post: ... ---` blocks for `magnet-test-for-silver-does-it-work`, `ice-test-for-silver-explained`, `content-marketing-ideas-for-local-business`, `how-often-should-a-small-business-blog`, each ending `exit: 0`, then `RESULT: all verifications passed (4 slugs + sitemap)` and `2026-07-17-pending.json` deleted / `2026-07-17-complete.json` written.

- [ ] **Step 3: Verify live**

```bash
python3 -c "import json; d=json.load(open('/Users/nick/projects/fuseddistribution/public/blog/posts.json')); print(d[0]['slug'], d[0].get('date'))"
curl -s "https://fuseddistribution.com/blog/how-often-should-a-small-business-blog/?cb=$(date +%s)" -o /dev/null -w "%{http_code}\n"
```

Expected: newest posts.json slug is one of today's four, dated 2026-07-17; curl returns `200`.

---

## Task 4: Preserve `HERMES_LOCAL_MODEL` (and siblings) through a retry

**Owner:** Codex (workflow architecture, per `WORKFLOW-OWNERSHIP.md`) — or Claude, if you'd rather I apply it directly. Fully specified either way.

**Files:**
- Modify: `scripts/daily-blog-reel.sh:15` (safer fallback default)
- Modify: `scripts/daily-blog-reel.sh:104-112` (retry plist template)
- Modify: `public/blog/BLOG-SOP.md:98` (keep the "must preserve" list honest)

- [ ] **Step 1: Change the fallback default to the proven model**

Current (`scripts/daily-blog-reel.sh:15`):
```bash
HERMES_LOCAL_MODEL="${HERMES_LOCAL_MODEL:-granite4.1:3b}"
```

New:
```bash
HERMES_LOCAL_MODEL="${HERMES_LOCAL_MODEL:-gemma3:4b-it-qat}"
```

granite4.1:3b is documented in [[blog_pipeline_hardening]] as producing sub-length articles that auto-quarantine. gemma3:4b-it-qat is the validated production writer/QA model everywhere else in this pipeline; the fallback default should match, not silently diverge.

- [ ] **Step 2: Carry the three Hermes-local vars into the retry plist**

Current (`scripts/daily-blog-reel.sh:104-112`):
```bash
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/Users/nick/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>BLOG_AUTO_DEPLOY</key><string>${AUTO_DEPLOY}</string>
    <key>BLOG_RUN_DATE</key><string>${TODAY}</string>
    <key>CLAUDE_ENABLED</key><string>${CLAUDE_ENABLED}</string>
    <key>HERMES_TAKEOVER</key><string>${HERMES_TAKEOVER}</string>
    <key>LOCAL_LLM</key><string>${LOCAL_LLM}</string>
  </dict>
```

New:
```bash
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/Users/nick/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>BLOG_AUTO_DEPLOY</key><string>${AUTO_DEPLOY}</string>
    <key>BLOG_RUN_DATE</key><string>${TODAY}</string>
    <key>CLAUDE_ENABLED</key><string>${CLAUDE_ENABLED}</string>
    <key>HERMES_TAKEOVER</key><string>${HERMES_TAKEOVER}</string>
    <key>LOCAL_LLM</key><string>${LOCAL_LLM}</string>
    <key>HERMES_LOCAL_MODEL</key><string>${HERMES_LOCAL_MODEL}</string>
    <key>HERMES_LOCAL_BASE_URL</key><string>${HERMES_LOCAL_BASE_URL:-http://localhost:11434/v1}</string>
    <key>HERMES_LOCAL_MAX_TOKENS</key><string>${HERMES_LOCAL_MAX_TOKENS:-256}</string>
  </dict>
```

- [ ] **Step 3: Update the SOP's preserve-list so it matches the code**

Current (`public/blog/BLOG-SOP.md:98-99`):
```
- Retry launch agents must preserve `BLOG_RUN_DATE`, `BLOG_AUTO_DEPLOY`,
  `HERMES_TAKEOVER`, `CLAUDE_ENABLED`, and `LOCAL_LLM`.
```

New:
```
- Retry launch agents must preserve `BLOG_RUN_DATE`, `BLOG_AUTO_DEPLOY`,
  `HERMES_TAKEOVER`, `CLAUDE_ENABLED`, `LOCAL_LLM`, `HERMES_LOCAL_MODEL`,
  `HERMES_LOCAL_BASE_URL`, and `HERMES_LOCAL_MAX_TOKENS`. A retry that drops
  the model override silently falls back to whichever model
  `HERMES_LOCAL_MODEL`'s script default points at — verify that default is
  still the validated production writer before changing it.
```

- [ ] **Step 4: Verify**

```bash
bash -n scripts/daily-blog-reel.sh
plutil -lint scripts/daily-blog-reel.sh 2>/dev/null; echo "(plutil only lints plists, ignore N/A on .sh)"
grep -A10 "EnvironmentVariables" scripts/daily-blog-reel.sh | grep HERMES_LOCAL_MODEL
```

Expected: syntax check passes, grep finds the new key in the retry template.

---

## Task 5: Make retry-scheduling failures loud instead of silent

**Owner:** Codex — or Claude if directed. This is the fix that would have put a notification on Nick's screen at 09:00 today instead of the problem surfacing 4+ hours later via manual audit.

**Files:** Modify `scripts/daily-blog-reel.sh:120-122`

- [ ] **Step 1: Capture bootstrap's exit code and verify it actually registered**

Current:
```bash
  launchctl bootout "gui/$(id -u)/${retry_label}" 2>/dev/null
  launchctl bootstrap "gui/$(id -u)" "$retry_plist"
  echo "Retry scheduled for ${retry_hour}:$(printf '%02d' "$retry_min") (${sleep_secs}s from now)" >> "$LOG_FILE"
```

New:
```bash
  launchctl bootout "gui/$(id -u)/${retry_label}" 2>/dev/null
  local bootstrap_err bootstrap_rc
  bootstrap_err=$(launchctl bootstrap "gui/$(id -u)" "$retry_plist" 2>&1)
  bootstrap_rc=$?
  if [[ $bootstrap_rc -ne 0 ]]; then
    echo "RETRY SCHEDULE FAILED: bootstrap rc=$bootstrap_rc: $bootstrap_err" >> "$LOG_FILE"
    notify "retry failed" "Could not schedule ${retry_hour}:$(printf '%02d' "$retry_min") catch-up run — check daily-blog-reel.log"
    return 1
  fi
  if ! launchctl list "$retry_label" >/dev/null 2>&1; then
    echo "RETRY SCHEDULE FAILED: bootstrap returned 0 but ${retry_label} is not in launchctl list" >> "$LOG_FILE"
    notify "retry failed" "Catch-up job did not register with launchd — check daily-blog-reel.log"
    return 1
  fi
  echo "Retry scheduled for ${retry_hour}:$(printf '%02d' "$retry_min") (${sleep_secs}s from now) — confirmed loaded" >> "$LOG_FILE"
```

This doesn't require knowing *why* today's bootstrap didn't take (that may be an environment-specific launchd quirk calling `bootstrap` from inside an already-launchd-spawned OnDemand agent — documented as investigated-but-inconclusive in the Incident Summary above). It guarantees that the next time it happens, Nick finds out within seconds via a native notification, not hours later via manual log spelunking.

- [ ] **Step 2: Verify**

```bash
bash -n scripts/daily-blog-reel.sh
```

Expected: no syntax errors. Full behavioral verification happens naturally the next time a same-day catch-up is actually triggered (can't be safely unit-tested without either waiting for a real backlog day or temporarily faking one — do not fake a `-pending.json` file against production `posts.json` state to test this, since that risks the exact "silently consume and skip a real day" failure mode this system exists to prevent. If you want a dry run, test `schedule_retry` in isolation by sourcing just that function into a throwaway shell and calling it directly, not by running the full pipeline against live state.)

---

## Task 6: Notify when the git-push backlog gets stale

**Owner:** Codex — or Claude if directed. Closes the process gap: BLOG-SOP.md assigns "Claude reviews and pushes" as an ongoing duty, but nothing currently reminds anyone it's overdue.

**Files:** Modify `scripts/daily-blog-reel.sh` — add after the `AUTO_DEPLOY` block closes (after line 608, before the `RETRY_SLUGS` check at line 610)

- [ ] **Step 1: Add a threshold check**

```bash
UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
if [[ "$UNPUSHED" -ge 8 ]]; then
  echo "NOTICE: $UNPUSHED commits unpushed to origin/main — Claude review/push overdue" >> "$LOG_FILE"
  notify "git backlog" "$UNPUSHED commits awaiting push to GitHub — ask Claude to review and push"
fi
```

Threshold of 8 ≈ two days of normal output (4 posts + occasional reel-render commits). Tune if it fires too eagerly or too late.

- [ ] **Step 2: Verify**

```bash
bash -n scripts/daily-blog-reel.sh
cd /Users/nick/projects/fuseddistribution && git log origin/main..HEAD --oneline | wc -l
```

After Task 2 lands (backlog pushed to 0), the next few days will naturally exercise both the below-threshold silent path and, if it's ever ignored for 2+ days again, the notify path.

---

## Explicitly Not Recommended

**Do not just set `BLOG_GIT_SYNC=1` in the plists to force git push back on unconditionally.** That would restore auto-push but remove the human review checkpoint BLOG-SOP.md deliberately built in ("Codex does not push; Claude reviews and pushes the local commits"). The actual defect was the credential (Task 1, fixed) plus no one having done the review-and-push pass in days (Task 6 closes that gap without removing the checkpoint). Keep the design; fix the tooling and the reminder.

---

## Verification Checklist (after Tasks 1-6 land)

- [ ] `git log origin/main..HEAD --oneline` → empty
- [ ] `python3 -c "import json; print(json.load(open('public/blog/posts.json'))[0])"` → newest post dated today or later
- [ ] `launchctl list | grep daily-blog-reel` → only the main label, no stray `.retry`
- [ ] `bash -n scripts/daily-blog-reel.sh` → clean
- [ ] Next natural occurrence of a same-day catch-up (whenever the next verification hiccup happens) produces either a clean confirmed-loaded log line or a `notify()` popup — not silence
- [ ] `grep HERMES_LOCAL_MODEL scripts/daily-blog-reel.sh` shows it both in the retry plist template and as the `gemma3:4b-it-qat` fallback default

## Self-Review Notes

- Every finding above was verified against live state (log files, `launchctl list`, `git log`, a live `curl`, a live dry-run push), not inferred from stale memory files — several memory entries ([[daily_blog_reel_cron]]'s "BLOG_AUTO_DEPLOY=1 runs auto pushes" claim) turned out to be outdated and are corrected here.
- No placeholders: every patch above is the literal diff to apply, not a description of one.
- Ownership tagged per task per `WORKFLOW-OWNERSHIP.md` so this can be hand-delivered to Codex as-is if that's the routing Nick picks.
