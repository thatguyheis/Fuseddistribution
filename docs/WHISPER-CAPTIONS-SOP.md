# Local Whisper captions

Use local faster-whisper with word timestamps for all new reels. Configuration is in `video/whisper-runtime.json`; exact Python dependencies are frozen in `video/whisper-requirements.txt`. This requires no paid transcription API. The runtime was verified on this Mac with Python 3.14.

## Setup from repository root

```sh
python3 -m venv .local-tools/whisper-venv
.local-tools/whisper-venv/bin/python -m pip install -r video/whisper-requirements.txt
.local-tools/whisper-venv/bin/python video/scripts/setup-whisper.py
```

Downloads occur only during setup. The worker loads the pinned local English model with CPU int8, four threads, beam size five, word timestamps and speech activity filtering, processing all missing segments in one model session. PyAV is pinned to 16.1.0 because version 19 rejects the decoder arguments used by faster-whisper 1.2.1.

## Production and recovery

The renderer checks runtime/model files before expensive generation. Missing audio, missing models or failed transcription must stop the render with a diagnostic path; do not silently substitute proportional timing. Cache entries depend on audio bytes, narration and runtime configuration. Changed inputs require new transcription; unchanged segments reuse results without LLM tokens or network access.

To test existing narration without changing published or comparison assets:

```sh
node video/scripts/generate-captions.mjs --post=walking-liberty-half-dollar-silver-eagle --output-dir=.workflow-state/whisper-repair/coin-test
```

Read `whisper-diagnostics.json`, `captions-meta.json` and caption text. Check dates, names and the beginning/middle/end against narration before release. Real speech pauses can leave intentional caption gaps; coverage checks are only structural checks, not proof of accurate speech alignment. A repaired caption generator does not change captions burned into an existing MP4; changing those requires a separate render and visual review.

The old failure was a hardcoded, removed whisper-node executable/model plus silent error handling. Keep the new runtime independent of JavaScript dependency installation. Runtime, model and transcript caches are local ignored files; do not commit audio caches.

## Verification on 2026-10-13

Six existing coin narration clips transcribed locally. A repeat run reused all six cached results. Four regression tests passed (timing/grouping, invalid timestamps, cache invalidation and punctuation-only artifacts), JavaScript syntax checks passed, and pip dependency checks passed. The base English model still makes occasional wording/name errors, including Weinman, so the output explicitly requires text review; automatic success is not editorial approval. No existing video was re-rendered or published during this repair.

For a reviewed presentation, an episode may supply a pinned stronger model with `WHISPER_RUNTIME_CONFIG=<path>` to the renderer, or `--runtime-config=<path>` to the caption CLI. The Fort Vancouver workup retains its small.en configuration. This does not change the ordinary default model. Quantized zero-length word tokens merge with neighboring timed speech without inventing timestamps; reversed or overlapping intervals still fail. Keep raw ASR evidence and record any editorial spelling corrections before release.
