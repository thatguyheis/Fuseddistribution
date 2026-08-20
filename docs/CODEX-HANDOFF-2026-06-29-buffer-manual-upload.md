# Codex Handoff: Buffer Manual Upload

**Date:** 2026-06-29  
**Owner:** Nick  
**Status:** Repo is prepared locally. X video scheduling is fixed and verified through Buffer API for X-eligible MP4s. The four long-form June 29 X videos were cut down to 135 seconds, deployed under `/reels-x/`, scheduled through Buffer API, and verified with `get_post` video assets.

## Goal

Complete the next Buffer queue fill for YouTube and X without exceeding the organization cap.

Use these rules:

- Buffer organization: `My Organization` (`6a3e62cb6adcaa97fe293a7d`)
- YouTube channel: `Nick` (`6a3e63375ab6d2f1067461b2`)
- X channel: `thatguyheis` (`6a3e73fb5ab6d2f10674b516`)
- Scheduled post limit across the org: `10`
- Reserve `2` open slots for new reels created today
- Fill at most `8` scheduled or sending slots total
- Since each selected slug uses 1 YouTube post + 1 X post, schedule at most `4` slug pairs this run
- Use `customScheduled` with `dueAt` between 1:00 PM and 7:00 PM `America/Los_Angeles`
- Use automatic scheduling
- Every YouTube and X post must include the matching canonical blog URL on `https://fuseddistribution.com/blog/<slug>/`
- YouTube AI disclosure must be verified manually in Buffer or YouTube Studio after scheduling
- Use the Buffer API tool for X video posts only after `npm run social:buffer:x:plan` selects the slug. The working payload is top-level `assets: [{ video: { url } }]`. After `create_post`, call `get_post` and confirm the returned post still has a video asset before logging success. Thread video assets are not valid for single-video X posts in this workflow.

## Current State

Buffer was empty when this was prepared:

- current scheduled plus sending count: `0`
- reserve slots: `2`
- effective capacity: `8`

The queue reopened after the hosted media map was populated:

- ready: `76`
- selected: `8`
- blocked: `0`
- skipped: `31`

Do not schedule all 8 selected slugs. Stop at 4 slug pairs to stay within the 8-slot cap. X scheduling for the four selected slugs is complete; YouTube still needs separate review for the two rows marked not done in `docs/BUFFER-MANUAL-UPLOAD-PACK-2026-06-29.md`.

## 2026-07-02 Buffer Posting Failure Update

Buffer status showed no platform-wide outage for the Web App, API, or MCP. The four known YouTube and X hosted MP4 URLs below now verify as `200 video/mp4` from the `*.workers.dev` route, so the current failure is not the original undeployed-media `404` condition.

The four YouTube Buffer copies were regenerated on 2026-07-02 as stricter Buffer-safe files: H.264/AAC, 720x1280, 179 seconds or shorter, and under 9 MiB each. They were deployed to Cloudflare Workers version `4b969767-55da-43a8-ad47-bec1466ef4d8`, and `npm run social:buffer:verify-media` confirmed all four `*.workers.dev/reels/...` URLs returned `200 video/mp4`.

Treat any current "not posting" problem as a Buffer post-level handoff failure until live Buffer inspection proves otherwise. Before retrying:

1. Query Buffer for `scheduled`, `sending`, `sent`, and `error` posts on YouTube and X.
2. Reconcile every `.buffer-youtube-scheduled.json` and `.buffer-x-scheduled.json` entry whose `dueAt` is in the past. Mark it `sent` only if Buffer confirms delivery. Mark it `error` if Buffer has an error, the video asset is missing, or the post is absent after due time.
3. Re-run `npm run social:buffer:verify-media` against the exact selected media map and slugs.
4. Re-run the queue planner and use only the new `selected[].createPostPayload`.
5. After every `create_post`, call `get_post`. For YouTube, require no Buffer error and a retained video asset. For X, require `assets[0].type == "video"`. Do not append a local scheduled-log entry until this passes.

## Critical Blocker Already Identified

The local queue and posting packs were updated with hosted-style reel URLs, but Buffer rejected the first create because the URL returned `HTTP 404 Not Found`.

That means the next required action is to publish the staged MP4s to the live site before any Buffer scheduling.

These files are already staged locally under `public/reels/`:

- [`/Users/nick/projects/fuseddistribution/public/reels/instagram-for-local-business-complete-guide/instagram-for-local-business-complete-guide.mp4`](/Users/nick/projects/fuseddistribution/public/reels/instagram-for-local-business-complete-guide/instagram-for-local-business-complete-guide.mp4)
- [`/Users/nick/projects/fuseddistribution/public/reels/facebook-page-vs-facebook-group-for-business/facebook-page-vs-facebook-group-for-business.mp4`](/Users/nick/projects/fuseddistribution/public/reels/facebook-page-vs-facebook-group-for-business/facebook-page-vs-facebook-group-for-business.mp4)
- [`/Users/nick/projects/fuseddistribution/public/reels/landing-page-vs-website-which-do-you-need/landing-page-vs-website-which-do-you-need.mp4`](/Users/nick/projects/fuseddistribution/public/reels/landing-page-vs-website-which-do-you-need/landing-page-vs-website-which-do-you-need.mp4)
- [`/Users/nick/projects/fuseddistribution/public/reels/call-to-action-best-practices-for-small-business-websit/call-to-action-best-practices-for-small-business-websit.mp4`](/Users/nick/projects/fuseddistribution/public/reels/call-to-action-best-practices-for-small-business-websit/call-to-action-best-practices-for-small-business-websit.mp4)

Expected live URLs after deploy:

- `https://fuseddistribution.com/reels/instagram-for-local-business-complete-guide/instagram-for-local-business-complete-guide.mp4`
- `https://fuseddistribution.com/reels/facebook-page-vs-facebook-group-for-business/facebook-page-vs-facebook-group-for-business.mp4`
- `https://fuseddistribution.com/reels/landing-page-vs-website-which-do-you-need/landing-page-vs-website-which-do-you-need.mp4`
- `https://fuseddistribution.com/reels/call-to-action-best-practices-for-small-business-websit/call-to-action-best-practices-for-small-business-websit.mp4`

Do not attempt Buffer scheduling until each live MP4 URL returns successfully over HTTPS.

## Local Files To Update

- [`/Users/nick/projects/fuseddistribution/.buffer-media-urls.json`](/Users/nick/projects/fuseddistribution/.buffer-media-urls.json)
- [`/Users/nick/projects/fuseddistribution/.buffer-youtube-scheduled.json`](/Users/nick/projects/fuseddistribution/.buffer-youtube-scheduled.json)
- [`/Users/nick/projects/fuseddistribution/.buffer-x-scheduled.json`](/Users/nick/projects/fuseddistribution/.buffer-x-scheduled.json)
- [`/Users/nick/projects/fuseddistribution/.buffer-youtube-queue.json`](/Users/nick/projects/fuseddistribution/.buffer-youtube-queue.json)

## Execution Order

1. Publish the four staged MP4s so the `https://fuseddistribution.com/reels/...` URLs are live.
2. Verify each live MP4 URL is publicly reachable.
3. If needed, update `.buffer-media-urls.json` so those four slugs point to the live `https://fuseddistribution.com/reels/...` URLs.
4. Query Buffer scheduled plus sending count for `My Organization`.
5. Confirm capacity still allows `4` slug pairs max.
6. Schedule YouTube for each slug first.
7. After each successful YouTube schedule, append the slug record to `.buffer-youtube-scheduled.json`.
8. Then run the X planner and schedule only selected X jobs. The June 29 long-form MP4s were cut down with `npm run social:buffer:x:media` and scheduled successfully.
9. After each successful X schedule, append the slug record to `.buffer-x-scheduled.json`.
10. Verify AI disclosure manually for each YouTube reel.

## Selected Slugs For This Run

Use these 4 slugs only:

1. `instagram-for-local-business-complete-guide`
2. `facebook-page-vs-facebook-group-for-business`
3. `landing-page-vs-website-which-do-you-need`
4. `call-to-action-best-practices-for-small-business-websit`

Do not schedule additional slugs in this run unless Buffer count and reserve math are recomputed first.

## Manual Buffer Posting Payloads

### 1. instagram-for-local-business-complete-guide

Local MP4:

- [`/Users/nick/projects/fuseddistribution/public/reels/instagram-for-local-business-complete-guide/instagram-for-local-business-complete-guide.mp4`](/Users/nick/projects/fuseddistribution/public/reels/instagram-for-local-business-complete-guide/instagram-for-local-business-complete-guide.mp4)

Canonical blog URL:

- `https://fuseddistribution.com/blog/instagram-for-local-business-complete-guide/`

Live hosted MP4 URL target:

- `https://fuseddistribution.com/reels/instagram-for-local-business-complete-guide/instagram-for-local-business-complete-guide.mp4`

YouTube title:

```text
Instagram is a powerful tool for local businesses if you focus on being findable and engaging.
```

YouTube description:

```text
Instagram is a powerful tool for local businesses if you focus on being findable and engaging. Start by optimizing your profile and posting consistent, location-tagged content to attract nearby customers. Send this to someone who needs to hear it.

#LocalBusiness #SmallBusinessTips #DigitalMarketing #GoogleMyBusiness #WebDesign

Read the full post: https://fuseddistribution.com/blog/instagram-for-local-business-complete-guide/
```

X text:

```text
Post three to five times a week, tag your location, and reply to every comment within an hour. This combination puts your local business in front of nearby buyers faster than any other free tactic. https://fuseddistribution.com/blog/instagram-for-local-business-complete-guide/
```

### 2. facebook-page-vs-facebook-group-for-business

Local MP4:

- [`/Users/nick/projects/fuseddistribution/public/reels/facebook-page-vs-facebook-group-for-business/facebook-page-vs-facebook-group-for-business.mp4`](/Users/nick/projects/fuseddistribution/public/reels/facebook-page-vs-facebook-group-for-business/facebook-page-vs-facebook-group-for-business.mp4)

Canonical blog URL:

- `https://fuseddistribution.com/blog/facebook-page-vs-facebook-group-for-business/`

Live hosted MP4 URL target:

- `https://fuseddistribution.com/reels/facebook-page-vs-facebook-group-for-business/facebook-page-vs-facebook-group-for-business.mp4`

YouTube title:

```text
Stop guessing about Facebook pages and groups.
```

YouTube description:

```text
Stop guessing about Facebook pages and groups. Use a Page to get found for immediate service calls and a Group to build community trust later. Send this to someone who needs to hear it.

#LocalBusiness #SmallBusinessTips #DigitalMarketing #GoogleMyBusiness #WebDesign

Read the full post: https://fuseddistribution.com/blog/facebook-page-vs-facebook-group-for-business/
```

X text:

```text
Start with a clean Facebook Page to get found on Google Maps for specific service calls. Groups build trust later. https://fuseddistribution.com/blog/facebook-page-vs-facebook-group-for-business/
```

### 3. landing-page-vs-website-which-do-you-need

Local MP4:

- [`/Users/nick/projects/fuseddistribution/public/reels/landing-page-vs-website-which-do-you-need/landing-page-vs-website-which-do-you-need.mp4`](/Users/nick/projects/fuseddistribution/public/reels/landing-page-vs-website-which-do-you-need/landing-page-vs-website-which-do-you-need.mp4)

Canonical blog URL:

- `https://fuseddistribution.com/blog/landing-page-vs-website-which-do-you-need/`

Live hosted MP4 URL target:

- `https://fuseddistribution.com/reels/landing-page-vs-website-which-do-you-need/landing-page-vs-website-which-do-you-need.mp4`

YouTube title:

```text
Decide between a focused landing page for immediate action or a comprehensive website for...
```

YouTube description:

```text
Decide between a focused landing page for immediate action or a comprehensive website for long-term trust. Choose the right tool based on whether you need to close a specific deal or build a lasting online presence. Send this to someone who needs to hear it.

#LocalBusiness #SmallBusinessTips #DigitalMarketing #GoogleMyBusiness #WebDesign

Read the full post: https://fuseddistribution.com/blog/landing-page-vs-website-which-do-you-need/
```

X text:

```text
A landing page is one page with one job built to convert. https://fuseddistribution.com/blog/landing-page-vs-website-which-do-you-need/
```

### 4. call-to-action-best-practices-for-small-business-websit

Local MP4:

- [`/Users/nick/projects/fuseddistribution/public/reels/call-to-action-best-practices-for-small-business-websit/call-to-action-best-practices-for-small-business-websit.mp4`](/Users/nick/projects/fuseddistribution/public/reels/call-to-action-best-practices-for-small-business-websit/call-to-action-best-practices-for-small-business-websit.mp4)

Canonical blog URL:

- `https://fuseddistribution.com/blog/call-to-action-best-practices-for-small-business-websit/`

Live hosted MP4 URL target:

- `https://fuseddistribution.com/reels/call-to-action-best-practices-for-small-business-websit/call-to-action-best-practices-for-small-business-websit.mp4`

YouTube title:

```text
Your call to action is the most important instruction on your website.
```

YouTube description:

```text
Your call to action is the most important instruction on your website. Make sure every page has one clear command that tells visitors exactly what to do next. Send this to someone who needs to hear it.

#LocalBusiness #SmallBusinessTips #DigitalMarketing #GoogleMyBusiness #WebDesign

Read the full post: https://fuseddistribution.com/blog/call-to-action-best-practices-for-small-business-websit/
```

X text:

```text
Personalized calls to action convert 20.2% better than generic ones. Use clear commands and benefit-driven words to drive real money. https://fuseddistribution.com/blog/call-to-action-best-practices-for-small-business-websit/
```

## Scheduled Log Shape

After each successful YouTube schedule, append an object to `.buffer-youtube-scheduled.json` `scheduled[]`:

```json
{
  "slug": "example-slug",
  "postId": "buffer-post-id",
  "dueAt": "2026-06-29T20:00:00.000Z",
  "dueAtLocal": "2026-06-29T13:00:00-07:00",
  "scheduledAt": "2026-06-29T19:45:00.000Z",
  "publicMediaUrl": "https://fuseddistribution.com/reels/example-slug/example-slug.mp4"
}
```

After each successful X schedule, append an object to `.buffer-x-scheduled.json` `scheduled[]`:

```json
{
  "slug": "example-slug",
  "postId": "buffer-post-id",
  "channelId": "6a3e73fb5ab6d2f10674b516",
  "dueAt": "2026-06-29T21:45:00.000Z",
  "dueAtLocal": "2026-06-29T14:45:00-07:00",
  "scheduledAt": "2026-06-29T19:45:00.000Z",
  "publicMediaUrl": "https://fuseddistribution.com/reels/example-slug/example-slug.mp4"
}
```

Do not duplicate a slug if it is already logged.

## Claude Notes

- Do not push.
- Do not exceed 4 slug pairs unless Buffer capacity is recalculated.
- Do not use placeholder or 404 media URLs.
- Prefer `*.workers.dev/reels/...` MP4 URLs for Buffer media fetches if the production `fuseddistribution.com/reels/...` route returns `403` to Buffer.
- If using the Buffer API tool, note that MCP expects video assets in the form:

```json
[
  {
    "video": {
      "url": "https://..."
    }
  }
]
```

not the flat queue-file asset shape.

- For X, use the Buffer API tool only with `.buffer-x-queue.json` selected jobs. Verify with `get_post`; if the video asset is missing, delete the post before it publishes.
- If using the browser instead of the API, manually confirm:
  - correct channel
  - `customScheduled`
  - `dueAt` between 1:00 PM and 7:00 PM `America/Los_Angeles`
  - automatic scheduling
  - correct blog URL in each post
  - correct hosted MP4
  - YouTube AI disclosure enabled where required
