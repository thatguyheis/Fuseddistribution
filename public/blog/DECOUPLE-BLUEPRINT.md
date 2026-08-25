# Pipeline Decouple Blueprint — Gemma/Claude Split

> Goal: cut Claude token/session usage ~80% by moving bulk language work to local
> Gemma (via Ollama) and all deterministic work to scripts. Claude reserved for
> high-end tasks only: real-stat sourcing, stat verification, final QA gate.
>
> State passes file -> file inside `public/blog/[slug]/`. Each stage is a separate
> process with a fresh context. An agent reads ONLY the output file of the prior
> stage. No shared chat history. This is what eliminates context bloat.

Status: PLAN. Not yet built. Created 2026-06-15.

---

## 0. Terminology / what's installed

- **hermes** = [Hermes Agent](https://github.com/NousResearch/hermes-agent) by Nous
  Research (Python, MIT). A full agent framework, NOT a thin script. INSTALLED
  2026-06-15. Built-ins that do the orchestration work for us:
  - Cron scheduler with delivery -> can replace the launchd pipeline.
  - Skills system (agentskills.io standard) -> each stage = a hermes skill.
  - Subagents -> spawn isolated stage workers, parallel.
  - Tool RPC: "Write Python scripts that call tools via RPC, collapsing
    multi-step pipelines into zero-context-cost turns." This IS the decouple
    mechanism — stage scripts call tools without growing chat context.
  - Any model via OpenAI-compatible endpoint -> points at local Ollama.
- **Paths:** binary `~/.local/bin/hermes`; config `~/.hermes/config.yaml`;
  secrets `~/.hermes/.env`; code `~/.hermes/hermes-agent`; cron/sessions/logs
  under `~/.hermes/`.
- Non-interactive hermes call: `hermes -z "PROMPT" --yolo`.

### Hardware constraint (BINDING — discovered 2026-06-15)

- **This machine = 8.6 GB RAM MacBook (Apple Silicon).** Measured during testing:
  free RAM 12%, swap 20 GB used. RAM is THE constraint on every model decision.
- **Lesson learned — packaging matters more than param count.** Ollama
  `gemma4:e2b` is a 5.1B Q4 **gguf = 7.7 GB resident**. On 8 GB it forces the
  system into swap; inference went disk-bound and hung (every gen request timed
  out while `/api/ps` answered instantly). gguf has no Per-Layer-Embedding
  offload, so it pays full weight in RAM. **Do not use Ollama gemma4:e2b here.**
- `gemma3:1b` (gguf, 815 MB) DOES run — verified, correct output — but only
  ~1 tok/s under current memory pressure. Usable as overnight fallback, weak
  quality (1B) for the harder language stages.

### Correct runtime for this machine = LiteRT-LM (Google AI Edge)

Nick's intended model is the **litert-community / Google Edge** quant, not the
Ollama gguf. That is the right call:

- **Gemma 3n E2B** (the "E" = effective params via MatFormer + Per-Layer
  Embeddings) runs in **~2 GB RAM** in LiteRT format despite 5B raw params — fits
  8 GB with room for browser/Claude. This is the packaging Ollama lacked.
- **LiteRT-LM** ([github](https://github.com/google-ai-edge/LiteRT-LM)) now has a
  macOS Swift package, Metal GPU backend, AND an **OpenAI-compatible server**
  (v0.13+) — so hermes points `base_url` at it exactly like Ollama.
- Install (uv already at `~/.hermes/bin/uv`):
  ```bash
  uv tool install litert-lm
  litert-lm run --from-huggingface-repo=google/gemma-3n-E2B-it-litert-lm \
    gemma-3n-E2B-it-int4 --prompt="test"
  # OpenAI server: see ai.google.dev/edge/litert-lm/cli/openai_server
  ```
- Model repos: `google/gemma-3n-E2B-it-litert-lm`,
  `litert-community/gemma-4-E2B-it-litert-lm`. Format `.litertlm`, int4 quant.

### Model recommendation table (8 GB Mac) — MEASURED 2026-06-15

**Decisive finding: run ALL models through LiteRT-LM, not Ollama.** On this 8 GB
machine, Ollama gguf models >~2 GB thrash to swap and hang (phi4-mini 2.5 GB and
qwen2.5:3b 1.9 GB both timed out HTTP 000 under real conditions; even 1 GB models
jammed once the daemon queued dead requests). LiteRT's Per-Layer-Embedding memory
layout + Metal backend is what makes mid-size models usable here.

| Model | Runtime | Decode tok/s | Verdict |
|---|---|---|---|
| Gemma-4-E2B int4 | **LiteRT** | **24.4** (GPU, TTFT 2.9s) | **PRIMARY.** Clean output, fits, fast |
| Qwen2.5-1.5B q8 | LiteRT | (benchmarking) | backup — JSON/structured |
| Phi-4-mini q8 | LiteRT | (benchmarking) | backup — reasoning |
| gemma3:1b | Ollama | ~1 (swap-bound) | last-resort fallback only |
| phi4-mini / qwen2.5:3b | Ollama gguf | **HANGS** | do NOT use — thrash on 8 GB |
| gemma4:e2b | Ollama gguf | **HANGS** (7.7 GB) | **REMOVE — swaps to death** |

LiteRT model files (all ungated litert-community, Apple Silicon generic builds):
- `litert-community/gemma-4-E2B-it-litert-lm` -> `gemma-4-E2B-it.litertlm`
- `litert-community/Qwen2.5-1.5B-Instruct` -> `Qwen2.5-1.5B-Instruct_multi-prefill-seq_q8_ekv4096.litertlm`
- `litert-community/Phi-4-mini-instruct` -> `Phi-4-mini-instruct_multi-prefill-seq_q8_ekv4096.litertlm`
- (`google/gemma-3n-E2B-it-litert-lm` is gated — needs `hf auth login`.)

### FINAL ARCHITECTURE (decided 2026-06-16)

**Gemma = leaf, Claude = brain.** Hermes is NOT the LLM brain (its ~14.5K-token
base prompt overflows gemma's 4K context — confirmed). Instead:

- **Brain/orchestrator = `claude -p`** (Claude Code CLI, no API key, no extra cost).
  Runs the high-end stages T1/T5/T12 and overall flow.
- **Leaf = gemma via LiteRT serve.** Bulk language stages (T2/T3/T6/T9/T10) call
  the OpenAI endpoint directly through `~/bin/gemma.sh` — no agent overhead.
- Stage state stays file -> file in `public/blog/[slug]/`.

WORKING SETUP (verified 2026-06-16):
- `litert-lm serve` on `localhost:9379`, model `gemma-e2b` (imported, 2.4 GB),
  request id `gemma-e2b,gpu` for Metal.
- Persistent service: `com.nick.litert-serve` LaunchAgent ->
  `~/bin/litert-serve.sh`. Log `~/Library/Logs/litert-serve.log`.
  - **CRITICAL plist keys:** `ProcessType=Interactive` + `Nice=-5` +
    `LimitLoadToSessionType=Aqua`. Without Interactive QoS, launchd throttles the
    process and Metal GPU readback times out ("ABORTED: timeout reading back
    data", HTTP 000). With it: HTTP 200, first call ~33s (model load), warm
    calls ~9s for short completions, 24 tok/s sustained.
- Helper `~/bin/gemma.sh "prompt"` (or stdin) -> completion text. Env:
  `GEMMA_MODEL` (default `gemma-e2b,gpu`), `GEMMA_MAX_TOKENS` (default 2048).
  Keep prompt+output < 4096 tokens (model KV cache limit).

Benchmarks (LiteRT GPU/Metal, this 8 GB Mac):
- gemma-4-E2B: 24.4 tok/s decode, 88.9 prefill, TTFT 2.9s — PRIMARY.
- Qwen2.5-1.5B: 14.8 tok/s decode — backup (downloaded to HF cache).
- Phi-4-mini q8: GPU engine create failed (too big for Metal buffer on 8 GB) —
  drop, or run CPU only.

Ollama findings (8 GB Mac): gguf models >~2 GB thrash to swap and hang
(gemma4:e2b 7.7 GB, phi4-mini 2.5 GB, qwen2.5:3b 1.9 GB all unusable). Existing
`com.nick.gemma-research` nightly uses Ollama — should migrate to the LiteRT
endpoint or a model that fits.

### Earlier config state (superseded — kept for history)

Installed:
- LiteRT-LM CLI `0.13.1` (`uv tool install litert-lm`). Commands: run / serve /
  benchmark / import / list. `litert-lm serve` = OpenAI API (`/v1/chat/completions`,
  `/v1/models`) on default port **9379**.
- Ollama backups for benchmarking: `phi4-mini` (2.5 GB), `qwen2.5:3b` (1.9 GB).

LiteRT model source:
- `google/gemma-3n-E2B-it-litert-lm` is **HF-gated** (401 — needs license accept +
  `hf auth login`). Skip unless Nick wants to authenticate.
- USE `litert-community/gemma-4-E2B-it-litert-lm` — **ungated**. Apple Silicon file:
  `gemma-4-E2B-it.litertlm` (generic CPU/Metal). `_web` = WebGPU; `_Google_Tensor`/
  `_intel`/`_qualcomm` = those NPUs only, not Mac.
  ```bash
  litert-lm run --from-huggingface-repo litert-community/gemma-4-E2B-it-litert-lm \
    gemma-4-E2B-it.litertlm --prompt "..."
  litert-lm serve   # then hermes base_url -> http://localhost:9379/v1
  ```

hermes config: `provider: ollama`, `base_url: localhost:11434/v1`,
`model.default: gemma3:1b` (stopgap). Repoint to LiteRT server once benchmarked.

### Benchmark plan (decide primary model)

Candidates: Gemma-4-E2B (LiteRT), phi4-mini (Ollama), qwen2.5:3b (Ollama).
Score each on: tok/s on this 8 GB Mac, peak RAM/swap during gen, §9 banned-word
compliance on a T3 clean task, JSON-schema validity on a T6/T10 task. Winner =
hermes default; other two = fallbacks via per-skill model override.

---

## 1. Root cause (current pipeline)

One monolithic `claude -p` call per post runs ~16 steps + 5 skills
(`daily-blog-reel.sh:251-339`). Per-post Claude context must hold:

| Source | ~Cost/post | Problem |
|---|---|---|
| `BLOG-SOP.md` re-read | 8k tok | 32 KB, loaded every post, never reused |
| `BLOG-REF.md` re-read | 6k tok | 22 KB templates, every post |
| 5 skill bodies | large | seo-check + seo-schema + seo-local + social-ad + ugc-script all in one context |
| 7 artifacts resident | compounding | html+hero.svg+photo-post.svg+reel-data+reel-script+social-copy+ugc all built in same context |
| `probe_session` | 1 call/post | `claude -p "respond with ok"` burns quota before every post |

Result (from log): 1 post built, then `You've hit your limit · resets 11:40am`.
Remaining posts committed with only `gemma_draft.md` -> no index.html -> 404.

Second defect: deterministic work (HTML fill, SVG, Chrome->JPEG, pexels, sitemap,
commit) runs INSIDE the LLM call. Zero LLM value. Pure token waste.

---

## 2. Stage map

```
STAGE          ENGINE        READS                          WRITES
──────────────────────────────────────────────────────────────────────────
T0 topic-pick  gemma3:1b     topic-history.md (last 30)     queue.json
T1 research    CLAUDE        queue.json post obj            research.json   ← sourced stats
T2 draft       gemma4:e2b    research.json                  gemma_draft.md
T3 style-clean gemma4:e2b    gemma_draft.md + banlist       clean.md
T4 lint        SCRIPT(grep)  clean.md                       lint.json
T5 stat-verify CLAUDE*       clean.md + research.json       verified.md     ← *only if [VERIFY]
T6 hooks       gemma3:1b     verified.md                    hooks.json
T7 html-build  SCRIPT(node)  verified.md + meta.json        index.html
T8 svg-build   gemma4:e2b/SCRIPT hooks.json + palette       hero.svg, photo-post.svg
T9 reel        gemma4:e2b    verified.md + hooks.json        reel-data.md, reel-script.md
T10 social     gemma4:e2b    verified.md + hooks.json        social-copy.json
T11 assets     SCRIPT(shell) *.svg + media_queries          *.jpg, images/pexels-*, sitemap.xml
T12 qa-gate    CLAUDE        index.html + social-copy.json  qa.json
T13 publish    SCRIPT(shell) all                            git + wrangler + curl 200
```

Claude touches 3 of 14 stages (T1, T5, T12), each <2k token context.
SOP/REF never enter Claude — they become the html-build template (T7) and the
Gemma system prompts (T3, T9, T10).

---

## 3. I/O contracts

Minimum input, exact output schema per stage. Each output file is the ONLY thing
the next stage reads.

### T0 topic-pick — gemma3:1b
IN: `topic-history.md` last 30 rows.
OUT `research/[date]-queue.json`:
```json
{"date":"YYYY-MM-DD","posts":[
  {"slug":"","brand":"silver|tech","keyword":"","intent":"informational|commercial|local","gap":"one line"}
]}
```

### T1 research — CLAUDE (web + sourcing)
IN: one post object from queue.json. Nothing else.
OUT `[slug]/research.json`:
```json
{"slug":"","stats":[{"claim":"","value":"42%","source_url":"","source_name":""}],
 "angle":"","secondary_kw":[""]}
```

### T2 draft — gemma4:e2b
IN: `research.json`.
OUT `[slug]/gemma_draft.md` — markdown body. Tag any stat NOT in research.json with `[VERIFY]`.

### T3 style-clean — gemma4:e2b
IN: `gemma_draft.md` + §9 banned-word list (static system prompt).
OUT `[slug]/clean.md` — banned words, em dashes, hedging removed. Content unchanged otherwise.

### T4 lint — SCRIPT (grep, no LLM)
IN: `clean.md`.
OUT `[slug]/lint.json`:
```json
{"em_dash":0,"banned_hits":[],"verify_tags":2,"pass":true}
```
`pass:false` -> loop T3 (max 2x), then continue with warning.

### T5 stat-verify — CLAUDE (only if lint.verify_tags > 0)
IN: `clean.md` + `research.json` sources.
OUT `[slug]/verified.md` — every `[VERIFY]` replaced with a real sourced stat or cut.
If Claude quota gone: skip, copy clean.md -> verified.md, leave `[VERIFY]` flags, log it.

### T6 hooks — gemma3:1b
IN: `verified.md`.
OUT `[slug]/hooks.json`:
```json
{"hook":"","hook_type":"contrarian_stat|pain_point|immediate_value|contradiction",
 "key_stat":{"value":"","label":""},"discussion_question":"","hashtags":"#a #b #c #d #e"}
```

### T7 html-build — SCRIPT (Node, BLOG-REF as template)
IN: `verified.md` + `[slug]/meta.json` (title, slug, excerpt, brand, date, alt).
OUT `[slug]/index.html` — every `[SLOT]` filled. Zero LLM.

### T8 svg-build — gemma4:e2b or SCRIPT
IN: `hooks.json` (key_stat, title) + brand palette constants (§7/§15).
OUT `[slug]/hero.svg`, `[slug]/photo-post.svg`. Numeric XML entities only — enforced by T11 grep gate.

### T9 reel — gemma4:e2b
IN: `verified.md` + `hooks.json`.
OUT `[slug]/reel-data.md` (§11 schema) + `[slug]/reel-script.md`.
Script-validated: em-dash=0, `## QUESTION` >=1, narration no `%`, no standalone `US`.

### T10 social — gemma4:e2b
IN: `verified.md` + `hooks.json`.
OUT `[slug]/social-copy.json` (§14 schema). No em dash (script-checked).

### T11 assets — SCRIPT (shell, mostly existing)
IN: `*.svg`, slug, queries from `reel-data.md ## media_queries`.
OUT `hero.jpg`, `photo-post.jpg`, `images/pexels-*`, `sitemap.xml`.
Gate: `grep -En "&[a-zA-Z]+;" *.svg` must be zero before JPEG (§13).

### T12 qa-gate — CLAUDE (final judgment only)
IN: `index.html` + `social-copy.json` (the two human-facing artifacts only).
OUT `[slug]/qa.json`:
```json
{"slug":"","score":0,"pass":true,"blockers":[]}
```
`pass:false` -> log blocker, skip T13 for that slug.

### T13 publish — SCRIPT (shell)
git add/commit/push + `npx wrangler deploy` + `curl` 200 verify. Standing push permission covers content commits.

---

## 4. hermes orchestration — how stages map onto the framework

Hermes already provides the runner. We don't build a stage-walker from scratch —
we express the pipeline IN hermes:

- **Each Gemma stage (T0,T2,T3,T6,T8,T9,T10) = one hermes skill.** Skill prompt =
  the stage system prompt (style rules, schema). Hermes runs them on `gemma4:e2b`
  (the configured default), zero Claude cost.
- **Deterministic stages (T4,T7,T11,T13) = Python scripts called via hermes tool
  RPC.** Per the README this collapses them into "zero-context-cost turns" — the
  script runs, only the result returns to context.
- **Claude stages (T1,T5,T12) = explicit `claude -p` calls** invoked as a shell
  tool from within a hermes skill, scoped to that stage's input file only. (Or
  set those three skills to a Claude provider via hermes per-skill model override.)
- **Scheduling:** replace the launchd `daily-blog-reel.sh` cron with `hermes cron`,
  OR keep launchd and have it call `hermes -z "run blog-pipeline skill" --yolo`.
- **Per-slug state:** still file -> file in `public/blog/[slug]/`. Hermes skills
  read/write those files; the file is the contract, not hermes memory.

Invariants the orchestration must keep (whether hermes-native or shell):
1. Check input file exists before a stage. Missing -> log + skip dependents.
2. After LLM stages, assert output file exists and non-empty.
3. On Claude quota error: skip T1/T5/T12, run degraded path, keep going.
4. Write per-slug `_status.json` (stages done).

Degraded mode (Claude exhausted) still produces a publishable post via Gemma +
scripts. No more 404s.

### Why this beats the old monolith
- Old: 1 Claude call holds SOP+REF+5 skills+7 artifacts -> limit after 1 post.
- New: Gemma (free, local) does 7 language stages; scripts do 4 deterministic
  stages; Claude touches only 3 tiny scoped stages. Claude session quota now
  covers many posts/day instead of ~1.

---

## 5. Token/session win

- Claude: 1 giant call/post -> 3 small scoped calls/post. ~80% Claude token cut.
- SOP/REF leave Claude permanently. ~14k tok/post saved.
- `probe_session` deletable per-post (one probe at start is enough; Gemma stages
  don't consume Claude quota).
- Limit-kill no longer strands posts at 404 — degraded path finishes them.

---

## 6. Build order / progress

- [x] Install hermes + LiteRT, serve gemma-4-E2B, benchmark. (2026-06-15/16)
- [x] **T7 html-build** = `scripts/build-html.mjs` — deterministic, zero-LLM,
      tested both brands. Reads `meta.json` + `verified.md` -> `index.html`.
- [x] **Migrate `gemma-nightly.sh`** off Ollama gemma4:e2b -> LiteRT `:9379`
      (gemma4:e2b removed). `ollama_call()` now hits the leaf endpoint.
- [x] **Chunk the draft generation** in `gemma-nightly.sh` — was one ~1400-tok
      call; now intro + one call per H2 (parsed from brief) + templated CTA. Each
      call well under the 4096 window. Verified: headings parse, sections gen,
      `[VERIFY]` preserved. gemma output is rough (generic phrasing) — claude
      polish (brain) + T4 lint clean it. See open "gemma quality gate" item.
- [x] **`~/bin/gemma.sh`** leaf helper + 4096-token context guard.
- [x] **Gemma quality gate** — strengthened `gemma-nightly.sh` STYLE with the
      full §9 ban list; the T4 lint + T5 polish loop IS the enforcement gate.
- [x] **T4 lint** = `scripts/lint-draft.mjs` — JSON report (em/en dash, banned,
      hedging, filler, openers, verify_tags). Exit 1 on any violation. Tested.
- [x] **T5 polish (brain)** = `scripts/polish-draft.sh` — `claude -p` polishes
      gemma_draft -> verified.md, gated on T4, loops claude up to 2x to fix.
      Tested: dirty draft -> lint PASS attempt 1, meaning preserved, [VERIFY] kept.
- [x] **T6 hooks** = `build-hooks.sh` (gemma + python-assembled JSON). Tested.
- [x] **T8 svg** = `build-svg.mjs` (deterministic hero+photo, numeric entities,
      self-checks for named entities). Tested (well-formed XML, 0 named entities).
- [x] **T9 reel** = `build-reel.sh` (deterministic §11 from verified+hooks,
      validates no em dash + has ## question). Tested.
- [x] **T10 social** = `build-social.sh` (gemma captions, python §14 schema,
      strips em dashes, X<=280). Tested.
- [x] **T1 research** = `research.sh` (claude -p + WebSearch -> research.json).
- [x] **T12 qa-gate** = `qa-gate.sh` (claude -p judges html+social -> qa.json).
- [x] **Orchestrator** = `build-post.sh <slug> --brand= [--degraded]`. Chains
      T1->T5->meta->T6->T8->T7->T9->T10->assets(jpg)->T12. Per-slug `_status.json`.
      Probes claude once; degraded mode skips claude stages (research/polish/qa)
      and still produces a full publishable post via gemma+scripts. End-to-end
      tested in degraded mode: all 10 artifacts, html+body, valid social, clean SVG.
- [x] **LIVE TEST PASSED** (2026-06-16, non-degraded): all 10 stages ran.
      research found 6 sourced stats, polish lint-passed, html/svg/reel/social
      built, qa correctly BLOCKED on a leftover [VERIFY] (score 72, pass=false).
      Fixes this round: research/qa f-string bugs; gemma.sh retry + auto-restart
      on transient litert 500s (engine wedges under rapid load, recovers on
      kickstart). Calls confirmed stateless.
- [x] **Integration gap CLOSED** (option 1 — added to build-post.sh):
      - internal links = `build-links.mjs` (tag-overlap, curl-200 verified, into
        verified.md before html). Tested: 3 links rendered in index.html.
      - posts.json = `add-to-posts.mjs` (idempotent prepend). Tested.
      - topic-history append (inline python, correct section). Tested.
      - social-ad + ugc-script = best-effort `claude -p` Skill calls (gated on
        CLAUDE_OK; built, not yet live-run to save quota).
      posts.json + topic-history are gated on qa-pass (PUBLISH_OK). Verified with
      backup/restore — zero pollution of real posts.json/topic-history.
- [x] **FINAL SWAP DONE** (2026-06-16). `daily-blog-reel.sh` monolith block
      (old lines 249-364) replaced with brand/kw extraction + `build-post.sh`
      call + preserved session-limit retry. MISSING check -> reel-data.md.
      Downstream (sitemap, secret-check, commit, push, deploy) untouched.
      Backup: `~/bin/daily-blog-reel.sh.bak-20260616`. zsh syntax OK.
      NOT run live (would publish real content); build-post.sh already live-validated.

## Known content deltas vs old monolith (follow-ups)
- **Pexels photos**: build-post.sh does NOT fetch Pexels (SOP §8 wants >=1 photo).
  Old monolith ran fetch-pexels. Add a pexels stage to build-post if photos wanted.
- **reel-script.md**: produced by the separate 11am render LaunchAgent from
  reel-data.md (not by build-post). Confirm renderer reads reel-data.md.
- **social-ad / ugc**: claude Skill stages, built but not yet live-exercised.
- **litert serve robustness**: gemma.sh retries + kickstarts on transient 500s.

## Stage script map (all in public/blog/scripts/)
| Stage | Script | Engine |
|---|---|---|
| T1 research | research.sh | claude+web |
| T5 polish | polish-draft.sh | claude + T4 lint loop |
| T4 lint | lint-draft.mjs | deterministic |
| T6 hooks | build-hooks.sh | gemma |
| T7 html | build-html.mjs | deterministic |
| T8 svg | build-svg.mjs | deterministic |
| T9 reel | build-reel.sh | deterministic+ |
| T10 social | build-social.sh | gemma |
| T12 qa | qa-gate.sh | claude |
| orchestrator | build-post.sh | routes all |
- [ ] Replace the monolith `claude -p` block in `daily-blog-reel.sh:251-339`
      with the staged orchestrator; keep session-probe/retry only for T1/T5/T12.

meta.json schema for T7 is documented at the top of `scripts/build-html.mjs`.

---

## 7. Open questions

- RESOLVED: hermes = Nous Hermes Agent, installed + configured for gemma4:e2b.
- gemma4:e2b quality on §9 banned-word compliance — needs a test pass before trusting T3.
- gemma4:e2b speed on this MacBook: first-token latency includes 7.2 GB model load.
  Keep Ollama warm (`OLLAMA_KEEP_ALIVE`) or the daily run pays cold-load each stage.
- SVG generation (T8): Gemma may be unreliable for precise SVG coordinates.
  Fallback = parametric Node template, LLM picks only text + stat.
- Orchestration choice: hermes-native skills+cron vs launchd-calls-hermes. Decide
  before building stage skills (affects where state/status lives).
