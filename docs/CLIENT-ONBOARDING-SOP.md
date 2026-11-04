# Onboarding clients to the protected reel service

Owner: Nick. Run owner commands from the Fused repository root. This SOP covers the hosted reel planning service and its client import kit. It does not change personal generation, coin history jobs, or business growth automation.

## Keep the three environments separate

| Environment | Uses | Payment dependency | Files it may receive |
|---|---|---|---|
| Nick's personal generation | Existing local scripts, voice, renderer, and scheduled jobs | None | Nick's local source procedures and assets |
| Paying client's project | `create_reel_plan` through MCP or HTTPS | Current server profile must have `paid = true` | Public integration files, client brief, returned draft and client assets |
| Owner administration and vault | Authenticated Wrangler operator commands | Cloudflare account permission, not a client token | Private source documents, compiled policies, credentials and verification records |

Install the client bootstrap only in a separate client project. The installer refuses the Fused personal repository and writes no global agent configuration. There is no `owner=true`, magic header, or personal bypass in the public service. Nick's own work remains independent because it uses the existing local workflow.

## What can be sold now

The hosted operation creates a reel script and storyboard, with private checks for hooks, captions, beats, narration length, closing, and source references. It returns a draft requiring factual and media-rights review. It does not render, publish, synthesize Nick's voice, or execute every paragraph of the archived SOPs. Connect the client's own approved renderer after draft review. Add further proprietary procedures as controlled server operations before promising them in the client scope.

The server never sends the private policy or owner reference archive to a client or to the drafting model. The original file download returns `410`; the old MCP download tool is removed; version preview URLs are disabled. Client outputs remain theirs after cancellation. Billing changes are currently manual.

## Owner preparation

1. Confirm Wrangler is authenticated to the Fused Cloudflare account. Run `npm run client-instructions:test` after service changes.
2. Check the private working copy and remote policy agree:

```bash
node services/client-instructions/scripts/operator.mjs verify-policy reel-core reel-policy-v1 .private/client-playbooks/2026-11-04-onboarding-v2/reel-core.json
```

3. Build the client kit using the allowlisted packager:

```bash
node services/client-instructions/scripts/package-client-kit.mjs outputs/fused-client-kit
```

The ZIP and manifest contain public integration files only. Never add the owner CLI, `.private/`, `.build/`, `.token` files, Cloudflare credentials, or private policy JSON to the kit. Regenerate a new kit after changes; do not edit an already delivered package in place.

4. Record a unique client installation ID, the paying account, approved scope, support contact, selected policy, renewal date, and billing source in an owner record. Use a separate ID per installation if credentials must be revoked independently. Do not put personal client details or payment references into this public repository.

## Provision and import

Set `FUSED_CLIENT_ID` locally to the agreed installation ID. The value is an identifier, never a credential.

```bash
node services/client-instructions/scripts/operator.mjs create-client "$FUSED_CLIENT_ID" reel-core
node services/client-instructions/scripts/operator.mjs client-status "$FUSED_CLIENT_ID"
```

Creation refuses a missing policy and starts the profile unpaid. The remote credential is saved with restricted permissions at `.build/client-instructions/credentials/<client-id>.token`. Local test credentials use the separate `credentials/local/` directory. Deliver the client token through an agreed secure channel, separately from the kit. Do not paste it into this SOP, a source repository, or public configuration.

The client extracts the kit and runs its installer from that extracted directory:

```bash
node install.mjs /absolute/path/to/client-project
```

The installer adds project-scoped Codex and Claude Code MCP settings, a client workflow document, a standalone HTTPS script, and sample brief. It preserves existing instructions and unrelated MCP servers, and refuses conflicting configuration. The client reviews/trusts the project, supplies `FUSED_INSTRUCTIONS_TOKEN` through its secret environment, and reopens the agent from that environment. See the kit README for exact steps. Do not install it in Nick's personal project or global home configuration.

Supported clients must send a bearer header over Streamable HTTP. Scripts can use the included Node client. An app that only supports OAuth needs identity integration before onboarding; the ZIP is not a universal plugin-directory submission.

## Acceptance sequence for every client

1. **Unpaid check:** With the new credential installed, a call to the service must fail with `403` and return no draft. The retired instruction route must return `410` even when later paid.
2. **Confirm payment or grant:** Nick checks the actual payment source, then activates the profile:

```bash
node services/client-instructions/scripts/operator.mjs set-paid "$FUSED_CLIENT_ID" true nick "Onboarding payment confirmed"
```

3. **Paid check:** From the imported client project, ask the agent to call `create_reel_plan` with the supplied example brief. For a scripted workflow run the installed `.fused-reel/create-reel-plan.mjs` with `.fused-reel/brief.example.json`. Save only the returned client draft. Confirm it has a script, storyboard, source references, and `reviewRequired: true`. No policy or instruction file should appear in the result.
4. **Revocation check:** Set paid to false and repeat the request. It must return `403`. Confirm the previously saved draft and client assets are still accessible.

```bash
node services/client-instructions/scripts/operator.mjs set-paid "$FUSED_CLIENT_ID" false nick "Onboarding revocation check"
```

5. **Restore only paid clients:** If payment or the grant remains valid, restore true and read back status. A test profile must finish false.
6. **Record acceptance:** Save client ID, date, kit manifest hash, policy name, unpaid/paid/revoked results, reviewer, and final paid status in an ignored owner record under `.private/client-playbooks/onboarding/`. Exclude tokens, private text and full client drafts. Do not report onboarding complete until the client's actual agent or script succeeds.

## Operate, cancel, and recover

Each new run calls the service. The service checks payment before generation and before delivery. Twenty generation attempts per client per UTC day are reserved atomically; failed generation counts and each attempt makes at most two model calls. Rendering and publishing costs belong to the agreed client workflow. Review charges and usage before increasing limits.

For nonpayment or cancellation, use `set-paid <id> false <actor> <reason>` and read back `client-status`. Do not delete client files or deactivate client-owned accounts. For a leaked or shared credential, first pause access, then run `rotate-token <id>`, securely deliver the replacement, verify the old token fails, and restore access only if payment remains valid. If an owner command reports uncertain database state, inspect status and the retained recovery credential before retrying.

Connect verified billing webhooks when the provider is selected. Until then, Nick owns the manual paid switch and renewal review. The client cannot supply its own trusted paid flag or choose another client's private policy.

## Protected source transfer and ongoing edits

The canonical owner working copy is `.private/client-playbooks/2026-11-04-onboarding-v2/`, ignored by Git with directories restricted to the owner and files mode `0600`. Its `manifest.json` records source paths, hashes, classification and destination. `transfer-report.json` records actual remote body verification. Cloudflare D1 stores reference Markdown in `owner_playbooks`; no Worker or client route reads that table. The active executable JSON remains in `private_policies`. The first snapshot is retained as history; the second includes the Source of Truth version update.

| Owner archive entry | Original source | Role |
|---|---|---|
| source-of-truth | `docs/SOURCE-OF-TRUTH.md` | Precedence and personal workflow reference |
| reel-sop | `video/REEL-SOP.md` | Full technical production reference |
| reel-enrichment | `docs/REEL-ENRICHMENT-SOP.md` | Visual treatment reference |
| reel-opening | `docs/REEL-OPENING-SOP.md` | Opening quality reference |
| reel-captions | `docs/WHISPER-CAPTIONS-SOP.md` | Captions reference |
| reel-audio | `docs/AUDIO-SOURCE-SOP.md` | Audio selection and rights reference |
| client-reel-reference | Private rewritten client-neutral playbook | Owner-only planning reference |
| reel-core | Private compiled JSON | Executed server policy |

Previously committed source files remain public in Git history. Copying them to the vault does not undo prior publication. Their local originals remain available to personal jobs. New proprietary revisions belong in the private working copy, not tracked SOP files or the client kit. The archived general SOPs may contain older operational rules; Source of Truth controls precedence.

Upload and verify new immutable Markdown versions with `put-playbook` and `verify-playbook`. Update supported executable policy fields with `put-policy` and `verify-policy`. Uploading a policy immediately makes the newest version active for all clients assigned that name, so validate representative drafts under a separate test policy name before promoting a version to `reel-core`. A reference upload alone never changes runtime behavior. Owner commands require Cloudflare credentials and cannot be called with a client bearer token.
