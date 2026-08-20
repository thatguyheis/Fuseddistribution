# Session Summary — 2026-07-07 Quarantine Backlog Recovery (Plan 3)

## Recovered (published: committed, pushed, deployed, live 200)

| Slug | Source | Notes |
|---|---|---|
| insuring-physical-silver-at-home | 2026-07-07 | Spot price current ($62.62). **Flag:** body leans storage/buying; insurance coverage thin vs title. QA passed. |
| customer-loyalty-program-ideas-for-small-business | 2026-07-07 | Clean recovery. |
| how-to-get-repeat-customers-for-your-small-business | 2026-07-07 | Clean recovery. |
| best-silver-storage-options-for-investors | 2026-07-03 | Clean recovery. |

posts.json 136 → 140, live count matches local, no duplicate slugs. Each post: figures preserved (pexels blocks re-injected after html rebuild), date refreshed to 2026-07-07, topic-history row appended under brand section.

## Still blocked (left in .workflow-blocked/, correctly — no gate bypass)

All remaining failures are **reel-script defect classes** the sanitizer can't repair:

- `how-to-get-more-google-reviews-for-your-business` — stat segments missing figures + filler label
- `canadian-silver-maple-leaf-investment-guide` — stat figures + filler label
- `britannias-vs-eagles-which-silver-coin-is-best` — stat figures + filler label
- `austrian-silver-philharmonic-guide` — stat figures + filler label
- `how-to-ask-customers-for-google-reviews` — stat figures + filler label
- `how-to-respond-to-negative-google-reviews` — stat figures
- `silver-supply-deficit-explained-2026` — malformed years in social-copy (all channels) + filler label
- `facebook-ads-for-local-business-beginner-guide` — malformed years (linkedin) + 4 filler labels
- `silver-storage-vault-vs-home-storage` — narration window (known reel class, PLAN-INDEX flagged)

These match the "reel narration-window / reel generation" class PLAN-INDEX deliberately did NOT plan. Needs reel-side fix (Codex domain).

## Skipped

- 6 incomplete dirs (missing verified.md/index.html/meta.json) — early-stage quarantines, nothing to recover.
- 8 slugs already live/republished on later days.

## Bug found + fixed during recovery

`sanitize-draft.py` sentence-start capitalizer uppercased URLs and single-token strings ("https://" → "Https://", slug → "Slug"), breaking the social-copy `blog_url` QA check on every candidate in run 1. Fixed with a URL lookahead guard; recovery script also skips non-prose (whitespace-free) strings when sanitizing social-copy.json.

## Git state

- 4 content commits pushed to origin/main (standing permission).
- Local-only, unpushed (need Nick review): `.assetsignore` artifact fix (1e6662c2), recovery script + sanitizer guard (26dd131f). Commits were reordered (rebase of UNPUSHED commits only) so content could push without the config commit; backup branch `backup-pre-reorder` kept, safe to delete.
- Pre-existing stash `stash@{0}` (WIP on 84b93f4) untouched — not mine.

## Needs review

1. insuring-physical-silver-at-home: title/body topic drift (see above).
2. 9 blocked posts need reel-script regeneration or reel-gate discussion with Codex.
3. Sanitizer cents repair drops valid decimals in ranges ("$1.50 to $3.00" → "$1 to $3") — by design per lint rule, but loses precision in social copy. Confirm acceptable.
