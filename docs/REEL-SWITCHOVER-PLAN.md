# Reel backlog and storyboard switchover plan

Status: planning only. No live publishing target or normal render default is changed by this document.

## Current state

- The Book Factory and completed Paper Collage Pilot automations are paused.
- The normal publishing owner remains active at 9:15 AM Pacific.
- Buffer maintenance remains active and still follows the existing 10-post per-channel limit.
- The repository contains 266 release QA records: 166 currently pass and 100 are blocked.
- The authoritative Buffer status request currently fails, so live scheduled counts and available slots are unknown.
- The worktree contains unrelated changes and must not be used as a merge-ready branch yet.

## Backlog burn target

This plan interprets “24 posts per day” as 24 total platform posts across YouTube, X, and Instagram, with one post due each hour. If the target means 24 per platform, the schedule becomes 72 posts per day and requires a separate capacity and audience review.

The safe implementation is a rolling hourly queue:

1. Query Buffer immediately before every planning session.
2. Maintain only the maximum safe number of future posts allowed by the connected Buffer plan, preserving a recovery slot.
3. Schedule the next unoccupied hourly slot, then refill after a confirmed post is sent or removed.
4. Rotate the three platforms so the daily total is balanced, while preventing duplicate slugs and same-platform collisions.
5. Reconcile every due post before adding more work.
6. Stop on any missing video asset, failed readback, expired queue, release QA failure, or platform capacity error.

The current six fixed slots and ten-post Buffer cap must be replaced only after the live account plan confirms that hourly custom scheduling is supported. Until then, the existing publisher remains the control plane.

## Switch-over stages

### Stage A: stabilize the old backlog

- Restore or verify Buffer live status access.
- Inventory release-ready slugs, blocked slugs, missing public media, and missing blog links.
- Process only release-ready old-style reels.
- Keep the normal render route as the fallback.
- Use rolling hourly scheduling rather than preloading 24 posts.

### Stage B: shadow storyboard planning

- Run the local storyboard planner for new reels without changing the rendered production output.
- Require the storyboard protocol: multiple visual roles, labeled charts, source periods, takeaways, and no consecutive generic cards.
- Compare old-style and storyboard-style render time, QA results, and human review scores.
- Use the local LLM subagent only for advisory storyboard classification and visual-role suggestions. The deterministic validator remains authoritative.

### Stage C: new-style default for new reels

- New reels use the storyboard route after the shadow comparison passes.
- Backlog reels remain old style so the migration does not trigger a full re-render.
- Blog pages receive the same release panel and posting metadata regardless of visual route.
- A route flag and rollback path remain available for any reel that fails visual or timing QA.

### Stage D: retire old-style backlog

- Stop scheduling old-style reels after the eligible backlog reaches zero.
- Keep old-style renderer support for historical rerenders and rollback.
- Remove only redundant automation after the backlog and publishing metrics are stable.

## LLM subagent boundary

The subagent may classify narration into hook, photo context, chart, diagram, collage, or CTA roles and propose a schema-valid storyboard. It may not invent numbers, choose unapproved media, publish, edit the SOP, or bypass release QA. A failed or unavailable local model falls back to the deterministic planner.

## Approval gates before live 24-per-day scheduling

- Buffer status readback succeeds.
- The connected account plan confirms hourly custom scheduling and the real queue capacity.
- At least 24 distinct release-ready platform jobs exist for the first day.
- Every job has a verified public MP4 and matching blog URL.
- A dry run proves duplicate prevention, hourly slot allocation, crash recovery, and post readback.
- The existing publisher and audio repair jobs are not contending for the same render lock.
