# Private client reel service SOP

Owner: Nick. This service is separate from Fused's coin history and business growth publishing jobs. No real client is onboarded. The private service replaces the earlier downloadable instruction pilot.

## Service boundary

Customers call `create_reel_plan` through MCP or `POST /v1/reels/plan` through HTTPS. Fused checks their paid status, generates a draft, applies its private rules on the server, and returns the client's script and storyboard. Setting `paid = false` blocks future operations and also blocks delivery when access ends during a running generation. Existing client assets and delivered work remain usable.

The old Markdown route always returns `410`. The old `get_reel_instructions` tool is absent. No MCP resource, prompt, file reader, debug route, or model sampling channel can retrieve private files. The source playbook is never sent to the customer's machine. Removing file delivery is the enforceable protection; labels such as read only cannot prevent a recipient saving text it has already received.

Version preview URLs are explicitly disabled. Cloudflare documents that [disabling these URLs disables routing to old and aliased version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/). Never roll back to the earlier raw-download implementation.

## Private rules and model isolation

The private policy is a strict JSON document stored in D1's `private_policies` table. Its canonical source is ignored at `.private/client-playbooks/2026-11-04-onboarding-v2/reel-core.json`. Server code enforces hook length, caption length, beat structure, narration duration, closing length, and valid references to supplied facts. The Markdown playbooks are versioned in the owner-only `owner_playbooks` archive. No Worker route reads them or sends them to a model. The [client onboarding SOP](CLIENT-ONBOARDING-SOP.md) records the protected source map and the client import process.

The AI receives only a generic public writing prompt, a public output schema, and the client's brief. It never receives the private policy or private validation thresholds. The server releases an allowlisted draft only after validating it and rechecking current access. This avoids depending on an AI's promise to keep its system prompt secret.

This is the first compiled set of procedures, not an automatic execution engine for all prose in a Markdown file. Additional advanced procedures must be implemented as private data plus controlled server operations, with explicit input/output contracts. Never add an arbitrary "chat with the playbook" tool or pass the full playbook into model context. A client can retain its results and may infer some behavior from them; no service can promise that a useful output reveals nothing about how it was made.

## Research behind the design

| Evidence | What it establishes |
|---|---|
| [Apify publishing](https://docs.apify.com/actors/publishing/publish), [monetization](https://docs.apify.com/actors/monetize), and [creator academy](https://docs.apify.com/academy/build-and-publish/why) | Apify documents paid hosted automations with source hidden by default, and identifies a freelance creator, Tugkan/epctex. Customers run an operation and receive results while the source remains with its provider. This is a useful architecture precedent; Fused remains on Cloudflare. |
| [Dialer founder's account](https://blog.remote-mcp.com/p/from-hackathon-to-revenue-how-i-built) | A solo developer describes a paid remote MCP tool with authentication and Stripe metering. This is a founder report, not independent revenue verification. |
| [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) | Tool result content reaches the client. A read-only tool annotation describes side effects, not a prohibition on copying. |
| [OWASP prompt leakage guidance](https://genai.owasp.org/llmrisk/llm072025-system-prompt-leakage/) | Authorization and security boundaries belong in server code. System prompts should not be treated as a reliable secret store. |
| [Cloudflare JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/) | Workers AI can produce structured drafts. The server must still validate outputs and handle model errors. |

These examples support selling access to hosted capabilities. They do not establish that freelancers can safely deliver a secret prompt to a client and prohibit saving it. Reach MCP explicitly ships playbooks to its clients, so it is not evidence of playbook confidentiality.

## Owner workflow

1. Maintain proprietary sources outside this public repository and back them up privately. Translate executable requirements into supported private policy fields or reviewed server code. Do not put private values, prose, or real test fixtures in the public code repository.
2. Validate and version the policy, then run `operator.mjs put-policy <name> <version> <private-json-file>`. Uploading raw instruction bundles is retired. Versions remain immutable; rollback means uploading a previous policy as a new version.
3. Create a separate unpaid client profile and securely deliver its token. Store only its hash in D1. Activate with `set-paid <id> true <actor> <reason>` after payment or an explicit grant. The current service uses manual paid status; there is no billing integration yet.
4. Install the MCP configuration or HTTPS client from `services/client-instructions/README.md`. Each run submits a new brief and receives a client-owned draft. Verify sources, voice permission, asset rights, and final rendered media within the client's own workflow. This service plans reels; it does not render or publish them.
5. Set `paid = false` when service access ends. Do not delete customer files or disable their website. Rotate a compromised token with `rotate-token <id>`; the old token fails immediately after the D1 update. A single token can be shared, so separate installations should receive separate profiles until per-user OAuth is added.
6. Review structured request logs and daily usage. Current quota is 20 generation attempts per client per UTC day, reserved atomically; failures count and each run allows at most two model calls. Do not log client briefs, generated text, credentials, or policy contents. D1 stores policy, client entitlement, usage counts, and payment audit, not client reel assets.

## Deployment and acceptance

Apply all migrations, including `0002_private_service.sql` and `0003_owner_playbooks.sql`, before owner setup. Upload the private policy through the owner CLI. Use the dedicated Worker and database, never the public site Worker. Model inference uses the Cloudflare Workers AI binding and may incur usage charges under the existing account plan.

Before granting real client access, verify:

- Anonymous and inactive calls cannot generate work; expiry and storage failures fail closed.
- A paid caller cannot download the old Markdown route or call the removed tool.
- MCP discovery contains only the public operation, with no private rules or values.
- Private policy content is absent from the complete model request, successful client response, and all errors.
- Revocation during generation prevents result delivery.
- Extra fields cannot select another policy, model, or file; oversized requests are refused.
- Concurrent requests cannot exceed the daily D1 quota.
- Client outputs remain client owned and available after revocation.

The automated suite covers these boundaries with synthetic policy values. Hosted verification must also exercise a real AI call and a paid-to-unpaid transition. Leave `pilot-smoke` unpaid afterward.

## Remaining onboarding work

Select the first real client and connect its rendering workflow. Configure its billing source when known; for Stripe use verified, idempotent events following [subscription webhook guidance](https://docs.stripe.com/billing/subscriptions/webhooks). Add OAuth for apps that cannot send a bearer header. Continue compiling additional proprietary procedures into server operations; never restore raw playbook delivery to gain compatibility.
