# Social Media SOP - Fused Distribution

Governs content creation and posting handoff for social media. The active production path is YouTube through Buffer plus Facebook Professional Mode through native Facebook tools. Postiz remains a future option for Page-based channels, but it is not the active workflow.

**Platforms:** YouTube, Facebook Professional Mode profile, Instagram, LinkedIn, X
**Content types:** Reels (video), Photo posts (SVG/image)

---

## Active Channel Strategy

| Channel | Current path | Automation status | Reason |
|---|---|---|---|
| YouTube | Buffer | Active test path | Buffer supports the connected YouTube channel and can be API-driven after media hosting is solved. |
| X | Buffer | Active test path | Buffer supports the connected X profile and can reuse the hosted reel MP4s with short platform copy. |
| Facebook Professional Mode profile | Facebook native tools | Manual handoff only | Third-party tools generally do not publish reliably to professional personal profiles. Use the Facebook app or Professional Dashboard. |
| Instagram | Manual or future scheduler | Pending | Keep captions ready. Do not assume profile/page API permissions until connected and tested. |
| LinkedIn | Manual or future scheduler | Pending | Keep captions ready. |

Do not use unofficial APIs or credential-scraping automation to post to the Facebook professional personal profile. Browser-assisted manual posting is allowed when Nick controls the session and the batch file is used only as a handoff checklist.

### Connected Buffer Channel

Use this exact Buffer channel for YouTube posting:

| Field | Value |
|---|---|
| Buffer organization | `My Organization` |
| Buffer organization ID | `6a3e62cb6adcaa97fe293a7d` |
| Buffer channel name | `Nick` |
| Buffer channel ID | `6a3e63375ab6d2f1067461b2` |
| YouTube channel URL | `https://www.youtube.com/channel/UCYZ9U8HGBxoyZbZjkmS8U0w` |
| Timezone | `America/Los_Angeles` |

Do not guess or substitute channel IDs. If Buffer reconnects the account, run `get_account` and `list_channels` again, then update this table before scheduling.

Use this exact Buffer channel for X posting:

| Field | Value |
|---|---|
| Buffer organization | `My Organization` |
| Buffer organization ID | `6a3e62cb6adcaa97fe293a7d` |
| Buffer channel name | `thatguyheis` |
| Buffer channel ID | `6a3e73fb5ab6d2f10674b516` |
| X profile URL | `https://twitter.com/thatguyheis` |
| Timezone | `America/Los_Angeles` |

## Daily Output

Per approved blog post:

| Asset | Count | Platforms |
|---|---|---|
| Long-form reel (MP4) | 1 | YouTube + Facebook Professional Mode + IG + LinkedIn + X |
| Buffer-safe YouTube MP4 | 1 when needed | YouTube via Buffer API |
| X cutdown MP4 | 1 when needed | X via Buffer API |
| Photo post (SVG) | 1 | FB + IG + LinkedIn |
| social-copy.json | 1 | Captions and discussion question source |
| posting-pack.json / posting-pack.md | 1 | Buffer handoff + Facebook native handoff |

---

## Content Creation Pipeline

Content is created during the daily Claude pipeline run (`daily-blog-reel.sh`). By the time the pipeline finishes, these files exist per blog post:

```
blog/[slug]/
  reel-data.md        ← validated source facts and media queries
  reel-script.md      ← one long-form reel script (from REEL-SOP.md)
  photo-post.svg      ← 1200×1200 feed image (see BLOG-SOP.md §15)
  social-copy.json    ← all captions per platform (see BLOG-SOP.md §14)

video/out/[slug]/
  [slug].mp4
```

The rendered `video/out` MP4 is the source of record. It may be too long or too large for Buffer API scheduling. Before any Buffer API run, create platform-safe public copies:

```bash
npm run social:buffer:youtube:media -- --slugs=slug-one,slug-two
npm run social:buffer:x:media -- --slugs=slug-one,slug-two
```

This writes:

```
public/reels/[slug]/[slug].mp4    ← YouTube Buffer API copy, max 179s and 25 MiB
public/reels-x/[slug]/[slug].mp4  ← X Buffer API copy, default 135s
.buffer-media-urls.json           ← YouTube media URL map
.buffer-x-media-urls.json         ← X media URL map
```

Do not send `video/out/[slug]/[slug].mp4` directly through the Buffer API unless it already passes the platform gates. Use the generated `public/reels` or `public/reels-x` copies for automation.

After the MP4 exists, generate the posting pack:

```bash
npm run social:pack -- <slug>
```

If the video has already been uploaded to a stable public URL for Buffer API scheduling:

```bash
npm run social:pack -- <slug> --media-url=https://example.com/video.mp4
```

This writes:

```
public/blog/[slug]/
  posting-pack.json
  posting-pack.md
```

The pack is credential-free by design. It prepares copy, asset paths, checklists, and Buffer/Facebook handoff data without storing API keys or account tokens.

### YouTube Buffer API Scheduling Requirements

Buffer API scheduling is allowed only when all of these are true:

- The MP4 has passed the `video/REEL-SOP.md` post-render QA checklist.
- `public/blog/[slug]/posting-pack.json` exists and has `destinations.youtube_buffer.status` set to `ready_for_buffer_scheduling`.
- `assets.public_media_url` is a stable HTTPS URL for the exact MP4 being posted. Local file paths cannot be sent through the Buffer API.
- The public MP4 is the Buffer-safe copy under `public/reels/[slug]/[slug].mp4`, generated with:

```bash
npm run social:buffer:youtube:media -- --slugs=<slug>
```

- The MP4 is live and returns HTTP 200 over HTTPS at that URL before any Buffer create. Buffer fetches media at create time; a 404 fails the post. Verify the exact URL that will be sent to Buffer:

```bash
npm run social:buffer:verify-media -- --url=https://example.com/reels/slug/slug.mp4
```

- Each MP4 is no longer than 179 seconds for Buffer YouTube API scheduling. In the 2026-06-30 repair, 181-182 second files returned generic Buffer `Invalid post` errors, while 175-179 second files scheduled cleanly.
- Each MP4 is at most 25 MiB. Cloudflare Workers static assets (`assets.directory=./public`) reject any single file over 25 MiB, so larger reels never go live and Buffer cannot fetch them. Re-encode oversize reels under 25 MiB before deploy, or skip them for the run.
- `assets.blog_url` and the YouTube description use the matching canonical website URL: `https://fuseddistribution.com/blog/[slug]/`.
- The post uses the exact YouTube Buffer channel ID `6a3e63375ab6d2f1067461b2`.
- The Buffer `create_post` payload includes `metadata.youtube.title` and `metadata.youtube.categoryId`, because YouTube requires both.
- Default to Buffer custom scheduling (`mode: customScheduled`) in the 1:00 PM-7:00 PM `America/Los_Angeles` window. Use the correct local offset for the date (`-07:00` during PDT, `-08:00` during PST).
- For a specific scheduled time, resolve it in the Buffer account timezone, `America/Los_Angeles`, and make sure it is in the future.

If any requirement is missing, create the posting pack and stop for handoff instead of publishing.

### X Buffer Scheduling Requirements

Buffer API scheduling is supported for X video posts when the MP4 passes X eligibility gates.

Verified Buffer MCP/API behavior:

- The 2026-06-26 X posts were created through Buffer API and published with video assets. `get_post` confirms top-level `assets[]` contains `type: "video"` for those sent posts.
- The working X payload shape is top-level `assets: [{ video: { url } }]` with no `metadata.twitter.thread`.
- A 2026-06-29 draft test with a 46-second MP4 confirmed this payload still preserves the video asset.
- A 2026-06-29 test with 175-182 second MP4s failed or saved as text-only. Those false-positive text-only posts were deleted before publish.
- Thread video asset shape `metadata.twitter.thread[0].assets: [{ video: { url } }]` is not valid for single-video X posts in this workflow. It can create a scheduled text-only post after Buffer strips the asset.

Therefore, do not treat a successful X `create_post` response as proof that a video was attached. X video is successful only if `get_post` shows the video asset is still present.

The current working Buffer API post-creation paths are:

- YouTube: top-level video asset as `assets: [{ video: { url } }]` plus `metadata.youtube.title` and `metadata.youtube.categoryId`
- Twitter/X: top-level video asset as `assets: [{ video: { url } }]`, `text`, `mode: "customScheduled"`, `schedulingType: "automatic"`, and a `dueAt` between 1:00 PM and 7:00 PM `America/Los_Angeles`

For X reel scheduling, all of these must be true:

- The MP4 has passed the `video/REEL-SOP.md` post-render QA checklist.
- `public/blog/[slug]/social-copy.json` exists and includes `reel.x`.
- The final X text is 280 characters or fewer including the canonical blog URL.
- The hosted MP4 is publicly reachable over HTTPS. Prefer the `*.workers.dev/reels/...` URL for Buffer media fetches if the production `fuseddistribution.com/reels/...` route returns `403` or otherwise blocks Buffer.
- The MP4 duration is at most 140 seconds. The current X channel is an `X Free Profile`, and the 175-182 second long-form reels failed the API video path while 20-46 second reels succeeded.
- The post is created on X channel `thatguyheis` (`6a3e73fb5ab6d2f10674b516`) using custom scheduling inside the 1:00 PM-7:00 PM `America/Los_Angeles` window.
- After creation, call `get_post` and confirm `assets[0].type` is `video` before appending the slug to `.buffer-x-scheduled.json`.

Do not schedule long-form reels to X through Buffer API. Create an X-safe cutdown under 140 seconds first, or skip X for that slug.

#### X API Scheduling Steps

Plan eligible X posts after querying the live Buffer scheduled/sending count:

```bash
npm run social:buffer:x:plan -- --current-scheduled=<count> --limit=10 --reserve-slots=2 --media-map=.buffer-x-media-urls.json --schedule-window-start=13:00 --schedule-window-end=19:00
```

The X planner verifies media URLs by default. Use `--skip-media-url-verification` only for offline planning, never for production scheduling. If any selected X media URL fails verification, do not create the Buffer post.

Schedule only `.buffer-x-queue.json` `selected` jobs. Each job includes this payload shape:

```json
{
  "channelId": "6a3e73fb5ab6d2f10674b516",
  "mode": "customScheduled",
  "schedulingType": "automatic",
  "dueAt": "2026-06-30T13:00:00-07:00",
  "text": "X copy ending with the matching blog URL",
  "assets": [
    {
      "video": {
        "url": "https://fuseddistribution.luxraycoco.workers.dev/reels/<slug>/<slug>.mp4"
      }
    }
  ],
  "metadata": {
    "twitter": {
      "isAiGenerated": true
    }
  }
}
```

After `create_post` returns, immediately call `get_post(postId)`. Append the slug to `.buffer-x-scheduled.json` only if the returned post has a video asset. If `assets` is empty, delete the post before it publishes and treat the slug as blocked.

### Automatic YouTube Queue Planning

Before scheduling, query Buffer for posts with status `scheduled` or `sending`. Subtract that count from the organization plan limit of 10, then reserve 2 open slots for reels created today. YouTube and X posts both consume this same Buffer scheduled-post limit.

Plan the next queue from the rendered backlog:

```bash
npm run social:buffer:plan -- --current-scheduled=<count> --limit=10 --reserve-slots=2 --media-map=.buffer-media-urls.json --schedule-window-start=13:00 --schedule-window-end=19:00 --write-packs
```

This writes selected jobs with `mode: customScheduled` and `dueAt` values in the 1:00 PM-7:00 PM `America/Los_Angeles` window. The YouTube planner verifies media URLs by default. Use `--skip-media-url-verification` only for offline planning, never for production scheduling. `.buffer-media-urls.json` is a local, gitignored map of slug to hosted MP4 URL:

```json
{
  "short-form-video-local-business": "https://fuseddistribution.luxraycoco.workers.dev/reels/short-form-video-local-business/short-form-video-local-business.mp4"
}
```

Use `workers.dev` MP4 asset URLs for Buffer media fetches. The YouTube description must still link to the matching canonical website post on `fuseddistribution.com`.

The planner writes `.buffer-youtube-queue.json` with:

- `selected`: ready posts to schedule now, capped by available Buffer capacity
- `readyOverflow`: ready posts held back because the Buffer queue is full
- `blocked`: rendered posts that still need a stable HTTPS MP4 URL
- `skipped`: posts missing a local MP4 or `social-copy.json`

The YouTube planner blocks posts before Buffer if any media gate fails:

- `youtube_video_too_long`: run `npm run social:buffer:youtube:media -- --slugs=<slug>`.
- `media_too_large_for_cloudflare_assets`: re-encode through the YouTube media prep script or lower the render bitrate.
- `public_media_url_not_ok` or `public_media_url_fetch_failed`: deploy the assets, then rerun the planner.
- `public_media_url_not_mp4`: fix the Worker/static asset route before scheduling.

Schedule only the `selected` jobs. Each job includes the exact `createPostPayload` for Buffer. Do not schedule `blocked`, `skipped`, or `readyOverflow` entries.

After scheduling a selected job, call `get_post` for the returned Buffer post ID. Append the slug and Buffer post ID to `.buffer-youtube-scheduled.json` only if the post is not in `error`, has no media accessibility error, and still has a video asset. The planner reads this local log and skips already scheduled slugs so the daily automation does not duplicate backlog posts. If a logged Buffer post later fails, update that local log entry to `status: "error"` so the planner can pick the slug up again after the media URL is fixed.

Every selected YouTube job must include the matching blog URL in its description:

```text
Read the full post: https://fuseddistribution.com/blog/[slug]/
```

Do not use a homepage link, category page, or unrelated blog URL as the reel reference.

### Manual Buffer Upload Run

Use this when Nick triggers a manual Buffer fill (not the cron). Source of truth for the run is the dated handoff doc in `docs/` (for example `docs/CODEX-HANDOFF-2026-06-29-buffer-manual-upload.md`), which lists the exact slugs, payloads, and slot caps.

Execution order:

1. Generate Buffer-safe media for the exact slugs:

```bash
npm run social:buffer:youtube:media -- --slugs=slug-one,slug-two
npm run social:buffer:x:media -- --slugs=slug-one,slug-two
```

2. Confirm each selected YouTube slug has `public/reels/<slug>/<slug>.mp4`, is 179 seconds or shorter, and is 25 MiB or smaller. Confirm each selected X slug has `public/reels-x/<slug>/<slug>.mp4`, is 140 seconds or shorter, and is 25 MiB or smaller.
3. Deploy `public/` so the reels go live. The reels are served from the same worker on both `fuseddistribution.com/reels/...` and the `*.workers.dev/reels/...` route. Deploy is outward-facing; get Nick's explicit go before running it.
4. Verify every selected MP4 URL returns HTTP 200 over HTTPS with `content-type: video/mp4`. Do not start Buffer scheduling until all return 200:

```bash
npm run social:buffer:verify-media -- --media-map=.buffer-media-urls.json --slugs=slug-one,slug-two
```

5. Query Buffer org `6a3e62cb6adcaa97fe293a7d` for live `scheduled` plus `sending` count. Do not trust the local `.buffer-*-scheduled.json` logs for capacity; past `dueAt` entries may already have published or dropped off.
6. Recompute capacity: limit 10, reserve 2, fill at most 8 slots. Each slug uses 1 YouTube post plus 1 X post, so cap slug pairs accordingly.
7. Schedule YouTube first through the Buffer API or Buffer UI (channel `6a3e63375ab6d2f1067461b2`), then append to `.buffer-youtube-scheduled.json`.
8. Schedule X through the Buffer API only for `.buffer-x-queue.json` `selected` jobs. Verify each created X post with `get_post`; if the video asset is missing, delete the post and do not log it.
9. Verify YouTube AI disclosure manually in Buffer or YouTube Studio for each reel.
10. Do not push unless the run is a content commit covered by standing push permission.

### Scheduled Queue Maintenance Task

Codex automation `buffer-youtube-queue-maintenance` runs once per day after the reel render window at 1:15 PM local time. It schedules ready hosted reels to YouTube and X while respecting the shared Buffer limit. The task should:

1. Query Buffer organization `6a3e62cb6adcaa97fe293a7d` for `scheduled` and `sending` posts.
2. Count those posts and export the count as `BUFFER_CURRENT_SCHEDULED`.
3. Run `npm run social:buffer:youtube:media` for any newly rendered slugs before planning. This keeps public YouTube Buffer assets under 179 seconds and 25 MiB.
4. Run `scripts/plan-buffer-youtube-queue.sh` with `BUFFER_RESERVE_SLOTS=2`, or run `npm run social:buffer:plan -- --current-scheduled=$BUFFER_CURRENT_SCHEDULED --limit=10 --reserve-slots=2 --media-map=.buffer-media-urls.json --schedule-window-start=13:00 --schedule-window-end=19:00 --write-packs`.
5. Schedule only `.buffer-youtube-queue.json` `selected` jobs through Buffer for YouTube.
6. Run `npm run social:buffer:x:plan` with the same `BUFFER_CURRENT_SCHEDULED`, reserve slots, media map, scheduled log, and 13:00-19:00 schedule window.
7. Schedule only `.buffer-x-queue.json` `selected` X jobs through Buffer API. Verify every created X post with `get_post`; if the video asset is missing, delete the post before it publishes.
8. Append successful YouTube posts to `.buffer-youtube-scheduled.json` only after `get_post` confirms no Buffer error. Append X posts to `.buffer-x-scheduled.json` only after `get_post` proves the video asset is present.
9. Stop without posting if no selected job has a stable HTTPS `publicMediaUrl` that returns `200 video/mp4`.

The reserve is intentional. With a 10-post Buffer limit, the automation should fill at most 8 slots so today’s fresh reels still have room.

---

## Caption Writing Rules

All captions written by Claude during pipeline. Same writing style rules as blog posts apply: no em dashes, no buzzwords, no rhetorical hooks, direct and specific.

### Facebook
- 2-5 sentences
- No hashtags in body
- Conversational tone, not a press release
- End with the discussion_question from reel-data.md on its own line
- For photo posts: slightly longer, 3-5 sentences
- For Facebook Professional Mode profile, treat this as native posting copy. Do not write captions that imply a Page, store, or corporate account unless the post topic requires it.

### YouTube
- Title: 95 characters max, strongest specific claim first
- Description: 1-3 short paragraphs, then blog URL if relevant
- Hashtags: specific tags only, no generic stuffing
- First line must explain why the viewer should keep watching
- Avoid platform promises that cannot be verified, such as "viral" or guaranteed results
- AI disclosure: set YouTube/Buffer AI content disclosure to `Yes` for all AI-assisted reels unless the reel is confirmed to be entirely human-recorded, non-realistic, and only uses minor AI assistance. The current Buffer API tool does not expose this field, so verify it manually in Buffer or YouTube Studio after scheduling.

### Instagram
- Punchy opener (first sentence must hook before the "more" cutoff)
- 2-3 sentences
- Hashtag block at end, separated by blank line
- 8-12 hashtags max — specific beats generic
- Use discussion_question as the last line before hashtags

### LinkedIn
- Professional but not corporate
- Lead with the insight, not the brand
- Include blog URL naturally in body
- 2-3 sentences
- No hashtags (they perform poorly on LinkedIn)

### X
- Under 280 chars total including URL
- Direct stat or claim
- Blog URL at end
- One sentence. No em dashes. No hashtag spam.
- For Buffer scheduling, use the X channel `thatguyheis` (`6a3e73fb5ab6d2f10674b516`) and attach the same hosted MP4 used for YouTube.

---

## Reel Standard

Each approved blog post produces one 180-240 second source vertical reel. It uses the strongest supported hook, covers the full article arc, and ends with a question designed to earn comments. `video/REEL-SOP.md` is authoritative for script, timing, render, and QA rules. Buffer API posting uses platform-safe public copies generated from that source reel.

---

## Photo Post Spec

Full spec in BLOG-SOP.md §15. Quick reference:

- SVG, 1200×1200, dark brand theme
- Top zone: category eyebrow + "FUSED" brand mark
- Center: post title (large Impact) + one key stat
- Bottom: one-sentence excerpt + blog URL CTA
- Posted to: Facebook + Instagram + LinkedIn (not X)

---

## Platform API Setup (one-time, required for Postiz)

> Complete this after Postiz is running on the Windows PC.
> This is not the active workflow for the Facebook Professional Mode personal profile.

### Facebook + Instagram
1. Go to https://developers.facebook.com
2. Create an app (type: Business)
3. Add products: Facebook Login, Instagram Graph API
4. Required permissions: `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`
5. Note App ID and App Secret → add to Postiz docker-compose env

### LinkedIn
1. Go to https://www.linkedin.com/developers
2. Create an app linked to your LinkedIn page
3. Request permissions: `w_member_social`, `r_basicprofile`
4. Note Client ID and Client Secret → add to Postiz docker-compose env

### X (Twitter)
1. Go to https://developer.twitter.com
2. Create a project + app
3. Set app permissions to "Read and Write"
4. Note API Key and API Secret → add to Postiz docker-compose env

---

## Posting Schedule

### Active workflow

1. Generate or verify `video/out/[slug]/[slug].mp4`.
2. Generate Buffer-safe public media with `npm run social:buffer:youtube:media -- --slugs=<slug>` and `npm run social:buffer:x:media -- --slugs=<slug>`, then deploy.
3. Query Buffer scheduled/sending count, then run `npm run social:buffer:plan -- --current-scheduled=<count> --limit=10 --reserve-slots=2 --media-map=.buffer-media-urls.json --schedule-window-start=13:00 --schedule-window-end=19:00 --write-packs`.
4. YouTube: schedule every `.buffer-youtube-queue.json` `selected` job through Buffer API to channel `6a3e63375ab6d2f1067461b2`; otherwise open Buffer, select the connected YouTube channel, upload the MP4, paste the title/description/tags from the posting pack, verify the description links to `https://fuseddistribution.com/blog/[slug]/`, and schedule.
5. YouTube AI disclosure: confirm the scheduled post is marked with the AI content disclosure/tag in Buffer or YouTube Studio.
6. X: run `npm run social:buffer:x:plan -- --current-scheduled=<count>` and schedule only eligible selected X jobs through Buffer API on channel `6a3e73fb5ab6d2f10674b516`. Confirm the copy stays under 280 characters, the video is at most 140 seconds, and `get_post` shows a persisted video asset before logging success.
7. Facebook Professional Mode: use the Facebook reel batch pack below, then open Facebook native composer or Professional Dashboard, upload the MP4, paste the Facebook caption, and publish or schedule with native controls.
8. After the Facebook reel is live, paste the blog URL as the first comment.
9. Log performance after 48-72 hours with `video/scripts/feedback.mjs`.

### Future Postiz workflow

Postiz schedules Page-based posts at platform-optimal times automatically (`scheduleType: "best_time"`). No manual scheduling needed once configured.

> **Not yet active.** Postiz setup pending (see docs/WINDOWS-PC-SETUP.md).

---

## Manual Posting

Post manually using the generated assets:

1. Open `public/blog/[slug]/posting-pack.md`.
2. YouTube via Buffer API: use `.buffer-youtube-queue.json` selected jobs only. For manual Buffer upload, use `public/reels/[slug]/[slug].mp4` if Buffer rejects the full source duration.
3. X via Buffer API: use `.buffer-x-queue.json` selected jobs only. Long-form reels over 140 seconds must be cut down before X scheduling. Do not log an X reel as scheduled until `get_post` shows the video asset.
4. Facebook Professional Mode: upload the same MP4 through Facebook native tools, then paste the Facebook caption from the pack.
5. For photo posts on supported manual channels, upload `public/blog/[slug]/photo-post.svg` and use the photo caption from `social-copy.json`.
6. First comment on each post: paste the live blog URL.

Do not paste Buffer API keys, Facebook credentials, or access tokens into repo files, chat prompts, screenshots, or generated posting packs.

### Facebook Reel Browser Batch

For Facebook Professional Mode, post in batches of 7 through the browser Facebook tool. This keeps the Facebook text, matching blog URL, and a short reel text sample in one compact handoff file grouped by Silver and Technology.

```bash
npm run social:facebook:batch
```

This writes:

- `.facebook-reels-batch.md` for manual browser posting.
- `.facebook-reels-batch.json` for structured browser-tool handoff.

Use `.facebook-reels-batch.md` as the compact copy reference while posting. After the batch is posted, update `.facebook-reels-posted.json` with:

```bash
npm run social:facebook:batch -- --mark-posted=slug-one,slug-two
```

To prepare a custom batch:

```bash
npm run social:facebook:batch -- --limit=7 --slugs=slug-one,slug-two
```

To intentionally include items already marked posted:

```bash
npm run social:facebook:batch -- --include-posted
```

---

## File Naming Reference

| File | Location | Format |
|---|---|---|
| Long-form reel | `video/out/[slug]/[slug].mp4` | 1080×1920 MP4 |
| Photo post | `blog/[slug]/photo-post.svg` | 1200×1200 SVG |
| Captions | `blog/[slug]/social-copy.json` | JSON |
| Posting pack | `blog/[slug]/posting-pack.md` and `blog/[slug]/posting-pack.json` | Markdown + JSON |
| Facebook reel batch | `.facebook-reels-batch.md` and `.facebook-reels-batch.json` | Markdown + JSON |
