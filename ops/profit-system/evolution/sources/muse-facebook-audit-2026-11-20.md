# ADA Performance Audit — Fused Distribution on Facebook
Date of audit: Nov 20, 2026 (extraction 22:55–23:10 PST). Read-only. Nothing was published or changed.

## Scope, sources, freshness
- **Personal profile**: Nicholas Hughes, facebook.com/Thatguyheis (585 followers, Professional Mode). Source: Professional Dashboard, Content Library + per-reel Post Insights, custom range Sep 25–Nov 20, 2026. No reels exist Sep 25–30 or on Nov 20, so effective coverage is **Oct 1–Nov 19, 2026: 83 Published original reels**. The library showed 234 rows; ~151 are group-share copies of the same reels (excluded from all rankings; the biggest group copy was 244 views, Silver Eagle in Morgan Dollar Group, Oct 31). A handful of low-view Nov 9–15 rows were seen but not fully transcribed; the top 10 was verified across all segments, so rankings are unaffected.
- **Nick's Freebies Page** (287571098326695, 461 followers): source facebook-cli Page insights, LAST_90D window, which covers the Page's entire life (earliest post Sep 29, 2026): 99 posts, 45 videos. Metrics are lifetime, as of 2026-11-20T22:55:24-08:00.
- **Exclusions**: group-share copies; photo/text posts; the two known duplicate originals are counted as separate posts because Meta counts them separately (noted where relevant).
- **Metric freshness**: all figures are lifetime-to-date as of the extraction window above. Meta does not expose a per-reel "last updated" timestamp; that field is **unavailable**, extraction time is the freshness bound.
- **Organic vs boosted**: no reel or Page post returned any paid/boosted label, and earnings were $0.00 throughout. Meta does not expose a per-reel organic/paid split here, so distribution type is **unavailable as a field**; "organic" is an inference from the total absence of paid markers, not a measured value.
- **Cross-platform**: YouTube (Maple Leafs 565, GBP setup 498) and Instagram (.env reel 144 views, 4.38s avg watch) figures are the owner's supplied context only. They are not merged with or compared as equivalents to Facebook numbers anywhere in this audit.
- CLI cross-check note: facebook-cli `post read` comment counts run lower than dashboard detail counts (e.g. top reel: 3 vs 8). Dashboard detail figures are used as the insights record because they decompose exactly into the reported engagement totals.

## Top 10 — personal profile reels, by views (all coin except #6, #7, #9, #10)
Reach is **unavailable** for every row (not shown by Meta); Viewers is the nearest distinct-audience metric and is labeled as such. Saves: **unavailable** for every row. Attributed follows and link clicks: **unavailable** for every row ("Insights not available").

| # | Reel | Published | Length | Viewers | Views | Total watch | Avg watch | Avg % watched | Comments | Shares |
|---|------|-----------|--------|---------|-------|-------------|-----------|---------------|----------|--------|
| 1 | [See the tiny O below the eagle (Morgan dollar O mint mark)](https://www.facebook.com/reel/1115278868105397) | Oct 13, 12:31 PM | 1:53 | 604 | 694 | 1h 51m 07s | 11s | 9% | 8 | 0 |
| 2 | [A president enters everyday pocket change (1909 Lincoln cent)](https://www.facebook.com/reel/2173166086883253) | Oct 21, 8:33 AM | 1:45 | 607 | 653 | 51m 03s | 5s | 5% | 1 | 1 |
| 3 | [Why did America put the word peace on a silver dollar?](https://www.facebook.com/reel/1086662984156269) | Oct 14, 1:02 PM | 1:49 | 512 | 561 | 1h 30m 47s | 10s | 9% | 3 | 0 |
| 4 | [America melted millions of silver dollars (Pittman Act)](https://www.facebook.com/reel/1415174240767346) | Oct 14, 7:30 PM | 1:50 | 461 | 503 | 2h 59m 02s | 23s | 21% | 6 | 0 |
| 5 | [For thirty five years… (Silver Eagle reverse redesign)](https://www.facebook.com/reel/2679057685883780) | Nov 1, 12:03 PM | 1:53 | 446 | 485 | 49m 31s | 7s | 6% | 1 | 1 |
| 6 | [Before AI can help, the raw material has to be right](https://www.facebook.com/reel/1441407974102284) | Nov 1, 12:39 PM | unavailable | 372 | 400 | 22m 21s | 4s | 3% | 1 | 1 |
| 7 | [Moving from personal Gmail to Google Workspace is not just a new inbox](https://www.facebook.com/reel/1000333919104165) | Nov 7, 5:28 PM | 1:57 | 369 | 379 | 27m 39s | 5s | 4% | 0 | 1 |
| 8 | [This half dollar pairs two educators (Carver-Washington)](https://www.facebook.com/reel/1079032538467880) | Oct 20, 3:08 PM | 2:05 | 303 | 356 | 47m 39s | 9s | 7% | 5 | 1 |
| 9 | [Did Buffer actually schedule your reel?](https://www.facebook.com/reel/2128691231353418) | Nov 4, 4:34 PM | unavailable | 326 | 354 | 20m 22s | 4s | 3% | 1 | 1 |
| 10 | [Wrong answer? Keep the evidence](https://www.facebook.com/reel/1429021125861098) | Oct 8, 1:52 PM | 2:01 | 326 | 353 | 17m 09s | 3s | 3% | 0 | 0 |

Just below: "Your next good customer…" 348 (Oct 30), "Fort Vancouver…" 335 (Oct 14), the second Gmail/Workspace cut 285 (Nov 7, 5:33 PM — a separate post of the same topic, 5 minutes after #7).

## Leaders by metric (profile reels)
- **Views**: #1 Morgan O, 694.
- **Total watch time**: #4 Pittman Act, 2h 59m 02s — nearly double #1 (1h 51m 07s).
- **Retention / avg % watched**: #4 Pittman Act, 21% (avg watch 23s). Next best are #1 and #3 at 9%. Every other top-10 reel sits at 3–7%.
- **Average watch seconds**: #4 23s, #1 11s, #3 10s.
- **Completion proxy (1-minute views)**: #3 Peace dollar, 23. Then #1 with 15, #5 with 10.
- **20-second view rate**: #3 Peace dollar, 7.8%. Then #4 4.6%, #5 4.3%, #1 4.2%.
- **Engagement (total)**: #1 Morgan O, 57 (12 reactions, 37 clicks, 8 comments, 0 shares). Then #4 with 21, #3 with 20.
- **Comments**: #1 with 8, #4 with 6, #8 with 5.
- **Shares**: no leader — the maximum is 1, shared by #2, #5, #6, #7, #8, #9. The three most-viewed reels have 0 shares.
- **Saves**: unavailable on every reel (Meta does not show the field here). Not zero — unavailable.
- **Attributed follows / link clicks**: unavailable per reel. Account level only: dashboard home shows 41 net follows in the last 28 days (Oct 23–Nov 19), not attributable to individual reels.
- **Follower share of viewers** (audience composition, not attribution): highest on #8 Carver-Washington, 9.6% followers; the top discovery reels ran 97%+ non-followers.

## Nick's Freebies Page — video leaders (lifetime, CLI)
Watch time, retention, and completion for Page videos are **unavailable** through the available Page fields (views, unique viewers, engagements, clicks, link clicks, saves only).
- Nov 6, 5:07 PM recap reel: 296 views, 273 unique viewers — Page's #1 video.
- Nov 4, 5:09 PM bonus reel: 285 views.
- Oct 21, 12:33 PM: 247 views — notably a coin video (first U.S. commemorative) cross-posted to the Page, the Page's #3 video.
- Page totals, last 90 days: 4,678 views, 3,399 unique viewers, 461 followers.

## Five strongest videos — content analysis
Method: full spoken transcripts via facebook-cli, plus frame inspection of the actual video files at 0.5s / 2s / 6s, plus scene-cut detection. Retention curves ARE accessible in per-reel insights; all five show the same shape — a near-vertical cliff in the first 5–10 seconds, then a long low tail. Playback of the videos themselves was possible from the CDN files; no metric had to be estimated.

**#1 Morgan O (694 views).** Opening hook (spoken, exact): "Why does the silver dollar carry a tiny O?" followed immediately by the stakes line, a mint that struck for both sides of the Civil War. Opening imagery: title card ("WHY THIS TINY O? / A mint with a Civil War history") over the slabbed Morgan reverse, then a full-frame coin shot captioned "NEW ORLEANS". First useful proof: the narration points to the physical detail ("Look below the eagle, just above the denomination") at roughly 8–12 seconds in; the O itself is visible in the opening coin photo but small and unzoomed. Captions: burned-in subtitles throughout. Pacing: slow pans over stills, zero hard cuts in the first 30s. Sound: AI voiceover over a synthesized instrumental bed. Ending CTA: spoken engagement question ("Would you explore the date or mint mark first?"); the follow/consult CTA lives in the caption text, not the audio. Biggest drop-off: 0:06 — before the proof sentence lands.

**#2 Lincoln cent (653 views).** Hook: contradiction statement — for over a century U.S. coins avoided real people's portraits, then Lincoln appeared on the cent in 1909 — followed by "Why did this everyday denomination become a major break with tradition?" Opening imagery: no title card; a plain side-by-side photo of the 1909-S VDB obverse and reverse on white, letterboxed. First proof: hard dates arrive early (1909, the Aug 2, 1909 release, the birth centennial) at roughly 10–15 seconds. Captions burned in. Pacing: stills with slow movement, no early cuts. Ending: spoken engagement question ("Which detail in this coin's history surprised you most?"). Drop-off at 0:05; retention is the weakest of the coin leaders (5% avg watched) despite #2 views — this one was carried by the hook and topic, not by holding power.

**#3 Peace dollar (561 views).** Hook: the title question itself, plus a second question about the design detail people read as defeat. Opening imagery: title card ("WHY NAME A DOLLAR PEACE?") over a worn 1923 Peace dollar, footer "1921 / A SYMBOL CHANGES". First proof: the broken-sword story is teased inside the hook; the documented proof (the Smithsonian record of the one-day alteration) lands late in the video. Despite that, this reel owns the best early-holding numbers after the hook: 7.8% 20-second view rate and 23 one-minute views, both #1 in the top 10. Ending: spoken summary, engagement question in the caption. Drop-off at 0:05.

**#4 Pittman Act (503 views, retention leader).** Hook: paradox in the first two sentences — America melted millions of silver dollars, then bought silver to replace them. "Why destroy money only to make it again?" Opening imagery: title card ("MELTED. THEN MADE AGAIN.") over a Morgan obverse, burned-in subtitle running from the first scene. First proof: the mechanism arrives immediately after the hook — 1918, World War I, British India, a silver shortage — concrete specifics inside roughly the first 10 seconds, the fastest hook-to-proof path of the five. Result: 21% average watched, 23s average watch, 2h 59m total watch — the retention outlier of the whole account. Ending: spoken summary; engagement question in the caption. Drop-off still at 0:05, but the tail holds at a level none of the others reach.

**#5 Silver Eagle redesign (485 views).** Hook: number statement — one reverse design stayed on the Silver Eagle for 35 years, then changed in 2021. Opening imagery: no title card; the video opens on the two-coin set itself (old and new reverses in capsules, dark background) — the proof object is literally the first frame, but it is unlabeled and dark, so a cold viewer cannot tell what they are looking at within 2 seconds. First labeled proof: the narration's 2021 change + designer name in the opening sentences; the side-by-side set comparison is spelled out late. Ending: spoken engagement question. Drop-off at 0:06, avg watched 6%.

**Cross-cutting observations (observed, not causal):** every top-10 reel's biggest drop-off is at 0:05 or 0:06. In all five watched videos the first explicit, labeled proof lands after that cliff. Openings are either a title card restating the hook or an unannotated coin photo. Visual pacing is uniformly slow (no hard cuts in the first 30 seconds of any of the five). The spoken CTA is always an engagement question; the follow/consult ask is caption-only.

## Similar-age comparison (Facebook only, Published originals, lifetime views)
Views are lifetime, so age is a confound: October posts have had 30–38 days, November posts 1–19 days. Medians below are descriptive, not age-adjusted proof.
- October coin cohort (Oct 13–21, 8 reels): 694, 653, 561, 503, 356, 274, 231, 227 — median ≈ 415.
- October tech cohort (Oct 5–17): median ≈ 100 across ~17 reels, best 353.
- November tech cohort (Nov 1–19): median ≈ 60 across ~26 reels, best 400.
- November coin cohort (Nov 1–19, small n): 485, 124, 32, 10.
The .env reel inside Facebook (Nov 17): 172 views, 66 three-second views, 2 one-minute views — the same early-cliff signature as the rest of the account. Its Instagram figures stay separate, per scope.

## Hypothesis check — "show useful proof within two seconds, hook preserved"
**Verdict: consistent with the data, not proven by it.** The drop-off cliff at 0:05–0:06 on every top reel, and proof landing after the cliff in all five watched videos, match the hypothesis's premise. But no existing reel actually places a labeled proof inside 2 seconds, so the account contains no treated case to compare against. The Silver Eagle reel is the nearest miss: proof object in frame at 0:00, unlabeled, 6% avg watched. This is a pattern worth testing, not a demonstrated cause. The experiment below is the test.

## Recommended topics
**Next 1 — Coin: "The initials the public made the Mint remove" (1909 VDB sequel).**
Hook: "A designer's initials were put on this coin in 1909, then removed after complaints. The first ones still have them." Payoff: viewers can spot V.D.B. at the reverse rim and know why later 1909 cents lack it. CTA: "Would you check the date or the initials first?" + follow. Visual plan: open at 0:00 on an extreme close-up of the V.D.B. initials (proof inside 2s), pull back to the full reverse, then the obverse; title card after the proof shot. Supporting evidence: the general 1909 Lincoln reel is #2 by views — [reel/2173166086883253](https://www.facebook.com/reel/2173166086883253).

**Next 2 — Tech: "Your Google listing is live. One setting decides if customers can message you."**
Hook: "More than half your customers would rather message you than call. If this setting is off, they cannot reach you at all." Payoff: viewer checks and enables Google Business Profile messaging. CTA: comment question + free one-on-one consult. Visual plan: open on the actual messaging toggle/chat-button screenshot (proof inside 2s), then the listing as customers see it. Supporting evidence: Gmail/Workspace migration is the top tech reel on Facebook (379 views, [reel/1000333919104165](https://www.facebook.com/reel/1000333919104165)); GBP setup is the strongest mapped tech topic; the GBP messaging reel posted Nov 20 ([reel/1696728061845336](https://www.facebook.com/reel/1696728061845336)) is too new to rank.

**Backup 1 — Coin paradox sequel:** another destruction-and-replacement story on the Pittman structure (e.g. the GSA hoard release). Supporting: retention leader [reel/1415174240767346](https://www.facebook.com/reel/1415174240767346) (21% avg watched).
**Backup 2 — Tech verification sequel:** "Did your AI actually send that email?" on the Buffer verification structure. Supporting: [reel/2128691231353418](https://www.facebook.com/reel/2128691231353418) (354 views).
**Backup 3 — Coin two-people-one-coin question format:** Lafayette dollar, first U.S. coin to picture a president. Supporting: [reel/1079032538467880](https://www.facebook.com/reel/1079032538467880) (356 views, best follower share) and [reel/1086662984156269](https://www.facebook.com/reel/1086662984156269) (best 20-second rate).

## Controlled experiment (proposed, not run)
- **Question**: does placing the first labeled proof inside 0–2 seconds, with the approved hook unchanged, improve retention?
- **Control (retained)**: current format — title card/hook first, proof in the body (~5–15s).
- **Treatment**: identical hook text, voice, and design; the first scene is the proof visual (zoomed detail, number card, chart, or screenshot) with the hook overlaid; the title card moves after the proof shot.
- **Units**: 3 comparable posts per arm, 6 total. Same category (coin history, the strongest baseline), length band 100–120s, same evening posting slots, profile-only distribution (no group shares during the test — group copies are a distribution confound), arms alternated to balance weekday effects.
- **Measurement**: at a fixed 7-day age per post. Primary: median average watch time and median avg % watched. Secondary: 3-second view rate, 20-second view rate, views.
- **Decision rule**: promote the treatment format only if its median average watch time improves **≥15%** over the control median without losing on avg % watched. Otherwise retain the control format. All 6 posts complete before judging; no early stopping.

## ADA handoff for Codex
**Evidence**: 83 Published profile reels, Oct 1–Nov 19, 2026 (dashboard, extracted Nov 20, 22:56–23:10 PST). Top views 694 (Morgan O mint mark). Retention leader: Pittman Act reel, 21% avg watched / 23s avg watch / 2h 59m total. Every top-10 reel's biggest drop-off is at 0:05–0:06. In all 5 videos inspected frame-by-frame, the first labeled proof lands after that cliff; openings are title cards or unannotated coin photos; zero hard cuts in the first 30s of any inspected video.
**Limitations**: Reach, saves, attributed follows, and link clicks are unavailable per reel (Meta returns "Insights not available"). Distribution type (organic vs paid) is not exposed; no paid markers were present. Views are lifetime, so cross-cohort comparisons carry an age confound. A few low-view Nov 9–15 library rows were not fully transcribed; top-10 membership was verified across all segments. CLI comment counts differ from dashboard counts; dashboard is treated as authoritative.
**Strongest topics**: coin history with a tiny-detail or paradox hook (Morgan O, Pittman Act, Peace dollar); tech verification/migration topics (Gmail to Workspace, Buffer verification, GBP).
**Proposed experiment**: proof-inside-2-seconds treatment vs retained current-format control, hook unchanged, 3 coin-history posts per arm, fixed 7-day measurement, promote only on ≥15% median avg-watch-time improvement. Not yet run; no results claimed.
**Proposed production changes** (proposals only — nothing has been applied): (1) add a 0–2s proof-scene slot to the render template ahead of the title card; (2) add a `proof_at_seconds` field to reel metadata and release QA; (3) log each reel's biggest drop-off second and avg % watched from the dashboard at day 7 into the posted-reels log so the next audit measures instead of re-deriving.
