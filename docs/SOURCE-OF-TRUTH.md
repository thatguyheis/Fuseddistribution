# Fused Source of Truth

Version 13, 2026-11-10. Owner: Nick Hughes.

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

Use `docs/REEL-PRODUCTION-RUNBOOK.md` for the compact production checklist and enrichment schema. Read detailed SOP sections only to resolve a specific failure. Incident, recovery, status, handoff and PLAN files are records, not rules.

---

## 2. Business scope

| Item | Decision (2026-10-22) |
|---|---|
| What we publish | **Coin history only.** One blog post plus one reel per episode. |
| Daily target | **3 finished pairs per Pacific day** (blog live and verified, reel passed release QA). |
| Stopped | All other blog and reel types: local business marketing, website and SEO tips, AI and automation, accessibility, general silver investing. No new posts, no new reels, no Buffer scheduling of them. |
| Existing non-coin posts | Stay live unless retired with a permanent redirect in `src/redirects.js`. Retired blog slugs must not be regenerated or registered. |
| Brand | Fused Reserve (silver). Tag every new post `brand: "silver"`. |
| Voice | Plain first person. No em dashes. No hyphenated words in prose. No AI buzzwords (list in `public/blog/BLOG-SOP.md`). |

Nick has separately authorized two business-growth blog/reel pairs per Pacific day through the Codex automation `daily-business-growth-blog-and-reel`, using the v2 365-day plan. This is a narrow automation-specific exception, governed by [`docs/BUSINESS-GROWTH-AUTOMATION-SOP.md`](BUSINESS-GROWTH-AUTOMATION-SOP.md). It does not change `ops/content-scope.json`, coin-history launchd jobs, or the scope of other publishers.

Nick's personal and first party generations use the existing local procedures and jobs. They do not require a client payment profile, service token, or paid MCP call. Paying client work uses the separate service under `services/client-instructions/` and the [client onboarding SOP](CLIENT-ONBOARDING-SOP.md). Install its bootstrap only in a client's project. The client installer refuses this personal repository; do not add the client gate to global agent instructions or personal render commands. Owner administration uses Cloudflare account access, with no public owner bypass in the client API.

---

## 3. Standards table (the values)

| Area | Value | Enforced by |
|---|---|---|
| Content scope switch | `scope: coin-history`, `dailyTarget: 3` | `ops/content-scope.json` read by `scripts/lib/content-scope.mjs`, `scripts/render-missing-reels.sh`, `scripts/run-coin-history-drafts.py` |
| Retired blog slugs | Every `/blog/` source in `src/redirects.js` is permanently retired | `scripts/check-editorial-regeneration.mjs`, `public/blog/scripts/add-to-posts.mjs` |
| What counts as coin history | Post is in `public/blog/posts.json` **and** has a workup folder `content/coin-history/<slug>/` | same readers |
| Production queue | `content/coin-history/queue.json` (append `{slug, keyword}` only after the package manifest passes) | `run-coin-history-drafts.py`, `prepare-coin-history-batch.mjs` |
| Daily cap behavior | Caps new blog publishes; a post already live may finish its reel the same day | `run-coin-history-drafts.py` `choose()` |
| Prepared queue floor | At least 3 complete, unprocessed packages each morning; alert below 3 | `run-coin-history-drafts.py`, `.workflow-state/coin-history-drafts/queue-health.json` |
| Throughput measurement | Record stage time, attempts and completed pairs by Pacific date; show sample size | `run-coin-history-drafts.py`, `.workflow-state/coin-history-drafts/throughput.json` |
| Blog length | 1,100 words minimum for drafts | `public/blog/BLOG-SOP.md` and QA |
| Blog sources | Every factual claim maps to a primary source (U.S. Mint, museums, archives, NPS, Library of Congress). Sources section required. | `claim-map.json`, `research.json`, blog QA |
| Blog QA pass | `qa.json` `pass: true`, score at least 85, mode `coin-history-automated`, stages include `qa-local-pass` and `qa-brain-pass` | `run-coin-history-drafts.py` |
| Reel format | Coin/default: vertical 720 x 1280. New business presentations: reviewed `business-growth-v1`, 1080 x 1920 full bleed, 30 fps, H.264 CRF 20, AAC 192 kbps. Retain the 1080 master without recompression when it meets delivery limits. | `video/src/Root.tsx`, presentation-plan.mjs, render.mjs, prepare-buffer-youtube-media.mjs |
| Reel script length | 280 to 330 words, target 110 to 130 seconds | `docs/COIN-HISTORY-SOP.md` |
| Reel release duration | 100 to 135 seconds measured from the mastered MP4 | `video/scripts/release-reel.mjs:110` |
| Reel ending | Spoken question card, 10 words or fewer, inside the hashed transcript | release gate, `run-coin-history-drafts.py` |
| Reel file size | Target 44 MB, must be under 50,000,000 bytes (master). Public derivatives for X and Instagram must be under 25 MiB. | `scripts/render-missing-reels.sh`, Buffer planners |
| Overnight reel batch | Two coin reels per launchd run at 01:00 and 04:00 Pacific; business-growth automation prepares three approved packages the prior evening and produces up to two pairs at 02:00 Pacific under one production owner. A date-bound, hash-bound Luna handoff is required; missing or stale handoff blocks the run instead of falling back to an old queue. Heavy rendering stays out of daytime hours. | `launchagents/com.nick.render-missing-reels.plist`, `scripts/write-business-reel-handoff.py`, `scripts/run-business-reel-queue.py`, Codex automation `daily-business-growth-blog-and-reel` |
| Generative diffusion | Optional and disabled by default. Prefer evidence-led charts, graphs, and clear flow diagrams; enable Stable Diffusion only for a reviewed gap that those graphics and cleared media cannot explain. | `scripts/render-missing-reels.sh`, `video/scripts/render.mjs`, render LaunchAgent |
| Attention design review | New business-growth reels record a hash-bound attention review: a visible, spoken question hook in the first three seconds, specific viewer benefit, supported payoff beats, one low-friction CTA, and platform metrics for later evaluation. Measure the generated hook audio before encoding; reject above 3.5 seconds. The approved article hero must appear in encoded frame zero; blank or near-blank openings block release. | `video/scripts/attention-review.mjs`, `video/scripts/opening-hero.mjs`, `video/scripts/release-reel.mjs`, `docs/BUSINESS-GROWTH-AUTOMATION-SOP.md`, `docs/REEL-OPENING-SOP.md` |
| Voice | Pinned Chatterbox Standard with Nick's voice reference. Use exaggeration 0.75, CFG 0.3, temperature 0.8, min-p 0.05, top-p 1.0, repetition penalty 1.2 and 1 dB output peak headroom. Generate and record a new random seed per spoken segment. Split sentence-aware narration into chunks no longer than 240 characters. Whisper is for speech recognition and word-timed captions, not voice synthesis. | `video/tts-runtime.json`, `video/scripts/chatterbox-tts.py`, `video/scripts/generate-audio.mjs`, `docs/BUSINESS-GROWTH-AUTOMATION-SOP.md` |
| TTS ownership and recovery | The tracked business queue runner holds one kernel lease inherited by its child. Historical ledger PIDs are diagnostics, not ownership. Wait within the overnight window for the shared renderer, including an indeterminate owner; only the renderer may reclaim its proven dead PID lock. Permission denial never proves death. Each topic has one render attempt per Pacific day; preserve failed checkpoints and continue the next approved topic. A successful current render resets the consecutive Chatterbox failure count; two consecutive runtime failures stop heavy work. Never reset a blocked circuit by selecting a new topic or editing unrelated files. Coin drafting yields to the business lease; business production waits for active article writers to avoid model memory contention. | scripts/run-coin-history-drafts.py, scripts/run-business-reel-queue.py, video/scripts/tts_worker_lock.py, process-liveness.mjs |
| Production enrichment | Every new render requires an editorially hashed enrichment-plan.json: at least one explanatory flow/table/chart and two short, purposeful licensed sound cues on separate body beats. Use semantic slide/wipe/fade transitions in both rendering routes. Version 3 release verifies exact props, plan and staged audio hashes, and rejects extra ending caption words. | video/scripts/production-enrichment.mjs, render.mjs, release-reel.mjs, prepare-coin-history-batch.mjs, qa-gate.sh |
| Business visual quality | `business-growth-v1` uses full bleed owner reviewed art, 64–80 px central headings, white text and cyan contrast at least 4.5:1 on navy, a visible first-two-second hook move, bottom 250 px and right 150 px social UI clearance. Reserve the explanatory graphic area and avoid duplicate text over baked art. Real interface cues require actual redacted evidence; label illustrative diagrams. | create-business-scene-art.mjs, presentation-layout, PresentationScene.tsx, Subtitle.tsx, ProductionEnrichment.tsx |
| Captions | Offline base.en word timings; detect anomalous repetition, broad transcript divergence or an ending mismatch and retry only suspicious segments once with pinned small.en. Cache both passes by audio, narration and actual model. If still suspicious, block that topic and continue independent work. Never rewrite recognition to hide extra speech. | `video/scripts/generate-captions.mjs`, caption-quality.mjs, video/whisper-fallback-runtime.json |
| Music | Cleared tracks from the trusted cycle only (`--music=cycle`). Retired: `mixkit-driving-ambition-32.mp3`, `youtube-gone-away-blue-beat-review.mp3`, ambient-02 to ambient-10. | `docs/AUDIO-SOURCE-SOP.md` |
| Coin imagery | Owner photos first (`content/coin-library/catalog.json`). Never generate or sharpen coin details. Specimen claims must be visible in the crop. Every coin evidence image must match the episode identity at package intake and again before rendering, with matching hashes and local Gemma vision evidence. | `scripts/prepare-coin-history-batch.mjs`, `video/scripts/coin-image-relevance.mjs`, `video/scripts/approved-sources.mjs` |
| Local model | Ollama `gemma3:4b` via `scripts/ollama-local-no-think.sh`. Coin drafting uses this local model; the separately authorized business automation uses GPT-5.6 Luna directly for writing and review. | coin worker env |
| Buffer queue | 9 scheduled posts per channel (limit 10, 1 reserve slot). Channels: YouTube Shorts, X, Instagram. | `scripts/buffer-backlog-runner.mjs:22-24` |
| Buffer CTA gate | Platform planners must apply `rotateQueue` to selected jobs before queue validation/publish; never hand-edit CTA metadata to bypass preflight. | `public/blog/scripts/prepare-buffer-*-queue.mjs`, `public/blog/scripts/lib/cta-rotation.mjs` |
| Buffer media gate | Before any API create request, fetch and consume the full public MP4 response. Require HTTPS, HTTP 200, `video/mp4`, a valid MP4 `ftyp` signature, complete body length, and the platform size limit. A passing local fetch does not prove Buffer can fetch through its own network path; if Buffer rejects the URL, confirm no post ID/live post exists and use only the documented recovery. | `public/blog/scripts/lib/buffer-media-verification.mjs`, `public/blog/scripts/buffer-live.mjs`, `docs/BUSINESS-GROWTH-AUTOMATION-SOP.md` |
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

Package preparation must decode and measure every exact sound-effect excerpt before handoff; schema validation alone does not prove the selected excerpt is audible. Reuse hash-valid rendered artifacts across production dates; delivery failures never require another encode.

Owner requests to generate now or manually authorize daytime production for the explicitly selected topics. Run `python3 scripts/run-business-reel-queue.py --allow-daytime --slugs <approved-slugs>` immediately, serially. This manual path replaces the dated scheduler handoff requirement; source approvals, shared leases, bounded retries and release QA still apply. Do not defer an explicit manual request to the overnight window or ask for the same authorization again.

## 5. Schedule

### macOS launchd jobs (repo definitions in `launchagents/`)

| Job | When | Script | Status |
|---|---|---|---|
| `com.nick.coin-history-drafts` | Every 15 min | `scripts/run-coin-history-drafts.py` | Installed but currently disabled in launchd. Coin publisher only; not used by the business exception. |
| `com.nick.render-missing-reels` | Daily 01:00 and 04:00, max 2 reels per run | `scripts/render-missing-reels.sh` | Active, coin scope only; diffusion disabled by default |
| `com.nick.business-reel-production` | Daily 02:00 Pacific, recovery checks at 03:00, 04:00 and 05:00 | scripts/run-business-reel-queue.py, ops/business-reel-queue.json | One serial owner; requires today's validated Luna handoff; target 2 current renders, at most 3 distinct approved topics per day; no new heavy work outside 00:00–06:00. Missing or stale handoff defers without rendering. caffeinate prevents idle sleep during the job. |
| `com.nick.buffer-backlog` | Daily 22:00 | `scripts/buffer-backlog-runner.sh` | Installed but currently disabled in launchd; existing disable preserved during business workflow repair. |
| `com.nick.daily-blog-reel` | Daily 09:00 | `scripts/daily-blog-reel.sh` | **Retire.** Generic publisher. Must be disabled with launchctl (section 9). |
| `com.nick.gemma-research` | Mon and Thu 23:00 | `scripts/gemma-research-batch.py` | **Retire.** Generic topic research. |
| `com.nick.ollama-publisher-watchdog` | Every 5 min | `scripts/ollama-publisher-watchdog.sh` | **Retire.** Only kicks the generic publisher; the coin worker restarts Ollama itself. |
| `com.nick.local-operations-audit` | Daily 22:20 | `scripts/local-operations-audit.mjs` | Installed but not in repo. Keep; add plist to repo. |

### Codex automations (`~/.codex/automations/`)

| Automation | Status |
|---|---|
| `fused-daily-publishing-owner` (08:30, 21:30) | Keep. Refocus on coin queue preparation (section 6, step 1). |
| `fused-daily-profit-and-sop-evolution` | Keep, weekly review only |
| `daily-business-growth-blog-and-reel` | Daily 20:30 Pacific, GPT-5.6 Luna low; prepare/review three packages for the next Pacific date, write the validated handoff, and never run a separate render loop. Use at most one bounded, read-only GPT Luna sub-agent for source/approval review. |
| `finish-failed-overnight-reels-now` | Reused as daily 03:15, 06:15 and 14:15 Luna delivery/health checks. Read compact status and the dated handoff, finish eligible delivery, and reconcile due exact post IDs. At 03:15 resume rendering only with a valid handoff and remaining limits. No daytime synthesis or encode; notify on changes, failures or required action. |
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
| 9. Render reel | Chatterbox, Whisper, Remotion | overnight `render-missing-reels.sh` job; coin worker queues and later reconciles | `video/out/<slug>/<slug>.mp4` | No daytime render; duration, size, voice, captions, music, hashes |
| 10. Release QA | Six frame visual review plus release gate | coin worker | `video/out/<slug>/release-qa.json` | `readyForPosting: true` |
| 11. Schedule | Buffer runner at 22:00 | launchd | Buffer posts on 3 channels | Queue cap 9, 7 day reuse |
| 12. Embed | Blog video player linked to hosted reel | Codex | updated blog HTML | Player and source URL in live HTML |
| 13. Commit | Content commit on `main` | Codex | git commit | Section 7 |

**Throughput operations.** The worker does one episode at a time. It may publish and queue reel work during the day, but must not start local TTS or Remotion; `render-missing-reels.sh` owns two-reel overnight batches and the worker reconciles hash-bound release evidence on its next pass. Maintain at least 3 complete, unprocessed packages in the queue each morning, with about 21 per week prepared as a rolling target. Use `node scripts/prepare-coin-history-batch.mjs --manifest=<path>` to prepare a new episode from its source checked workup and append it to the production queue only after package validation and the first coin image match check pass. The owner photo catalog is the image supply ledger; photos remain unavailable for production until identity and crop review are complete. The worker records stage durations, retries and completed pairs by Pacific date in `.workflow-state/coin-history-drafts/throughput.json`. Review that report over multiple production cycles before treating the three pair target as a proven capacity. Never reduce a source, editorial, image or release gate to meet the target.

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
| Business queue and nightly handoffs | `ops/business-reel-queue.json`, `.workflow-state/business-growth-ai-365/production/handoffs/<Pacific-date>.json` |
| Business run status | `python3 scripts/business-reel-status.py`, `.workflow-state/business-growth-ai-365/production/runs/<Pacific-date>/` |
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
