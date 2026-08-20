# Audio Rights Audit - 2026-07-07

## Incident

Reel uploads are being marked for copyrighted audio. Reported claim:

- Title: `Happy Mysterious Full Track 102 BPM, F Major`
- Publisher / label shown: Rapid Entertainment
- Content owner: Airbit SG Pte. Ltd
- Type: Audio
- Impact: blocked globally
- Date reported: 2026-07-07

## Decision

Fail closed on the local reference library, not on every historic render. Do not use the old bundled ambient music pack for any new reel until every track is re-cleared with durable evidence. The immediate production path is the approved two-track Mixkit stock cycle with `--music=cycle`.

## Code Changes

- Added `video/data/audio-rights.json` as the base rights database.
- Added `video/scripts/audio-rights.mjs` shared validation utilities.
- Added `video/scripts/audit-audio-rights.mjs` and `npm run video:audio-rights` for one-time local reference library checks.
- Updated `video/scripts/render.mjs` to default to the approved trusted cycle and block unapproved tracks before expensive render work.
- Generated five local original 3-minute beds, then retired them from the default cycle after review.
- Downloaded and registered two Mixkit stock tracks with source URLs, license URL, SHA-256 hashes, and platform-use notes.

## Current Catalog Result

All 10 existing `video/public/music/ambient-*.mp3` files are blocked pending re-clearance. They are still present on disk for historical renders and auditability.

The trusted cycle contains two approved Mixkit stock tracks:

- `mixkit-driving-ambition-32.mp3`
- `mixkit-serene-view-443.mp3`

## Replacement Policy

Preferred production options:

1. Use `--music=cycle` with the two approved Mixkit stock tracks.
2. Use `--music=none`.
3. Use platform-native libraries only inside that platform's own editor or export flow.
4. Use public domain or CC0 sources only when the exact file, source URL, license, and verification date are preserved.

Avoid:

- Tracks described only as "royalty free".
- Social-platform trending sounds.
- Music from YouTube channels or unofficial compilations.
- AI music whose terms do not clearly grant commercial social publishing rights.

## External Reference Notes

- YouTube Audio Library is useful for YouTube-specific publishing, but YouTube says only Audio Library files are known to YouTube as copyright-safe and warns it is not responsible for issues from other libraries: https://support.google.com/youtube/answer/3376882
- Creative Commons describes CC0 as the strongest tool for placing work as fully as possible into the public domain, but the source and exact file still need to be preserved: https://creativecommons.org/public-domain/#cc0
- Mixkit says free audio clips can be used on YouTube, social media platforms, podcasts, websites, and online advertisements, and that attribution is not required; it also excludes CDs, DVDs, video games, and TV/radio broadcasts: https://mixkit.co/free-stock-music/

## Open Work

- Re-render any reel selected for future scheduling with `--music=cycle`.
- If more variety is needed, replace one of the two stock tracks only after preserving the exact file, source page, license page, SHA-256 hash, and usage restrictions in `video/data/audio-rights.json`.
- Re-run `npm run video:audio-rights` when the local reference library changes.
