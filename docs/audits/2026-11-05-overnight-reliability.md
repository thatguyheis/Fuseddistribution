# Overnight production repair

Owner: Codex. Operating date: 2026-11-05 Pacific. Authority: `docs/SOURCE-OF-TRUTH.md`.

## Findings and corrections

| Observed failure | Correction |
|---|---|
| A dead supervisor PID was treated as an active owner after sandbox process inspection failed. | A tracked queue runner holds a kernel lease inherited by its child. A historical ledger PID is no longer ownership authority. The local LaunchAgent runs outside the Codex process-inspection sandbox. |
| Local drafting and speech could compete for limited memory. | Coin drafting yields to the business kernel lease; business rendering waits for active coin/publisher writers. Existing coin schedules and scope stay unchanged. |
| The first caption failure stopped all remaining topics. | Preserve per-topic state/logs and continue the next approved topic. Target two current successful renders within at most three distinct attempts per Pacific day. A genuine shared TTS circuit failure still stops synthesis safely. |
| base.en invented repetitive text and merged `detail do` into `detailed`. | Detect anomalous repetition relative to the approved narration, broad divergence and ending mismatch; retry only affected segments once with pinned offline small.en. Cache both models separately. Never change correct speech to repair recognition. |
| The delivery monitor ran before the scheduled posts were due and then stopped. | Reuse the existing monitor at 03:15, 06:15 and 14:15; reconcile exact due IDs, retain unknown results and avoid duplicate creates. |
| Routine Buffer status rewrote unrelated public article panels. | Public link synchronization now requires explicit `--sync-social-links`. A live exact-ID regression confirmed normal status leaves public files unchanged. |
| Preparing sources and rendering at the same start time creates a race. | Luna prepares at 01:15; the single local render job starts at 02:00. Maintain three approved unprocessed packages when source material permits. |

The real Whisper regression was checked using existing audio and caches: segment 3 changed from 259 recognized words with repetition to the correct 68 words; the ending matched all seven approved words. Neither repair required another TTS generation.

## Operating schedule

| Pacific time | Owner | Work |
|---|---|---|
| 01:15 | GPT-5.6 Luna, low | Resume backlog, restore approved queue floor, source/artwork QA. At most one Luna helper; no helper may render. |
| 02:00 | `com.nick.business-reel-production` | Tracked serial local runner, cached narration/captions, one inherited lease, no parallel render loop. |
| 03:15 | GPT-5.6 Luna, low | Compact health check, adopt a free tracked runner only within the overnight window and persisted limits, deliver finished eligible files. |
| 06:15 | GPT-5.6 Luna, low | Encoded visual/audio review, release, persistent hosting, verified blog player/deployment and capacity-aware social scheduling. No daytime synthesis/encode. |
| 14:15 | GPT-5.6 Luna, low | Reconcile exact due IDs and finish outstanding delivery. Scheduled is distinct from sent. |

Loaded job inventory also found the coin draft publisher and 22:00 coin Buffer refill explicitly disabled in launchd, contrary to their former documented active status. Their existing disables were preserved; this repair installs and schedules the separate business exception. The 01:00/04:00 coin renderer remains loaded. Retired generic blog/research jobs remain disabled.

The local job uses caffeinate while processing. App-based preparation/review needs the Mac and desktop app available; see [official scheduled-task guidance](https://developers.openai.com/training/walkthroughs/scheduled-tasks). Current power assertions show the desktop app prevents idle sleep. No system power settings or wake schedule were overwritten.

Routine monitoring reads `scripts/business-reel-status.py`, not the entire historical SOP corpus. Deterministic local waits do not require repeated LLM turns. Notify on meaningful changes, completion, actual failure or required action.

## Facebook reviewer feedback

The two owner supplied RTFD notes are creative review input, not a verified statement of official Facebook publishing requirements. They request 1080 x 1920 full-screen output, larger central text, platform UI clearance, early movement, stronger contrast and less recompression.

The previous canvas was already 9:16. Empty fields were part of the source artwork. New business presentations use `business-growth-v1`, regenerated full bleed source cards, 64–80 px headings, a reserved explanatory graphic area, opaque white/contrast checked cyan, bottom 250 px and right 150 px clearances, and a restrained first-two-second hook move. No duplicate headings cover baked artwork. Actual redacted interface cues require real evidence; conceptual graphics remain labeled. The 1080 master is copied for delivery when it meets size/codec limits; the shared delivery step no longer automatically downsamples this profile to 720p. Coin/default output remains 720p.

## Verification scope

The audit validates ownership/failure isolation with simulated workers and a real inherited-flock child process, caption fallback against the actual failed cached reel, source/profile/contrast/layout tests, the installed LaunchAgent, and queue dry-run approval checks. A daytime still is a composition check, not a completed overnight run. Full success still requires the next production run's release, live blog/player and exact social delivery evidence. Never mark this audit itself as proof that two pairs have posted.
