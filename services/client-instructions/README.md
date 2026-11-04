# Client instruction service

This Worker serves versioned reel instructions only to clients whose D1 profile has `paid = 1` and has not expired. The operator controls the profile with Wrangler. The current Fused GitHub repository is public, so private instruction source files must stay outside tracked paths. Cloudflare R2 is not enabled on this account; D1 stores the small Markdown bundles for this first version.

## Local setup

From the repository root:

```bash
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

Deploy with `npx wrangler deploy --config services/client-instructions/wrangler.jsonc`. The endpoint is `https://fused-client-instructions.<account-subdomain>.workers.dev/v1/instructions/reel`. Set `FUSED_INSTRUCTIONS_URL` to the actual deployed URL and `FUSED_INSTRUCTIONS_TOKEN` to that client's token outside Git. The client loader writes the verified Markdown to stdout and exits nonzero on denial or outage:

```bash
node services/client-instructions/client/fetch-instructions.mjs
```

The supported client reel entry point must call the loader for every new run and stop if it fails. `AGENTS.example.md` is only a pointer for an interactive agent. It does not enforce access against someone who changes their local code or saves prior instructions.

## Operating rules

- `set-paid client-id false nick "Reason"` blocks the next instruction fetch. This does not delete any client owned output.
- `put-bundle` adds a new immutable version. The Worker serves the latest version of the client's allowed bundle.
- A missing client, inactive client, missing bundle, or database failure returns no instruction bytes. All responses have `Cache-Control: private, no-store`.
- Keep previous bundle versions in D1 for audit and recovery. To roll back, upload the previous text as a new version.
- Back up D1 and the private source repository before onboarding paying clients. Add billing webhooks only after manual access changes are verified.
