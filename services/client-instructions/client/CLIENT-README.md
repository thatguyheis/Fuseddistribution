# Fused client reel setup

This kit connects your project to Fused's paid reel planning service. It contains the integration files and a sample brief. The private playbook, server policy, owner tools, and account credentials are not included. The service returns your script and storyboard; you keep your assets, drafts, renders, and other delivered work when service access ends.

## Import into a client project

Install Node.js 22 or newer. Extract this ZIP to a temporary folder and run its installer with the client project directory:

```bash
node install.mjs /absolute/path/to/client-project
```

This is a folder installer, not an app plugin ZIP import. The target project must already exist. The installer adds project-scoped MCP configuration in `.codex/config.toml` and `.mcp.json`, preserves other server entries, and appends a marked workflow pointer to existing `AGENTS.md` and `CLAUDE.md`. The integration files are placed in `.fused-reel/`. Repeating the command is safe when the installed files have not been changed. A conflicting Fused configuration or symbolic link is refused before installation begins; resolve the conflict explicitly and run again.

The installer refuses Fused's personal production workspace. Install only in the customer's project. It never edits user-level or global agent configuration. There is no payment check added to the owner's personal generation jobs.

## Supply your credential

Obtain the client credential from Fused through an approved secure channel. Keep it in your OS keychain or another private secret store. Never paste it into project files, instructions, tickets, prompts, or a committed `.env` file.

For a temporary terminal session, the following works in Bash and Zsh. It reads without echoing the value or storing it in shell command history:

```bash
printf 'Fused access token: '
read -r -s FUSED_INSTRUCTIONS_TOKEN
printf '\n'
export FUSED_INSTRUCTIONS_TOKEN
```

Start your chosen agent or script from that same terminal environment. A desktop app already running may not inherit a newly exported value; use its supported secret/environment configuration or fully restart it from an environment where the variable is available. Do not embed the token in a launch command or copy it into the MCP configuration.

For Codex, trust this client project before reopening it. Codex loads `.codex/config.toml` only for trusted projects. For Claude Code, open this project and approve its project MCP configuration when prompted. Confirm that `fused_reel` exposes `create_reel_plan`. These configurations require an MCP client that supports Streamable HTTP with a bearer header. OAuth-only clients require additional identity integration from Fused.

## Make the first request

Ask the agent to follow `.fused-reel/FUSED-CLIENT-WORKFLOW.md` and call `create_reel_plan` with your topic, audience, sourced facts, call to action, and requested duration. The sample brief contains a small public documentation example; replace it with your own sourced material for real work.

A scripted request can run from the client project:

```bash
node .fused-reel/create-reel-plan.mjs .fused-reel/brief.example.json > reel-plan.json
```

The JSON result is your draft and may be saved. Verify facts and media rights before rendering or publishing. The service plans reels; it does not render or publish video. If access is inactive, the service returns `403`. Contact Fused to resolve access. Stop the paid workflow on denial or outage; do not substitute an old result for a new service run.

Your project data remains available independently of the service. Fused can revoke future service operations without deleting your files. Do not expect to download the private playbook; no such tool is exposed.

## Connection troubleshooting

- Missing credential: ensure the agent process receives `FUSED_INSTRUCTIONS_TOKEN` from its launch environment.
- `401`: the credential is missing, invalid, or was rotated. Obtain the current credential from Fused.
- `403`: paid access is inactive or expired. Contact Fused.
- `429`: the current service quota has been reached. Contact Fused before retrying in a loop.
- `422` or `503`: revise the brief when requested or retry later. Never publish an unreviewed substitute.

The SHA256 manifest detects changed kit files before installation; it is an integrity check, not a signature proving the sender's identity. Obtain this kit directly from Fused.

Official configuration references: [Codex project configuration](https://learn.chatgpt.com/docs/config-file/config-basic) and [Claude Code MCP](https://code.claude.com/docs/en/mcp).
