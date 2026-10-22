# Handoff to Codex (GPT): 2026-10-22

From: Claude session with Nick, 2026-10-22.
Read first: `docs/SOURCE-OF-TRUTH.md`. It is now the single reference and wins over every other SOP.

---

## 1. Why this handoff exists

On 2026-10-22, Nick asked for an audit of the blog and reel pipeline (`docs/audits/2026-10-22-pipeline-audit/`). It found:

| Finding | Evidence |
|---|---|
| The 9 AM publisher had produced nothing since 10/4 | Topic pool exhausted since 10/15 (`~/Library/Logs/gemma-research.log`) |
| No git commit since 2026-09-06; 2,153 paths dirty | All post-incident fixes and new SOPs lived only in the working tree |
| The push step pushed nothing and reported success | `scripts/daily-blog-reel.sh:925` runs `git push origin main` while HEAD was on `agent/buffer-instagram-profit-sop` |
| Production deployed from an untracked folder | `.workflow-state/deployment-baseline` |
| About 21 SOP files (about 120k tokens) contradict each other | Buffer 9 vs 10, reel 110 to 130 s vs 180 to 240 s, 720 vs 1080, Standard vs Nano, six schedules |
| Output drifted from the business plan | 50 to 109 posts per month across unrelated topics; many near duplicates |

---

## 2. Nick's decisions (2026-10-22)

1. **Commit and organize everything, then push to `origin main`.** Approved in session.
2. **Coin history only.** Stop new blogs and reels of every other type. Existing posts stay live.
3. **Target: 3 finished coin-history blog and reel pairs per day.**
4. **One source of truth** for standards, workflow and process: `docs/SOURCE-OF-TRUTH.md`.
5. Admin page lockdown: explained to Nick, **decision pending**. Do not change `/admin/` until he decides.

---

## 3. What was changed

### Commits (all on `main`, pushed)

| Commit(s) | What |
|---|---|
| `68e24d3c` | `.gitignore`: raw footage, renders, stock, archives, logs, wav/mov/mp4/m4a stay local |
| `d4dbb61d` | All pipeline script and test changes made since 9/06 (222 files) |
| `ba769e0f` | launchd plist changes (commit and sync off, Buffer once daily at 22:00) |
| `fad5e304` | SOP, incident and recovery docs, including the untracked authority docs and the audit |
| `c86ff754` to `f1e1921f` | Site content in 16 batches (posts, research, reel metadata, site files). The pre-commit hook caps commits at 250 files. |
| `3d007a0d`, `249f059f` | Coin history production sources (research, narration, artwork) |
| `534a91fe`, `c2263cba` | Reel render metadata (`video/out/*` without MP4s) |
| `c3a135d0` | Profit system and engagement state snapshot |
| `2c9640d6` | CSP `frame-src 'self'` for the embedded reel player (uncommitted since August) |
| `78d187d1` | **Coin history scope and 3 per day cap** (details below) |
| the next commits | `docs/SOURCE-OF-TRUTH.md`, this handoff, pointers at the top of AGENTS.md, CLAUDE.md and the older authority SOPs |

`public/blog/email-newsletter-ideas-for-small-business/.qa-brain.log` was removed from the index. It is a runtime log that was already gitignored; the file is still on disk.

### Scope change (`78d187d1`)

| File | Change |
|---|---|
| `ops/content-scope.json` (new) | `scope: coin-history`, `dailyTarget: 3`, `coinHistoryQueue: content/coin-history/queue.json`. Setting `scope` to `"all"` restores the old behavior. |
| `scripts/lib/content-scope.mjs` (new) | `scopedSlugs(repoRoot)` returns coin-history slugs newest first: in posts.json **and** with a `content/coin-history/<slug>/` folder. Returns `null` when scope is `all`. |
| `scripts/buffer-backlog-runner.mjs` | `plannerArgs()` adds `--slugs=<coin slugs>` for the YouTube and X planners. Instagram reads the YouTube queue, so it inherits the limit. An empty list passes `__no-scoped-posts__` rather than falling back to all posts. |
| `scripts/render-missing-reels.sh` | The registered-slug list skips posts without a coin-history workup when scope is `coin-history`. |
| `scripts/run-coin-history-drafts.py` | Reads its queue from the config (falls back to `production-2026-10-20/draft-queue.json`). New `published_today()`. `choose()` skips **new** items once `dailyTarget` blogs went live today (Pacific); already-live items may still finish their reel. Logs `CAP:` when the target is reached. |
| `content/coin-history/queue.json` (new) | Rolling queue, seeded with the 5 October 20 items, all already `release_ready`. |
| `tests/content-scope.test.mjs`, `tests/test_coin_history_daily_cap.py` (new) | 3 Node tests and 4 Python tests, all passing |

Verified live: both readers resolve the same 11 coin-history slugs. The coin worker ran once after the change and logged `IDLE` (queue fully done).

### Test status after the changes

| Suite | Result |
|---|---|
| `npm test` (worker, vitest) | 15/15 pass |
| `cd video && npm test` | 86/86 pass |
| `npm run profit:test` | 79 pass, **1 fail: "QA year validation ignores opaque HTML identifiers"**. This failure predates today's changes (it fails identically with them stashed). |
| New scope and cap tests | 7/7 pass |

### Not done (blocked)

- **Disabling the generic launchd jobs** (`daily-blog-reel`, `gemma-research`, `ollama-publisher-watchdog`). The Claude session was not permitted to run `launchctl`. Nick runs the command in `SOURCE-OF-TRUTH.md` section 9. Until then, those jobs still fire but stop at "no queue" or "topic inventory exhausted", so they publish nothing.

---

## 4. Your task list, in order

### P0: make 3 per day possible

1. **Automate coin package preparation (steps 1 to 6 in SOURCE-OF-TRUTH section 6).** Today packages are hand-built and hardcoded in `scripts/prepare-coin-history-batch.mjs`. Build a repeatable preparer that takes a topic and produces a complete package:
   - `content/coin-history/<slug>/`: research.json, claim-map.json, narration with SHA256 approval, artwork plan
   - `public/blog/<slug>/`: meta, content plan, reel script
   - a `{slug, keyword}` entry appended to `content/coin-history/queue.json`

   It must keep every COIN-HISTORY-SOP gate: primary sources, claim to image matching, no generated coin detail.
2. **Keep at least 3 packages in the queue every morning** (about 21 per week). Add an alert when the queue depth falls under 3.
3. **Check the photo supply.** `content/coin-library/catalog.json` has 47 owner assets, and about 11 have been used. At 3 episodes a day, owner photos run out within weeks unless episodes reuse photos for different stories, use sourced archival images, or Nick shoots more coins. Raise this with Nick early, with numbers.
4. **Measure real throughput.** One episode includes up to 4 hours of blog generation plus Chatterbox Standard plus the render, one at a time on an 8 GB machine. Confirm 3 per day fits in 24 hours. If it does not, tell Nick the measured ceiling; do not lower a gate.

### P0: stop generic work

5. **Retire or rewrite the generic Codex automations** in `~/.codex/automations/`: `daily-blog-backlog-monitor`, `fused-blog-backlog-recovery-watch`, `reel-audio-backlog-sequential-rerender`, `fused-final-buffer-pair-recovery`, `buffer-youtube-queue-maintenance`, and the one-off `resume-fused-coin-video-production-tonight`. Refocus `fused-daily-publishing-owner` on step 1 above.
6. **Confirm Nick has run the launchctl disable** (section 9). If not, remind him. Do not re-enable these jobs.

### P1: reliability

7. **Fix the push guard** in `scripts/daily-blog-reel.sh:925` and anywhere else that pushes: refuse unless `git rev-parse --abbrev-ref HEAD` is `main`, and push `HEAD:main`. The 9 AM job is being retired, so apply this to whatever commits and pushes coin content.
8. **Add the coin worker to commit and push flow.** It currently deploys without committing. After each `release_ready`, make a content commit on `main` and push it under the standing content exception.
9. **Build one daily health report that reaches Nick** (not osascript). It should cover: last coin publish, coin queue depth, unpushed and dirty counts, Buffer queue depth, and reel release backlog. Extend `scripts/local-operations-audit.mjs` and add its plist to the repo.
10. **Move the render log** from `/tmp/fuseddistribution-render-missing-reels.log` to `~/Library/Logs/`.
11. **Fix the failing profit test** ("QA year validation ignores opaque HTML identifiers").

### P1: SOP consolidation

12. Every older authority file now opens with a pointer to SOURCE-OF-TRUTH. Next, **delete** the conflicting values and copied banners in those files (do not rewrite them as new banners). Targets, with line numbers in `docs/audits/2026-10-22-pipeline-audit/raw_01_sop_corpus.md`:
    - SOCIAL-SOP: four-hourly schedule, the expired six-per-channel experiment, 180 to 240 s
    - BLOG-SOP: §18, §22, 180 to 240 s, the missing SHORTFORM link
    - REEL-SOP: ambient table, 100 to 240 s, three short reels
    - QUICKSTART and TECH-EDUCATION: Nano
    - AI-READABLE-CONTENT-SOP: 1080 x 1920, XTTS
13. Merge BATCH-PRODUCTION-SOP, AUTOMATED-PUBLISHING-OPERATIONS, PUBLISHING-OWNER-QUICKSTART, TOKEN-BUDGET-SOP and WORKFLOW-OWNERSHIP into SOURCE-OF-TRUTH or archive them. Move dated incident, recovery, status and handoff docs to `docs/archive/`.

### P2: cleanup (ask Nick before any deletion)

14. Items 18 to 21 in `docs/audits/2026-10-22-pipeline-audit/fix_list.md`:
    - re-render 4 stub reels
    - about 22 GB of unpublished 1080p masters
    - `zzz-skill-test/` and 29 empty blog folders
    - `.assetsignore` gaps (about 554 workflow files deploy publicly)
    - 5 posts missing from the sitemap

---

## 5. Rules that bind you

- **Gates:** never lower a gate, mark an item ready without evidence, or call a paid remote model from a scheduled job.
- **Git:**
  - Never `git reset --hard` in this repo.
  - Never force push.
  - Never bypass the pre-commit hook.
  - Code, SOP, plist and config pushes need Nick's explicit approval each time; content pushes do not.
- **Writing style:** no em dashes, no hyphenated words in prose, no AI buzzwords.
- **Changing a rule:** change it in SOURCE-OF-TRUTH and in the enforcing code in the same commit.
