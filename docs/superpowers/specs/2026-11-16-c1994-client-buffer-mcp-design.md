# Client video upload and Buffer scheduling over MCP

Date: 2026-11-16. Approved by Nick in session. Status: built and deployed.

## Goal

The Coins Since 1994 client uploads its own MP4s and schedules them to its own Buffer channels from Claude Code or Codex CLI, with no review step by Nick.

## Decisions (Nick)

- Client posts straight to its Buffer queue. No approval gate.
- Uploaded videos expire automatically after 5 days.
- Client app is a CLI agent with a shell, so bearer token auth and a `curl` upload are enough. No OAuth, no upload web page.

## Design

Added to the existing `fused-client-instructions` Worker (`services/client-instructions/`). Main site Worker is untouched.

- `clients.publish_profile` (D1) names a publish profile. NULL means no publish tools. `clients.reel_enabled = 0` removes `create_reel_plan` for a client that only publishes.
- The profile is one Worker secret, `PUBLISH_PROFILE_<NAME>`, holding JSON `{token, organizationId, channels, maxPending}`. Buffer key and channel IDs are never in the repo, D1, tool output or logs.
- MCP tools: `create_video_upload`, `list_videos`, `schedule_post`, `get_post_status`.
- Upload: `create_video_upload` records the declared size and SHA-256 and returns a one time `PUT /v1/uploads/<id>?key=...` link valid 15 minutes. The Worker checks key, size, MP4 header and checksum, then stores the file in `REELS_KV` at `reels/<id>/<id>.mp4` with a 5 day TTL. The existing `fused-reel-media` Worker serves it on workers.dev, the host Buffer can read.
- Schedule: validates ownership, expiry and time, checks the pending cap per channel before creating anything, claims a `(video, service)` row before each `createPost` so retries never double post, then reads each post back to confirm scheduled status and attached video.
- Limits: 25 MiB per file, 20 uploads and 30 posts per client per UTC day.
- No delete tool. Edits and cancels happen in the Buffer app.

## Operator steps for another client

1. `wrangler secret put PUBLISH_PROFILE_<NAME>` with the JSON profile.
2. `operator.mjs create-client <id> reel-core`, `set-publish <id> <name> <true|false>`, `set-paid <id> true nick "<reason>"`.
3. Send the token from `.build/client-instructions/credentials/<id>.token` by a secure channel with `client/PUBLISH-README.md`.

## Tests

`tests/publish.test.mjs` runs the real migrations in SQLite and covers tool visibility, the full upload and schedule flow, idempotent retry, every upload refusal, schedule refusals, queue cap, Buffer rejection, daily limits, tenant isolation and a broken profile.
