# Local SOP model evaluation, September 24, 2026

## Decision

Keep the existing Gemma writer and Granite advisory helper. Do not replace them with Liquid or Qwen3.5 on these results. Improve task boundaries and validation before adding models. No model in this evaluation earned factual, rights, or publishing approval authority.

Completed 166 local responses across 21 distinct incident-inspired cases, repeated trials, and prompt/runtime variants. No production model assignment, schedule, publishing gate, queue, or content was changed. Qwen3.5 2B was downloaded for testing and remains installed, but all Ollama models were unloaded at the end (`/api/ps` returned an empty list). Existing LiteRT service was left intact.

## Comparable first-pass results

Each row below uses the same 15 cases, once. Repeats are not independent new examples. These are contract/fixture scores, not publication-quality scores.

| Model and actual runtime | Strict pass | After exact JSON fence removal | Assessment |
| --- | --- | --- | --- |
| Granite 4.1 3B, Ollama Q4_K_M | 14/15 | 14/15 | Best structured candidate; writing failed |
| Gemma E2B GPU, current LiteRT service | 5/15 | 13/15 | Most strict failures were wrappers; two routing errors remain |
| Qwen3.5 2B, Ollama Q8_0 (reported 2.3B) | 11/15 | 11/15 | Routing errors, oversized writing, slower and memory concern |
| Liquid LFM2.5 1.2B, installed Q4_K_M artifact | 6/15 | 6/15 | Fast but poor routing and a missed contradiction |

Granite, Gemma, and Liquid each completed two baseline passes. Qwen completed one pass plus five cases of the second before an operator stop. Its partial records are retained, but are excluded from the matched first-pass table.

The 15 baseline cases include eight incident routes; supported, contradicted, missing and adversarial evidence; exact extraction with missing metadata; a 180-220 word section; and a bounded reel hook. Six fresh cases subsequently tested Granite on caption repair, unknown licensing, receipt existence, unchanged completed work, and two evidence distinctions.

## Improvements demonstrated

### Short residency within one job

On identical six-case holdout inputs repeated twice, Granite took 27.14 seconds with unload-after-each-request, versus 14.44 seconds with 30-second residency and explicit final unload. That is 46.8 percent less total elapsed request time in this comparison. Median request time fell from 2.33 to 1.11 seconds. Both configurations passed 10/12 responses.

This supports batching a small number of advisory checks in one local job. It does not support leaving every model loaded, running multiple models simultaneously, or claiming an equivalent ChatGPT quota saving. Run order, filesystem cache and other desktop processes were not controlled; validate the gain during a limited operational trial.

The existing `scripts/local-content-subagent.mjs` already defaults to Granite but uses `keep_alive: 0`. A bounded residency option plus reliable final unload is a concrete next implementation candidate. Its three existing task contracts should receive direct integration tests before deployment; this evaluation used narrower fixtures, not those exact contracts.

### Formatting repair belongs in code

Removing only an exact outer JSON code fence recovered 16 of Gemma's 30 baseline responses without another model request. Wrong decisions still failed validation. The existing local helper already extracts JSON objects, so this is evidence to preserve and tighten that behavior, not a newly demonstrated production saving.

Prefer exact wrapper normalization plus schema checks over broad extraction from arbitrary surrounding prose. Never interpret malformed output as a successful check or let a returned `publish` field control publication.

### Typed instructions help formatting, not reasoning

Liquid improved from 12/30 to 16/30 when routing policy was separated into a system message, JSON output mode was requested, and integer/null requirements were explicit. Extraction and hook formatting improved. Routing failures and the contradicted-evidence mistake remained. The variant changed multiple factors together; the improvement cannot be attributed to any one factor.

Do not spend repeated retries trying to turn this installed Liquid configuration into a reliable SOP supervisor. It may still be useful for low-stakes suggestions, but the tested alternatives offer stronger reasons for use.

### Keep writing separate from structured decisions

Granite's baseline section was 238 words and contained em dashes. A paragraph-budget prompt produced 174 words and still used an em dash: both attempts failed. Its revised prose also said a map “merely confirms functionality,” conflicting with the supplied distinction between a plan and a tested outcome.

Gemma's section passed structural checks, but manual inspection found repetition and leaked writing instructions such as avoiding invented statistics in the reader-facing prose. Passing the automated contract is therefore insufficient for publication.

Continue focused section repair with source notes and deterministic length checks. Preserve editorial review. Do not regenerate an entire article because one section fails, and do not lower the minimum length to improve benchmark scores.

## Failure findings that limit adoption

- Liquid routed most incidents to `local_script`, including tasks requiring prose or human review. An embedded instruction also changed its route to `no_action`.
- Gemma confused a count-only request with human review and followed the misleading incident's suggested `no_action` route. Fence removal did not fix these errors.
- Qwen routed both a short-section repair and unresolved license evidence to scripts, and followed the injected route. The downloaded artifact is Q8_0, unlike Granite's Q4_K_M; this is an installed-configuration comparison, not a controlled architecture ranking.
- Granite passed all initial routing/evidence fixtures but failed a fresh distinction twice: an empty test-result field means a passed test is unproven, not necessarily disproven. The error persisted with warm residency. Keep factual conclusions advisory.
- No tested model should determine music licensing or YouTube clearance. This was a text-only evaluation; no audio or visual inspection capability was tested.

## Memory and timing limits

Hardware: Apple A18 Pro, 8 GB shared memory. Existing desktop services remained active. Tests used one inference request at a time; they did not reserve the entire machine. The baseline Ollama requests unloaded each time, while LiteRT used the existing service, so raw latency across backends includes different startup behavior.

System swap was already about 4.3 GB before the first test. During Qwen it increased from 4526.12 MiB to 6129.50 MiB at the last recorded sample. Qwen was stopped and unloaded; the observation is not proof it caused all of the increase. A future Q4 test would be a separate configuration, not a reason to rerun this one now.

The reusable runner now stops after an execution error or more than 1024 MiB of observed swap growth. Memory samples are process RSS and global swap, not true peak unified/GPU memory. Liquid's original baseline has before/after samples only. No performance claim should treat the sample values as precise model memory requirements.

## Recommended SOP trial

1. Continue deterministic scripts for counts, dates, receipt checks, hashes, locks and known error codes. Do not insert an LLM into those decisions.
2. Use the existing Granite helper for small advisory summaries and grouping unfamiliar QA findings. Return validated structured data, with no publishing side effects.
3. Test a 30-second residency option inside an explicitly bounded job, then unload. Preserve local job ownership and avoid overlap with rendering or research.
4. Keep Gemma for focused prose work with real source excerpts. Permit at most one targeted retry before escalating the precise failure.
5. Cache advisory results only when artifact hash, model digest, prompt version and relevant SOP version match. This is proposed, not measured or implemented here.
6. Measure avoided cloud invocations, accepted repairs, retries and missed findings on actual jobs before changing any scheduled Codex task. No weekly quota reduction has been measured by this study.

Do not add an embedding model yet. First measure whether document retrieval is a meaningful part of the remaining cost; this test did not evaluate retrieval or embeddings.

## Reproduction and artifacts

The isolated reports contain prompts, expected labels, raw output, per-check results, latency, available token counts, and memory observations. Later runs also preserve exact requests and the harness SHA256. The harness gained sampling and stop guards during the study; original reports were preserved rather than relabeled as if they had those features.

- Runner: `scripts/evaluate-local-sop-models.mjs`
- Summarizer: `scripts/summarize-local-sop-evaluation.mjs`
- Validator tests: `tests/local-sop-evaluation.test.mjs` (7 passing)
- Reports: `ops/profit-system/model-benchmarks/sop-evaluation-2026-09-24/`
- Summary: `ops/profit-system/model-benchmarks/sop-evaluation-2026-09-24/summary.json`

Example, using a new output filename to preserve previous evidence:

```bash
SOP_EVAL_SET=holdout SOP_EVAL_KEEP_ALIVE=30 node scripts/evaluate-local-sop-models.mjs granite4.1:3b /tmp/granite-holdout-new.json
node --test tests/local-sop-evaluation.test.mjs
```

These are small development tests, including six cases not used for the earlier prompt changes. They are not a statistically representative production evaluation. Repeated temperature-zero outputs measure repeatability rather than broad coverage. No model was promoted, and no commit or push was made.
