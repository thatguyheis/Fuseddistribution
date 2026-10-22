# Companion video reconciliation

Effective October 5, 2026. A blog article is not considered video-connected merely because a placeholder, social link or pending staging file exists. It needs an actual matching player in the live article.

The existing daily 22:00 Buffer shell runner now runs `node scripts/reconcile-blog-videos.mjs --deploy` after its Buffer pass, including when Buffer is deferred. This is a local deterministic step, not another AI task. It uses saved confirmed sent records and the latest fresh sent-post metrics snapshot; it makes no Buffer API requests. An unchanged site requires no video availability requests or deployment.

The command checks the reviewed deployment catalog for missing players. Match by exact article slug, validated YouTube video ID and confirmed sent time. Scheduled posts, guessed topic similarities, invalid URLs, future articles and editorial holds do not qualify. If no published YouTube match is available, a hosted fallback requires current music clearance, release and visual approval, a matching source hash and verified hosted bytes. Keep unqualified work pending rather than pretending every article has a reel.

For each eligible panel, verify the YouTube embed identity/availability or the exact hosted file. Change only the marked video panel of the reviewed deployment snapshot. Preserve prose, dates, CTAs, hero and other site work. Back up prior bytes. Renew only the index hash of an already intact approved source package; never approve unrelated drift. Publish one scoped snapshot for the whole group and compare each live article's exact main content. A staged panel or successful upload alone is not completion.

Use the shared publisher lock. A busy or unknown owner defers the work without breaking the lock. Retry intent is persisted before mutation, and failed live checks remain pending for the next run. Review `.workflow-state/blog-video-reconciliation/latest.json` in the existing owner brief. Escalate changed errors during the next 08:30/21:30 owner pass. No additional polling schedule is needed.

Run `node scripts/reconcile-blog-videos.mjs` for a local read-only plan. It reports articles with existing players, eligible missing players and articles lacking a verified matching video. The old social-link sync may still stage additional social buttons, but its staging output is not live-publication evidence.

On Sundays the same runner adds `--check-existing` to check existing hosted player URLs. Only confirmed 404/410 responses justify replacing a broken player with a clear availability message; timeouts remain unknown. Verified matching replacements are preferred. Missing legacy sources are listed in `.workflow-state/blog-video-reconciliation/legacy-video-repair-queue.json` and the owner brief. Repair them within batch capacity, preserving all release gates.

For a deployed repair awaiting propagation, use `node scripts/verify-blog-video-panels.mjs`. That verifier makes only production GET requests and updates local evidence; it cannot deploy.

This pass does not certify existing third-party videos remain globally playable. A reported broken, private or claimed video requires replacement review. Never infer copyright clearance from YouTube oEmbed. Keep all existing free-music, revocation and final-video checks.
