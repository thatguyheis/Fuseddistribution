# Remote client instructions: SOP and rollout plan

Status: hosted access service and remote MCP endpoint deployed, 2026-11-04. This is for paid client workflows only. It does not change `docs/SOURCE-OF-TRUTH.md`, coin history production, or the separate business growth automation. No real client is onboarded.

## Goal and exact limit of revocation

Host Fused's advanced reel instruction files on Cloudflare. A client's local repo contains only a small loader and ordinary client owned material. On each new reel run, the loader authenticates, fetches the current instruction bundle, and stops if that client's server profile has `paid = false`. The client's completed videos, posts, website, and source files remain theirs, consistent with `docs/superpowers/specs/2026-11-02-pricing-realign-design.md`.

This revokes **future retrieval**, not knowledge already seen. A paying client or their agent can save any instructions that the server returned. No HTTP header, expiring URL, license check, or MCP transport can erase such a copy. The honest promise is: Fused stops serving and updating its private instructions after access ends; the official loader refuses new work without a fresh fetch. If the business needs to prevent all reuse of the method, a plain text instruction service alone cannot supply that guarantee.

## Research findings

| Pattern | Evidence | Fit for Fused |
|---|---|---|
| Local project instructions | [OpenAI Docs](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide) describes Codex loading local `AGENTS.md`; [Claude Code docs](https://code.claude.com/docs/en/memory) describe local `CLAUDE.md` and local file imports. Neither documents automatic import of a protected HTTPS Markdown file as a replacement for these files. | Keep a short local bootstrap file that explicitly calls the protected loader. Verify each target agent actually follows it. A deterministic reel entry script must enforce the fetch for unattended runs. |
| Protected file API | [Cloudflare D1](https://developers.cloudflare.com/d1/worker-api/prepared-statements/) supports bound queries for client profiles and small instruction bundles. [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/) is an optional later identity layer. | Best first version for a freelancer with a few clients: one service, one instruction library, a profile row and unique bearer token per client. The Worker checks `paid` on each fetch. |
| Remote MCP tool server | [Cloudflare's current MCP handler guide](https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/) documents a stateless Worker handler; [Codex configuration](https://learn.chatgpt.com/docs/config-file/config-reference) supports an MCP bearer token environment variable; [Claude Code docs](https://code.claude.com/docs/en/mcp) support authenticated remote HTTP MCP servers. | The deployed `/mcp` endpoint exposes one read only `get_reel_instructions` tool. Clients that support Streamable HTTP and a bearer header can use it. Other workflows use the Markdown loader. Native app connectors may require OAuth. |
| Paid agent service run by one person | The [Dialer founder's account](https://blog.remote-mcp.com/p/from-hackathon-to-revenue-how-i-built) describes a remote MCP server, customer authentication, and Stripe payment access. | Evidence that a solo operator can sell gated agent capabilities. It is the founder's self report, not independent proof of revenue or reliable revocation. Do not copy its older experimental billing code without checking current documentation. |
| Agency client workflow | [Reach MCP's own description](https://www.reachmcp.com/) uses one hosted endpoint, client restricted keys, and account specific limits. [A Toronto agency profile](https://zapier.com/blog/hire-adrian-mcp/) describes keeping shared workflow knowledge in one agency workspace while connecting to client apps through MCP. | Use one central library plus client specific brand and channel rules. Keep client content and approvals in their own workspace. These are provider and profile descriptions, not a standard all freelancers follow. |

The researched examples gate access to a hosted service or connector. I found no documented method that retracts plain text instructions already delivered to a customer's machine. That distinction is an inference from how file delivery works, not a claim that every freelancer uses the same setup.

## Recommended first architecture

```text
Client reel command or agent
  -> local bootstrap in client repo
  -> HTTPS Markdown fetch or MCP tool call with that client's credential
  -> dedicated instruction Worker
  -> SHA256 lookup of the bearer token in D1
  -> D1 lookup: client paid, allowed bundle, expiry
  -> D1: versioned Markdown instruction bundle
  -> response to client for this run only
```

Use the separate Worker under `services/client-instructions/`, not the public `src/worker.js` site Worker. This account does not have R2 enabled, so the first version stores small, versioned Markdown bundles in D1. Keep the source Markdown in a separate private Fused repository or an ignored local staging path. Store a shared reel bundle once; each client profile names the bundle it may read. Add client specific overlays only after there is a real need and an isolation test. Give the client only its authorized bundle, version and digest. Do not copy the full instruction library into their Git repository. The current Fused GitHub repository is public.

Read contract: `GET /v1/instructions/reel` returns `200 text/markdown` with a version and SHA256 digest only for an entitled caller. `/mcp` accepts authenticated MCP requests and offers `get_reel_instructions`. Both paths read the profile on every request. Missing or invalid credentials return `401`; `paid = false` or expired access returns `403`; a storage or profile lookup failure returns `503`. None of these paths returns instruction content except to an entitled client. `HEAD` uses the same authorization. There is no direct public database or bundle URL.

Use D1 as the authority for `paid`, `access_until`, allowed bundle, and token hash to client mapping. Read it on **every** instruction request, with no entitlement cache. Cloudflare documents that [KV reads can be stale across locations](https://developers.cloudflare.com/kv/concepts/how-kv-works/), so the repo's existing KV namespaces are unsuitable for a prompt access switch that should take effect on the next request. The response uses `Cache-Control: private, no-store`; check that no cache rule, browser storage, service worker, or client script persists the bundle for later use. If the store or auth check fails, return an error and no instructions. [D1 primary reads](https://developers.cloudflare.com/d1/best-practices/read-replication/) avoid read replica lag for this check.

For machine access, the operator creates a distinct random bearer token per client installation and stores only its SHA256 hash in D1. The Worker maps that hash to exactly one client profile. Never trust a `client_id` or `paid` value supplied by the requester alone. Store the token in the local OS keychain or a protected environment file outside Git. A future Cloudflare Access layer can add user sign in or service token policies, but is not needed for the pilot's per client authorization.

## Operator SOP

1. **Prepare instructions.** Maintain the master files in a private Fused repository or an encrypted backup outside this public repository. Review and version changes, then upload the approved Markdown bundle to D1 with `services/client-instructions/scripts/operator.mjs`. Older versions remain in D1 for rollback. Never put proprietary content under `public/` or in a client repo. The first candidate at `.build/client-instructions/private/reel-core-v1.md` is ignored by Git; back it up privately.
2. **Onboard a client.** Create a unique unpaid profile with an allowed bundle. The operator command generates one credential and saves it locally in ignored `.build/` with restricted permissions. Give the credential to the client through a secure channel. Put only the bootstrap command and endpoint URL in the client repo. Set `paid = true` only after payment or a manual grant. Confirm a second client cannot fetch the first client's bundle.
3. **Start a reel.** A scripted client entry point must call `services/client-instructions/client/fetch-instructions.mjs` before drafting or rendering. An MCP agent must call `get_reel_instructions` at the start of each reel. Both paths stop on denial or outage and never fall back to a stale local copy. Integrating one of these paths into a specific client's workflow remains part of onboarding. The existing QA and client approval steps remain separate.
4. **Change payment status.** For the first pilot, Nick uses the operator CLI with his authenticated Wrangler account and records actor and reason. `paid = false` makes the next fetch return `403` with a generic access message and no instruction bytes. The client can still open and use work already delivered. Restore `paid = true` only after payment or an explicit manual grant.
5. **Automate later.** Once the manual flow works, connect the actual billing provider. Use verified, idempotent webhooks and an explicit grace period to update the profile. If Stripe is selected, follow its current [subscription webhook guidance](https://docs.stripe.com/billing/subscriptions/webhooks); do not infer payment from a client supplied flag or a checkout redirect.
6. **Audit and support.** Record client ID, bundle version, timestamp, result, and request ID for each fetch, but never the instruction body or credential. Review access denials, missing payments, failed fetches, and unexpected fetch volume. Rotate or disable a compromised credential. Provide a clear renewal route without exposing the bundle.

## Rollout plan

| Stage | Deliverable | Acceptance check |
|---|---|---|
| 1. Inventory | Identify which current reel SOP, prompt, and script files are Fused proprietary versus client owned; choose one small instruction bundle for a pilot. Check whether an advanced file was already delivered in a client repo or Git history. | New client repo contains no copy of that bundle or shared credential. Previously delivered copies are recorded as unretractable. |
| 2. Protected origin | Separate Worker, D1 profiles and bundle versions, unique bearer tokens, operator `paid` control. | Anonymous, wrong client, expired, and `paid = false` requests receive no instruction content. |
| 3. Client loader | Small bootstrap file and supported reel entry script for one actual Mac or Linux client workflow. | Every supported new reel run fetches fresh instructions; outage and denial stop cleanly; prior outputs remain available. |
| 4. Pilot | One consenting client, instruction update, payment pause and restore, credential rotation, and cross client test. | Fetch logs and client behavior match the profile state. Nick reviews the delivered work and support burden. |
| 5. Billing and scale | Connect the chosen payment provider and add webhook reconciliation. Add OAuth sign in only for a client app that requires it. | Repeated and delayed billing events cannot accidentally reactivate or block the wrong client. |

Do not alter `ops/content-scope.json` or current coin history automation to implement this client service. A later change to production rules must follow `docs/SOURCE-OF-TRUTH.md` section 10.

The local and hosted pilot both passed an end to end payment cycle: unpaid fetch `403`, paid fetch `200` with a verified SHA256 digest, and revoked fetch `403`. Both status changes appear in D1's audit table. The MCP path also passed protocol and payment denial tests. The dedicated D1 database and Worker are deployed at `https://fused-client-instructions.luxraycoco.workers.dev`. The hosted `pilot-smoke` profile is unpaid. A real client installation, that client's reel entry command, and billing integration remain to be connected.

## First protected bundle selection

Use a rewritten, client neutral `reel-core` bundle. Its source is `.build/client-instructions/private/reel-core-v1.md` and is intentionally ignored by this public repository. It selects the reusable parts of `video/REEL-SOP.md`, `docs/REEL-ENRICHMENT-SOP.md`, `docs/WHISPER-CAPTIONS-SOP.md`, and `docs/AUDIO-SOURCE-SOP.md`: specific viewer promise, sourced claims, hook and payoff beats, storyboard, cleared media, caption checks, and final delivery QA. It excludes Fused's coin history scope, Nick's voice reference, internal file paths, scheduled jobs, exact model settings, and vendor credentials. This is a new client service instruction set; the old public files remain public in Git history.

The next onboarding decision is the first paying client's identity, payment source, and preferred agent or script. The service supports multiple access types, but each client must be configured and verified separately. Native ChatGPT style connector access needs a separate OAuth flow before claiming compatibility.
