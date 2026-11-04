# Private reel service

The service offers `create_reel_plan` through MCP and `POST /v1/reels/plan` through HTTPS. A paid client submits a brief and receives its own script and storyboard. There is no instruction or policy download: the old file endpoint returns `410`, and `get_reel_instructions` is no longer registered. The legacy fetch script exits without making a network request.

Private policy JSON is stored in D1 and evaluated by server code. It is never included in the model prompt, public tool metadata, client results, or error messages. The current policy implements hook, caption, beat count, duration, closing, and source-reference checks. It is a compiled subset of the reel SOP. Prose instructions and future procedures must be translated into server operations before clients can use them privately; this service does not secretly feed an arbitrary Markdown playbook to a customer's agent.

The model drafts from a public generic prompt and the client brief. Keeping the policy outside model context prevents a prompt injection from asking the model to quote that policy. Customers can keep their returned work and infer some visible behavior; this is not a guarantee against reverse engineering or credential sharing.

## Install and verify

```bash
npm ci --prefix services/client-instructions
npm run client-instructions:test
npx wrangler deploy --config services/client-instructions/wrangler.jsonc --dry-run
```

## Owner operations

Follow the [client onboarding SOP](../../docs/CLIENT-ONBOARDING-SOP.md) for provisioning, importing and acceptance. Nick's personal generation continues through its existing local jobs without this payment gate.

Private source files must be outside this public repository or in ignored `.private/client-playbooks/` or `.build/`. The canonical owner working copy is `.private/client-playbooks/2026-11-04-onboarding-v2/`. Back it up privately. All commands use remote D1 unless `--local` follows the script name. Local credentials use a separate `credentials/local/` directory. Do not print token contents.

```bash
npx wrangler d1 migrations apply fused-client-instructions --config services/client-instructions/wrangler.jsonc --remote
node services/client-instructions/scripts/operator.mjs verify-policy reel-core reel-policy-v1 .private/client-playbooks/2026-11-04-onboarding-v2/reel-core.json
node services/client-instructions/scripts/operator.mjs create-client client-id reel-core
node services/client-instructions/scripts/operator.mjs client-status client-id
node services/client-instructions/scripts/operator.mjs set-paid client-id true nick "Payment confirmed"
node services/client-instructions/scripts/operator.mjs set-paid client-id false nick "Access ended"
node services/client-instructions/scripts/operator.mjs rotate-token client-id
```

A new client starts unpaid. Only SHA256 token hashes are stored in D1. `rotate-token` invalidates the old credential and saves the replacement under ignored `.build/client-instructions/credentials/` with restricted permissions. Share credentials through a secure channel. Tokens remain per client; they can be shared by a recipient, so separate installations should receive separate client profiles. Payment changes are audited by D1 triggers. Billing-provider integration has not been configured.

The Worker enforces a UTC daily cap of 20 accepted generation attempts per client, including failed generation. Each attempt makes at most two model calls. Concurrent requests reserve quota atomically in D1. Limits are operational safeguards, not a billing ledger. Cloudflare Workers AI usage may incur charges under the account's plan. No paid-plan upgrade is performed by deployment.

## Client connections

Build the token-free import package with `node services/client-instructions/scripts/package-client-kit.mjs outputs/fused-client-kit`. Extract the resulting ZIP and run `node install.mjs /absolute/path/to/client-project`. The installer adds project-scoped Codex and Claude Code settings, a workflow pointer and the HTTPS client. It preserves unrelated configuration and refuses personal production workspaces. Existing output directories are immutable; choose a new output path when rebuilding.

MCP endpoint: `https://fused-client-instructions.luxraycoco.workers.dev/mcp`.

Codex configuration:

```toml
[mcp_servers.fused_reel]
url = "https://fused-client-instructions.luxraycoco.workers.dev/mcp"
bearer_token_env_var = "FUSED_INSTRUCTIONS_TOKEN"
```

Claude Code configuration, with the credential available in its environment:

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

Other clients must support Streamable HTTP with a bearer header. OAuth-only apps require additional identity integration. For scripts, provide a JSON brief shaped like `client/brief.example.json`, set `FUSED_INSTRUCTIONS_TOKEN` privately, and run:

```bash
node services/client-instructions/client/create-reel-plan.mjs services/client-instructions/client/brief.example.json
```

The CLI writes only the client's result to stdout. The client may save it. `AGENTS.example.md` describes the integration. Client URLs are treated as citations and are not fetched; supplied facts require human verification. Results are drafts with `reviewRequired: true`, not permission to render or publish unreviewed content. The service does not upload, delete, or revoke client files.

## Access and confidentiality checks

- Every request and generation operation checks current D1 paid status and expiry. Access is checked again before releasing a generated result.
- An inactive client gets HTTP `403` at entry; revocation during MCP execution yields a generic tool error without a plan.
- Arbitrary file paths, models, system prompts, and bundle names are rejected by strict input validation.
- No resources, prompts, sampling, private-file tool, or debugging exports are exposed through MCP.
- D1 or AI failures return generic errors. Logs contain request IDs, status, and successful client IDs, not input/output text or private policy.
- Only server code reads `private_policies`. `owner_playbooks` stores versioned owner reference Markdown and has no Worker reader. The old `instruction_bundles` table remains an owner archive and has no HTTP reader. Use `put-playbook` / `verify-playbook` to archive sources and `put-policy` / `verify-policy` for executable rules. Uploading a reference never changes service behavior.
- Version preview URLs are explicitly disabled so old Worker versions cannot provide an alternate download route. Never roll back to a version with raw instruction delivery.

The selected Cloudflare model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, using its documented JSON mode. Private policy validation is independent of model compliance. The deployed test profile is `pilot-smoke`; it must remain unpaid after verification.

Hosted verification passed: paid MCP and HTTPS generation, retired file `410`, removed tool rejection, unpaid `403`, and old-token `401` after rotation. The automated suite also checks extraction attempts, revocation during generation and safe client installation. Tightening policy values can increase draft rejections; test policy changes against representative briefs before uploading them. `put-policy` makes the newest version active for every client assigned that policy name; validate a separate test policy before promoting changes.
