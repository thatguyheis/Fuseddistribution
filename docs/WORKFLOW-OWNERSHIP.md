# Workflow Ownership — Fused Distribution

Owner persona: Robert Paulson, operating through Codex.
Reports to: Nick Hughes.
Business goal: publish reliable blog, website, social, and reel assets that create audience trust, search traffic, leads, and revenue for Fused Distribution.

## Operating Model

Codex owns production integrity: workflow code, gates, render safety, deployment checks, logs, and incident follow-up. Agent output is treated as input, not truth, until deterministic validation passes.

Hermes and Gemma are draft/research workers. They can produce queue items, rough drafts, hooks, and low-cost supporting copy, but they do not decide whether content is publishable.

Claude is an editorial and QA specialist when quota is available. Claude can improve polish, research, social copy, and review quality, but a Claude limit must degrade gracefully instead of publishing partial work.

Remotion is a downstream renderer. It should run only after blog assets, reel data, script timing, captions, media, and display text pass automated checks.

## Non-Negotiable Gates

- Do not commit or deploy a post with missing `index.html`, `hero.jpg`, `reel-data.md`, `reel-script.md`, or `social-copy.json`.
- Do not publish a post that failed QA registration into `posts.json`.
- Do not render a reel if the script has missing display text, markdown citations in narration, URL narration, unsafe TTS tokens, or narration windows that are too short.
- Do not store secrets in launchd plists, generated docs, blog posts, or committed scripts.
- Prefer deterministic validators over SOP instructions that rely on an agent remembering rules.

## Revenue Priorities

1. Publish complete, useful blog posts that can rank and build trust.
2. Produce reels that are readable with sound off and strong enough to drive comments/follows.
3. Protect Nick's time and plan limits by failing fast before expensive render or deploy steps.
4. Use AI image generation selectively for hook slides, thumbnails, hero visuals, and ad creatives where stock assets are weak.
5. Keep the workflow simple enough to run daily on the MacBook without babysitting.

## Current Production Standard

- The 9 AM job builds, validates, and commits approved blog posts locally for Claude review. It does not render video, push, or deploy by default.
- The 11 AM job renders at most two stale registered reels per run and commits metadata locally for Claude review.
- A global render lock prevents launchd, Claude, and Codex from starting concurrent Remotion jobs on the Mac.
- Chatterbox with Nick's voice reference is the required production voice. Zoe is opt-in recovery only.
- Remotion variable text uses measured fitting. Script validation blocks missing or mismatched stat figures.
- Audio cache entries are keyed by narration and voice so changed scripts cannot reuse stale speech.
- Chatterbox loads once per reel and generates stale segments as a batch to reduce MPS startup overhead.
- Caption metadata records `whisper`, `proportional`, `mixed`, or `none`; proportional captions are not described as Whisper verified.

## Near-Term Backlog

- Rotate the deployment token that was previously stored in a launchd plist.
- Add one-frame still checks for hook, mid-body, chart, and question frames before full render.
- Add AI-generated hook and thumbnail assets as an optional fallback when licensed stock media is weak.
