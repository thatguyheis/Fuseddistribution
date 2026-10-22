# Presentation reel profile

Use `--quality=presentation` on `video/scripts/render.mjs` for approved coin history productions. This is the coin history SOP standard; legacy scheduled invocations still require explicit routing to this mode. Other scheduled output stays unchanged.

The article's reviewed `presentation-plan.json` contains ordered shots for every narration segment, weights, native titles, illustration or stock labels, file paths and hashes. Only files in that article or its own coin-history workup may be staged. A changed plan or asset blocks rendering until renewed editorial review.

Presentation delivery uses 720 by 1280 at 30 fps, PNG intermediate frames, H.264 CRF 20 with the slow encoder preset, and 192 kbps AAC. It renders from hash-verified lossless narration WAV masters. Source resolution still matters; an HD export does not manufacture detail in a smaller image. Keep original coin pixels and clear attribution.

Within each narration segment, shots use restrained motion and 15-frame dissolves. Outer transitions preserve the existing measured timeline while using dissolves. Captions use a larger 44 px maximum in the 1080 px coordinate system. Existing hero-first-frame, source approval, audio duration, music rights and exact-video release checks still apply.

`--prepare-only` prepares audio, captions and props without encoding an MP4, allowing names and dates to be reviewed before the expensive render. A supervised owner may use `--supervised-tts-recovery` after diagnosing a held runtime and removing resource contention. This performs the normal bounded preflight before the batch; failures remain blocked, and the circuit is reset only after successful synthesis. Do not add that recovery flag to unattended scheduled tasks.

A process-probe permission error (EPERM or EACCES) means the lock owner may be alive, not dead. Only ESRCH establishes an exited owner. An unreadable or malformed PID blocks rather than deleting another worker's lock.

## Fort Vancouver reference

`content/coin-history/fort-vancouver-centennial-half-dollar/scene-plan.md` is the narrative edit plan. Its fort plates are labeled generic AI illustrations, not reconstructions. Two built-in imagegen plates passed visual review; the local DreamShaper candidate depicted a modern cabin and was rejected for this historical story. A 576 by 1024 local attempt exceeded the 8 GB Mac's practical memory budget and timed out. Keep local production at 384 by 640, use 20 steps and allow up to four hours per image to finish; avoid overlapping local image generation with TTS or encoding. Keep generated originals and reviewed art with provenance for reuse.

## Upload size requirement

Final upload files must be strictly below 50,000,000 bytes. Aim for 45,000,000 bytes to leave headroom. Measure after audio mastering; reduced resolution alone does not guarantee the limit. When needed, budget video bitrate from measured duration and run a two-pass H.264 encode with an audio and container reserve. Validate actual byte count, dimensions, playback, captions and the exact final file hash. Keep larger originals as archives, not upload deliverables.
