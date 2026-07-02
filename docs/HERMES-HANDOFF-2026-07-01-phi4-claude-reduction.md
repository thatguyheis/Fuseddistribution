# Hermes Handoff - Phi-4 Local Pipeline Migration

Date: 2026-07-01
Owner: Nick Hughes
Workflow owner: Robert Paulson via Codex
Target agent: Hermes

## Purpose

Move the Fused Distribution content workflow away from Claude as the default execution path because Claude API/session limits are blocking daily throughput. Use Hermes with a local long-context model as the primary agent path, while keeping deterministic gates and treating all model output as untrusted until validation passes.

This handoff is written for Hermes. Read it before changing scripts or SOP files.

## Current State

Hermes is installed and currently configured to use Ollama's OpenAI-compatible endpoint:

```yaml
model:
  default: phi4-mini:latest
  provider: custom
  base_url: http://localhost:11434/v1
  context_length: 128000
  max_tokens: 1024
```

Validation already completed:

```bash
hermes --ignore-rules -z 'Reply with exactly OK.'
```

Expected result:

```text
OK.
```

The previous LiteRT Gemma endpoint on `http://localhost:9379/v1` is healthy for small direct calls, but the loaded `gemma-e2b,gpu` model only supports a 4096-token context. Hermes Agent requires at least 64000 tokens. Do not route full Hermes sessions to that 4K LiteRT model.

Available local Ollama models:

```text
phi4-mini:latest    2.5 GB
qwen2.5:3b          1.9 GB
qwen2.5:1.5b        986 MB
gemma3:1b           815 MB
gemma3:270m         291 MB
```

Best current default: `phi4-mini:latest`. It is already installed, fits the 8 GB MacBook better than larger models, and advertises a 128K context window.

Best next Gemma test: `gemma3:4b` via Ollama. It is listed as roughly 3.3 GB with 128K context. Test it before replacing Phi-4-mini.

## Existing SOPs To Preserve

Read these before touching workflow logic:

- `docs/WORKFLOW-OWNERSHIP.md`
- `public/blog/BLOG-SOP.md`
- `video/REEL-SOP.md`
- `SOCIAL-SOP.md`
- `public/blog/DECOUPLE-BLUEPRINT.md`

Do not weaken these production rules:

- Agent output is draft input, not truth.
- Deterministic validators decide publish readiness.
- QA-failed posts are not registered in `posts.json`.
- Reels do not render until script validation passes.
- No credentials in generated files, logs, launchd plists, or prompts.
- Render jobs must respect the global render lock.
- Chatterbox with Nick's local voice reference remains the production voice.

## Business Goal

Increase daily content throughput and reduce Claude quota dependency without increasing publish risk. Success means:

- Claude limits no longer strand posts with only `gemma_draft.md`.
- Daily blog posts still produce complete artifacts.
- Social and reel assets still pass existing validators.
- Claude becomes optional polish or escalation, not a required happy path.
- Local model failures produce blocked/deferred status, not partial public output.

## Architecture Direction

Use Hermes/Phi-4-mini as the primary local reasoning and writing worker.

Use scripts for deterministic work.

Use Claude only for stages that still need a stronger external model and only when quota is available.

The existing staged pipeline is the right direction. Keep the file-to-file contract from `public/blog/DECOUPLE-BLUEPRINT.md`.

Current stage map with recommended engines:

| Stage | Current engine | Recommended next engine | Notes |
|---|---|---|---|
| T0 topic-pick | Gemma | Hermes/Phi-4-mini | Good candidate. Keep output as queue JSON. |
| T1 research | Claude + web | Hermes with web tools, or Claude fallback | Phi-4-mini alone cannot browse. Hermes must use web tools or pre-fetched sources. |
| T2 draft | Gemma | Hermes/Phi-4-mini | Strong upgrade due to 128K context and better instruction following. |
| T3 style-clean | Gemma | Hermes/Phi-4-mini | High-value replacement. Keep `lint-draft.mjs` as gate. |
| T4 lint | Script | Script | No LLM. Do not change. |
| T5 write/polish | Claude | Hermes/Phi-4-mini first, Claude fallback | Biggest quota win. Must loop through `lint-draft.mjs`. |
| T6 hooks | Gemma | Hermes/Phi-4-mini or script-assisted | Good replacement. JSON must be assembled or validated by script. |
| T7 html-build | Script | Script | No LLM. Do not change. |
| T8 svg-build | Script | Script | Keep deterministic. Phi-4 should not place SVG coordinates. |
| T9 reel-data/script | Script plus model text | Hermes/Phi-4-mini for text, validators for truth | Must pass `parse-script` and `validate-reel`. |
| T10 social | Gemma | Hermes/Phi-4-mini | Good replacement. Keep JSON assembly and X length gate. |
| T11 assets | Script | Script | No LLM. Do not change. |
| T12 qa-gate | Claude | Hermes/Phi-4-mini advisory plus deterministic gates, Claude optional | Do not allow local LLM judgment alone to publish high-risk posts. |
| T13 publish | Script | Script | No LLM. Do not change. |

## Immediate SOP Improvements

Make these SOP updates first. They reduce confusion and keep future agents from assuming Claude is required.

1. In `docs/WORKFLOW-OWNERSHIP.md`, update the operating model:
   - Hermes/Phi-4-mini is the primary local draft, polish, hooks, reel, and social worker.
   - Claude is an optional external QA/research escalation when quota is available.
   - Gemma LiteRT is a leaf helper for small prompts only, not a Hermes session backend.

2. In `SOCIAL-SOP.md`, change "daily Claude pipeline run" to "daily staged pipeline run".
   - Captions should be described as written by the active local model and validated by script.
   - Keep the rule that captions must follow blog writing rules.

3. In `video/REEL-SOP.md`, update references that say Claude must produce or review scripts.
   - The required role is "agent-generated script audit", not "Claude-generated script audit".
   - The audit can be done by Codex or Hermes, but render still requires deterministic validation and visual QA.

4. In `public/blog/DECOUPLE-BLUEPRINT.md`, update stale model notes:
   - Hermes default is currently `phi4-mini:latest` through Ollama.
   - The LiteRT `gemma-e2b,gpu` endpoint is 4K and should not be used as the Hermes backend.
   - `gemma3:4b` is the next Gemma candidate to benchmark.

5. Add a small model-routing section to `BLOG-SOP.md`:
   - "Use Hermes/Phi-4-mini for draft, clean, hooks, reel, and social text."
   - "Use Claude only for quota-available research or final editorial escalation."
   - "Never skip `lint-draft.mjs`, SVG entity checks, reel validation, or secret checks."

## Script Improvements

The current scripts still hardcode `GEMMA="$HOME/bin/gemma.sh"` in several stages. Replace that with a generic local model helper.

Recommended low-risk change:

```bash
LOCAL_LLM="${LOCAL_LLM:-$HOME/bin/hermes-local.sh}"
```

Then replace calls to `$GEMMA` with `$LOCAL_LLM`.

Create `~/bin/hermes-local.sh` outside the repo as the local text helper. It should call Hermes or Ollama with `phi4-mini:latest`, enforce `max_tokens`, and fail nonzero on empty output. Keep the interface compatible with `gemma.sh`:

```bash
echo "prompt" | hermes-local.sh
hermes-local.sh "prompt"
```

Do not point `gemma.sh` itself at Hermes unless every caller is checked. Safer path: introduce `LOCAL_LLM` and migrate stage scripts one by one.

Candidate scripts to update first:

- `public/blog/scripts/build-hooks.sh`
- `public/blog/scripts/build-social.sh`
- `public/blog/scripts/build-post.sh` meta description and alt text calls

Candidate scripts to update second:

- `public/blog/scripts/write-article.sh`
- `public/blog/scripts/polish-draft.sh`
- `public/blog/scripts/research.sh`
- `public/blog/scripts/qa-gate.sh`

For the second group, preserve Claude fallback until Hermes/Phi-4-mini passes several real posts.

## Recommended Migration Plan

### Phase 1 - Route Low-Risk Leaf Stages To Phi-4

Replace Gemma leaf calls in hooks, social, meta description, and alt text with `LOCAL_LLM`.

Run on one existing draft slug only. Verify:

```bash
node public/blog/scripts/lint-draft.mjs public/blog/<slug>/verified.md --out public/blog/<slug>/lint.json
node public/blog/scripts/generate-sitemap.mjs
grep -En "&[a-zA-Z]+;" public/blog/<slug>/hero.svg public/blog/<slug>/photo-post.svg
```

Expected:

- Lint passes or reports actionable style violations.
- Social JSON is valid.
- X copy is 280 characters or fewer.
- SVG entity check returns zero matches.

### Phase 2 - Replace Claude Polish With Hermes First

Create a new script or mode:

```bash
public/blog/scripts/polish-draft-hermes.sh
```

It should:

1. Read only `gemma_draft.md` or `clean.md`.
2. Read `research.json` if present.
3. Apply the existing hard writing rules from `polish-draft.sh`.
4. Write `verified.md`.
5. Run `lint-draft.mjs`.
6. Loop at most two times to fix violations.
7. Leave `[VERIFY]` in place if a claim cannot be sourced.

Keep Claude fallback:

```text
Hermes polish fails lint twice -> try Claude if quota available -> otherwise defer.
```

### Phase 3 - Replace Claude QA With Split Gates

Do not trust Phi-4-mini as the only final QA gate. Instead split QA into:

- deterministic blockers: leftover `[SLOT]`, `[VERIFY]`, em dash, missing meta/schema, missing files, invalid social JSON.
- Hermes advisory review: writing score and suggested fixes.
- Claude optional escalation: only if deterministic checks pass but Hermes flags content quality below threshold.

This reduces Claude use while keeping publish risk low.

### Phase 4 - Replace Research Carefully

Research is the hardest Claude replacement because it needs current sources.

Safe patterns:

- Hermes uses web tools and writes `research.json`.
- Or a script fetches sources first, then Phi-4-mini summarizes them into `research.json`.
- Do not let Phi-4-mini invent stats from memory.

For silver posts, keep the live spot price fetch in `research.sh`. Current spot examples must still use the site API and include the date.

Research output must keep this schema:

```json
{
  "slug": "",
  "keyword": "",
  "angle": "",
  "secondary_kw": [],
  "stats": [
    {
      "claim": "",
      "value": "",
      "source_url": "",
      "source_name": ""
    }
  ]
}
```

### Phase 5 - Benchmark Gemma 3 4B Against Phi-4

Test `gemma3:4b` only after the Phi-4 path is stable.

Benchmark tasks:

1. Style clean task using known banned phrases.
2. Hooks JSON task.
3. Social caption task.
4. Reel script task from one known `verified.md`.
5. Speed and memory during cold and warm runs.

Score each model on:

- validator pass rate
- JSON validity
- banned phrase compliance
- useful specificity
- peak memory and swap
- total wall time per post

Do not choose a model only because it is "Gemma" or newer. Choose the one that produces more valid artifacts per hour on this MacBook.

## Hermes Execution Prompt

Use this prompt to start the migration in Hermes:

```text
Read docs/HERMES-HANDOFF-2026-07-01-phi4-claude-reduction.md, docs/WORKFLOW-OWNERSHIP.md, public/blog/BLOG-SOP.md, video/REEL-SOP.md, SOCIAL-SOP.md, and public/blog/DECOUPLE-BLUEPRINT.md.

Goal: reduce Claude dependency in the Fused Distribution daily content workflow by routing local draft, polish, hooks, reel, and social stages through Hermes on phi4-mini while preserving all deterministic gates.

First task: update the SOP references so they no longer describe Claude as the default daily pipeline. Do not change publish gates. Then propose the smallest script change to introduce LOCAL_LLM without breaking the existing gemma.sh fallback.

Do not publish, deploy, push, delete files, or run a live production blog build. Use one existing local slug for dry-run validation only.
```

## Risks And Guardrails

Risk: Phi-4-mini may produce plausible but unsourced facts.
Guardrail: Research claims must come from `research.json` or be tagged `[VERIFY]`.

Risk: Local model output may be more generic than Claude.
Guardrail: `lint-draft.mjs`, banned phrase checks, and manual QA remain required until quality is proven.

Risk: Long 128K context encourages reintroducing monolithic prompts.
Guardrail: Keep the staged file-to-file pipeline. Do not put SOP, template, all artifacts, and all tools into one call again.

Risk: Hermes has tool overhead.
Guardrail: Use direct helper calls for leaf text stages where tool use is unnecessary. Use full Hermes tools only when the stage actually needs files, shell, or web.

Risk: Ollama context settings may advertise 128K but run slowly at high context on 8 GB RAM.
Guardrail: Keep prompts scoped by stage. Do not rely on full 128K except where needed.

## Definition Of Done

The migration is successful when:

- `docs/WORKFLOW-OWNERSHIP.md`, `SOCIAL-SOP.md`, `video/REEL-SOP.md`, and `public/blog/DECOUPLE-BLUEPRINT.md` reflect Hermes/Phi-4 as the local default path.
- `build-hooks.sh`, `build-social.sh`, and build-post meta text calls can use `LOCAL_LLM`.
- At least one local slug passes hooks, social, SVG entity, lint, and sitemap checks using Phi-4 output.
- Claude is no longer required for low-risk leaf stages.
- Research and final QA still have safe fallbacks and do not publish unsourced or QA-failed content.

## Do Not Do

- Do not route Hermes back to the 4K LiteRT Gemma endpoint for full agent sessions.
- Do not remove deterministic validation because Phi-4 has a larger context.
- Do not let local model research invent statistics.
- Do not make `gemma3:4b` the default without a benchmark.
- Do not run `wrangler deploy`, `git push`, or live scheduling from this migration pass.
- Do not archive or delete `.openclaw.pre-migration` unless Nick explicitly asks.
