# Publishing recovery audit: September 15, 2026

## Verified causes

- Codex exhaustion stopped the earlier owner task. The account now reports 0% consumed and no active limit block after Nick's reset. No additional reset was redeemed.
- Ollama at port 11434 and LiteRT at port 9379 respond outside the sandbox. LiteRT exposes the nightly Gemma model. The running Chatterbox owner is doing local work; it does not consume Codex plan tokens.
- Today's 07:00 research run exited because both finite topic pools were exhausted. The 09:00 publisher and retry had no queue to consume.
- The watchdog could wake a publisher but could not repair a missing research queue. Afternoon research would otherwise default to tomorrow.
- Short sections accumulated into rejected 693-888 word drafts. Declared reel timings also previously hid insufficient narration; existing preflight and measured release gates remain enforced.
- The earlier inherited-sale hosting failure was a missing environment load, not an absent credential: video/.env already contains the configured Cloudflare token. The standalone uploader now reads only that credential, without executing the file or exposing unrelated secrets.

## Repairs and validation

Added eight fresh editorial candidates per brand, preserving registration and canonical exclusions. The selector reports low inventory at six remaining candidates. These are candidates, not source-reviewed or approved articles.

Existing queues exit before topic selection and model startup. A deficient article section gets one substantive revision attempt and must still meet the section floor and full draft QA.

After 07:00 Pacific, the watchdog requests the existing research service for today's absent queue, once per date and generator revision. It respects the active render and publisher guards. Recovery targets today's gap even after noon. A failed revision requires owner review rather than unlimited immediate retries.

27 targeted tests passed, including executable shell tests for queue preservation and bounded research wakes. Bash, Zsh, and JavaScript syntax checks passed. Evidence: `/tmp/fused-audit-tests-20260915.log`.

## Delivery status and remaining work

The current health audit reports zero uncovered queued topics, zero order errors, six incomplete legacy packages, and two historical missing queue dates. Today's queue is still missing; corrected generation must run after the active renderer is idle. Do not report a new article as published from this repair alone.

One authoritative Buffer snapshot returned zero active jobs and deficits of three each for YouTube, X, and Instagram. The existing launchd owner is loaded with its first daily run at 13:00 Pacific. No duplicate owner or new social submission was started by this audit.

The inherited-sale reel already has passing release evidence at 114.880 seconds. Its two prepared files are 8,793,802 bytes each. Automatic approval review rejected the exact Cloudflare upload for missing explicit payload/destination authorization. Approval was requested; no upload occurred. After approval, run exact-slug sync and verify both hosted paths before scheduling.

Other short recovery scripts still require source-supported narration repair. Preserve the active renderer, valid audio caches, approval hashes, and actual media release gates. No commit, push, file deletion, or new live publication was performed.
