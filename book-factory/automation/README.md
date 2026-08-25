# Automation Specs

These files define the two recurring workflows for Codex automation setup:

- `weekly-discovery.toml`: refresh the ranked candidate list and surface public-domain opportunities
- `manuscript-pipeline.toml`: advance approved titles through blueprint, draft, and packaging steps
- `daily-owner-loop.toml`: run one safe daily production pass, stop at hard gates, and refresh status artifacts

The files are versioned here so prompt changes remain reviewable. Actual Codex automation installation happens through the app, using these specs as the source of truth.
