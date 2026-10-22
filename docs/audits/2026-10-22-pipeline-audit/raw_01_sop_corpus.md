# Raw: SOP corpus (subagent report, 2026-10-22)

Key fact: last commit 2026-09-06. The docs now claiming authority (AUTOMATED-PUBLISHING-OPERATIONS, BATCH-PRODUCTION-SOP, PUBLISHING-OWNER-QUICKSTART, all Oct SOPs, SOP-*-2026-*) are untracked: ~45 days of rule changes with no git history.

## Inventory
| File | Lines | Last commit | Purpose |
|---|---|---|---|
| AGENTS.md | 170 | 08-25 | Codex instructions, photo library ONLY |
| CLAUDE.md | 65 (M) | 08-25 | reel/Remotion rules |
| SOCIAL-SOP.md | 770 (M) | 08-20 | Buffer/social |
| fused-reserve-sop.md | 239 | 07-08 | fulfillment, not pipeline |
| video/REEL-SOP.md | 1219 | 09-04 | reel |
| video/STORYBOARD-PILOT-PROTOCOL.md | 76 | untracked | storyboard test |
| public/blog/BLOG-SOP.md | 1456 (M) | 09-03 | blog |
| public/blog/BLOG-REF.md | 745 | 06-11 | HTML/CSS template |
| docs/AI-READABLE-CONTENT-SOP.md | 454 | 08-20 | machine copy of SOP (drifted) |
| docs/AUDIO-SOURCE-SOP.md | 184 (M) | 08-20 | music rights, TTS |
| docs/PROFIT-IMPROVEMENT-SOP.md | 470 (M) | 08-25 | metrics |
| docs/WORKFLOW-OWNERSHIP.md | 164 (M) | 08-25 | roles, schedule |
| docs/WORKTREE-HYGIENE-SOP.md | 71 | 08-25 | worktrees |
| docs/BATCH-PRODUCTION-SOP.md | 122 | untracked | schedule authority from Oct 5 |
| docs/AUTOMATED-PUBLISHING-OPERATIONS.md | 213 | untracked | "current operations authority" |
| docs/PUBLISHING-OWNER-QUICKSTART.md | 126 | untracked | "routine owner entry point" |
| docs/COIN-HISTORY-SOP.md | 113 | untracked | coin reels |
| docs/TOKEN-BUDGET-SOP.md | 72 | untracked | model routing |
| docs/ENGAGEMENT-SOP.md | 55 | untracked | CTA rotation |
| docs/LOCAL-ADVISORY-SOP.md | 49 | untracked | local models |
| docs/EDITORIAL-HERO-SOP.md | 43 | untracked | hero v2 |
| docs/TECH-EDUCATION-SOP.md | 39 | untracked | tech topics |
| docs/REEL-ENRICHMENT-SOP.md | 33 | untracked | reel visuals |
| docs/WHISPER-CAPTIONS-SOP.md | 33 | untracked | captions |
| docs/REEL-OPENING-SOP.md | 32 | untracked | hero frame 0 |
| docs/BLOG-VIDEO-RECONCILIATION-SOP.md | 19 | untracked | player backfill |
| docs/REEL-PRESENTATION-PROFILE.md | 21 | untracked | quality profile |
| docs/REEL-SWITCHOVER-PLAN.md | 70 | untracked | planning only |
| docs/CLAUDE-REEL-HANDOFF.md | 41 | 06-25 | Claude handoff (obsolete) |
| docs/SOP-STATUS/UPGRADES-2026-09-29, SOP-RECOVERY-2026-10-04, SOP-FIXES-2026-10-09 | 29-147 | untracked | dated logs |
| ops/profit-system/CONTENT-AGENT-SOP.md, EVOLUTION-SOP.md | 134, 119 (M) | 08-25 | agent roles, evolution |
| PLAN-INDEX.md + 5 PLAN-*.md | | 08-25 | 07-07 fix plans |

## Redundancy
- Copy-pasted banners: "Current operations authority..." in 6 files; "September 7 reliability correction" 4; "Current October5 batch standard" 5; "September 11 efficiency and art update" 3; "Buffer capacity correction, September 29" 3. Mostly in uncommitted diff (spreading now).
- Reel length stated in 8+ places. Render command in 4. No-em-dash rule in 10 places. Buzzword list in 2. Buffer planner flags 4x inside SOCIAL-SOP. Push/commit rules in 8 files.

## Contradictions
- Buffer queue: code `scripts/buffer-backlog-runner.mjs:22-24` = 10 limit, 1 reserve (9/channel, verified). Docs say 10/reserve 0 (AUTOMATED-PUBLISHING-OPERATIONS:49, WORKFLOW-OWNERSHIP, SOCIAL-SOP:3, QUICKSTART Oct4 with unused env var BUFFER_CHANNEL_QUEUE_TARGET) vs 9 (QUICKSTART:3, SOCIAL-SOP:5, two lines below ten). SOP-FIXES-10-09 says ten. REEL-SOP:896 old shared cap.
- Reel duration: 110-130s/135 cap (AUTOMATED-OPS:78, banners) vs REEL-SOP:309 100-240s, :312 up to 4 min; BLOG-SOP:757 180-240; SOCIAL-SOP:602 180-240; CONTENT-AGENT-SOP:32 180-240. ENGAGEMENT-SOP:19 60-85s on-camera (legit separate).
- Resolution: CLAUDE.md:20, AI-READABLE:241 say 1080x1920; REEL-SOP:1069 says 720x1280 do not render 1080; REEL-SOP:1219 calls presentation profile 1080p vs REEL-PRESENTATION-PROFILE:7 720.
- TTS: tts-runtime.json variant standard. QUICKSTART:42,60 and TECH-EDUCATION:9,35 say Nano. AI-READABLE:170 lists Coqui XTTS.
- Claude role: BLOG-SOP:1386-1392 "Claude Code retired 2026-07-26"; committed CLAUDE.md:14 said Claude is editorial QA; uncommitted edit -> Codex. Stale Claude refs: SOCIAL-SOP:100, :559, BLOG-SOP §18 (:1230-1280), CLAUDE-REEL-HANDOFF.md.
- Commit/push: CLAUDE.md:57 explicit auth + REEL_GIT_COMMIT=1; REEL-SOP:862-869 commit locally; CLAUDE-REEL-HANDOFF:40 commit locally; AUTOMATED-OPS:53 no automatic commits or pushes; WORKFLOW-OWNERSHIP:120 auto deploy; BLOG-SOP:102-103 commit locally, push with approval; SOCIAL-SOP:531 and PLAN-INDEX:13 rely on standing push permission that lives only in Nick's global ~/.claude/CLAUDE.md.
- Schedule: BATCH-PRODUCTION-SOP (08:30/21:30, Buffer 22:00 only) vs AUTOMATED-OPS:49 (22:00 sole) vs same file :209 (13/16:01/19/22) vs WORKFLOW-OWNERSHIP:129-131 vs TOKEN-BUDGET:31-44 vs QUICKSTART:76,97,107 vs SOCIAL-SOP:535,653 (every 4h, 9:15 owner) vs REEL-SWITCHOVER-PLAN:8.
- Share CTA: BLOG-SOP:1057-1082 fixed line vs ENGAGEMENT-SOP:25-29 rotation.
- Short reels: CLAUDE.md:19 "not three short reels" vs REEL-SOP:305-314 three Short topics.

## Stale references
- AGENTS.md points to `photos/...`; real path `public/photos/`. package.json:6-11 `node photos/scripts/*.mjs` broken. Finder duplicates `* 2.mjs`.
- BLOG-SOP:759 -> missing video/REEL-SOP-SHORTFORM.md.
- CLAUDE-REEL-HANDOFF:35 ambient-02..10 tracks blocked; REEL-SOP:147-156 still lists them.
- Retired audio still on disk: video/public/music/mixkit-driving-ambition-32.mp3 (claimed 9/23), youtube-gone-away-blue-beat-review.mp3 (retired 10/15).
- Missing: CONTENT-AGENT-SOP path in LOCAL-ADVISORY:35; video/data/performance-report.md (REEL-SOP:927); posting-pack.md.
- Expired experiment: "expedited six per channel through 2026-08-12" still in SOCIAL-SOP:67,97,657, PROFIT-IMPROVEMENT:441-467.

## Precedence / load
No single entry. AGENTS.md (auto-loaded by Codex) says nothing about pipeline. Chain: CLAUDE.md -> 4 SOPs -> banners -> AUTOMATED-OPS -> QUICKSTART + BATCH -> 13 more. ~21 files, ~120k tokens before work starts.

## Agent consolidation proposals
1. AGENTS.md as single entry (~150 lines); move photo content to public/photos/README.md.
2. docs/CURRENT-STANDARDS.md table of all changing values; delete banners.
3. Merge BATCH, AUTOMATED-OPS, QUICKSTART, TOKEN-BUDGET, WORKFLOW-OWNERSHIP into one operations SOP.
4. Fold REEL-OPENING, REEL-ENRICHMENT, WHISPER-CAPTIONS, REEL-PRESENTATION-PROFILE into REEL-SOP; delete stale tables.
5. SOCIAL-SOP cleanup; fold ENGAGEMENT CTA rotation.
6. BLOG-SOP: delete Claude sections, fix :757, :759.
7. Archive dated logs/incidents/handoffs/PLAN-* to docs/archive/.
8. Delete or regenerate AI-READABLE-CONTENT-SOP.
9. Move fused-reserve-sop out of pipeline set.
10. Commit SOP tree; settle push policy in one place.
