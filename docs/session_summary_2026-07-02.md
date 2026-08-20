# Session Summary — 2026-07-02 (Claude pipeline audit + recovery)

## What was done

**Audit — why nothing went live:**
- LaunchAgent runs the pipeline in local-LLM takeover mode (`HERMES_TAKEOVER=1`, `CLAUDE_ENABLED=0`, gemma3:4b; log mislabels it "Phi-4").
- The small model emits em/en dashes; the LLM fix loop (same model) fails after 3 attempts; the deterministic QA gate correctly blocks and quarantines. Today: 4/4 posts quarantined, zero published. Same pattern caused quarantines on 6/25, 6/26, 6/30, 7/1.
- Secondary issue: first wrangler deploy shipped a stale asset manifest (deploy raced the posts.json write), so the blog listing missed the new posts even after they were live at their URLs.

**Fixes (pushed in `9c5b1bc`):**
- `write-article.sh`: deterministic dash sanitizer before every lint pass.
- `scripts/daily-blog-reel.sh`: post-deploy posts.json content verification with one auto-redeploy retry.

**Recovery — today's 4 posts (all live, verified 200, sitemap 213/213):**
- electric-vehicle-silver-demand-explained (silver)
- silver-market-outlook-2026-what-analysts-say (silver)
- best-time-to-post-on-instagram-for-local-business (tech)
- social-media-analytics-what-metrics-actually-matter (tech)
- Repair: restored from `.workflow-blocked/2026-07-02/`, sanitized dashes + banned words, re-ran lint + qa-local (all pass, no gate bypass), registered, committed, pushed, deployed. Listing confirmed fresh (121 posts).

**Reels (all 4 rendered + validated):**
- 1080x1920, 181–203s, chatterbox voice, proportional captions, ffprobe-verified.
- Worker committed metadata locally (`aad588c`) per reel policy (no push).
- Buffer-safe copies generated: `public/reels/` (YouTube, 179s ≤25MiB) and `public/reels-x/` (X, 135s); posting packs written.

**Handoff:** `docs/CODEX-HANDOFF-2026-07-02-buffer-reel-publishing.md` — full Buffer scheduling instructions, capacity math, verified specs.

**Cron:** verified intact — 23:00 gemma-research → 09:00 daily-blog-reel → 11:00 render-missing-reels, all loaded, exit 0. Tomorrow's run should pass QA with the sanitizer in place.

## Needs review / pending approval

1. **Reel publish (blocks Buffer scheduling):** `npx wrangler deploy` to host the 8 new MP4s + `git push` of `aad588c` + handoff doc. Awaiting Nick/Codex approval per reel policy.
2. Optional: purge-scoped Cloudflare API token (keychain `cloudflare-purge-token`) for instant cache purges — dashboard one-time setup.
3. `com.nick.litert-serve` LaunchAgent is dead (exit -15) — not blocking this pipeline (writer uses ollama), but the gemma leaf service is down.
4. Old live post `silver-portfolio-allocation` contains banned word "accordingly" (pre-existing, untouched).
5. Log label "T5 write via local Phi-4" is a mislabel — actual model is gemma3:4b (cosmetic).

## Skipped

- Buffer scheduling itself (Codex-owned, needs live media first).
- No changes to takeover mode (`CLAUDE_ENABLED=0`) — intentional decoupling; sanitizer makes it viable.
