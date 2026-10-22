# Local advisory workflow

Effective September 24, 2026. This procedure applies to bounded owner assistance. It does not replace the existing publisher, writer, renderer or release review.

## Routing

Use deterministic scripts first for counts, dates, locks, file presence, known QA error codes, audio revocations, and publication receipts. Do not ask an LLM to repeat those checks. Use the existing Granite 4.1 3B helper only when grouping unfamiliar findings or summarizing a small evidence set will reduce owner work. Keep Gemma for source-grounded prose. Its output still requires editorial review; one focused revision attempt precedes escalation of the exact unresolved issue.

Liquid and Qwen3.5 have not earned new responsibilities. No local model can approve factual claims, resolve music rights, record editorial approval, publish, or schedule posts. Missing evidence means unknown, not passed or disproven.

## Invocation

Run `node scripts/publishing-owner-brief.mjs` first. If a producer is active or its ownership is unknown, defer optional advisory work. Call the helper before acquiring the public-tree publisher lock. Do not run parallel model jobs or inference beside rendering.

For one job:

```bash
node scripts/local-content-subagent.mjs --task=qa-triage --input=.workflow-state/local-advisory/findings.json --out=.workflow-state/local-advisory/triage.json
```

Supported tasks are `qa-triage`, `cluster-summary`, and `fitness-mutation`. Fitness proposals remain hypotheses and cannot change the schedule or select a winner.

For 2-4 related jobs, write a JSON array of objects with `task`, `input`, and `out` fields, then run:

```bash
node scripts/local-content-subagent.mjs --batch=.workflow-state/local-advisory/jobs.json
```

Paths inside the manifest resolve against the repository. Each output must be a distinct JSON file under `.workflow-state/local-advisory/`. Inputs must be current, compact evidence, at most 6,000 characters. Include relevant artifact hashes, observation times, and unresolved findings in the input. The helper cannot discover changes to external evidence that the caller omitted.

## Runtime and cache

The helper has one owner lock and defers to live or indeterminate production locks. Uncached jobs use the installed Granite model with JSON output, separate policy and data messages, a 4,096-token context, and at most 500 generated tokens. Model residency is 30 seconds between sequential jobs, followed by an explicit unload even on failure. The default per-request timeout is 45 seconds. There are no automatic model retries or cloud fallbacks.

Successful advisory results are cached for at most 24 hours. Reuse requires identical task/input contents, model name and installed digest, prompt/schema version, and the contents of TOKEN-BUDGET-SOP.md, PUBLISHING-OWNER-QUICKSTART.md, CONTENT-AGENT-SOP.md and this procedure. The cached result is integrity checked and validated again before reuse. Metadata records source hash, SOP hash, original generation time, current check time and cache status. A cache hit performs no inference and does not unload another user's model.

Any change to the model policy, schema or validation semantics requires a promptVersion bump. Inputs and outputs must remain outside the publication tree. Exact outer JSON code fences may be removed; surrounding prose, extra approval keys, invalid field types, truncation and malformed JSON fail validation.

## Failure and review

A nonzero exit or `latest.json` state other than `complete` is not usable completion. Earlier files can remain after a failed attempt; never treat their existence as a fresh result. Read `_meta` and compare it with the current input. Unload failures are also failed runs. Preserve the error evidence, defer or escalate once, and do not poll an unchanged failure.

The owner checks whether the recommendation is grounded in the supplied evidence before acting. An advisory must never write a QA approval, complete marker, deployment manifest, or Buffer instruction directly. Unchanged known blockers need no model call at all.

## Today's ownership

At September 24 preparation, all four queued articles already have live proof and intact editorial hashes. The 09:00 local publisher retains verification/recovery ownership and must preserve reviewed content. The 09:30 scheduled owner reads the updated brief and changed evidence only. The existing 11:00 renderer owns the four companion reels; actual voice, music rights, duration, frames, captions, derivatives and hosting remain separate gates. Do not infer reel completion from article publication.

No new scheduled Codex wakeups are introduced. Compare actual avoided cloud invocations and accepted repairs before changing any cadence. The earlier benchmark's faster local runtime is not a measured weekly quota reduction.
