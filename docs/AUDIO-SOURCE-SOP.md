# Audio Source SOP

## Goal

Use a tiny local collection of trusted background audio for reels without relying on active platform-by-platform copyright checks.

## YouTube Rule To Respect

YouTube says Shorts over one minute with any active Content ID claim are blocked globally. YouTube also says most songs in the Shorts Audio Library can be used up to 90 seconds in a three-minute Short, with some limited to 60 or 30 seconds, and that royalty-free music from the YouTube Audio Library should not receive a Content ID claim on YouTube.

Reference:
- https://support.google.com/youtube/answer/15424877
- https://support.google.com/youtube/answer/3376882

## Policy

1. Default render music is `--music=cycle`.
2. The cycle comes from `policy.trustedCycle` in `video/data/audio-rights.json`.
3. Run `npm run video:audio-rights` only when adding, removing, or changing local audio files.
4. Do not use social trending sounds, unofficial YouTube uploads, generic royalty-free compilations, or tracks with incomplete source evidence.
5. Old `ambient-*.mp3` files are archived and blocked pending re-clearance.
6. The production cycle is the approved track list in `video/data/audio-rights.json`; do not copy its count into this SOP. The renderer normalizes every selected bed to the policy loudness target.

## Approved Free Options

Best current option: the approved Mixkit stock cycle in `video/data/audio-rights.json`.
- Mixkit says its free music can be used on YouTube, social media platforms, podcasts, websites, and online advertisements.
- Mixkit says attribution is appreciated but not required.
- Do not use Mixkit music in CDs, DVDs, video games, or TV/radio broadcasts.

YouTube-only safest option:
- Download from YouTube Studio Audio Library.
- YouTube says Audio Library files are copyright-safe on YouTube and will not be claimed through Content ID.
- YouTube also says it cannot give legal guidance for off-platform music issues, so do not treat YouTube Audio Library files as the cross-platform default unless the track license itself supports that use.

Generated local originals:
- Disabled as the production default. Keep only as a fallback if explicitly approved.
- Generated from FFmpeg oscillator formulas.
- No source samples.
- Registered as Fused original work in `video/data/audio-rights.json`.

Higher-quality local generation option:
- Generate instrumental candidates with ACE-Step in the repo-local venv.
- Candidates are written to `video/music-candidates/ace-step/`, which is ignored by git and is not production approved.
- First use may download ACE-Step checkpoints into `.model-cache/ace-step/checkpoints`.
- On macOS, keep ACE-Step `bf16` disabled unless the local torch build has been verified with Apple Metal/MPS.
- If ACE-Step hits an MPS memory limit, retry drafts with `--force-cpu=true --steps=2 --duration=5` to verify the pipeline, then move full-quality generation to a machine with more GPU/MPS memory.
- Generated candidates still require listening review and rights registration before production use because AI models can unintentionally produce similar musical material.

Public domain or CC0 option:
- Use only when the exact file, source URL, license page, acquired date, verified date, and SHA-256 hash are recorded.
- Do not rely on a collection-level claim alone.

## Add A Generated Track

### Simple Procedural Track

1. Generate the MP3 into `video/public/music/`.
2. Run:

```bash
shasum -a 256 video/public/music/<file>.mp3
ffprobe -v error -show_entries format=duration,size -of default=nw=1 video/public/music/<file>.mp3
```

3. Add a record to `video/data/audio-rights.json`:

```json
{
  "title": "Fused Original Bed 06",
  "status": "approved",
  "sha256": "<sha256>",
  "sourceName": "Fused Distribution procedural FFmpeg synthesis",
  "sourceUrl": "local:video/public/music/<file>.mp3",
  "license": "fused-original",
  "acquiredAt": "YYYY-MM-DD",
  "verifiedAt": "YYYY-MM-DD",
  "allowedPlatforms": ["youtube", "facebook", "instagram", "linkedin", "x"],
  "generationMethod": "Generated from oscillator formulas using FFmpeg lavfi; no sampled source media, downloaded loops, third-party melodies, vocals, or lyrics."
}
```

4. Add the filename to `policy.trustedCycle`.
5. Run `npm run video:audio-rights`.

### ACE-Step Candidate Track

Generate a candidate:

```bash
npm run video:music:ace -- --prompt="instrumental warm modern business background, clean drums, soft piano, subtle synth pads, optimistic but not corporate stock music, no vocals" --lyrics="[inst]" --duration=90 --steps=27 --seed=7001 --name=fused-ace-candidate-01
```

For a higher quality candidate, raise `--steps=60`. Use shorter durations while drafting to conserve compute.

Listen locally:

```bash
afplay video/music-candidates/ace-step/<timestamp>/fused-ace-candidate-01.wav
```

Promote only a reviewed candidate:

```bash
npm run video:music:register -- --source=video/music-candidates/ace-step/<timestamp>/fused-ace-candidate-01.wav --id=fused-ace-01 --title="Fused ACE 01" --review-notes="Listened end to end. Instrumental only. No obvious third-party melody, vocal, lyric, tag, or watermark."
npm run video:audio-rights
```

Promotion normalizes the track to MP3, stores it under `video/public/music/`, writes the SHA-256 and generation evidence to `video/data/audio-rights.json`, and adds it to `policy.trustedCycle` unless `--no-cycle` is passed.

## Render

```bash
cd video && set -a && source .env && set +a && node scripts/render.mjs --post=<slug> --music=cycle --voice=chatterbox
```

For a narration-only render:

```bash
cd video && set -a && source .env && set +a && node scripts/render.mjs --post=<slug> --music=none --voice=chatterbox
```
