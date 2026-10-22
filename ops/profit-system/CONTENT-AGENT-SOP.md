September 11 efficiency and art update: follow `docs/TOKEN-BUDGET-SOP.md` (repository root) for twice-daily owner checks, Luna routing and daily usage monitoring; follow `docs/EDITORIAL-HERO-SOP.md` for the owner-preferred diagram recipe. User preference is separate from measured fitness promotion. These controls supersede earlier routine review frequencies.

# Codex Master and Local Content Sub-Agent SOP

Current operations authority: `docs/AUTOMATED-PUBLISHING-OPERATIONS.md` (September 7). It supersedes older schedules, duplicate recovery ownership, automatic Git commits, 180–240 second reel targets and silent media truncation. Codex owns routine editorial review and downstream completion. New reel scripts target 110–130 seconds and must fit the 135-second distribution limit without losing the ending.

Version: 1.0
Owner: Codex
Applies to: blog, Reel, and social production

## Operating model

Codex is the master editor and systems owner. It defines the reader promise, evidence boundary, section jobs, Reel focus, and release constraints in `content-plan.json`. Local models are workers. Each worker receives one bounded task and cannot publish, change the plan, add unsupported facts, or approve its own work.

The production rule is:

> Codex plans. Local workers draft. Deterministic code assembles and verifies. Codex resolves exceptions.

## Efficient route from idea to final product

1. Capture one rough idea as a reader question, not a broad category.
2. Codex selects one narrow Reel topic that can provide an immediate useful answer.
3. Codex expands that topic into an eight to twelve section blog plan. Four to six related sections form the Reel source cluster. The remaining sections add context, decisions, examples, risks, and next steps.
4. Validate the plan before any model call:

   ```bash
   npm run content:plan:validate -- --file=public/blog/SLUG/content-plan.json --slug=SLUG
   ```

5. The segmented writer asks one local worker for the opening and one worker operation per section. Each result is saved under `.content-segments/`, so retries do not regenerate accepted work.
6. Deterministic assembly preserves the established article structure: one H1, eight to twelve substantive H2 sections, at least 1,100 words, internal-link stage, metadata, graphics, and existing QA.
7. Reel generation reads only the section IDs selected in the master plan. It still uses the existing 180 to 240 second timing, media, caption, rights, and release gates.
8. Social hooks and captions derive from the verified article and focused Reel, then pass deterministic schema and copy checks.
9. Publication remains controlled by existing registration, deployment, media verification, Buffer readback, and live verification.

Posts without `content-plan.json` use the existing writer and whole-article Reel path. This rollback path remains available until the segmented route proves better across multiple comparable posts.

## Master plan contract

Use [content-plan.example.json](../../public/blog/content-plan.example.json) as the structural reference. Every plan contains:

- exact slug, title, brand, and reader promise;
- eight to twelve uniquely assigned section jobs;
- one question, purpose, two to four required points, and target length per section;
- zero to two exact `research.json` claims assigned to each section through `evidenceClaims`;
- a narrow Reel topic and promise;
- four to six section IDs totaling at least 540 target words for the Reel source cluster.

The plan cannot contain placeholders, unsupported facts, or publication instructions. If research provides at least three sourced facts, the plan must distribute at least three exact claims across the relevant sections. Workers see only the evidence assigned to their section.

## Worker boundaries

Local workers may:

- write one opening or one article section;
- summarize a small evidence cluster;
- propose hooks, captions, CTA variants, and media-query wording;
- classify deterministic QA findings;
- summarize fitness cohorts and propose controlled mutations.

Local workers may not:

- calculate performance scores;
- invent citations, prices, laws, or financial claims;
- select their own section scope;
- change the reader promise or Reel focus;
- approve rights, captions, media, publication, deployment, or SOP changes;
- perform Git, Buffer, or external publishing actions.

Structured advisory workers run through a fail-closed command. Their output is written to a separate file and never edits the authoritative input:

```bash
npm run content:subagent -- --task=qa-triage --input=public/blog/SLUG/qa.json --out=public/blog/SLUG/qa-triage.json
npm run content:subagent -- --task=fitness-mutation --input=ops/profit-system/evolution/fitness-YYYY-MM-DD.json --out=ops/profit-system/evolution/mutation-YYYY-MM-DD.json
npm run content:subagent -- --task=cluster-summary --input=PATH/TO/SMALL-CLUSTER.txt --out=PATH/TO/summary.json
```

The command rejects inputs over 16,000 characters and rejects output that does not match the task schema.

## Model routing

The 2026-08-25 structured leaf benchmark is stored at [2026-08-25.json](./model-benchmarks/2026-08-25.json).

| Work type | Current route | Status |
|---|---|---|
| Master planning, conflicts, repair decisions | Codex | Production |
| Section prose | Gemma 3 4B IT QAT | Production with deterministic QA; segmented route begins in shadow rollout |
| Structured classification and compact JSON | Granite 4.1 3B | Approved for bounded leaf tasks based on the local benchmark |
| Existing nightly research draft | Gemma E2B through LiteRT | Retained while service reliability is monitored |
| Qwen 3 4B | None | Not promoted; failed the current output contract |
| NVIDIA Nemotron 3 Nano 4B | Candidate | Test only after storage, license, memory, and quality review |
| MiniMax M2.5 | None locally | Rejected for this Mac; API-only evaluation would require a separate cost and privacy decision |

Benchmark results:

- Granite 4.1 3B: 100/100, 19.16 seconds.
- Gemma 3 4B IT QAT: 80/100, 54.71 seconds.
- Qwen 3 4B: 10/100, 42.58 seconds.

This microbenchmark measures structured instruction compliance, not long-form prose quality. Granite must still pass shadow article-section tests before replacing Gemma for prose.

Current research supports these constraints. IBM positions its 3B Granite model for low latency local and agentic work under Apache 2.0. Qwen publishes Qwen 3 4B as an Apache 2.0 local model with a 32K native context. NVIDIA offers a 2.8 GB Ollama build of Nemotron 3 Nano 4B. MiniMax M2.5 is approximately 229B parameters, which makes it unsuitable for local deployment on this machine. References: [IBM Granite](https://www.ibm.com/granite/docs/models/granite), [Qwen 3](https://qwenlm.github.io/blog/qwen3/), [Nemotron Ollama tags](https://ollama.com/library/nemotron-3-nano/tags), and [MiniMax M2.5 model card](https://huggingface.co/MiniMaxAI/MiniMax-M2.5).

## ADA feedback loop

For every planned post, retain:

- plan version and section IDs;
- Reel source section IDs and focus;
- model used for each worker segment;
- retries, latency, output word count, and deterministic failures;
- final Buffer post IDs and fitness observations.

At D+3 and D+7, compare planned Reel clusters against the same platform and age bucket. Codex may mutate one variable at a time, such as the Reel focus, hook, CTA, or selected section cluster. A worker model cannot promote itself or its output.

## Rollout

1. Use the segmented route for one silver and one local-business post.
2. Compare quality escapes, total wall time, retries, manual corrections, and Reel fitness against two legacy controls.
3. Keep Gemma for prose and Granite for structured work during the first cycle.
4. Promote the segmented path only after two clean cycles and no regression in article or release QA.
5. Roll back by removing or renaming `content-plan.json`; the existing writer remains unchanged.

## September16 editorial ownership correction

The daily owner must finish the oldest due unapproved article, not stop because approval is absent. Use the compact publishing quickstart, existing draft, primary-source review, real companion inspection, production QA and explicit hashed editorial approval. Local catalog registration and a numeric QA score are not live completion. Record exact live proof before a completion marker. See `docs/PUBLISHING-INCIDENT-2026-09-16.md` for evidence and remaining work. Luna closes evening releases at21:30 before normal Buffer22:00; no extra Buffer polling.

## Current growth experiment

Follow `docs/GROWTH-AUDIT-2026-10-05.md` for the next 24 eligible companion videos. Alternate demonstration-first and control within each vertical, preserve quality gates and opinion mix, and record exact video and post identity. Practical comparisons and checklists are hypotheses supported by observed views, not proven revenue winners. One relevant next step per piece; never route technology viewers to Reserve solely to satisfy CTA rotation. Do not replace existing approved schedules or generate extra volume for the experiment.

## Approved pre-revenue growth objective, October 5

Nick confirms no revenue yet and authorizes the prioritized growth plan. The publishing owner approves the 24-video pilot for the existing production schedule. Use median D+7 views within each platform and vertical to select successful formats, with at least six measured creatives per arm. Do not wait for revenue, lead or conversion evidence. Missing views stay unavailable; X impressions cannot substitute for views. Keep comments, saves and production time as diagnostics and preserve all editorial, rights and release gates. See `ops/engagement/growth-pilot.json`. Approval means ready to execute, not already produced or measured.
