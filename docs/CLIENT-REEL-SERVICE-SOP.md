# Client reel service access: proposed SOP and rollout plan

Status: proposal for Nick's review. This does not change production rules in `docs/SOURCE-OF-TRUTH.md`, the coin history jobs, or the separate business growth automation. No client access control has been implemented by this document.

## Business outcome and service boundary

Fused needs to stop new managed reel generation when a client's service is not entitled, without taking away work already delivered to that client. The approved pricing design in `docs/superpowers/specs/2026-11-02-pricing-realign-design.md` offers Fused hosted delivery or a pipeline on the client's machine and says the client owns the finished work. Preserve both commitments in the client contract and product behavior.

A remote instruction file alone is not access control. A client that has received the repository, instructions, model prompts, render code, or credentials can retain a copy and bypass a later `paid: false` check. Keep the valuable generation logic and service credentials on infrastructure Fused controls. A client repository may contain a thin integration and nonsecret settings, but it must request a new job from the Fused service each time. The service checks entitlement before creating the job and again before any external publishing action. Revocation stops future service work. Published posts, delivered MP4 files, and other client owned artifacts remain available under the agreement.

For a client machine installation, two offers are possible. A thin local agent can upload approved inputs and receive finished artifacts while Fused controls orchestration. A fully local, source delivered pipeline cannot have technically guaranteed revocation after delivery; treat that as a licensed product with contractual terms, not as a remote kill switch. Nick must choose which offer to sell before implementation.

## Target architecture

| Component | Owner and responsibility |
|---|---|
| Client adapter or portal | Accept topic, assets, and approval; show job status and delivered results. No billing authority, provider keys, prompts, or privileged publishing tokens. |
| Fused service API | A separate Cloudflare Worker with authenticated client and operator routes. It validates requests, checks entitlement, applies per client limits, creates jobs, and returns only required status and outputs. Keep it separate from the public `fuseddistribution` site Worker in `src/worker.js`. |
| Entitlement store | D1 tables for clients, service plans, effective access state, billing event IDs, jobs, and audit events. Use the primary database path for authorization reads. Do not use the existing `REELS_KV` or `SPOT_KV` as the source of truth for revocation. |
| Billing bridge | Verified, idempotent payment provider webhooks update the entitlement store. The provider and exact event mapping remain to be selected. An operator can add a time limited manual grant or suspension with a reason and audit record. |
| Generation worker | Fused controlled compute performs research, writing, voice, captions, Remotion rendering, and release QA. The current Chatterbox and Remotion pipeline runs on the Mac; moving heavy rendering into the public Cloudflare Worker is not part of this plan. |
| Private instructions | Keep versioned prompts, policies, and templates in a private Fused repository and deploy them with the service. If live updates become necessary, use a private, versioned store behind the Worker. Never serve raw instructions as public static assets or return them to clients. |
| Outputs | Store and deliver client owned final artifacts using the agreed retention and export process. Record which instruction version, input hashes, and QA result produced each artifact. |

Cloudflare Workers can bind to [D1](https://developers.cloudflare.com/d1/worker-api/) and use [secrets](https://developers.cloudflare.com/workers/configuration/secrets/) for credentials. [D1 read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/) is opt in; ordinary queries go to the primary, which is the intended entitlement read path. Authenticated API responses must use `Cache-Control: no-store`; do not configure an edge cache rule that bypasses the Worker for these routes. See [Workers caching](https://developers.cloudflare.com/workers/cache/configuration/).

## Access and billing SOP

1. **Onboard.** Create a client identity and plan record. Issue a distinct client credential through a secure channel. Store only its hash or verifier, scope it to that client, and support rotation and revocation. Never put a shared secret in a public site or a client repository. Define monthly volume and approved distribution channels in the plan.
2. **Confirm payment state.** Accept billing changes only from a verified provider webhook or an audited operator action. Verify webhook signatures against a Cloudflare secret. Store provider event IDs and process repeats safely. Map provider states into `active`, `grace`, `suspended`, or `canceled`; a raw `paid: false` boolean is too ambiguous for failed payments, retries, and annual contracts. Nick sets the grace period and notice policy before launch.
3. **Authorize every job.** Authenticate the caller, validate the client and request, read current entitlement, then enforce plan limits. Deny new work for suspended or canceled clients with a clear response and a billing contact path. A client supplied `paid` field is never authoritative. Apply rate and volume limits per client.
4. **Run the approved pipeline.** Bind each job to a client ID, idempotency key, instruction version, and input hashes. Recheck entitlement when a queued job begins. Continue the existing source, identity, rights, voice, caption, and release QA gates relevant to that client's work. Do not expose Fused's full prompts or credentials in job output or logs.
5. **Check before publishing.** Recheck entitlement and client approval before a social or website publish action. On suspension, stop queued work and block new publishing. For a render already in progress, finish only if needed to preserve a safe checkpoint; do not publish it. The operator reviews whether a paid period or written agreement requires delivery of that completed artifact.
6. **Recover and reconcile.** If billing, D1, authentication, or Fused compute is unavailable, do not start new jobs or publish. Preserve job state and inputs, show a service unavailable state, and retry after recovery. Reconcile provider subscriptions against local entitlement daily and alert on mismatches. Never restore access from a stale cached flag.
7. **Offboard.** Revoke client credentials and scheduled jobs, export contracted client owned artifacts and data, then apply the agreed retention policy. Keep minimum billing and security audit records under the applicable agreement. Do not remove public content or client files merely because access ended.

## Security and operating checks

- Separate client and operator authentication. Restrict operator actions, require a reason for overrides, and log who changed access, when, and why. Give manual grants an expiry.
- Store payment webhook and provider API secrets in Cloudflare Worker secrets, not `wrangler.jsonc`, client code, prompts, or logs. Rotate after suspected exposure.
- Validate upload type, size, ownership, and rights. Keep one client's assets, jobs, and credentials inaccessible to another. Return generic external errors, while recording request IDs and useful internal diagnostics.
- Make job creation idempotent. Never double charge volume or publish twice when a client retries or a webhook arrives again.
- Alert on denied access spikes, webhook failures, entitlement mismatches, stalled jobs, and unauthorized publish attempts. Review an audit trail before changing a client's access manually.
- Test active, grace, suspended, canceled, expired manual grant, forged webhook, duplicate webhook, cross client access, stale credential, outage, and in flight suspension cases before a pilot.

## Rollout plan and acceptance gates

| Stage | Work | Exit evidence |
|---|---|---|
| 1. Product decisions | Choose Fused hosted versus thin local agent for the first offer; identify billing provider, payment grace period, volume rules, output ownership, retention, and suspension notice. Review the pricing page promise against the service agreement. | Nick approves one offer and its access policy. |
| 2. Boundary inventory | Trace all current prompt, script, voice, rendering, QA, upload, and publishing dependencies. Mark what clients would receive and what must stay on Fused infrastructure. Confirm rights for client supplied voice and media. | Data flow and threat review show no privileged code or credentials in client deliverables. |
| 3. Service foundation | Build a separate private Worker project, D1 schema and migrations, client authentication, webhook verifier, entitlement API, audit trail, and minimal operator tooling. Keep a local test environment separate from production data. | Tests prove immediate denial of new work after suspension and no cross client data access. |
| 4. Generation integration | Put a thin client adapter in the client installation or portal. Connect the Fused controlled generation worker to the service job API. Keep existing release gates and add idempotent checkpoints. | One test client can submit, approve, render, pass QA, and receive a reel without seeing service instructions. |
| 5. Pilot and cutover | Run one consenting pilot client. Compare billing state, jobs, costs, and outputs daily. Simulate payment failure, webhook outage, revocation, renewal, and export. Migrate clients individually and rotate any credentials previously distributed. | Nick signs off on the pilot and rollback rehearsal before general availability. |

Rollback means disabling new client job intake and keeping existing client outputs accessible while restoring the previous managed workflow for already entitled clients. Do not switch the current coin history or business growth automations to this service as part of the pilot. Any later change to their production scope or rules must follow `docs/SOURCE-OF-TRUTH.md` section 10.

## Decisions required before build

1. Is the first paid offer Fused hosted generation, or a thin client machine agent that calls Fused for generation?
2. Which billing system is authoritative, and what exact event or date ends access after a failed payment?
3. What does the contract promise on cancellation: previously approved drafts, in progress renders, published content, exports, and retention?
4. Will Fused publish to client channels, or only deliver an approved MP4 and copy for the client to publish?
