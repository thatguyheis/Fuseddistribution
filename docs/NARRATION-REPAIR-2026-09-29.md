# Narration repair, September 29

The paused narration runtime was repaired using free, local Chatterbox Nano with the existing cloned voice reference. No paid speech API, new voice, music change, or editorial rewrite is involved.

## What failed and what changed

The original CPU model exceeded the five minute preflight even with two threads, shorter chunks and default guidance. The Mac was using approximately10 GB of swap during diagnosis. Smaller chunks alone did not make that model reliable under the observed memory pressure.

The replacement uses the official Nano implementation pinned to source revision `5de7a54aa4e5e2baadb0182dde554908b48b85c2` and model revision `71ccd1d0081b430592cea481f4307e764e07bc64`. The source and model are stored locally, and production loads their exact paths without a network lookup. The existing Python environment was not upgraded.

- Narration is split into chunks of roughly140 characters without dropping or reordering words.
- The voice reference is prepared once per process, rather than once per chunk.
- Completed chunks are saved atomically under content and voice specific hashes. A failed later chunk does not discard earlier work.
- Token limits reject potentially truncated output instead of accepting it as a completed segment.
- Two CPU threads and one interoperation thread limit contention.
- The existing five minute preflight, ten minute segment timeout and persistent circuit remain active.
- Nano's reference normalization is disabled for the existing curated reference because NumPy2 promotes its scaled waveform to float64, which the float32 speech tokenizer rejects.
- New synthesis records runtime configuration and elapsed time under `.workflow-state/tts-runs/`.

Existing valid narration remains cached. New segments record their runtime provenance. Approved source files are protected by the existing nine artifact hashes.

## Measured verification

The exact passage that previously failed completed in55.4 seconds and produced29.06 seconds of audio. Local Whisper transcription matched every word after punctuation normalization:0% word error rate. All six recovered reel segments were transcribed; none had a missing section. Existing cached segment differences were minor recognition/word variations, with the largest measured error rate9.5%.

The verified final segment was recovered through the ordinary durable WAV checkpoint path. The hold was then cleared and the normal locked scheduler started the affected skip links reel. A completed MP4 and release result must be recorded separately; synthesis success alone is not publication proof.

72 existing focused tests and3 new chunk boundary tests pass. Runtime availability is checked with:

```sh
python3 video/scripts/setup-chatterbox-nano.py --check
```

If pinned runtime files are missing, run the same command without `--check`. This restores only the configured source/model assets and does not replace the existing Python environment. Model downloads are a one time setup operation, not part of each scheduled narration run.

Evidence is in `.workflow-state/tts-repair-2026-09-29/`, including the failed original probe, successful Nano benchmark, transcript comparisons and recovery render log.

Official runtime reference: [Resemble AI Chatterbox](https://github.com/resemble-ai/chatterbox). The production pins are in `video/tts-runtime.json`.

## Completed reel and resumed queue

At12:28 Pacific the skip links reel completed: 127.13 seconds, about9.6 MB, release `readyForPosting=true`, no release errors. A full FFmpeg decode passed, and five sampled frames were reviewed for visible content and captions. Caption timing retains the existing proportional mode and passed its automated coverage check. The reel is ready for posting; this repair did not itself publish it.

At12:29 a bounded normal scheduler run resumed up to3 additional backlog reels, one attempt each. Its PID and live log are in `backlog-run.json` and `backlog-render.log` in the repair evidence directory. Eleven previously stalled reels remain after the completed skip links reel, including the work selected by this run. Do not confuse a started batch with completed or published reels.

The next normal scheduler preflight generated a fresh larger text testing segment in43.9 seconds and passed decode validation. Its full narration run reused that exact segment from cache, verifying the production entry point as well as the isolated benchmark.
