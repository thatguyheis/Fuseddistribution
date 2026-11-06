# Reel production checklist

Authority: `SOURCE-OF-TRUTH.md`. Sol owns code/process audits. Routine scheduled preparation, review and delivery use GPT-5.6 Luna, low reasoning. At most one Luna helper may review a source package or finished output using only its relevant files; helpers never start heavy work. The tracked local runner is the sole rendering owner. Read this checklist and the compact ledger; consult individual technical SOP sections only when needed. Do not load the entire historical SOP corpus into each run.

## Resume and prepare

1. Maintain three approved unprocessed business packages (two targets plus one standby) when source material permits. Prune finished published queue entries only with a free lease, keeping their history in the ledger. Read `.workflow-state/business-growth-ai-365/ledger.json` and the most recent run. Resume unfinished topics before selecting replacements. Record each topic independently. A blocked first topic does not stop research, writing or review for the second. Never overwrite the other topic's evidence.
2. Business exception: GPT writes directly from current primary sources. Do not call the local LLM article writer. Preserve a failed draft and finish editorial repair using verified facts. For coin jobs retain their existing local writer and source gates.
3. Prepare the article, question hook, script, hero, media and one CTA. Use conceptual flowcharts or tables when no measured data belongs in the lesson. Numeric charts need a source, unit, period and supported takeaway. Never add invented statistics to satisfy a graphic quota.
4. Before overnight rendering, inspect pending approved coin packages in the active queue for a missing enrichment plan. Use their approved `meta.json` contentGraphic rows and workup sources, then pass the normal editorial/QA gate. Coin intake now creates a plan automatically. Do not fabricate an approval hash or silently bypass a missing plan.

## Enrichment contract

Every new render requires `public/blog/<slug>/enrichment-plan.json`. Minimum: one explanatory graphic, plus two purposeful 0.1–1.2 second sound accents on different body scenes. Do not put effects over the hook or CTA. Keep narration clear. Select sounds by meaning, never randomly; gunshots, children or traffic are unsuitable for an unrelated software lesson. Audition the selected excerpt before approval. Rights and file hashes must match `video/data/sound-effects-rights.json`. Read only the selected catalog entries, not the entire rights database. Eighteen registered user-supplied files live in `video/private-audio/youtube/sound-effects/`; do not distribute those originals alone.

```json
{
  "version": 1,
  "graphics": [{
    "segmentIndex": 1, "kind": "flow", "title": "Verify the output",
    "rows": [{"label": "Render", "detail": "Inspect the MP4"}, {"label": "Publish", "detail": "Read back the post ID"}],
    "source": "Illustrative workflow, supported by the article sources",
    "takeaway": "Check each handoff"
  }],
  "soundEffects": [
    {"segmentIndex": 1, "file": "youtube-cartoon-metal-thunk.mp3", "sourceStartSeconds": 1.88, "durationSeconds": 0.4, "purpose": "Quiet step reveal"},
    {"segmentIndex": 2, "file": "youtube-cartoon-metal-thunk.mp3", "sourceStartSeconds": 1.88, "durationSeconds": 0.4, "purpose": "Quiet verification accent"}
  ]
}
```

Indices are zero based. Graphic kinds: `flow`, `table`, `bar`; use 2–4 short rows. Bars also need numeric `value` per row, `unit` and `period`. Use one graphic per scene; compose its reserved middle panel with the source media rather than covering important evidence. Review source labels and takeaway with the narration.

Run local blog QA **before** editorial sign-off; hash the current enrichment plan and all source artifacts in `qa.json`. `node video/scripts/approved-sources.mjs <slug>` verifies approval. Renderer enrichment validation occurs before expensive synthesis. The runtime stages approved sounds, rejects silent excerpts, caps their measured gain, animates the graphic and uses semantic slide/wipe/fade transitions in both routes. Do not force all presentation transitions to fade.

## Render and release

The GPT-5.6 Luna owner prepares the next Pacific day's queue at 20:30 and uses one bounded, read-only GPT-6 Luna sub-agent for source and approval review. After packages and queue are final, run `python3 scripts/write-business-reel-handoff.py --queue-config=ops/business-reel-queue.json --date=<next-pacific-date>`. This writes the handoff only if every topic passes `approved-sources.mjs`; otherwise write a blocked handoff for the same date with `--blocked --reason=... --date=<next-pacific-date>`. The 02:00 launchd job and any 03:15 resume call `python3 scripts/run-business-reel-queue.py --queue-config=ops/business-reel-queue.json`. The runner requires today's date-bound handoff and verifies the exact queue config hash, topic order, daily limits, and current approval hashes before any work. Missing, stale, blocked or invalid handoff exits as `blocked_handoff` and cannot fall through to an earlier queue. `python3 scripts/business-reel-status.py` reports both handoff and run state. `--dry-run` validates the handoff, queue and approvals without synthesis. Historical ledger PIDs never veto the kernel lease. The runner waits for the shared render lock, preserves checkpoints, attempts each approved topic once per day and continues after a topic-specific failure. Target two successful current renders within at most three distinct attempts; a successful complete render resets the consecutive Chatterbox failure count, while choosing a new topic never does. Two consecutive TTS failures or a closed 00:00–06:00 Pacific window defers heavy work. Only a direct daytime authorization permits `--allow-daytime`. A render is not a finished pair until all delivery gates below pass.

Caption quality automatically checks primary recognition for anomalous repetition, broad divergence and exact normalized ending words, then retries only suspicious segments with the pinned offline small.en model once. Keep narration cached; record the real model/cache keys and fallback evidence. If both recognition passes fail, preserve the topic for actual audio/source repair and continue the next approved topic. Never hide extra speech with caption replacement. Inspect captions against narration, including names, numbers and the entire ending. Coverage alone cannot approve wording. Use timestamp-preserving `caption-corrections.json` and refresh approval hashes before re-rendering. New production rejects ending words absent from the approved CTA.

Review the actual encoded MP4: frame zero, frame 15, each graphic, scene transitions, effect cues, caption clearance, spoken ending and final frame, including phone-size inspection and listening. Record the exact-file visual review, run `node video/scripts/release-reel.mjs --post=<slug>`, and require `readyForPosting: true`. Version 3 release independently verifies the enrichment plan, props and sound hashes. Passing metadata does not prove aesthetic quality; listen and inspect the encoded output.

## Business visual review

Use `create-business-scene-art.mjs` for new business source cards and set reviewed `presentation-plan.json` profile to `business-growth-v1`. Full bleed 1080 x 1920 art must place 64–80 px headings in the central 50%, reserve the enrichment panel, keep the bottom 250 px and right 150 px clear of essential text, and use opaque white plus contrast checked cyan on navy. Show the approved hero at frame zero and a restrained zoom/highlight within the first two seconds. Never crop evidence or duplicate a heading over baked art. Use actual redacted UI evidence only when available; label conceptual cards. Copy a compliant master for delivery, preserving 1080 resolution, rather than recompressing a small file.

## Deliver and reconcile

The 03:15, 06:15 and 14:15 Luna checks read compact production status and work only on changed/actionable stages. The night check may adopt the tracked runner only with a free lease, before 06:00 and within persisted limits. The morning check releases and delivers finished files; the afternoon check reconciles exact due IDs and finishes outstanding delivery. A 13:00 schedule must be checked after its due time, not only at 12:30. Do not use incomplete history as permission to repost. Routine `buffer-live.mjs status` reconciles local ID logs without rewriting unrelated public pages; syncing public links requires the explicit `--sync-social-links` content action.

Recovery must keep a single production owner. Never rename or clear a render or TTS lock on a quiet log, elapsed-time guess, or permission-denied process check. Verify the PID and its child processes with authorized process inspection; if uncertain, wait. Check `.workflow-state/tts-runs/<slug>-<pid>-<segment>.log` for live model output on new generations. Chatterbox holds an independent kernel lock before model loading. Its lock file remains on disk after exit; file existence alone does not mean it is held. Do not remove that file. Stop only a positively identified duplicate worker and its supervisor, preserve audio, and record the owner before resuming the queue.

Preserve existing size, rights and delivery gates. Verify the exact hosted MP4 bytes, deploy the matching blog with a working player, and confirm canonical HTTP 200. Get one fresh Buffer capacity snapshot, prepare CTA-rotated queues within cadence/capacity, validate, publish and read back every created ID. Record `scheduled` separately from `sent`. Confirm delivery from exact IDs after their due times; missing history is unresolved, not permission to repost. Finish with URLs, IDs and outstanding stages. Resume failures from their checkpoint rather than rebuilding completed work.
