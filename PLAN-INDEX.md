# Plan Index — 2026-07-07

Five execution-ready plans, ranked by leverage. Written so a less capable model can execute each without questions. Execute in rank order; dependencies noted.

| Rank | Plan | What it buys | Depends on |
|---|---|---|---|
| 1 | [PLAN-quarantine-autorepair.md](PLAN-quarantine-autorepair.md) | Stops losing ~1 post every other day to deterministic quarantine causes ([VERIFY] markers, banned words, cents typos). 15 quarantine days in the last 3 weeks. | — |
| 2 | [PLAN-inline-link-injector-gate.md](PLAN-inline-link-injector-gate.md) | All 156 live posts have zero inline internal links (SOP §9 miss shipped 156×). Injector + gate fixes every future post's internal SEO permanently. Spec already approved in docs/CODEX-HANDOFF-2026-07-07. | — (but run rank 3 first or recovery posts must pass the new gate) |
| 3 | [PLAN-quarantine-backlog-recovery.md](PLAN-quarantine-backlog-recovery.md) | Unlocks ~19 fully built posts (≈3 weeks of content, already paid for) sitting in .workflow-blocked/. | Rank 1 (sanitizer). Do before enabling rank 2's gate. |
| 4 | [PLAN-artifact-leak-assetsignore.md](PLAN-artifact-leak-assetsignore.md) | Live site publicly serves qa.json/lint.json/meta.json/hooks.json/_status.json for every post (verified 200). 5-line fix, <1 hour. | — |
| 5 | [PLAN-live-content-cleanup.md](PLAN-live-content-cleanup.md) | 12 live posts contain banned AI words; 2 posts shipped off-topic/repetitive bodies. Brand + E-E-A-T repair. | Rank 1 (swap map). |

Shared rules across all plans: never `git reset --hard`; script/config commits stay local (Nick pushes); content commits pushable under standing permission; nothing runs 9:00–10:00 AM PDT (daily cron window).

Known issues deliberately NOT planned (flagged for Nick):
- Reel narration-window quarantine class (7/04) — reel generation issue, separate fix.
- `com.nick.litert-serve` LaunchAgent dead (exit -15) — gemma leaf service down; pipeline unaffected (uses ollama).
- DECOUPLE-BLUEPRINT (public/blog/DECOUPLE-BLUEPRINT.md) — big architecture project, needs Nick's direction, not weak-model executable.
- `tests/worker.test.js` (158 lines) thin vs `src/worker.js` (601 lines) — worker test coverage gap.
