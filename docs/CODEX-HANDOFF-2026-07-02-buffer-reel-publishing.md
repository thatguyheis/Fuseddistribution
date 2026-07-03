# Codex Handoff: Buffer Reel Publishing — 2026-07-02

**Date:** 2026-07-02
**Owner:** Nick
**Prepared by:** Claude (editorial/QA pass)
**Status (updated 2026-07-02 ~15:20 PDT):** 4 new posts live and verified. 4 long-form reels rendered, validated, committed, and pushed (`aad588c`, `b7eaeeb`). Hosted media DEPLOYED — all 8 MP4 URLs (`/reels/` x4, `/reels-x/` x4) verified `200 video/mp4` on fuseddistribution.com. Publish blocker CLEARED. Ready for Buffer scheduling (start at "Buffer Scheduling Rules").

## Today's Slugs (4)

| # | Slug | Brand | Reel (source) | YT copy | X copy |
|---|------|-------|---------------|---------|--------|
| 1 | `electric-vehicle-silver-demand-explained` | silver | 195.1s 1080x1920 104MB | 179s 720x1280 9.5MB | 135s 4.9MB |
| 2 | `silver-market-outlook-2026-what-analysts-say` | silver | 183.1s 1080x1920 116MB | 179s 720x1280 11.5MB | 135s 5.1MB |
| 3 | `best-time-to-post-on-instagram-for-local-business` | tech | 202.6s 1080x1920 80MB | 179s 720x1280 8.2MB | 135s 4.0MB |
| 4 | `social-media-analytics-what-metrics-actually-matter` | tech | 181.1s 1080x1920 92MB | 179s 720x1280 9.0MB | 135s 4.5MB |

All source reels: chatterbox voice (Nick clone), proportional captions, validated by `parse-script.mjs` + `validate-reel.mjs`, ffprobe-verified 1080x1920 within the 180-240s window. Blog URLs all verified 200:

- `https://fuseddistribution.com/blog/electric-vehicle-silver-demand-explained/`
- `https://fuseddistribution.com/blog/silver-market-outlook-2026-what-analysts-say/`
- `https://fuseddistribution.com/blog/best-time-to-post-on-instagram-for-local-business/`
- `https://fuseddistribution.com/blog/social-media-analytics-what-metrics-actually-matter/`

## Prepared Local Artifacts

- `public/reels/<slug>/<slug>.mp4` — YouTube Buffer copies (all under 25 MiB / 179s gate)
- `public/reels-x/<slug>/<slug>.mp4` — X cutdowns (135s)
- `.buffer-media-urls.json` + `.buffer-x-media-urls.json` — updated media URL maps
- `public/blog/<slug>/posting-pack.json` + `posting-pack.md` — per-slug packs (media-url set to hosted `/reels/<slug>/` target)
- Reel metadata committed locally in `aad588c` (reel policy: no push from reel pass)

## Blocker To Clear First (same class as 2026-06-29)

Hosted MP4 URLs are NOT live yet. Buffer rejects non-200 media. Note: reel MP4s, posting packs, and media-url maps are git-ignored by design — hosting is filesystem-based via wrangler. Required publish step (needs Nick/Codex approval — reel deploys are excluded from the standing content-push permission):

1. `npx wrangler deploy` (ships `public/reels/` + `public/reels-x/` from the working tree)
2. `git push origin main` (reel metadata commit `aad588c` + this handoff doc; no media in git)
3. Verify each URL returns `200 video/mp4`:
   - `https://fuseddistribution.com/reels/<slug>/<slug>.mp4` (x4)
   - `https://fuseddistribution.com/reels-x/<slug>/<slug>.mp4` (x4)

Deploy-race caution: after deploy, verify content freshness, not just 200s. A stale asset manifest shipped on 2026-07-02 (fixed in `9c5b1bc` with auto-verify+redeploy for posts.json; reel URLs are new paths so a plain 200 check is sufficient for them).

## Buffer Scheduling Rules (carried from 2026-06-29 doc)

- Buffer organization `My Organization` (`6a3e62cb6adcaa97fe293a7d`); YouTube channel `Nick` (`6a3e63375ab6d2f1067461b2`); X channel `thatguyheis` (`6a3e73fb5ab6d2f10674b516`)
- Org-wide scheduled cap `10`; reserve `2` slots; fill at most `8` scheduled/sending total
- Each slug = 1 YouTube + 1 X post, so max `4` slug pairs per run
- Query Buffer `scheduled` + `sending` count BEFORE scheduling; recompute capacity
- `customScheduled` with `dueAt` between 1:00 PM and 7:00 PM America/Los_Angeles
- Every post includes the matching canonical blog URL
- X payload: top-level `assets: [{ video: { url } }]`; after `create_post`, `get_post` must show a retained video asset before logging success
- Append to `.buffer-youtube-scheduled.json` / `.buffer-x-scheduled.json` only after verified create
- Verify YouTube AI disclosure manually after scheduling
- Reconcile any past-due entries in the scheduled logs before adding new ones (see 2026-06-29 doc "2026-07-02 Buffer Posting Failure Update" section)

## Execution Order

1. Nick approves push → push + deploy + verify hosted MP4 URLs (section above)
2. Reconcile Buffer scheduled logs vs live Buffer state
3. Query Buffer capacity; confirm ≤ 8 slots after adding 4 pairs
4. Schedule YouTube for each slug (from `.buffer-media-urls.json` URLs), verify per-post, log
5. Schedule X for each slug (from `.buffer-x-media-urls.json` URLs), verify per-post, log
6. Verify AI disclosure on the 4 YouTube posts
