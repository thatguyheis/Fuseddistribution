# Fix List (2026-10-22)

Ranked by impact. Items marked NICK need your decision; the rest can be executed once approved.

## P0: restore control (this week)

1. **Snapshot and commit the working tree** (NICK: approve). 2,153 dirty paths, all fixes since 9/7 are uncommitted. Split into commits by area: pipeline scripts, plists, SOPs, content, ops state. Gitignore runtime state (events.jsonl, latest.json, admin/data.json) instead of committing it.
2. **Merge `agent/buffer-instagram-profit-sop` into main and push** (NICK: approve, non-content push). Then fix `daily-blog-reel.sh:925`: refuse to push unless the branch is `main`, push `HEAD:main`, and fail loudly otherwise.
3. **Refill the topic pool** (NICK: pick direction). `public/blog/data/topic-pool.json` is empty, so the pipeline is dead. Seed it with buyer-intent topics from FUSDD_GROWTH_DIRECTION.md. Add an alert when fewer than 14 days of topics remain.
4. **Lock down `/admin/`.** Put it behind Cloudflare Access or a worker auth check, or stop deploying it. Add `admin/data.json` to `.assetsignore`.
5. **Build one alert that reaches you.** Run a single daily health check (extend `local-operations-audit.mjs`) covering: last successful publish date, unpushed and dirty counts, topic-pool depth, Buffer queue depth, and reel backlog. Send it by email or push notification, not osascript. This is the Task 6 from 7/17 that was never effective.

## P1: remove redundancy (next 2 weeks)

6. **One publisher.** Fold `coin-history-drafts` into the daily runner as a topic lane, or the reverse. Keep one render queue (the 11:00 job), one deploy path, and one retry mechanism (the watchdog). Delete the self-written retry plist.
7. **Deploy from git.** Deploy from a clean `git worktree` of origin/main instead of the untracked `.workflow-state/deployment-baseline`, or at minimum record the deployed commit hash.
8. **Delete dead scripts.** That covers 10 unreferenced scripts, `recover-approved-reel-queues.py`, `defer-render-catchup.py`, the dead Claude branches in `daily-blog-reel.sh` and `build-post.sh`, and the `~/bin/hermes-local.sh` fallbacks.
9. **Clean up the plists.** Add `launchagents/install.sh` that installs and diffs them. Fix the render plist drift. Track or remove `local-operations-audit` and `litert-serve`. Delete the `.backup`/`.disabled` plists in `~/Library/LaunchAgents`.
10. **Fix locks and logs.** Use one lock helper everywhere, with a stale-owner check. Send the render log back to `~/Library/Logs`. Prune old lock dirs. Cap total render runtime.

## P1: SOP consolidation

11. **Single entry point.** Rewrite AGENTS.md as the pipeline entry point (about 150 lines: roles, precedence, links). Move the photo-library content to `public/photos/README.md` and fix the `npm run photos:*` paths.
12. **`docs/CURRENT-STANDARDS.md`.** One table for every changing value: Buffer 9 per channel with 1 reserve (matches the code), reels 110 to 130 s with a 135 s cap at 720x1280, Chatterbox Standard, the schedule, push policy, and CTA rotation. Strip all the dated banners from the other files.
13. **Merge the operations docs.** BATCH-PRODUCTION, AUTOMATED-PUBLISHING-OPERATIONS, QUICKSTART, TOKEN-BUDGET and WORKFLOW-OWNERSHIP become one OPERATIONS-SOP.
14. **Fold reel sub-SOPs into REEL-SOP.** That covers REEL-OPENING, ENRICHMENT, WHISPER, and PRESENTATION-PROFILE. Remove the stale ambient table, the 100 to 240 s table, and the three-short-reels section.
15. **Fix BLOG-SOP and SOCIAL-SOP.** Remove dead Claude sections, the expired six-per-channel experiment, and the 180 to 240 s references; fix the missing SHORTFORM link.
16. **Archive the dated docs.** Move incident, recovery, handoff, status, and PLAN-* docs to `docs/archive/`. Delete or regenerate AI-READABLE-CONTENT-SOP.
17. **Settle push policy in one place** (NICK). Either keep the global standing exception and mirror it in the repo, or remove it.

## P2: output cleanup

18. **Reels.**
    - Re-render the 4 broken stubs and the 20 posts with no reel.
    - Recut the 14 masters over 135 s and the 33 over 25 MiB.
    - Replace the 16 public copies still at 1080p and re-sync the 39 that are out of step with their masters.
    - Unpublish `paper-collage-storyboard-pilot`.
19. **Disk** (NICK: confirm before any delete). This would free about 25 GB:
    - 22 GB of legacy 1080p masters that were never published (archive them to external storage or delete).
    - 1.9 GB of versioned variants.
    - The `before-whisper` and `pre-media-repair` backups.
    - The ffmpeg2pass logs at the repo root.
    - The retired music files.
20. **Blog structure** (NICK: confirm before any delete).
    - Remove `zzz-skill-test/` and the 29 empty dirs.
    - Widen `.assetsignore` to cover the 554 leaked workflow files and the Finder `* 2.*` copies.
    - Regenerate the sitemap to add the 5 missing posts.
    - Backfill the 109 missing topic-history rows.
21. **Blog quality.**
    - Consolidate about 25 near-duplicate clusters with 301 redirects.
    - Clean banned words and uncited statistics in the July and August posts.
    - Remove the 161 old em-dashes.
    - Add sources to the coin-history posts.
    - Lift the October posts to the 1,100-word floor, or change the floor.
22. **Volume and direction** (NICK). The current 4+ posts a day versus the 1 to 2 a month in the growth plan. Decide on the real target and update FUSDD_GROWTH_DIRECTION.md or the pipeline to match. This one decision drives items 3, 6, and 21.
