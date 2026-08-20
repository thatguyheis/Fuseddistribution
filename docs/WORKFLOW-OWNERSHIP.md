# Workflow Ownership — Fused Distribution

Owner persona: Robert Paulson, operating through Codex.
Reports to: Nick Hughes.
Business goal: publish reliable blog, website, social, and reel assets that create audience trust, search traffic, leads, and revenue for Fused Distribution.

## Operating Model

Codex owns production integrity: workflow code, gates, render safety, deployment checks, logs, and incident follow-up. Agent output is treated as input, not truth, until deterministic validation passes.

Hermes and Gemma are draft/research workers. They can produce queue items, rough drafts, hooks, and low-cost supporting copy, but they do not decide whether content is publishable.

Codex is the accountable editorial, QA, recovery, and operations owner. Local models may draft supporting material, but they cannot approve publication or close a checkpoint. Claude Code is not a production dependency.

Remotion is a downstream renderer. It should run only after blog assets, reel data, script timing, captions, media, and display text pass automated checks.

## Non-Negotiable Gates

- Do not commit or deploy a post with missing `index.html`, `hero.jpg`, `reel-data.md`, `reel-script.md`, or `social-copy.json`.
- Do not publish a post that failed QA registration into `posts.json`.
- Do not render a reel if the script has missing display text, markdown citations in narration, URL narration, unsafe TTS tokens, or narration windows that are too short.
- Do not render or schedule a reel with background music unless `video/data/audio-rights.json` marks the exact track file as `approved`; unlisted, pending, claimed, or hash-mismatched tracks are blocked.
- Do not store secrets in launchd plists, generated docs, blog posts, or committed scripts.
- Prefer deterministic validators over SOP instructions that rely on an agent remembering rules.

## Revenue Priorities

1. Publish complete, useful blog posts that can rank and build trust.
2. Produce reels that are readable with sound off and strong enough to drive comments/follows.
3. Protect Nick's time and plan limits by failing fast before expensive render or deploy steps.
4. Use AI image generation selectively for hook slides, thumbnails, hero visuals, and ad creatives where stock assets are weak.
5. Keep the workflow simple enough to run daily on the MacBook without babysitting.

## Daily Profit and SOP Improvement

Codex runs the comparison-driven control loop in
`docs/PROFIT-IMPROVEMENT-SOP.md`. Every operating day must record authoritative
business and reliability outcomes, compare them with the trailing baseline, and
address the highest expected-loss behavior first. Repeated failures receive an
escalating penalty. Attributable gross profit, conversions, qualified leads, and
verified high-quality distribution receive rewards.

SOP evolution is governed, not free-form. A learned rule requires evidence,
an expected profit mechanism, a measurable success condition, guardrails, a
test or replay, and a rollback condition. No learned rule may weaken security,
privacy, legal, financial, accuracy, approval, release-QA, or authoritative
live-verification requirements.

## Current Production Standard

### Failure containment standard

The daily owner must distinguish a transient dependency failure from a content
quality failure. Empty model output, transport errors, and deployment propagation
failures are retryable from the dated checkpoint. Repeated undersized content,
invalid metadata, unsupported claims, or a failed deterministic/editorial gate are
quality blocks: preserve the artifact in `.workflow-blocked/<pacific-date>/`, record
the exact gate, and require an owner repair. A quality block must never be retried
indefinitely as a model outage.

Each post execution has a bounded whole-post watchdog and a durable attempt count.
When the watchdog fires, the runner terminates the child process group, retains the
slug in the pending marker, and schedules bounded backoff. After the configured
attempt ceiling, it quarantines the checkpoint and reports the blocker instead of
starving newer dates. The runner records Pacific operating dates with
`TZ=America/Los_Angeles`; UTC timestamps are diagnostic metadata only.

Launchd configuration is not execution evidence. The runner records retry due
time in `.workflow-state/retry.json` and writes a per-date heartbeat to
`.workflow-state/blog-YYYY-MM-DD.json` with its PID, launch label, current slug,
and exit event. The owner must require a post-due heartbeat or an explicit
quality/deferred checkpoint before considering a retry handled.

- The 9 AM job builds, validates, commits, deploys approved blog posts automatically (`BLOG_AUTO_DEPLOY=1` in the launchd plist, enabled 2026-06-29), and curl-verifies each slug returns 200. It does not render video. QA-failed or deferred posts are not registered, not deployed, and stay local for retry. Source synchronization remains a separate controlled handoff; never bundle unrelated worktree changes into it.
- The blog runner checkpoints the queue before any model or network probe. On
  startup it resumes the oldest `*-pending.json` date before today's queue, and
  generated retry jobs preserve the original date and production environment.
  A computer restart must therefore delay the workflow, not abandon the day.
- The 11 AM job renders at most four stale registered reels per run and commits metadata locally for Codex review. Keep this aligned with the daily blog publish target; if four posts publish per day, rendering only two guarantees a reel backlog and starves Buffer.
- A global render lock prevents launchd, Codex, and manual operators from starting concurrent Remotion jobs on the Mac.
- The Codex daily publishing owner task audits the oldest pending blog date, live deployment, reel backlog, and downstream Buffer readiness. It resumes checkpoints rather than trusting a prior agent's success report.
- Scheduled ownership is deliberately redundant but not concurrent: launchd may
  start the 9 AM blog producer, while the 9:15 AM Codex owner must detect an
  active run and monitor it rather than start a second producer. Buffer
  maintenance runs every four hours at :30 to refill the six fixed full-day
  posting slots. Every pass covers YouTube Shorts, X, and Instagram, reuses
  authoritative checkpoints, and must not duplicate posts or occupied due times.
- Chatterbox with Nick's voice reference is the required production voice. Zoe is opt-in recovery only.
- Remotion variable text uses measured fitting. Script validation blocks missing or mismatched stat figures.
- Audio cache entries are keyed by narration and voice so changed scripts cannot reuse stale speech.
- Reels are timed from measured TTS audio, not word-count padding. The renderer permits a 0.2-second dialogue gap between segments and a 0.5-second final-card pad.
- Approved music is normalized to the loudness target in `audio-rights.json`; a fixed percentage volume is prohibited because source tracks have inconsistent mastering.
- A completed MP4 is not postable until `release-qa.json` passes. Proportional captions require a recorded three-point sync review before that gate is marked ready.
- Chatterbox loads once per reel and generates stale segments as a batch to reduce MPS startup overhead.
- Caption metadata records `whisper`, `proportional`, `mixed`, or `none`; proportional captions are not described as Whisper verified.
- A zero-post Buffer queue is an observation, not a completion state. It is
  healthy only when the day's eligible released reels are already confirmed
  sent or no eligible backlog exists. Otherwise it is a missed distribution
  checkpoint and must be recovered or recorded as blocked.
- Daily Buffer distribution targets at least three posts each on YouTube Shorts,
  X, and Instagram. Allocation is deficit-based per Pacific operating date, so
  an Instagram catch-up can run alongside different YouTube/X content. Prefer
  new approved reels, then unsent approved backlog, then the oldest approved
  reel outside the seven-day rotation cooldown. The organization cap and
  one-slot reserve remain hard limits.
- Through the 2026-08-12 expedited backlog-burn review, Buffer targets six posts
  per channel without weakening the three-per-channel floor. A four-hour owner
  loop refills the rolling queue for the fixed 01:00, 05:00, 09:00, 13:00,
  17:00, and 21:00 Pacific slots, counts scheduled/sending/sent posts for the
  Pacific date, and fills only unoccupied future slots. The rolling active target
  is nine posts, preserving one slot beneath Buffer's free limit of ten. If approved inventory is
  insufficient, report the exact release/media gate instead of lowering QA.
- Instagram sourcing merges the fresh YouTube queue with deduplicated verified
  YouTube history. This lets Instagram consume eligible backlog even when the
  fresh queue contains only candidates that Instagram recently posted.
- Instagram is not considered operationally proven merely because its channel
  is connected. At least one newly created Reel must pass API create/readback,
  retain its video asset, and later reach sent state; until then reports must say
  `configured, unproven`.

## Near-Term Backlog

- Rotate the deployment token that was previously stored in a launchd plist.
- Add one-frame still checks for hook, mid-body, chart, and question frames before full render.
- Add AI-generated hook and thumbnail assets as an optional fallback when licensed stock media is weak.
