# Verify a Buffer Post After Scheduling It

Did Buffer actually schedule your post, or did your request only appear to succeed?

That question matters whenever a publishing script creates a post through an API. A successful network request is not the same as a confirmed item in the queue. The request may time out after Buffer has accepted it. A response may omit a field your workflow needs. A video may be attached to the wrong channel. If you immediately retry, you can create a duplicate while the first post is already waiting to publish.

This tutorial follows the readback workflow in Fused Distribution’s `public/blog/scripts/buffer-live.mjs`: create only when needed, query Buffer again, compare the returned post with the intended job, and save the confirmed ID. Examples are hypothetical and redacted, not customer records or performance claims.

## 1. Treat creation and verification as separate steps

Buffer describes a post as content that is scheduled or published through a connected channel. The important shared fields include `id`, `text`, `channelId`, `dueAt`, `status`, and `assets`. That gives you a useful verification contract.

Before creating anything, keep the intended channel, UTC schedule, caption, and public media URL together in one job record. The record is your comparison target. It lets the readback step answer more than “did the API return a response?” It can answer “is the post in the intended channel, at the intended time, with the intended content and a retained video asset?”

Buffer distinguishes `addToQueue` from `customScheduled`. If your workflow promises a specific time, verify the returned ISO 8601 UTC `dueAt` instead of assuming the request was interpreted as intended.

## 2. Save the post ID as soon as creation returns it

The `id` is the handle for later investigation. A successful `createPost` result should include a post with an ID. If the mutation returns a typed error, or returns no post ID, stop and record that outcome. Do not manufacture an ID from the caption, URL, or timestamp.

In a production workflow, persist the confirmed ID with the job, but do not call it confirmed merely because the mutation response contained it. The local Buffer script preserves creation evidence and verifies the exact post again before reporting confirmed scheduling. That checkpoint includes the slug, Buffer post ID, channel ID, status, due time, public media URL, and a boolean indicating that a video asset was verified.

The saved checkpoint should retain the redacted post ID, channel ID, status, due time, observation time, and verified video flag. This is delivery evidence, not a performance result.

## 3. Query Buffer and read back the post

The local workflow queries live posts with fields including `id`, `text`, `status`, `dueAt`, `sentAt`, `channelId`, and `assets`. For a targeted investigation, it can also look up posts by ID. Buffer’s guide shows the same pattern: filter posts by channel and status, then follow cursor pagination when needed.

After creation, query the live queue again. Match the returned post by the saved ID. If the ID is not found, do not immediately create another post. The result can be ambiguous: the create may have been accepted but the readback may have failed, or the post may no longer be in the filtered set.

Use a broader, controlled investigation instead. Check the relevant scheduled and sending states, query the known ID directly when the API supports it, inspect your local checkpoint and request log, and note the time of each observation. If the post may already have been sent, check the sent history as well. An unknown outcome is a state to investigate, not permission to retry blindly. For more on this, see [How to Use Chatterbox for Business Voiceovers](/blog/using-chatterbox-for-business-voiceovers/).

## 4. Confirm the channel and schedule

First compare `channelId`. The same caption and video can be valid for several connected profiles, but a successful post on the wrong profile is still a publishing failure. The local readback check rejects a mismatch between the returned channel and the job’s intended channel. For more on this, see [How to Use Remotion to Make a Business Reel](/blog/using-remotion-to-make-a-business-reel/).

Next compare `dueAt`. Parse both values as dates rather than comparing formatting alone. The API uses ISO 8601 UTC for a custom schedule, while a local job may display Pacific time for an operator. Convert deliberately and record both when helpful. A time that looks different in a dashboard can represent the same instant, but a genuine time shift should be investigated before publication.

The expected pre-publication statuses in this workflow are `scheduled` and `sending`. Buffer documents `scheduled` as waiting for its due time and `sent` as successfully published to the social platform. A post that is already `sent` is not the same as a post waiting in the queue, so record the distinction. An error status needs investigation rather than a success label.

## 5. Confirm the video asset was retained

A post can have the right ID and time but still be missing its media. Inspect `assets`, not just the caption. The local workflow requires at least one asset whose MIME type starts with `video/`. This is especially important when a request uploads or references a hosted MP4.

If the job includes an expected media URL, compare it where the response exposes the source. Preserve the distinction between “Buffer returned an asset” and “Buffer returned the intended video.” The local script also performs media preflight before creation and checks the live post afterward. That combination catches a bad public URL before mutation and a missing video after mutation.

Read the post again when you edit or replace media. A safe replacement flow preserves the original post ID, text, channel, and due time, then verifies that the updated asset source is the expected URL. The video is retained only when the readback shows it.

## 6. Avoid duplicate creates when the outcome is unknown

The most expensive mistake in a retry path is treating uncertainty as failure. Suppose the create request times out. You do not know whether Buffer rejected it, accepted it, or accepted it while the response was lost. Creating again can produce two identical scheduled posts.

Make retries idempotent at the workflow level. Keep a durable checkpoint and search the live queue for an existing post matching the job’s channel, text, and due time before creating. The local script first resumes a previously confirmed post ID when it is still live. If that ID is unavailable, it searches live posts for the same channel, text, and scheduled instant. Only when no matching post is found does it proceed to create.

That matching rule is practical, but it is not a universal idempotency key. Captions can legitimately repeat, and two posts can intentionally share a time in different channels. Keep the match scoped to the exact job and channel, and make a human review path available when the result is ambiguous.

## Common mistakes

- Trusting the mutation response without a live readback.
- Saving a post ID without the channel, due time, or media evidence beside it.
- Treating `scheduled`, `sending`, and `sent` as interchangeable.
- Checking that `assets` is nonempty without checking for a video MIME type.
- Comparing local time strings without converting UTC correctly.
- Retrying after a timeout without searching for an existing matching post.
- Reporting views, reach, or other performance numbers before the network provides them. This workflow proves delivery state, not business performance.

## Practical verification checklist

Before you call a post verified, confirm:

- The create response returned a real Buffer post ID.
- A follow-up readback found that same ID, or a carefully matched existing post.
- `channelId` matches the intended connected profile.
- `dueAt` matches the intended instant after UTC conversion.
- The status is understood: `scheduled` or `sending` before delivery, `sent` after delivery, and not an unexplained error.
- `assets` contains the expected retained video.
- The checkpoint records the observation time and evidence.
- A retry path would look for an existing post before creating another.

## The useful habit

Publishing is a state transition, not a single request. Create the post, read it back, compare the important fields, and save the evidence. If the outcome is unknown, investigate before mutating again.

If you are building a Buffer workflow, use this checklist beside your first dry run and keep the redacted readback with the job log. For more practical publishing guides, visit Fused Distribution’s business resources.

## Sources

- [Buffer API: Posts and Scheduling](https://developers.buffer.com/guides/posts-and-scheduling.html), including post fields, scheduling modes, statuses, creation, and retrieval.
- [Fused Distribution Buffer live workflow](https://github.com/thatguyheis/Fuseddistribution/blob/main/public/blog/scripts/buffer-live.mjs), the local implementation.

## Related

- [How to Use Remotion to Make a Business Reel](/blog/using-remotion-to-make-a-business-reel/)
- [How to Use Chatterbox for Business Voiceovers](/blog/using-chatterbox-for-business-voiceovers/)
- [AI Reels for Beginners: Start With Your Real Business](/blog/ai-reels-for-beginners-part-1/)

Read next: [How to Use Remotion to Make a Business Reel](/blog/using-remotion-to-make-a-business-reel/)

