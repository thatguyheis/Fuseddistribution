# Codex Handoff — Stale Music Track Picker in render-missing-reels.sh

Date: 2026-07-09
From: Claude (editorial/QA lane)
To: Codex (workflow architecture / gates)
Approved by: Nick (asked Claude to hand this to Codex rather than patch it directly)

## Problem

The 2026-07-09 11:00 `com.nick.render-missing-reels` run rendered zero reels: `Complete: rendered=0 failed=4`. All four posts (`sms-marketing-vs-email-marketing-small-business`, `how-to-get-the-most-money-when-selling-silver`, `selling-silver-to-a-dealer-vs-private-sale`, `text-message-marketing-for-small-business` — the last hit the render budget before failing) were blocked twice each by the audio rights gate:

```
Error: Audio rights blocked for ambient-03.mp3: music_track_not_approved - Source and
license evidence were not preserved in a durable rights record before platform copyright
claims were reported.
```

The gate is working exactly as designed. The bug is upstream: `scripts/render-missing-reels.sh:36` still hardcodes the retired ambient set:

```bash
TRACK=$(printf "ambient-%02d.mp3" $(( ($(date +%j) % 9) + 2 )))
```

All `ambient-*.mp3` records were set to `blocked_pending_reclearance` in `video/data/audio-rights.json` on 2026-07-08 (following the 2026-07-07 Airbit/Rapid Entertainment copyright claim; see `docs/AUDIO-RIGHTS-AUDIT-2026-07-07.md`). The approved set is now the 10-track Mixkit `trustedCycle`. The picker in the launchd script was never updated to match, so every daily run since the rights DB change will fail 100% until it is.

Note the ambient picker never selects `ambient-01.mp3` (formula yields 02–10) and will pick a blocked track every day — this is deterministic, not intermittent.

## Proposed fix (Codex owns final design)

One line, `scripts/render-missing-reels.sh:36`:

```bash
TRACK="cycle"
```

`video/scripts/render.mjs:81` already handles this: `musicTrack === 'cycle' ? selectTrustedCycleTrack(slug) : ...`, which picks deterministically (slug-seeded hash) from `policy.trustedCycle` in `audio-rights.json`, then still passes through `assertMusicTrackCleared`. This matches `policy.defaultRenderMusic: "cycle"` already declared in the rights DB. No new code paths.

Alternative if per-day rather than per-slug variety is wanted: `selectTrustedCycleTrack()` with no arg seeds on today's date; the shell script could instead call `node -e` to resolve a concrete track name, but passing `cycle` through is simpler and keeps track selection in one place.

## Blast radius / follow-ups

- Blog publish path unaffected; all four 2026-07-09 posts published and verified (see `~/Library/Logs/daily-blog-reel.log`).
- Backlog: the four failed slugs plus whatever was already queued remain stale; after the fix, `MAX_RENDERS_PER_RUN` budget (2 default, per daily cron) will take multiple days to clear — consider a one-off manual `MAX_RENDERS_PER_RUN=4 scripts/render-missing-reels.sh` run after patching.
- Worth a grep for other callers still passing `--music=ambient`: the daily 11:00 launchd script is the one confirmed instance, but any other automation invoking `render.mjs --music=<hardcoded>` has the same failure mode.
- Reels remain local-commit-only per REEL-SOP; nothing here changes push/deploy policy.

## Log evidence

`~/Library/Logs/render-missing-reels.log`, 2026-07-09 11:00:17–11:00:48: each slug attempted twice, `exit=1 size=0`, stack trace from `audio-rights.mjs:132` via `render.mjs:85`. Run ended `rendered=0 failed=4`.
