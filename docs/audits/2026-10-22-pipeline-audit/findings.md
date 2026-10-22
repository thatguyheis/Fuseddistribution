# Fused Pipeline Audit: Findings (2026-10-22)

Read-only audit of blog and reel production under Codex management. It combines 5 subagent reports (raw_01 to raw_05). The main session re-checked the key claims; those are marked [verified].

## Key takeaways

1. **The daily pipeline is stopped.** The 9 AM runner has published nothing since 10/4. Every run since 10/15 dies upstream with "Topic inventory exhausted; owner replenishment required" [verified, gemma-research.log 10/20]. Since mid-September, output has come from manual Codex batch catch-ups (12 to 17 posts in a single day) rather than the automation.
2. **Git has been effectively abandoned since 9/06.** That date has the last commit. There are 2,153 dirty paths [verified]. Every fix since the 9/7 incident, every new SOP, and the deploy script itself exist only in the working tree. HEAD is on `agent/buffer-instagram-profit-sop` [verified], not main.
3. **The push step is broken by design and still reports success.** `daily-blog-reel.sh:925` runs `git push origin main` [verified] while the work sits on a different branch. Local main is behind origin, so the push "succeeds" and sends nothing. 22 commits are stuck. This is the third occurrence (7/14, 7/20, now). The 7/17 notifier (Task 6) exists, but it sits after an early exit and can never fire.
4. **Production deploys from an untracked folder** (`.workflow-state/deployment-baseline`, gitignored). Nothing checks whether the live site matches any commit.
5. **There are two publishers, three render triggers, and two deploy paths.** `coin-history-drafts` runs every 15 minutes and deploys and renders on its own, separately from the 9 AM job. It also defers the main publisher.
6. **The SOPs contradict each other and cost about 120k tokens to read.** The SOPs span about 21 files. Each change is pasted as a dated "supersedes" banner into 3 to 6 files, and many of those banners disagree. AGENTS.md, the file Codex loads automatically, covers only the photo library.
7. **The reel backlog is stuck at the repair stage, and Buffer is nearly empty.** 61 reels are stuck. Buffer queues hold x 0/10, YouTube 1/10, Instagram 2/10, with 0 eligible to add. 279 of 396 posts have no published video.
8. **Content has drifted from the business plan.** The growth plan calls for 1 to 2 buyer-intent posts a month. Actual output was 50 to 109 posts a month, mostly informational, with large near-duplicate clusters. No posts target the "silver subscription" or "coin dealer website" money keywords.

## Detail by area

### A. Scheduling and code (raw_02)
- **Jobs:** 6 repo-defined launchd jobs, plus 2 that are installed only (`local-operations-audit`, `litert-serve`). The installed `render-missing-reels` plist differs from the repo version: its timeouts are 3 to 60 times smaller.
- **Retry storms:**
  - 9/13: 65 blocked runs, one every 15 minutes, all on the same slug.
  - 9/27: 450 "RETRY RELOAD FAILED" lines.
  - Hundreds of runs that end within seconds with "no queue".
- **Swallowed failures:**
  - `build-post.sh` steps log an error and carry on.
  - `|| true` after state writes.
  - Desktop `osascript` alerts fired from launchd, which may never show up.
  - The Buffer runner exits 0 when the Buffer API is unavailable.
- **Locks:** each script uses its own `/tmp` lock in its own way. The watchdog lock has no stale-owner check, so a single SIGKILL leaves it silent forever. About 2,000 lock.finished files have piled up.
- **Render log:** it moved to `/tmp/...` and is wiped on reboot. The `~/Library/Logs` copy has been stale since 8/16.
- **Dead code:**
  - 10 unreferenced scripts and 5 referenced only by tests or docs.
  - Claude code paths that can never run (`CLAUDE_ENABLED` is forced to 0).
  - `hermes-local.sh` fallbacks that hardcode `~/bin`.

### B. History (raw_03)
- **Healthy period:** fully automated until about 8/28. Daily reel commits ran 7/20 to 8/28 and then stopped.
- **Daily runner, 8/19 to 10/22 (65 days):**
  - About 17 days fully passed.
  - About 29 days had no queue.
  - About 20 days ended in a quality block.
- **Duplicate production:**
  - contact-page-best-practices was committed 4 times, then quarantined.
  - One slug was rebuilt 13 times.
  - 15 reels were rendered twice.
- **Incident follow-ups:** only 2 of 12 tracked actions are fully done (see raw_03 table).
- **Profit-system ledger:** 103 penalties against 23 rewards. The latest report is a hard stop: `unverified_fresh_publication`.

### C. Reels (raw_04)
- **Format change:** the switch to 720p in September fixed size: the median file dropped from 103 MB to 20 MB, and median duration came back to about 121 s.
- **Still out of spec:**
  - 42 public reels over the 135 s cap (legacy 175 to 179 s copies).
  - 14 current-era masters over 135 s.
  - 33 current masters over the 25 MiB Buffer limit.
  - 4 broken stubs of 4 to 6 s.
  - 16 published copies still at 1080p.
- **Captions:** only 10 of 376 reels use Whisper captions; the rest use proportional timing.
- **Coverage:** 20 posts have no reel. A pilot reel with no blog post is published. 39 public copies are out of step with their masters.
- **Disk:**
  - `video/out` holds 28 GB, of which 22 GB is legacy 1080p masters that were never published.
  - 62 versioned variants use 1.9 GB.
  - Backup and intermediate copies are scattered around.
  - A 47 MB ffmpeg log sits at the repo root.
- **Quality:** old reels were text-only and clipped. The June frame has colliding text, and the July frame cuts off a caption mid-number. The October "paper collage" style is clearly better.

### D. Blog (raw_05)
- **Index vs disk:** posts.json has 396 entries and the sitemap has 391. The 5 newest posts are missing from the sitemap.
- **Topic history:** 109 posts are missing from topic-history, so the no-repeat check is blind to over 25% of the catalog.
- **Leftover directories:** 29 empty orphans, plus `zzz-skill-test/` [verified], whose images deploy publicly.
- **Assetsignore gap:** about 554 workflow JSON and script files (about 23 MB) still deploy past `.assetsignore`.
- **Admin page:** `/admin/` and `/admin/data.json` return 200 with no auth [verified]. The data is 1.3 MB of internal ops scores, penalties, and Buffer state. No emails or tokens were found, but the page should not be public.
- **Quality by month:**
  - July and August are the worst months for banned words (958 hits) and missing sources (August has 0 of 59 posts with a sources section, plus uncited statistics).
  - April to June posts still contain 161 em-dashes.
  - All 50 October posts are under the 1,100-word SOP floor.
  - Coin-history posts have no external sources, which breaks their own SOP.
- **Duplicates:** about 25 near-duplicate topic clusters, which cannibalize each other in search. Several slugs are cut off at 55 characters.

### E. SOPs (raw_01)
- **Contradictions:**
  - Buffer queue size: the code uses 9 per channel; the docs say both 9 and 10, sometimes two lines apart.
  - Reel length: 110 to 130 s versus 180 to 240 s versus "up to 4 min".
  - Resolution: 1080 versus 720.
  - TTS engine: Standard versus Nano versus XTTS.
  - Schedule: 6 different versions.
  - Push policy: 8 different statements.
  - Share CTA: a fixed closing line versus a rotation.
- **Stale references:**
  - `npm run photos:*` is broken because of a wrong path.
  - Links to the missing short-form SOP and to `performance-report.md`.
  - A retired, copyright-claimed music track is still on disk.
  - The "expedited six per channel" experiment, which expired 8/12, is still written as live.
- **Claude references:** Claude was retired from the pipeline on 7/26 (BLOG-SOP:1386), but it is still referenced in SOCIAL-SOP, BLOG-SOP §18, and CLAUDE-REEL-HANDOFF.
- **Policy conflict:** the standing push permission in Nick's global CLAUDE.md conflicts with the repo CLAUDE.md and AGENTS.md, which require explicit approval.

## Root causes
1. **No single source of truth for rules.** Each fix adds a banner instead of editing the canonical value.
2. **Agents work in the working tree and never close the loop:** no commit, no merge to main, no push. Fixes stay invisible to git, and the deploy reads from an untracked copy.
3. **Recovery layers are stacked instead of replacing what came before.** Each incident added a new script, lock, or retry path. The 9/3 to 9/4 window alone has 5 recovery-fix commits.
4. **Alerts never reach Nick.** The notifiers are osascript or log-only, and the one push notifier cannot be reached. Problems surface weeks later as "blogs aren't posting."
5. **Volume target is far above the growth plan.** Pushing for 4 or more posts a day exhausted the topic pool and produced near-duplicates and thin posts.

## Sources
- Subagent raw reports: raw_01_sop_corpus.md, raw_02_pipeline_code.md, raw_03_logs_history.md, raw_04_reel_outputs.md, raw_05_blog_outputs.md
- Logs: ~/Library/Logs/daily-blog-reel.log, gemma-research.log, render-missing-reels.log
- State: .workflow-state/, ops/profit-system/events.jsonl, latest.json
- Live checks: https://fuseddistribution.com/admin/ and /admin/data.json (200, 2026-10-22)
- Flagged unreliable: render-missing-reels.log has been stale since 8/16. Monthly counts depend on posts.json dates, which batch catch-ups rewrite. Hyphen and banned-word counts are upper bounds.
