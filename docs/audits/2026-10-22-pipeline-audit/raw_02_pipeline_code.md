# Raw: Pipeline code and scheduling (subagent report, 2026-10-22)

Verified by main session: HEAD = `agent/buffer-instagram-profit-sop`; origin/main tip 32bc5caa (2026-09-03); gemma-research.log 2026-10-20 "Topic inventory exhausted; owner replenishment required".

## TL;DR
- 9 AM publisher idle 6+ days: every run since 10-17 ends `BLOCKED: no valid queue` (scripts/daily-blog-reel.sh:574-578). Upstream: research logs "Topic inventory exhausted" every run since 10-15.
- Real publisher now `com.nick.coin-history-drafts` (every 15 min; deploys and renders on its own).
- 22 unpushed commits structural: HEAD on `agent/buffer-instagram-profit-sop`, push does `git push origin main` (daily-blog-reel.sh:925). Local main (07-27) is ancestor of origin/main, so push succeeds and pushes nothing. 17 of 22 exist on `origin/agent/buffer-instagram-profit-sop`.
- Large dirty tree (~2153 paths, 779 untracked) incl. 10 pipeline scripts.
- Production deploys from untracked `.workflow-state/deployment-baseline` (scripts/deploy-approved-blog.mjs:13,56), gitignored.

## Flow
| Stage | Script | Model/tool | Failure handling |
|---|---|---|---|
| Schedule | launchd: research Mon/Thu 23:00, watchdog 5 min, publisher 09:00, render 11:00, Buffer 22:00 | | watchdog kickstarts |
| Topic pick | public/blog/scripts/gemma-nightly.sh:415 -> scripts/topic-inventory.py --select | deterministic | pool exhausted -> exit 1 (current state) |
| Research/draft | gemma-nightly.sh:97-371 via ollama-local-no-think.sh | ollama gemma3:4b | 6h timeout; failures to research/attempts |
| Write | daily-blog-reel.sh:756 -> build-post.sh -> write-segmented-article.mjs / write-article.sh | gemma3:4b, LFM2.5-1.2B leaf | exit 4 retry, exit 5 quarantine |
| Assets | build-links/svg/html/pexels/chart/reel/social | gemma + deterministic | mostly `|| log failed` |
| QA | qa-local.mjs, qa-gate.sh | deterministic + gemma3:4b | fail -> .workflow-blocked |
| Register | add-to-posts.mjs, topic-history | | |
| Commit | daily-blog-reel.sh:910-913 | git | only BLOG_GIT_COMMIT=1; installed plist 0 |
| Push | daily-blog-reel.sh:924-934 | git | GIT_SYNC=0 -> disabled; when on, pushed wrong branch |
| Deploy | scripts/deploy-approved-blog.mjs | wrangler from untracked baseline | retry plist |
| Verify | verify_live_slug, verify-sitemap, verify-blog-catalog | curl | redeploy once |
| Reel parse/validate | render-missing-reels.sh:140-160 | deterministic | skip slug |
| TTS | render.mjs -> generate-audio.mjs -> chatterbox-tts.py | Chatterbox (Nick voice) | tts-circuit.py breaker |
| Media | fetch-media.mjs + generative | Pexels/Pixabay + local image gen | 4h budget |
| Captions | generate-captions.mjs -> transcribe-local.py | Whisper | 600s timeout |
| Render | render.mjs:227 remotion | Remotion | retries; fit-upload-size >=50MB |
| Release QA | auto-visual-review.py, release-reel.mjs | gemma3:4b | notify |
| Social | buffer-backlog-runner.sh -> prepare-buffer-* , buffer-live.mjs | Buffer API | cooldown; last run 0 scheduled |
| Video panels | reconcile-blog-videos.mjs --deploy | wrangler | second deploy path |

Claude disabled: CLAUDE_ENABLED forced 0 at daily-blog-reel.sh:37 (dead branches :581-619, build-post.sh). Codex not invoked by any script; human-driven only.

## Scheduled jobs
| Label | Schedule | Repo vs installed |
|---|---|---|
| daily-blog-reel | 09:00 | match, repo version uncommitted (COMMIT=0, SYNC=0) |
| render-missing-reels | 11:00 | DIFFERS: installed RENDER_TIMEOUT 5400 / CHATTERBOX_BATCH 1800000 / GEN_MEDIA 240000; repo 18000 / 2700000 / 14400000 / STEPS 20 |
| buffer-backlog | 22:00 | match, uncommitted |
| gemma-research | Mon/Thu 23:00 + watchdog wakes | match; last exit 1 |
| ollama-publisher-watchdog | 300s | match |
| coin-history-drafts | 900s | match |
| local-operations-audit | 22:20 | installed only, not in repo |
| litert-serve | KeepAlive | installed only, unused by pipeline |
| daily-blog-reel.retry | dynamic | points at /Users/nick/bin wrapper; .disabled-20260929 leftover |

Leftover backups in ~/Library/LaunchAgents: buffer-backlog.plist.backup-20260914-budget, gemma-research.plist.backup-20260914.

## Redundancy
- Two publishers: daily-blog-reel.sh and run-coin-history-drafts.py.
- Three render triggers + uncalled recover-approved-reel-queues.py, defer-render-catchup.py, video/scripts/rerender-blocked-audio-reels.mjs.
- Two deploy paths: deploy-approved-blog.mjs, reconcile-blog-videos.mjs --deploy.
- Two retry mechanisms: self-written retry plist and watchdog kickstart.
- Two LLM wrappers; hermes-local.sh fallbacks in build-hooks.sh:9, build-social.sh:8, write-article.sh:14, write-segmented-article.mjs:13, fetch-media.mjs:87.
- Locks in /tmp, inconsistent; 158 .finished/.stale lock dirs never cleaned.
- Unreferenced scripts: benchmark-pipeline-models.mjs, create-blog-backlog-queues.mjs, defer-render-catchup.py, plan-buffer-youtube-queue.sh, prepare-coin-history-batch.mjs, publishing-owner-brief.mjs, recover-blocked.sh, run-shadow-blog-workflow.mjs, summarize-local-sop-evaluation.mjs, verify-blog-video-panels.mjs. Tests/docs only: litert-generation-health.py, recover-approved-reel-queues.py, spot-monitor.py, evaluate-local-sop-models.mjs, batch-inventory.mjs.

## Fragility
- Push wrong refspec, false success.
- Commit gate exists only in uncommitted diff.
- Deploy source untracked.
- Retry plist hardcodes /Users/nick/bin.
- Watchdog lock no stale check (ollama-publisher-watchdog.sh:20-23): SIGKILL -> silent forever.
- Render log goes to /tmp (render-missing-reels.sh:8), wiped at reboot; ~/Library/Logs copy stale.
- Render worst case ~20h; coin-history wraps in 5h timeout.
- Swallowed failures: build-post.sh:196-253, write_run_state || true (:421), osascript notify from launchd, buffer-backlog-runner.mjs:242 exits 0 when unavailable.
- Task 6 notifier at :998-1002 unreachable (early exit :578), measures wrong branch, osascript only.
- video/.env sourced wholesale; coin-history PATH lacks ~/.local/bin.
- Watchdog detects publisher with pgrep not lock.

## Top issues (agent ranking)
1. Topic inventory exhausted -> refill topic-pool.json, alert at <14 days.
2. Push wrong branch -> guard on branch, push HEAD:main, alert otherwise.
3. Deploy from untracked baseline -> deploy from clean worktree of origin/main or record hash.
4. Uncommitted pipeline changes and plist drift -> commit, launchagents/install.sh with diff.
5. Task 6 notifier unreachable -> move to watchdog/local-operations-audit, durable channel.
6. Two publishers, three render triggers -> single owner, delete dead scripts.
7. Hardcoded ~/bin paths.
8. Watchdog lock + /tmp render log.
9. Unbounded render timeouts.
10. Dead Claude code paths.
