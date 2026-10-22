## Current October5 batch standard

Follow `docs/BATCH-PRODUCTION-SOP.md` for current schedules. AI ownership is08:30 and21:30 daily plus Friday22:30 review; separate08:00 oversight is paused. Local research batches run Monday/Thursday23:00; Buffer refills once daily22:00. Preserve daily publishing and all release gates. Older schedule sections below are historical and do not authorize extra runs.

Current model rule, effective October15,2026: every scheduled Codex owner task and hosted model-assisted SOP action uses GPT-6 Luna (`gpt-6-luna`). Use low reasoning for routine oversight, triage and saved-evidence review; use medium for coordinated repairs and production. Update existing active and paused cron automations to this model without changing their enabled or paused status. Heartbeat automations inherit their thread model; set GPT-6 Luna in that thread when the app supports it and state the requirement in the prompt. Local deterministic scripts and local Gemma/Ollama generation remain local to conserve hosted usage. Model routing never bypasses quality gates.

# September 24 tested local advisory update

Use `docs/LOCAL-ADVISORY-SOP.md` for bounded Granite assistance. The existing helper now groups up to four jobs in one local process, keeps the model resident for at most 30 seconds between requests, and explicitly unloads it at the end. Its validated cache requires matching input, installed model digest, prompt/schema version and current SOP contents; results expire after 24 hours. A cache hit uses no inference. Exact checks and unchanged known blockers remain deterministic and require no model. Existing Gemma writing, editorial and release ownership stays unchanged; Liquid and Qwen3.5 gain no new production responsibilities.

The September24 benchmark found 27.14 versus 14.44 seconds for the matched cold/warm Granite test, with equal results. This is a small local runtime measurement, not a cloud token or weekly quota saving. Preserve all schedules. Track actual avoided owner calls before changing cadence. No new polling or cloud fallback is introduced. Detailed evidence is in `docs/LOCAL-MODEL-EVALUATION-2026-09-24.md`.

# September 23 local reporting update

This section supersedes earlier schedule counts below. Daily deterministic reporting now runs without a model at 22:20 through the installed `com.nick.local-operations-audit` LaunchAgent and `scripts/local-operations-audit.mjs`. It runs publishing health, audio rights, cached fitness, ADA lifecycle application and profit audit, preserving existing checks. It makes no network/model calls and cannot publish or grant approval. The Mac must be available for local jobs.

The separate SOP interpretation task is now Friday 22:30, GPT-6 Luna low. The daily 21:30 publishing pass owns due D+1/D+3/D+7 metrics collection, reusing valid same-day evidence and respecting the existing request budget/cooldown. Other publishing passes and daily 08:00 oversight retain their schedules and Luna routing. This is 43 scheduled model wakeups per week, reduced from 49 after the earlier correction, and 210 before it. These are invocation counts, not measured token savings.

Start with the compact owner brief, which now includes the local audit summary. Full outputs stay under `.workflow-state/local-operations/YYYY-MM-DD/`; `latest.json` is atomically replaced. Unexpected exit codes/timeouts are explicit execution failures. Findings such as blocked rights are retained separately from script failure. Never equate a completed audit with healthy publishing, or local rights approval with YouTube clearance. Check dates and inspect detail only for the stage requiring action. No unattended process should infer editorial approval from these reports.

Validation: the first five-command local run completed; the existing lifecycle, fitness and profit suite passed 24 tests. The report found 100 blocked local renders, six incomplete registered packages and seven missing historical queue dates. These findings were not repaired by the optimization. Existing cloud editorial/release review remains necessary. Do not move factual approval, rights disputes or manual audiovisual review to an unvalidated smaller local model.

# Seven day publishing compute budget

Effective September 11, 2026. This supersedes earlier hourly owner checks and automatic delegation instructions. Maintain production quality while reducing model-assisted supervision.

## September 23 active schedule and cost correction

This section supersedes older schedule/model counts below. Current account evidence: 92 percent of the weekly allowance consumed, reset September 29 at 12:31 Pacific. This is account-wide; it cannot all be attributed to publishing. No reset was redeemed. The September 22 sample was 35 percent in the same reset window.

- Daily oversight at 08:00 uses GPT-6 Luna low in the existing task. The temporary hourly catch-up loop is ended. Do not restore it automatically.
- The existing publishing owner retains 09:30, 12:30, 15:30, 18:30 and 21:30 Pacific, now GPT-6 Luna medium. Preserve editorial execution capacity and every existing gate.
- The daily 22:30 profit/SOP review uses GPT-6 Luna low. Other legacy tasks remain paused.
- Total planned scheduled model invocations: seven per day, down from thirty (49 rather than 210 per week, 76.7 percent fewer invocations). This is not a measured token or quota saving.
- Start with `node scripts/publishing-owner-brief.mjs`, approximately 3.3 KB at validation, then inspect only changed files for the next actionable stage. The brief is read-only and does not prove process ownership, publication, audio clearance or completion.
- Keep all local launchd schedules, cached speech, deterministic quality checks and exact publication verification. Do not bypass automatic approval review or repeatedly retry its unchanged rejection. Record the action/manifest and wait for approval or a materially safer permitted route.
- An advancing producer or unchanged external blocker needs no polling loop. Unfinished actionable content still requires the assigned repair. Escalate a precise unresolved factual/technical issue instead of silently accepting weaker output.
- Sample usage once per Pacific day, use remaining percentage divided by days to reset as a planning ceiling, and defer optional experiments. Do not promise seven-day endurance before observing it.

Evidence: `.workflow-state/efficiency-2026-09-23/session-token-review.json`, automation before/after snapshots and `token-budget-samples.json`. In the sampled Fused sessions since September 22, the old Astra oversight processed 42.7M input tokens, including 41.8M cached input. Auto-review also had substantial activity; preserve that safety system and reduce repeated failed attempts, not review itself. Raw session totals are partial, not an invoice or complete account attribution. Official model/usage guidance: https://learn.chatgpt.com/docs/pricing .

## Execution and model routing (historical September 11 baseline)

- Local launchd remains production owner: nightly research at 23:00, blog publishing at 09:00, reels at 11:00, Buffer at 13:00/16:00/19:00/22:00 Pacific. The local Ollama watchdog runs every five minutes. These jobs must not wait for a Codex check.
- The existing owner heartbeat now runs at 08:00 and 18:00 Pacific, inheriting the task model. Its tool does not support an independent model override. Astra is for short oversight and necessary complex repair, not hourly polling.
- All six standalone schedules retain gpt-5.6-luna; four duplicate or legacy owners stay paused; the existing Luna finalization owner runs at 09:30 and 15:30 with medium reasoning. Active daily ADA at 22:30 uses low reasoning. Substantive factual/editorial repair can use Luna medium; escalate unresolved high-stakes claims for stronger review. Never reduce accuracy gates to meet a usage target.
- Do not spawn an agent for a serial command or unchanged state. When independent delegation saves work, use one fresh-context Luna task, exact paths, a bounded deliverable and a short report. No conversation-history forks for routine work.
- Shell/Node handle status, hashing, sorting, duration checks, deduplication and cached evidence comparison. Use no LLM to summarize an unchanged successful log.
- Daily local publisher disables Claude (CLAUDE_ENABLED=0, HERMES_TAKEOVER=1). Its default writing/structured/QA model is Gemma 3 4B QAT; light leaf/media work uses LFM 2.5 1.2B Q4. Nightly research separately uses LiteRT Gemma E2B. Do not describe the Hermes wrapper as a separate cloud model. Local models consume Mac memory/time, not Codex plan tokens.
- Chatterbox/audio and Remotion rendering are local compute. Preserve valid segment caches; retry only failed segments. Cloud transcription or other separately configured APIs have their own billing, not an assumed free subscription allowance. Do not introduce paid fallback calls without existing authorization.

## Bounded reads and retries

Read the compact checkpoint and changed evidence only. Redirect large reports to files and return counts plus the next actionable item. Never dump complete automation prompts, session transcripts or historical SOPs into each run. Full context and cached input still contribute to usage.

If a locked process advances, save its stage and return. Do not wait in short polling loops while audio/video runs. If unchanged evidence shows a blocked dependency, preserve its retry condition and stop. A fresh due item remains actionable even if an older item is blocked. For recoverable work, combine cheap deterministic steps into a single bounded repair rather than assigning a separate model turn to each command. Do not repeat failed model generation without correcting the input or identifying a changed dependency. Read and preserve each production script's existing bounded retry and timeout rules.

## Daily account budget and monitoring

At the first scheduled review each Pacific day, call get_usage_limits once. Append checkedAt, window duration, reset timestamp, used percent and reported plan to .workflow-state/token-budget-samples.json. Other reviews reuse that day's sample. Account-wide usage includes unrelated tasks; do not attribute its entire change to publishing.

For the same reset timestamp, compare daily samples. A falling percentage or changed reset starts a new baseline; never count it as negative spending. Target no more than 10 percentage points per day for the entire account, leaving roughly 30 percent weekly contingency. Also calculate sustainable daily spend as remaining percentage divided by days until reset. The smaller figure is the planning ceiling, not an enforceable provider cap.

If the observed daily pace exceeds the ceiling, defer optional experiments, broad audits and cosmetic rerenders. Continue deterministic publishing and necessary quality repairs; keep the two owner checks brief. Repeated excess across two samples requires a concrete model/context/call-count repair and a meaningful notification. Never silently pause publishing, skip QA or consume a reset credit. Missing usage evidence is unavailable, not zero. No automatic subscription upgrade or credit purchase.

On September 18 and each Friday thereafter, compare usage, actual live articles, release-ready reels, verified sent outcomes, failures and repair latency. Claim seven-day endurance only after observing it. Planned owner wakeups fell from 168 to 14 per week (91.7 percent); this is not a measured 91.7 percent account saving. Daily ADA adds seven Luna runs per week; editorial finalization adds fourteen bounded Luna passes. Fewer checks can delay agent-only repairs; local jobs retain their normal cadence and recovery behavior.

## Evidence and scope

Root session measurement: .workflow-state/token-session-measurement-2026-09-11.json. September 10: 303 nonduplicate cumulative usage updates; 38,993,230 input tokens, 37,757,696 cached input, 1,235,534 uncached input, 54,207 output. Root only, not other tasks or children. Raw token totals are not plan usage or an invoice.

The September 11 account snapshot reported a seven-day window and planType plus despite the owner's description of Pro. Report that mismatch without guessing billing or changing the account. Current official guidance supports Luna for high-volume automation and explains the effects of context, reasoning and caching: https://learn.chatgpt.com/docs/pricing . Smaller model names do not necessarily mean a better Codex allowance; Luna currently has higher listed message capacity than GPT-5.4 mini.
