# Raw: Logs, state, incidents, git history (subagent report, 2026-10-22)

Coverage limit: daily-blog-reel.log (18,472 lines, 229 runs) starts 2026-08-19. render-missing-reels.log last written Aug 16 although job still launches daily (log moved to /tmp, see raw_02).

## Week-by-week
| Week | Blogs | Reels | Published | Blocked / failure |
|---|---|---|---|---|
| 7/20-7/26 | 24 | daily render commits | git push | healthy |
| 7/27-8/2 | 22 | daily | yes | catch-up commits 1285807c, b17212f5 |
| 8/3-8/9 | 18 | daily | yes | healthy |
| 8/10-8/16 | 11 | daily; 8/16 rendered=2 failed=2 | yes | reel failures |
| 8/17-8/23 | 13 | daily | partial | brain QA outage 8/20-8/23; quarantines 8/22 |
| 8/24-8/30 | 8 | last render commits 8/27-8/28 | partial | 1800s post timeouts; 8/27-28 runs hung ~6 days; 8/29-31 "Hermes takeover active" skip |
| 8/31-9/6 | 6 | recovery | partial; LAST GIT COMMIT 9/06 | 9/3: 33 runs, repeated timeouts |
| 9/7-9/13 | 17 | manual | Cloudflare helper, not git | 9/7 incident; 9/13: 65 runs every 15 min for 21h, all `canonical resolution validation failed for silver-stacking-for-beginners-first-steps` |
| 9/14-9/20 | 22 (17 catch-up 9/14) | 4 processing | helper | no Gemma queue 9/15, 9/18; no runs 9/19-20 |
| 9/21-9/27 | 15 | 4 hosted 9/21 | helper | 9/27: 450 `RETRY RELOAD FAILED` lines |
| 9/28-10/4 | 36 (batch-dated) | narration repair, TTS circuit blocked | helper | no queue most days; 10/4 passed |
| 10/5-10/11 | 14 | 4 blocked for stock footage | owner helper | no queue 10/5-10/9; quarantines |
| 10/12-10/18 | 6 | none | owner helper | no queue; RETRY EXHAUSTED 10/15 |
| 10/19-10/22 | 5 | none | unverified | every run `BLOCKED: no valid queue`; 10/19 coin-history owns inference, publisher deferred |

## Rates (daily runner 8/19-10/22, 65 days)
- ~17 days `RESULT: all verifications passed`.
- ~29 days no queue.
- ~20 days quality block/quarantine (27 QUARANTINED, 19 RETRY EXHAUSTED, 57 preflight FAILED).
- Runner published zero posts since 10/4.
- Catalog growth from mid-Sep came from Codex batch catch-ups (17 on 9/14, 12 on 9/28, 10/1, 10/4).
- Reels: release-qa readyForPosting true 205 / false 170. reel-backlog/current.json: 61 stuck (media_repair 24, release_checks 25, source_repair 4, opening_hero_repair 3, distribution_handoff 3, render_required 2).
- Buffer: eligible 0; 279/396 articles without published video; queues x 0/10, youtube 1/10, instagram 2/10.
- Log line counts: DEFERRED 3165, RETRY RELOAD FAILED 450, BLOCKED 286, ERROR 152, unpushed notice 148, canonical validation 65, brain QA outage 56, artifact must-not-enter-Git 29, timeout 23.
- events.jsonl: 103 penalties vs 23 rewards. Top: buffer-metrics-api-fetch-unavailable 32, blog-quality-gate-blocked 16, reel-release-qa-missing 7. latest.json 10/21: score 0, hard stop `unverified_fresh_publication`.

## Recurring patterns
- Reel recovery/scheduler: 5 fix commits 9/3-9/4 (0a0d53cd, 725e2813, b73ccace, ea5e690e, 4e3a0df4), then stale lock 9/7, TTS circuit block 10/4, stock footage block 10/9.
- Buffer 429s: fix 89dfdea0 (9/4), still 69 "429" lines; CLI calls bypassed cooldown (9/7); missing shebang buffer-live.mjs 10/4; ~2003 lock.finished files in .workflow-state.
- Queue/recovery: 6 fix commits 8/24-9/3; alternates no-queue vs quarantine; retry storms 9/13 and 9/26-27.
- Narration/audio: audio claim 9/23 (mixkit-driving-ambition-32.mp3, 31 renders); Chatterbox Nano swap due to 10GB swap; TTS circuit.
- Writer quality: "writer did not produce 1100+ words"; topic-coherence QA fails.
- Memory: 8GB host, 5.66GB Gemma, 8.8GB swap.
- Duplicate fix commits same message: 657babf0/185dda9b, 1a84bfa1/0062d67d.

## Duplicates and waste
- contact-page-best-practices-for-local-business committed c72f5aaf (9/3), 6b320c28 (9/4), d4a9eb0a (9/5) (plus 6/27), then quarantined 9/6. how-to-avoid-silver-dealer-scams twice. Cause confirmed in 9/7 incident: queues repeated published slugs with new date.
- buying-silver-from-a-local-coin-shop-vs-online built 13 times (4 timeouts).
- 15 slugs reels rendered twice.
- 33 runs 9/3, 69 blocked runs 9/13-14, hundreds of seconds-long no-queue runs.

## Current state 2026-10-22
- Branch agent/buffer-instagram-profit-sop; 22 commits ahead of origin/main (9/3-9/6).
- No commits since 9/06. ~2153 uncommitted paths incl. plists, build-post.sh, render-missing-reels.sh, posts.json, untracked deploy-approved-blog.mjs, publishing-health.mjs, tests, most incident/SOP docs. All post-9/7 fixes exist only in working tree.
- Daily runner blocked `missing_approved_queue`.
- Codex owner state (10/22 08:33) stalled: curl exit 6 (DNS) on creating-an-approval-log-for-ai-assisted-work, pending since 10/12.
- Buffer available but 3/27 slots filled.

## Incident follow-ups
| Doc | Item | Status |
|---|---|---|
| 9/7 | sort by date, skip registered slugs | done |
| 9/7 | publishing health audit | partial (untracked; last written 10/05 healthy:false) |
| 9/7 | push backlog | not done |
| 9/14 | every pass advances unblocked candidate | not done |
| 9/16 | four reels | done 9/21 |
| 9/16 | narration repair older reels | open |
| 9/23 | other old mixes blocked until repaired | no evidence |
| 9/29 | 3 hero repairs | open |
| 10/4 | three recovery failures | open |
| 10/4 | Nick on-camera recording | no evidence |
| 10/9 | repair 4 blocked reels | not done |
| 10/5 | 24-video demo vs control experiment | not started |
