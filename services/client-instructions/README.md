# Client instruction service

This Worker serves versioned reel instructions only to clients whose D1 profile has `paid = 1` and has not expired. The operator controls the profile with Wrangler. The current Fused GitHub repository is public, so private instruction source files must stay outside tracked paths. Cloudflare R2 is not enabled on this account; D1 stores the small Markdown bundles for this first version. The same entitlement check guards the Markdown endpoint and the remote MCP endpoint.

## Local setup

From the repository root:

```bash
npm ci --prefix services/client-instructions
npm run client-instructions:test
npx wrangler d1 migrations apply fused-client-instructions --config services/client-instructions/wrangler.jsonc --local
npx wrangler deploy --config services/client-instructions/wrangler.jsonc --dry-run
```

Run the operator with `--local` to work against the local D1 database. Omit it to work against the Cloudflare database. A new client starts with `paid = false`.

```bash
node services/client-instructions/scripts/operator.mjs --local put-bundle reel-core pilot-v1 /absolute/path/to/private/reel.md
node services/client-instructions/scripts/operator.mjs --local create-client pilot-client reel-core
node services/client-instructions/scripts/operator.mjs --local set-paid pilot-client true nick "Pilot payment confirmed"
```

The `create-client` command writes a unique token to `.build/client-instructions/credentials/<client-id>.token` with restricted file permissions. Deliver it through a secure channel, then keep it in the client's OS keychain or an untracked protected environment file. Never paste the token into this repository, a ticket, a chat log, or an instruction bundle. The operator command requires a private bundle source outside this public repository, or under ignored `.build/` for local testing.

## Production setup

Apply the same migration remotely, upload a reviewed private bundle, then create and activate each client:

```bash
npx wrangler d1 migrations apply fused-client-instructions --config services/client-instructions/wrangler.jsonc --remote
node services/client-instructions/scripts/operator.mjs put-bundle reel-core 2026-11-04 /absolute/path/to/private/reel.md
node services/client-instructions/scripts/operator.mjs create-client client-id reel-core
node services/client-instructions/scripts/operator.mjs set-paid client-id true nick "Payment confirmed"
```

Deploy with `npx wrangler deploy --config services/client-instructions/wrangler.jsonc`. The deployed Markdown endpoint is `https://fused-client-instructions.luxraycoco.workers.dev/v1/instructions/reel`. Set `FUSED_INSTRUCTIONS_URL` to that URL and `FUSED_INSTRUCTIONS_TOKEN` to that client's token outside Git. The client loader writes the verified Markdown to stdout and exits nonzero on denial or outage:

```bash
node services/client-instructions/client/fetch-instructions.mjs
```

The remote MCP endpoint is `https://fused-client-instructions.luxraycoco.workers.dev/mcp`. It offers the read only `get_reel_instructions` tool. MCP clients must send the same client token as `Authorization: Bearer <token>` on each request. For Codex, set the token in the client's environment, then add this to that client's private `~/.codex/config.toml`:

```toml
[mcp_servers.fused_reel]
url = "https://fused-client-instructions.luxraycoco.workers.dev/mcp"
bearer_token_env_var = "FUSED_INSTRUCTIONS_TOKEN"
```

Claude Code supports a remote HTTP MCP server and environment variable expansion in `.mcp.json` headers. Put this in the client's private config only where their credential is available to Claude Code:

```json
{
  "mcpServers": {
    "fused_reel": {
      "type": "http",
      "url": "https://fused-client-instructions.luxraycoco.workers.dev/mcp",
      "headers": { "Authorization": "Bearer ${FUSED_INSTRUCTIONS_TOKEN}" }
    }
  }
}
```

Other MCP clients can connect if they support Streamable HTTP and a bearer header. Clients that cannot set this header can use the Markdown loader; native app connectors that require OAuth need an additional OAuth sign-in layer. Neither transport forces a client agent to call the tool, so a short local bootstrap must instruct it to call `get_reel_instructions` at the start of each reel. A deterministic reel entry script must call the Markdown loader and stop on failure. Neither mechanism can prevent someone saving a previously delivered bundle.

The first bundle, `reel-core-v1`, is staged outside Git at `.build/client-instructions/private/reel-core-v1.md` and uploaded to D1. It rewrites reusable reel guidance around intake, sourced claims, hook and beat planning, rights, caption checks, and delivery. It excludes Fused's coin history rules, Nick's voice setup, internal paths, production schedule, and vendor credentials. This staging file is ignored, so make a durable private backup before using it as the only editable source.

## Operating rules

- `set-paid client-id false nick "Reason"` blocks the next instruction fetch. This does not delete any client owned output.
- `put-bundle` adds a new immutable version. The Worker serves the latest version of the client's allowed bundle.
- A missing client, inactive client, missing bundle, or database failure returns no instruction bytes. All responses have `Cache-Control: private, no-store`.
- Keep previous bundle versions in D1 for audit and recovery. To roll back, upload the previous text as a new version.
- Back up D1 and the private source repository before onboarding paying clients. Add billing webhooks only after manual access changes are verified.

The hosted database contains an unpaid `pilot-smoke` test profile. The live test observed anonymous `401`, unpaid `403`, paid `200` with digest validation, then `403` immediately after changing `paid` back to false. Both transitions appeared in `payment_audit`. There is no real client profile or billing integration yet.
