# Video publishing through the Fused MCP server

This lets your AI agent (Claude Code or Codex CLI) upload a finished MP4 and schedule it to your own Buffer channels: YouTube, Instagram and Facebook. Posts go straight into your Buffer queue. Nobody reviews them first, so check the video and caption before you schedule.

## Setup (one time)

1. Save the access token you were sent as an environment variable. Add this line to `~/.zshrc` (Mac) and open a new terminal:

   ```bash
   export FUSED_INSTRUCTIONS_TOKEN="paste-the-token-here"
   ```

   Treat the token like a password. Anyone who has it can post to your channels. If it leaks, ask Fused to rotate it.

2. Connect the server.

   **Claude Code:**

   ```bash
   claude mcp add --transport http fused_publish https://fused-client-instructions.luxraycoco.workers.dev/mcp --header "Authorization: Bearer ${FUSED_INSTRUCTIONS_TOKEN}"
   ```

   **Codex CLI:** add to `~/.codex/config.toml`:

   ```toml
   [mcp_servers.fused_publish]
   url = "https://fused-client-instructions.luxraycoco.workers.dev/mcp"
   bearer_token_env_var = "FUSED_INSTRUCTIONS_TOKEN"
   ```

3. Start the agent and ask it to list its `fused_publish` tools. You should see four: `create_video_upload`, `list_videos`, `schedule_post`, `get_post_status`.

## How to use it

Just ask the agent in plain words, for example:

> Upload ~/Videos/lot-12.mp4 with fused_publish and schedule it to YouTube, Instagram and Facebook for tomorrow at 5:30 pm Pacific. Caption: "1921 Morgan dollar. Lot 12 is open for bidding. https://auctions.coinssince1994.com". YouTube title: "1921 Morgan Dollar | Lot 12".

What the agent does:

1. `create_video_upload` with the file name, size and SHA-256. It gets back a one time upload link and a ready `curl` command.
2. Runs the `curl` command to send the MP4.
3. `schedule_post` with the video ID, caption, YouTube title, channels and time.
4. `get_post_status` later to confirm each post was sent and get the live link.

## Limits

| Rule | Value |
|---|---|
| File type | MP4 only |
| File size | 25 MiB (26,214,400 bytes) maximum |
| Upload link | Works once, for 15 minutes |
| Video storage | 5 days after upload, then removed automatically |
| Schedule time | At least 15 minutes ahead, and at least 1 hour before the video's 5 day storage ends |
| Buffer queue | 10 pending posts per channel. If a channel is full nothing is scheduled |
| Daily use | 20 uploads and 30 posts per day |
| Caption | 2,200 characters maximum, same text on every channel |
| YouTube title | 100 characters maximum, required for YouTube |

Notes:

- Running `schedule_post` again for the same video is safe. A channel that already has that video is skipped, never posted twice.
- To post the same video at a second time, upload it again to get a new video ID.
- To cancel or edit a scheduled post, use the Buffer app. This server cannot delete posts.
- A video over 25 MiB must be compressed first, for example: `ffmpeg -i in.mp4 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k -movflags +faststart out.mp4`
