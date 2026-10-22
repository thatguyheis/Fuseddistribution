# Pipeline Audit Plan (2026-10-22)

Goal: full picture of blog + reel production as run by Codex (ChatGPT). Find redundancy and issues worth fixing. Read-only audit; no code changes, commits, or pushes.

## Context at start
- 22 local commits not pushed to origin/main (recurring issue, see 07-17 and 07-20 incidents)
- ~20 uncommitted modified files (SOPs, launchagents plists, ops/profit-system)
- 81 commits since 2026-08-22, 17 of them `fix:`
- ~25 SOP files spread across root, docs/, video/, public/blog/, ops/profit-system/

## Workstreams (parallel subagents)
1. [ ] SOP corpus: redundancy, contradictions, stale references
2. [ ] Pipeline code and scheduling: real flow vs documented flow, dead or duplicate scripts
3. [ ] Logs, state, incidents, git history: timeline and recurring failure patterns
4. [ ] Reel outputs: compare rendered videos against spec, find gaps and duplicates
5. [ ] Blog outputs: posts vs posts.json vs sitemap, duplicate topics, rule violations

## Deliverables
- `findings.md`: combined findings, ranked
- `fix_list.md`: numbered fixes
- `index.md`
- `session_summary.md`
