# Fused Source of Truth

Version 2, 2026-10-22. Owner: Nick Hughes.

This file is the single reference for what Fused produces, the rules it follows, which jobs run, and how work moves from idea to posted reel. Every other SOP is detail. **When any other file disagrees with this one, this file wins.** Do not paste dated "supersedes" banners into other files; change the value here and in the code in the same commit.

---

## 1. Precedence

| Rank | Source | Use it for |
|---|---|---|
| 1 | Nick's direct instruction in the current session | Overrides everything below |
| 2 | **This file** | Scope, standards, schedule, workflow, git policy |
| 3 | `ops/content-scope.json` | Machine-readable scope and daily target (must match section 3) |
| 4 | `docs/COIN-HISTORY-SOP.md` | How to research, script, illustrate and verify a coin-history episode |
| 5 | `video/REEL-SOP.md`, `public/blog/BLOG-SOP.md`, `SOCIAL-SOP.md` | Technical detail for render, blog HTML and Buffer, where not contradicted here |
| 6 | Everything else in `docs/` | History and background only |

Incident, recovery, status, handoff and PLAN files are records, not rules.

---

## 2. Business scope

| Item | Decision (2026-10-22) |
|---|---|
| What we publish | **Coin history only.** One blog post plus one reel per episode. |
| Daily target | **3 finished pairs per Pacific day** (blog live and verified, reel passed release QA). |
| Stopped | All other blog and reel types: local business marketing, website and SEO tips, AI and automation, accessibility, general silver investing. No new posts, no new reels, no Buffer scheduling of them. |
| Existing non-coin posts | Stay live. Not deleted, not promoted. |
| Brand | Fused Reserve (silver). Tag every new post `brand: "silver"`. |
| Voice | Plain first person. No em dashes. No hyphenated words in prose. No AI buzzwords (list in `public/blog/BLOG-SOP.md`). |

---

## 3. Standards table (the values)

| Area | Value | Enforced by |
|---|---|---|
| Content scope switch | `scope: coin-history`, `dailyTarget: 3` | `ops/content-scope.json` read by `scripts/lib/content-scope.mjs`, `scripts/render-missing-reels.sh`, `scripts/run-coin-history-drafts.py` |
| What counts as coin history | Post is in `public/blog/posts.json` **and** has a workup folder `content/coin-history/<slug>/` | same readers |
| Production queue | `content/coin-history/queue.json` (append `{slug, keyword}` only after the package manifest passes) | `run-coin-history-drafts.py`, `prepare-coin-history-batch.mjs` |
| Daily cap behavior | Caps new blog publishes; a post already live may finish its reel the same day | `run-coin-history-drafts.py` `choose()` |
| Prepared queue floor | At least 3 complete, unprocessed packages each morning; alert below 3 | `run-coin-history-drafts.py`, `.workflow-state/coin-history-drafts/queue-health.json` |
| Throughput measurement | Record stage time, attempts and completed pairs by Pacific date; show sample size | `run-coin-history-drafts.py`, `.workflow-state/coin-history-drafts/throughput.json` |
| Blog length | 1,100 words minimum for drafts | `public/blog/BLOG-SOP.md` and QA |
| Blog sources | Every factual claim maps to a primary source (U.S. Mint, museums, archives, NPS, Library of Congress). Sources section required. | `claim-map.json`, `research.json`, blog QA |
| Blog QA pass | `qa.json` `pass: true`, score at least 85, mode `coin-history-automated`, stages include `qa-local-pass` and `qa-brain-pass` | `run-coin-history-drafts.py` |
| Reel format | Vertical 720 x 1280, 30 fps, H.264, AAC 192 kbps | `video/REEL-SOP.md`, render profile |
| Reel script length | 280 to 330 words, target 110 to 130 seconds | `docs/COIN-HISTORY-SOP.md` |
| Reel release duration | 100 to 135 seconds measured from the mastered MP4 | `video/scripts/release-reel.mjs:110` |
| Reel ending | Spoken question card, 10 words or fewer, inside the hashed transcript | release gate, `run-coin-history-drafts.py` |
| Reel file size | Target 44 MB, must be under 50,000,000 bytes (master). Public derivatives for X and Instagram must be under 25 MiB. | `scripts/render-missing-reels.sh`, Buffer planners |
| Voice | Chatterbox Standard with Nick's voice reference, settings pinned in `video/tts-runtime.json`. Nano and Zoe only for explicit recovery tests Nick approves. | `video/tts-runtime.json` |
| Captions | Local Whisper word timings | `docs/WHISPER-CAPTIONS-SOP.md` |
| Music | Cleared tracks from the trusted cycle only (`--music=cycle`). Retired: `mixkit-driving-ambition-32.mp3`, `youtube-gone-away-blue-beat-review.mp3`, ambient-02 to ambient-10. | `docs/AUDIO-SOURCE-SOP.md` |
| Coin imagery | Owner photos first (`content/coin-library/catalog.json`). Never generate or sharpen coin details. Specimen claims must be visible in the crop. Every coin evidence image must match the episode identity at package intake and again before rendering, with matching hashes and local Gemma vision evidence. | `scripts/prepare-coin-history-batch.mjs`, `video/scripts/coin-image-relevance.mjs`, `video/scripts/approved-sources.mjs` |
| Local model | Ollama `gemma3:4b` via `scripts/ollama-local-no-think.sh`. No paid remote model in scheduled jobs. | coin worker env |
| Buffer queue | 9 scheduled posts per channel (limit 10, 1 reserve slot). Channels: YouTube Shorts, X, Instagram. | `scripts/buffer-backlog-runner.mjs:22-24` |
| Buffer reuse | Same reel not reposted within 7 days | `buffer-backlog-runner.mjs` `repostAfterDays` |
| Buffer window | Schedule between 13:00 and 23:59 Pacific, 20 minutes apart | `buffer-backlog-runner.mjs` |
| Buffer scope | Only coin-history slugs (YouTube and X get `--slugs`; Instagram copies the YouTube queue) | `buffer-backlog-runner.mjs` `plannerArgs()` |

---

## 4. Roles

| Who | Owns | Does not |
|---|---|---|
| Nick | Business direction, topic approval policy, push approval for non-content changes, money and accounts | Routine production checks |
| Codex (GPT) | Workflow code, queue preparation, incident follow-up, SOP upkeep, review and push of content commits | Lower a gate to hit the target; push non-content changes without Nick |
| Local workers (gemma3:4b, Chatterbox, Whisper, Remotion) | Drafting, narration, captions, render, automated QA | Final authority; their output is untrusted until gates pass |
| Claude | On request audits and reviews | Scheduled pipeline work (retired 2026-07-26) |

---

## 5. Schedule

### macOS launchd jobs (repo definitions in `launchagents/`)

| Job | When | Script | Status |
|---|---|---|---|
| `com.nick.coin-history-drafts` | Every 15 min | `scripts/run-coin-history-drafts.py` | **Active. The only publisher.** |
| `com.nick.render-missing-reels` | Daily 11:00 | `scripts/render-missing-reels.sh` | Active, coin scope only |
| `com.nick.buffer-backlog` | Daily 22:00 | `scripts/buffer-backlog-runner.sh` | Active, coin scope only |
| `com.nick.daily-blog-reel` | Daily 09:00 | `scripts/daily-blog-reel.sh` | **Retire.** Generic publisher. Must be disabled with launchctl (section 9). |
| `com.nick.gemma-research` | Mon and Thu 23:00 | `scripts/gemma-research-batch.py` | **Retire.** Generic topic research. |
| `com.nick.ollama-publisher-watchdog` | Every 5 min | `scripts/ollama-publisher-watchdog.sh` | **Retire.** Only kicks the generic publisher; the coin worker restarts Ollama itself. |
| `com.nick.local-operations-audit` | Daily 22:20 | `scripts/local-operations-audit.mjs` | Installed but not in repo. Keep; add plist to repo. |

### Codex automations (`~/.codex/automations/`)

| Automation | Status |
|---|---|
| `fused-daily-publishing-owner` (08:30, 21:30) | Keep. Refocus on coin queue preparation (section 6, step 1). |
| `fused-daily-profit-and-sop-evolution` | Keep, weekly review only |
| `resume-fused-coin-video-production-tonight` | One-off from 2026-10-20. Retire. |
| `daily-blog-backlog-monitor`, `fused-blog-backlog-recovery-watch`, `reel-audio-backlog-sequential-rerender`, `fused-final-buffer-pair-recovery`, `buffer-youtube-queue-maintenance` | Generic backlog work. Retire or rewrite for coin scope. |
| `overnight-actions-review`, `book-factory-daily-audit-and-status` | Not part of Fused publishing. Leave alone. |

---

## 6. Workflow: one coin-history episode

| Step | What happens | Who | Output | Gate to pass |
|---|---|---|---|---|
| 1. Pick topic | Choose a coin with a real story, preferring owner photos and unused subjects | Codex | entry in a prep list | Not a repeat of any slug in `content/coin-history/` or posts.json |
| 2. Research | Primary sources, verified facts vs open questions | Codex + gemma | `content/coin-history/<slug>/research.json`, `claim-map.json`, `overview.md` | Every claim mapped to a source |
| 3. Transcript | 280 to 330 words, hook, chronology, payoff, final question | Codex + gemma | `narration-v1-approved.txt`, `script-approval.json` with SHA256 | Automated audit per COIN-HISTORY-SOP (Nick's 2026-10-20 authorization) |
| 4. Images | Owner coin crop, sourced context photos, labeled AI support scenes | Codex | `artwork-source/`, `preferred-media.json` or `presentation-plan.json` | Each coin evidence image must directly match the episode coin in a local vision check at intake and again before rendering; image hashes and claim links must match |
| 5. Blog package | Post folder with meta, content plan, reel script | Codex | `public/blog/<slug>/` | Files present |
| 6. Queue | Append `{slug, keyword}` | Codex | `content/coin-history/queue.json` | Steps 2 to 5 complete |
| 7. Write and QA blog | build-post.sh with local model | coin worker | `index.html`, `qa.json` | Blog QA pass (section 3) |
| 8. Deploy blog | `scripts/deploy-approved-blog.mjs`, then curl 200 | coin worker | live URL | HTTP 200 on `https://fuseddistribution.com/blog/<slug>/` |
| 9. Render reel | Chatterbox, Whisper, Remotion | coin worker via `render-missing-reels.sh` | `video/out/<slug>/<slug>.mp4` | Duration, size, voice, captions, music, hashes |
| 10. Release QA | Six frame visual review plus release gate | coin worker | `video/out/<slug>/release-qa.json` | `readyForPosting: true` |
| 11. Schedule | Buffer runner at 22:00 | launchd | Buffer posts on 3 channels | Queue cap 9, 7 day reuse |
| 12. Embed | Blog video player linked to hosted reel | Codex | updated blog HTML | Player and source URL in live HTML |
| 13. Commit | Content commit on `main` | Codex | git commit | Section 7 |

**Throughput operations.** The worker does one episode at a time. Maintain at least 3 complete, unprocessed packages in the queue each morning, with about 21 per week prepared as a rolling target. Use `node scripts/prepare-coin-history-batch.mjs --manifest=<path>` to prepare a new episode from its source checked workup and append it to the production queue only after package validation and the first coin image match check pass. The owner photo catalog is the image supply ledger; photos remain unavailable for production until identity and crop review are complete. The worker records stage durations, retries and completed pairs by Pacific date in `.workflow-state/coin-history-drafts/throughput.json`. Review that report over multiple production cycles before treating the three pair target as a proven capacity. Never reduce a source, editorial, image or release gate to meet the target.

---

## 7. Git, deploy and push policy

| Rule | Detail |
|---|---|
| Branch | Work on `main`. Short feature branches are fine, but merge them back the same day. The push step must refuse to run from any branch other than `main`. |
| Commit | Every change to code, SOPs, plists or content is committed. Nothing lives only in the working tree overnight. |
| Commit size | The pre-commit hook blocks over 250 files per commit and scans for secrets with gitleaks. Split large commits; never bypass with `--no-verify`. |
| Never in git | Raw footage, renders, stock clips, archives, logs (see `.gitignore`). Secrets in any form. |
| Push | Content commits (posts, reels metadata, sitemap, posts.json, topic history, social copy) may be pushed to `origin main` without asking (standing exception, 2026-06-10). Code, SOP, plist or config changes need Nick's explicit approval each time. Never force push. |
| Deploy | `scripts/deploy-approved-blog.mjs`. Publish means: posts.json updated, commit, push, deploy, then `curl` the URL with `?cb=$(date +%s)` and get 200. |
| Destructive git | Never `git reset --hard` in this repo. |

---

## 8. Where things live

| Thing | Path |
|---|---|
| Scope switch | `ops/content-scope.json` |
| Coin queue | `content/coin-history/queue.json` |
| Episode workups | `content/coin-history/<slug>/` |
| Owner coin photo catalog | `content/coin-library/catalog.json` (originals in `Coin Raw/`, local only) |
| Published posts | `public/blog/<slug>/`, index `public/blog/posts.json` |
| Reel outputs | `video/out/<slug>/` (MP4 local only, metadata in git) |
| Coin worker state and log | `.workflow-state/coin-history-drafts/state.json`, `runner.log` |
| Render log | `/tmp/fuseddistribution-render-missing-reels.log` (move to `~/Library/Logs`, open task) |
| Buffer log | `~/Library/Logs/` buffer runner log |
| Audit 2026-10-22 | `docs/audits/2026-10-22-pipeline-audit/` |

---

## 9. Operator commands

```bash
# Check the coin worker
tail -20 .workflow-state/coin-history-drafts/runner.log

# Retire the generic jobs (run once, survives reboot; undo with launchctl enable + bootstrap)
for L in com.nick.daily-blog-reel com.nick.gemma-research com.nick.ollama-publisher-watchdog; do
  launchctl bootout gui/$(id -u)/$L; launchctl disable gui/$(id -u)/$L
done

# Restore all content types
# edit ops/content-scope.json: "scope": "all"
```

---

## 10. Changing this file

1. Change the value in this file and in the enforcing code or config in the **same commit**.
2. Update the "Enforced by" column if the enforcing location moves.
3. Bump the version line at the top.
4. Do not copy the change into other SOPs. Delete the conflicting line there instead.
