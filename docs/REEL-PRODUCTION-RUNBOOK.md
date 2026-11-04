# Reel production checklist

Authority: `SOURCE-OF-TRUTH.md`. Sol owns code/process audits. Routine scheduled writing and review use GPT-5.6 Luna, low reasoning, without delegation. Read this checklist and the compact ledger; consult individual technical SOP sections only when needed. Do not load the entire historical SOP corpus into each run.

## Resume and prepare

1. Read `.workflow-state/business-growth-ai-365/ledger.json` and the most recent run. Resume unfinished topics before selecting replacements. Record each topic independently. A blocked first topic does not stop research, writing or review for the second. Never overwrite the other topic's evidence.
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

Use the approved existing render command with `--post=<slug> --voice=chatterbox --music=cycle`; use `--quality=presentation` only with an approved presentation plan. Shared lock: `/tmp/fused-remotion-render.lock`. Render serially within the overnight window; wait on an active owner, never steal its lock. Reuse exact completed audio/caption checkpoints. Follow the voice profile in `video/tts-runtime.json`, not copied prompt settings.

Inspect captions against narration, including names, numbers and the entire ending. Coverage alone cannot approve wording. Use timestamp-preserving `caption-corrections.json` and refresh approval hashes before re-rendering. New production rejects ending words absent from the approved CTA.

Review the actual encoded MP4: frame zero, frame 15, each graphic, scene transitions, effect cues, caption clearance, spoken ending and final frame, including phone-size inspection and listening. Record the exact-file visual review, run `node video/scripts/release-reel.mjs --post=<slug>`, and require `readyForPosting: true`. Version 3 release independently verifies the enrichment plan, props and sound hashes. Passing metadata does not prove aesthetic quality; listen and inspect the encoded output.

## Deliver and reconcile

Recovery must keep a single production owner. Never rename or clear a render or TTS lock on a quiet log, elapsed-time guess, or permission-denied process check. Verify the PID and its child processes with authorized process inspection; if uncertain, wait. Check `.workflow-state/tts-runs/<slug>-<pid>-<segment>.log` for live model output on new generations. Chatterbox holds an independent kernel lock before model loading. Its lock file remains on disk after exit; file existence alone does not mean it is held. Do not remove that file. Stop only a positively identified duplicate worker and its supervisor, preserve audio, and record the owner before resuming the queue.

Preserve existing size, rights and delivery gates. Verify the exact hosted MP4 bytes, deploy the matching blog with a working player, and confirm canonical HTTP 200. Get one fresh Buffer capacity snapshot, prepare CTA-rotated queues within cadence/capacity, validate, publish and read back every created ID. Record `scheduled` separately from `sent`. Confirm delivery from exact IDs after their due times; missing history is unresolved, not permission to repost. Finish with URLs, IDs and outstanding stages. Resume failures from their checkpoint rather than rebuilding completed work.
