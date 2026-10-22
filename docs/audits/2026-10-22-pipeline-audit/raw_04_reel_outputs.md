# Raw: Reel video outputs (subagent report, 2026-10-22)

ffprobe on 650 MP4s: 118 public/reels, 94 public/reels-x, 438 video/out. Probe data: session scratchpad probe.tsv / rows.json (temporary).

Current spec: 720x1280, 30fps, H.264 + AAC 192k; script target 110-130s, cap 135s (X 140s); Buffer 25 MiB; coin history <50MB; Chatterbox; captions.json (no srt/vtt anywhere).

## Summary
| Location | Files | Duration median [range] | Size median | Total | Resolutions |
|---|---|---|---|---|---|
| public/reels | 118 | 124s [20-179] | 7.5MB | 0.91GB | 115x720p, 3x1080p |
| public/reels-x | 94 | 124s [101-135] | 5.5MB | 0.53GB | 81x720p, 13x1080p |
| video/out | 438 (376 canonical) | 133s [4-250] | 42.2MB | 27.5GB | 292x1080p, 145x720p, 1x540x960 |

video/out by month: Jun 64 (85s, 1080p), Jul 115 (188s, 12.6GB), Aug 71 (198s, 7.2GB), Sep 71 (119s, 720p, 1.4GB), Oct 53 (121s, 1.1GB).

## Eras
| Era | Count | Duration | Size median | Total | MB/min |
|---|---|---|---|---|---|
| Pre-Chatterbox (May 29-Jun 24) | 62 | 70s | 31MB | 3.3GB | 25 |
| Chatterbox 1080p (Jun 26-Aug 27) | 190 | 191s | 103MB | 20GB | 34 |
| Chatterbox 720p (Sep 2-Oct 21) | 124 | 121s | 20MB | 2.5GB | 10 |

## Spec compliance
- public/reels: 42 over 135s (legacy 175-179s Jul/Aug), 7 under 100s (physical-silver-vs-silver-etf 20s, silver-vs-gold 31s, review-generation-tools 35s, silver-as-a-percentage-of-net-worth 35s, small-business-website-mistakes 46s, instagram-stories-local-business 50s, self-directed-ira-for-silver 57s), only 48 in 110-130s, 3 still 1080p.
- public/reels-x: 0 over 140s; 13 still 1080p.
- Current era (Sep+): 14 masters over 135s (how-to-make-reels-for-your-local-business 204s, google-local-service-ads-explained 201s, social-media-content-ideas 193s, morgan-silver-dollars-as-investment 189s, ...); 33 over 25 MiB; 4 broken stubs: should-you-buy-silver-in-dips 3.8s, local-seo-ranking-factors-2026 5.1s, local-citations... 6.1s, fractional-silver-coins 4.1s.
- Captions: 2 masters missing captions.json (silver-storage-options, local-business-repeat-customers). Caption mode: 304 proportional, only 10 whisper, 62 none.
- "Center reel media in phone frame" fix: no trace found in docs/src (only commit 2c1240d3 message).

## Coverage
- 396 posts with index.html; 20 have no reel (19 have reel-script.md, empty video/out dirs): 100-oz-silver-bars-pros-and-cons, apmex-vs-jm-bullion..., best-apps-to-track..., best-silver-mining-stocks..., coinstats-vs-delta..., engelhard-silver-bars..., google-business-profile-categories..., how-relief-changes..., how-silver-futures-work..., how-silver-mine-production..., inherited-junk-silver..., jm-bullion-vs-sd-bullion..., morgan-silver-dollar-complete-buying-guide, retargeting-ads..., rolling-over-401k..., silver-halides..., silver-premium-calculator..., welcome-to-fused, what-is-90-percent-silver..., what-to-do-when-you-inherit...
- paper-collage-storyboard-pilot published in public/reels with no post, no captions.
- 4 slugs in reels-x but not public/reels.
- 262 video/out slugs never reached public/reels (22.3GB).
- 17 slugs with versioned extras (62 files, 1.9GB); silver-dollar-roll-hoards 7 variants, pittman-act 7, fort-vancouver 5.
- 39 public copies differ from master by >1s; 6 masters newer than public copy (peace-dollar, silver-dollar-roll-hoards, walking-liberty, american-silver-eagle, pittman, landing-page-vs-website).

## Leftovers
- Repo root ffmpeg2pass-0.log (644KB) + .mbtree (47MB), Jun 29.
- 26 *.before-whisper-*, 5 *.pre-media-repair-2026-10-21, logs in video/out, -unmastered/-raw/-first-render variants; one variant still has retired "Gone Away" track.
- .workflow-state 2.9GB, video/public/videos 2.6GB, video/public/audio 1.2GB.

## Frame spot-checks (2s)
1. Jun public physical-silver-vs-silver-etf: text-only navy, oversized title cropped both edges, hook text collides with title.
2. Jul silver-counterfeit-detection-guide: same template, bottom caption cut mid-sentence ("49 g/cm3..." vs "A 10.49 g/cm3").
3. Oct creating-a-small-business-exception-handling-log: paper collage style, media centered inside safe area, readable. Clear quality improvement.
