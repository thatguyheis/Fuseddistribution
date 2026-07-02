# Buffer Manual Upload Pack - 2026-06-29

**For:** Codex (Buffer upload executor)
**Prepared by:** Claude
**Source of truth:** `docs/CODEX-HANDOFF-2026-06-29-buffer-manual-upload.md`
**Procedure:** `SOCIAL-SOP.md` -> "X Buffer Scheduling Requirements"

## Prep Status (verified by Claude 2026-06-29)

- Media published: all 4 reel MP4s live on production and workers.dev, served as `video/mp4`, byte length matches local source.
- X copy: all 4 `reel.x` strings are 280 chars or fewer and match `social-copy.json`.
- The 404 blocker from the handoff is cleared. Buffer can fetch the media.
- 2026-06-29 Codex API test: Buffer API can schedule X video posts with top-level `assets: [{ video: { url } }]` when the MP4 is X-eligible. A 46-second draft test preserved the video asset. The four long-form June 29 MP4s are 175-182 seconds and are blocked until cut down. Thread video assets created text-only false positives; those test posts were deleted before publish.

| Slug | Prod 200 | workers.dev 200 | X chars | YouTube done | X done |
|---|---|---|---|---|---|
| instagram-for-local-business-complete-guide | yes | yes | 277 | yes (API) | yes (API, verified video) |
| facebook-page-vs-facebook-group-for-business | yes | yes | 195 | no | yes (API, verified video) |
| landing-page-vs-website-which-do-you-need | yes | yes | 135 | yes (API) | yes (API, verified video) |
| call-to-action-best-practices-for-small-business-websit | yes | yes | 225 | no | yes (API, verified video) |

## Remaining Work For This Run

1. YouTube (Buffer): `facebook-page-vs-facebook-group-for-business`, `call-to-action-best-practices-for-small-business-websit`. The other two YouTube posts are already logged in `.buffer-youtube-scheduled.json`; do not re-schedule them.
2. X: all 4 slugs were cut down to 135 seconds, deployed under `/reels-x/`, scheduled through Buffer API, and verified with `get_post` video assets.

## Before Uploading

1. Query Buffer org `6a3e62cb6adcaa97fe293a7d` live `scheduled` + `sending` count. Do not trust local logs for capacity.
2. Cap: limit 10, reserve 2, fill at most 8 slots. Stay at or under 4 slug pairs this run.
3. Channels: YouTube `Nick` `6a3e63375ab6d2f1067461b2`; X `thatguyheis` `6a3e73fb5ab6d2f10674b516`.
4. Use `customScheduled` with `dueAt` between 1:00 PM and 7:00 PM `America/Los_Angeles` on every new YouTube or X Buffer API post.

## Local MP4 Files

- `public/reels/instagram-for-local-business-complete-guide/instagram-for-local-business-complete-guide.mp4`
- `public/reels/facebook-page-vs-facebook-group-for-business/facebook-page-vs-facebook-group-for-business.mp4`
- `public/reels/landing-page-vs-website-which-do-you-need/landing-page-vs-website-which-do-you-need.mp4`
- `public/reels/call-to-action-best-practices-for-small-business-websit/call-to-action-best-practices-for-small-business-websit.mp4`

## X API Cutedown Files

- `public/reels-x/instagram-for-local-business-complete-guide/instagram-for-local-business-complete-guide.mp4` -> Buffer post `6a427e5c1ed56c173d8361ec`
- `public/reels-x/facebook-page-vs-facebook-group-for-business/facebook-page-vs-facebook-group-for-business.mp4` -> Buffer post `6a427ecd5aa6ddf0b8f3a0bc`
- `public/reels-x/landing-page-vs-website-which-do-you-need/landing-page-vs-website-which-do-you-need.mp4` -> Buffer post `6a427ee2c5a6660adb630be8`
- `public/reels-x/call-to-action-best-practices-for-small-business-websit/call-to-action-best-practices-for-small-business-websit.mp4` -> Buffer post `6a427f2d5aa6ddf0b8f3a3c5`

## Per-Slug Payloads

### 1. instagram-for-local-business-complete-guide (YouTube already scheduled; X still needed)

Blog URL: `https://fuseddistribution.com/blog/instagram-for-local-business-complete-guide/`
Hosted MP4 (verify/API): `https://fuseddistribution.luxraycoco.workers.dev/reels/instagram-for-local-business-complete-guide/instagram-for-local-business-complete-guide.mp4`

X text (277 chars):

```text
Post three to five times a week, tag your location, and reply to every comment within an hour. This combination puts your local business in front of nearby buyers faster than any other free tactic. https://fuseddistribution.com/blog/instagram-for-local-business-complete-guide/
```

### 2. facebook-page-vs-facebook-group-for-business (YouTube + X needed)

Blog URL: `https://fuseddistribution.com/blog/facebook-page-vs-facebook-group-for-business/`
Hosted MP4 (verify/API): `https://fuseddistribution.luxraycoco.workers.dev/reels/facebook-page-vs-facebook-group-for-business/facebook-page-vs-facebook-group-for-business.mp4`

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

X text (195 chars):

```text
Start with a clean Facebook Page to get found on Google Maps for specific service calls. Groups build trust later. https://fuseddistribution.com/blog/facebook-page-vs-facebook-group-for-business/
```

### 3. landing-page-vs-website-which-do-you-need (YouTube already scheduled; X still needed)

Blog URL: `https://fuseddistribution.com/blog/landing-page-vs-website-which-do-you-need/`
Hosted MP4 (verify/API): `https://fuseddistribution.luxraycoco.workers.dev/reels/landing-page-vs-website-which-do-you-need/landing-page-vs-website-which-do-you-need.mp4`

X text (135 chars):

```text
A landing page is one page with one job built to convert. https://fuseddistribution.com/blog/landing-page-vs-website-which-do-you-need/
```

### 4. call-to-action-best-practices-for-small-business-websit (YouTube + X needed)

Blog URL: `https://fuseddistribution.com/blog/call-to-action-best-practices-for-small-business-websit/`
Hosted MP4 (verify/API): `https://fuseddistribution.luxraycoco.workers.dev/reels/call-to-action-best-practices-for-small-business-websit/call-to-action-best-practices-for-small-business-websit.mp4`

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

X text (225 chars):

```text
Personalized calls to action convert 20.2% better than generic ones. Use clear commands and benefit-driven words to drive real money. https://fuseddistribution.com/blog/call-to-action-best-practices-for-small-business-websit/
```

## After Scheduling

1. Append each YouTube post to `.buffer-youtube-scheduled.json` `scheduled[]`.
2. Append each X post to `.buffer-x-scheduled.json` `scheduled[]` only after the post is created and the video asset is verified. Do not log Buffer API-created X posts unless `get_post` shows the video asset persisted.
3. Verify YouTube AI disclosure manually in Buffer or YouTube Studio for each reel.
4. Do not push (content-commit standing permission does not cover Buffer state edits unless Nick says so).
