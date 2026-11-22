# Fused tech short production

Authority: Nick's current instructions, FUSED-TECH-REELS-CHATGPT-INSTRUCTIONS.md, and the C1994 handoff for the borrowed method. This manual pilot is separate from the scheduled Fused business and coin pipelines.

## Scope and identity

- Fused Distribution only. No coin intro, outro, voice, lot labels, auction copy, or C1994 Buffer credentials.
- About 60 seconds of narration, 145-170 spoken words, 9-11 short segments. Local technical QA accepts 45-85 seconds while reporting the actual duration; an outlier requires repair.
- 720 by 1280, 30 fps, H.264 and AAC, below 25,000,000 bytes. Hero image and hook begin at frame zero. One tie-back and one approved CTA.
- Fused voice and generation settings are read from the unchanged repo video/tts-runtime.json. Both runtime and reference bytes are bound into the approved package.
- Quiet approved music cycle, cyan accents, word-highlighted capital captions, sourced charts held at least four seconds, purposeful transitions and soft whooshes.

## Evidence and approval

Prepare an idea sheet with subject, hook, promise, explanation, visual support, payoff and variety. Name every actual artifact and each source. Diagrams and teaching datasets must be labeled. Store current primary-source snapshots and tool versions. Do not make screenshots, benchmarks, product features, savings or outcomes up.

Nick approves the exact hooks, evidence, graphics and scope. His first-preview review remains required unless he explicitly authorizes all three serially for this batch. Store that actual reply and the selected idea-sheet hash. Only then write the narration, Approved/<batch>/reels.json, and a matching approval.json whose packageSha256 binds the finished package. Never create an owner approval from an assistant assumption.

Use the website CTA only if the matching blog is already live. Until then use: "Follow for more on growing your business with AI." Matching blog drafts may be prepared after idea approval; they are not deployed by this pilot.

## Commands

From this folder, use /Users/nick/.venvs/chatterbox/bin/python3:

    tools/fused_tech_video.py prep BATCH [T-01]
    tools/fused_tech_video.py tts BATCH [T-01]
    tools/fused_tech_video.py whisper BATCH [T-01]
    tools/fused_tech_video.py render BATCH [T-01]
    tools/fused_tech_video.py qa BATCH [T-01]

For overnight work, use the serial owner rather than calling heavy stages directly:

    tools/run_tech_batch.py BATCH --date YYYY-MM-DD --dry-run
    tools/run_tech_batch.py BATCH --date YYYY-MM-DD

The real job runs only on its approved Pacific date, from midnight to 6 a.m. The owner holds the shared Fused production kernel lease and the legacy render PID lock. It waits for active coin render/TTS commands too. The inherited lease reaches the speech, transcription and encoder children. No unknown or stale lock is removed. On completion only its own lock is archived, not deleted. No existing queue, LaunchAgent or recurring Fused job is changed.

## Recovery and checks

Each reel is serial. A failure preserves its checkpoints, is not retried with unchanged inputs, and does not suppress a different approved reel. Reuse audio only if its exact text, full voice settings, reference SHA256, model revision and recorded audio bytes match. Keep completed segments even if a later segment fails. Changed or rejected audio is renamed and retained. Finished outputs get _v2 and later versions rather than overwrites.

Speech uses the pinned local small.en recognizer and saves actual word timing records. The hook and CTA must match exactly after number/name normalization; unexpected repeats and substantial drift block encoding. Captions use the copied C1994 timing method: recognized timing where token counts agree, explicit within-segment mapping for spoken numbers when needed. Do not claim perfect word alignment from presence alone.

Full decode, dimensions, frame rate, codecs, AV duration difference, size, integrated loudness and true peak are measured. Failed exports are retained in work/failed, outside Out. No forced speech bypass is supported.

Then inspect the exact-file contact sheet, full frame zero, every chart, transitions, captions, and final card. Check chart values and units. Save the visual-review result against the exact output SHA256. "Automated checks passed" is not the same as Nick's final listen/watch. Report every file, seconds, MB, LUFS, speech state, and remaining review honestly.

## Delivery and token use

No Buffer post, upload, deployment or Git push is performed by this format's build job. Finished files remain local in Out for Nick's decision. The Coins Since 1994 tools and credentials remain separate.

The scheduler should invoke the deterministic runner and read its compact run-status and QA reports. Use Luna with low reasoning for the one overnight invocation, not a full SOP/history prompt per segment. No LLM is needed to count files, compare hashes, transcribe locally, render, or measure media. Do not start overlapping monitor jobs; inspect a running job in its current task.

## Owner-requested manual preview

An explicitly approved first preview can run with --allow-daytime. This flag is restricted to scope first-preview, keeps the approved Pacific date and shared ownership locks, and never authorizes held topics. It does not change the default overnight window or any scheduled Fused job.

A first-preview failure must report preview_generation_failed and return a nonzero exit. Only a successfully encoded and checked file may be marked awaiting_first_preview_review. When independent recognition also flags a line, simplify that line and regenerate only its invalidated audio. Preserve all rejected audio and keep the exact approved hook. Final narration uses a dedicated CTA card.

Explicit owner instructions to generate selected topics now authorize a dated selected-topics manual run. Bind approvedIds to the exact package IDs and require manualGeneration true for --allow-daytime. Keep serial execution, shared leases, evidence, exact hook and all media checks. This does not authorize publication.

Speech comparison normalizes only verified equivalent technical spelling forms, including file name / filename and H .264 / H.264. Preserve raw recognized words and timings. Different codec values and missing or extra words must still fail; do not lower the score threshold or edit transcripts to hide a mismatch.

For a flagged recording, a second pinned local recognizer may provide the selected actual word timings. Preserve the primary output, bind the selected words and independent evidence to the exact audio SHA256 and both model revisions, then rerun the unchanged speech threshold and exact hook/CTA checks. Changed audio, words, model provenance or an evidence path outside the batch invalidates that selection. Never manufacture recognized words.

## Caption clearing and temporal review

Chart and still caches contain clean artwork only. Cache a copy of the artwork and return a fresh image for each frame. Compose the tool label and captions on a fresh frame after the visual transition. Never write text into a cached master. Each caption phrase ends no later than the next phrase begins; replace it immediately, without overlapping or crossfading text.

Preflight must exercise multiple caption phrases on the same chart after its 4.5-second cache threshold, then verify that expired text disappears. A single midpoint image cannot detect cumulative subtitle trails. Final QA samples 16, 16.5, 17, 17.5 and 18 seconds, plus late frames of every chart, and compares decoded caption bands with clean composites. Inspect these frames in the actual MP4 before sharing it. Preserve originals and create a new version; reuse hash-valid narration for this visual repair.

Technical-name comparison also canonicalizes the observed equivalent forms A-P-I / API and Next .js / Next J S / Next.js. Preserve raw recognition and timings, keep the speech score threshold and exact hook/CTA check, and test that different names such as API/IP and Next.js/Nuxt.js remain different.

Whole-number comparison canonicalizes unambiguous values from zero through 999 and whole dollar amounts, such as $24 versus twenty four dollars, without editing raw words or timing. Different values, units and codec identifiers still differ. A second recognizer confirming extra speech requires regenerated audio; never discard an audible word to force an exact CTA pass.
