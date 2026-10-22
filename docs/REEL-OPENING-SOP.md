# Reel opening image

Every new production reel starts with the approved article hero image at frame zero. The image is fully visible for one second, then fades out over0.2 seconds to reveal the regular animated reel. The whole image is fitted inside the portrait frame so titles and artwork are not cropped. A blurred copy fills the surrounding space.

The opening overlays the existing timeline. Narration, music and total duration remain unchanged. It sits above storyboard overrides and subtitles, so an unfinished animation cannot become the opening frame.

`stageOpeningHero` checks the source against the editorial hero hash before staging it. New renders record pipeline version2 and opening image provenance. The release gate verifies that source, staged image, props and metadata agree. A missing or changed approved hero blocks the new render rather than silently substituting unrelated media.

For visual QA, inspect actual frame zero from the encoded MP4, not just the article image or a later sample frame. Missing hero images should be repaired through the editorial source workflow; do not replace approval hashes to bypass a mismatch.

## Required graphic quality

For all new or newly redesigned heroes, apply `docs/EDITORIAL-HERO-SOP.md`, protocol FD-HERO-GRAPHIC-V2. The opening must include a meaningful topic-specific illustration, explanatory diagram or sourced chart with a concise truthful hook. Generic text-card grids and title-only artwork fail editorial review even if frame-zero provenance passes. Record the hero quality review before approval, then check the actual encoded opening for legibility and visual fidelity.

## Attention and mobile readability before approval

The opening must give a viewer a clear reason to stop scrolling while accurately representing the article. Design and review the hero for its actual portrait reel presentation before editorial approval.

- Use one clear focal subject and a short, specific benefit, question or problem. Aim for a three to seven word cover headline where practical; do not use unsupported promises or misleading curiosity bait.
- Make the main subject and headline immediately recognizable without sound. Use strong contrast and large type. Keep supporting labels secondary; remove tiny text and busy decorative detail from the opening artwork.
- Preview the complete hero inside the real portrait composition at360 by640 pixels. The headline must be readable without zooming, and important content must stay clear of platform controls and cropping. A landscape hero that becomes an unreadable strip fails this check; redesign the approved hero instead of enlarging and clipping its text.
- Inspect encoded frames0 and15 plus the transition into the reel. Reject blank or near blank openings, unfinished entrance animations, unrelated stock, missing images and accidental dark overlays.
- Record the reviewer, hero hash and frame preview in the reel's visual review. A reviewer must be able to state the topic and viewer benefit after a one second look. If that test fails, revise the hero before scheduling.
- Preserve truthful variety across successive covers: vary the focal image, composition and concise hook while retaining Fused branding. Do not regenerate an already approved cover merely for novelty.

The publishing owner checks this before media upload and Buffer submission. Any hero edit requires renewed editorial approval and regeneration of the affected opening and hosted derivatives; an old approval hash must never be reused for changed artwork.

On September29 this opening was applied to the four newly recovered reels: skip links, larger text testing, original silver coin packaging, and damaged coin holders. Original MP4s and metadata are preserved under `.workflow-state/hero-opening-2026-09-29/`. Repair checks include unchanged audio bitstreams, unchanged duration, full decode and release readiness.

Validation:24 focused regression tests passed, Remotion frame zero rendered successfully, and application type checking passed with dependency declaration checking skipped. The unrestricted type check still reports conflicting WebCodecs/Remotion declarations inside installed dependencies; those declarations were not changed by this repair.

All four encoded first frames match their intended covers at greater than0.994 luminance SSIM. This comparison normalizes PNG and encoded video color formats; the first encoded frame was also visually inspected. All four repaired files passed release checks.
