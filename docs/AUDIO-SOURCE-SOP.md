## YouTube Studio import approved October 6, 2026

Nick supplied 26 downloads and explicitly confirmed all carry the YouTube Audio Library License quoted in `video/data/audio-evidence/youtube-studio-2026-10-06.json`. This is user-confirmed per-file provenance, not a claim of an independent Studio lookup. That license permits use incorporated into videos/content, including monetized videos, without attribution. It does not permit standalone redistribution or unrestricted use of the source files. This approval supersedes the older pending-download status below for these exact files only.

Music approval and the active background rotation are defined by `policy.trustedCycle` in `video/data/audio-rights.json`; sound effects are cataloged separately in `video/data/sound-effects-rights.json` and excluded from random background selection. Use effects deliberately for relevant scenes; never insert gunshots, impacts, children or traffic sounds simply to fill silence. Artist metadata is left unknown for effects where it was not supplied.

## Gone Away retirement, October 15, 2026

Do not use “Gone Away” by Blue Beat Review (`youtube-gone-away-blue-beat-review.mp3`) in new renders. It was removed from `policy.trustedCycle` and its record is `retired`. Use another currently approved track from the trusted cycle when background music fits. If a track is retired after a reel has been scheduled, replace the scheduled media with a verified render using a different approved track and preserve the original caption, channel, and schedule. Keep the retired source and evidence for audit history; it is not an eligible generation source.

Keep original MP3 bytes in `video/private-audio/youtube/music/` and `video/private-audio/youtube/sound-effects/`. Music has an identical local renderer copy in `video/public/music/`; this is Remotion's local asset input, outside the deployed website's `public/` tree. Both original files and renderer copies are excluded from Git. Do not deploy a Remotion static bundle, expose its preview publicly, or copy these files into the website. Only finished videos may include the audio in published output.

Approval is bound to SHA-256 and preserved license evidence. Import validates metadata, full decoding and integrated loudness without re-encoding the supplied MP3s. New music uses the existing narration-relative mix. Rights approval is not a claim of listening review, instrumental-only content or permanent freedom from claims. Review musical fit and any vocals in the final reel. Keep all previous track revocations and final release checks intact.

## Approved narration profile, October 15, 2026

Full Chatterbox Standard is the default for every new production narration. Nick reviewed the latest complete reel and requested the higher-quality voice even when local generation takes longer. Keep Nano available only for explicitly requested comparison or recovery work; never silently fall back to it. The pinned Standard model revision, source, voice reference and quality profile are in `video/tts-runtime.json`.

Use the full-precision Standard model with the existing curated `video/voice-sample/voice-reference.wav`. Set exaggeration to0.4 and CFG weight to0.5. Use sentence-aware chunks up to280 characters, a600-token cap per chunk, and seed1337 with the existing per-chunk derivation. Keep CPU generation, two threads, durable chunk checkpoints and the supervised45-minute batch ceiling. The larger chunks and longer supervised run favor natural phrasing and uninterrupted sentence flow; never remove the token-limit truncation check.

Preserve the voice reference samples without repeated loudness normalization; the current runtime's normalization path has a float-type compatibility issue. Keep the reference free of background music, clipping and multiple speakers. Do not replace or denoise the approved reference without another listening comparison.

Retain native-rate lossless WAV masters in each narration folder's `masters/` directory. Encode the Remotion narration copy with an explicit192kbps AAC target (actual bitrate depends on the codec and sample rate). Do not upsample, change pitch or tempo, apply aggressive denoising, or repeatedly re-encode compressed copies to claim better quality. Existing approved cached narration stays intact; this encoding policy applies to newly generated or recovered narration.

Keep the current100ms joining gap, reproducible sampling, durable checkpoints and the token-limit rejection. Never force truncated speech through release checks. Listen across joins and to names, numbers, abbreviations and the final sentence. Check finite samples, clipping, full decoding and transcript coverage; ASR accuracy is not a substitute for naturalness and voice-likeness review. Make pronunciation adjustments only in staged spoken text, preserving approved article source files. Keep music below narration under the existing mix policy.

Keep CPU generation, two threads, producer locks and the longer supervised timeout. Do not introduce untested quantization or weaker-model fallback. Cache keys include the model profile and settings, so Nano audio is never mistaken for Standard output. Any later parameter, model or voice change needs a fresh matched-text listening test and cache/provenance review. The latest full-reel Standard run is recorded in `content/coin-history/silver-dollar-roll-hoards-hidden-gems/production-status.json`.

September 23 owner decision: free music only. Paid-library recommendations below are historical comparison, not the active plan. Use YouTube Studio Audio Library for new YouTube-specific music, with exact license and attribution evidence. Cross-platform use requires track-specific permission; do not silently approve it for Instagram or X. Adding replacement Audio Library files and checking channel claims is pending a usable signed-in Studio session. The existing nine free Mixkit tracks retain local license approval, without any claim-proof guarantee. All revoked/unknown old mixes remain blocked from new publishing. No new track has been downloaded or approved in this review.

# Audio Source SOP

## Goal

Use a tiny local collection of trusted background audio for reels without relying on active platform-by-platform copyright checks.

## YouTube Rule To Respect

The September 22 claim blocked a Short longer than one minute globally. As checked September 23, YouTube announces a September 24 change under which new Shorts longer than one minute and under three minutes with an active Content ID claim may remain playable. Do not assume this resolves an existing block or grants rights to a recording. Remove claimed content and verify the individual upload in Studio. YouTube says most Shorts Audio Library songs allow up to 90 seconds, with some limited to 60 or 30 seconds; that library is distinct from the YouTube Audio Library.

Reference:
- https://support.google.com/youtube/answer/15424877
- https://support.google.com/youtube/answer/3376882

## Policy

1. Default render music is `--music=cycle`.
2. The cycle comes from `policy.trustedCycle` in `video/data/audio-rights.json`.
3. Run `npm run video:audio-rights` when adding, removing, changing or revoking local audio. After a claim, include existing renders with `node video/scripts/audit-audio-rights.mjs --include-renders`; summarize counts rather than dumping the full report into model context.
4. Do not use social trending sounds, unofficial YouTube uploads, generic royalty-free compilations, or tracks with incomplete source evidence.
5. Old `ambient-*.mp3` files are archived and blocked pending re-clearance.
6. The production cycle is the approved track list in `video/data/audio-rights.json`; do not copy its count into this SOP. The renderer normalizes every selected bed to the policy loudness target.
7. When the owner retires a track, remove it from `policy.trustedCycle` and set its record to `retired`. Preserve the audio file and rights evidence for audit history. Do not select a retired track for a new render; already scheduled media that uses it must be replaced when the owner requests removal.

## Approved Free Options

Approved free background options: use only the tracks currently listed in `policy.trustedCycle` in `video/data/audio-rights.json`, including the eligible YouTube Studio downloads and Mixkit tracks. Check each track's `allowedPlatforms` before selecting it. A local rights approval is not a guarantee against future Content ID claims.
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

## September 23 music claim containment

`mixkit-driving-ambition-32.mp3` is blocked pending re-clearance and removed from the trusted cycle. A user supplied YouTube notice names “Turn Up” by RIMBOY OFFICIAL, Yeeh Sir, owned by ONErpm, updated September 22. The affected reel metadata identifies Driving Ambition; this does not independently establish that the two recordings are the same or that the claim is valid. Preserve both the license evidence and claim.

- Recheck current render audio rights immediately before every Buffer create operation, including cached queues. An old approval or prepared public MP4 is not current clearance.
- Inventory all renders using the revoked file. The September 23 inventory contains 31 reels in `.workflow-state/audio-claim-2026-09-23/affected-reels.json`. Existing remote schedules and published copies require separate reconciliation; a local block does not remove remote media.
- For this copyright recovery, a narration only correction is permitted with an explicit release note. Preserve all original narration and the full ending. Use clean narration stems with exact transition frame offsets, never mute the entire soundtrack or shorten the reel to evade a claim.
- Preserve the original MP4 and metadata. Keep the correction separate until release review and hosting verification; never change original metadata to claim old bytes contain no music. Regenerate hosted derivatives and queue manifests before scheduling corrected media.
- Prefer removing the song from the affected upload in YouTube Studio when its preview preserves speech. Verify claim removal after processing. A local correction does not establish that the upload is unblocked.
- Do not dispute a claim without reviewing the exact recording, license and claim evidence. “Royalty free” is not a guarantee against Content ID matches.

## Source selection review (September 23, 2026)

Nick reported fixing the affected YouTube upload in Studio. Keep Driving Ambition out of the mix. No replacement subscription or new track was purchased or approved by this review.

| Source | Fit for Fused | Required controls |
| --- | --- | --- |
| YouTube Studio Audio Library | Preferred free source for YouTube-only exports. YouTube says these downloads will not be claimed through Content ID. | Save the exact track license and attribution requirements. Do not assume the same file is licensed for other platforms; check its specific license first. This is not the Shorts popular-song library. |
| Artlist Music Pro | Recommended paid shortlist choice for one commercial reel across social platforms. Pro covers commercial projects and worldwide platforms; Clearlist supports channel/video clearance. | Verify account eligibility, register supported channels before publishing, preserve track and subscription evidence, and keep coverage active for new publishing. The personal Social plan is not the commercial recommendation. |
| Epidemic Sound commercial plan | Alternative paid shortlist with channel/video safelisting and commercial online coverage. | Confirm the current Pro/Business plan fits Fused and every destination before purchase. Safelist before publishing. Published content remains cleared after cancellation, but new publishing requires active coverage. |
| Remaining registered Mixkit tracks | Existing free option for YouTube, social media and online ads. | Preserve file hashes and license evidence; retain claim revocations and the publish-time rights check. Do not describe the library as claim-proof. |

Recommendation: for free YouTube exports, select instrumental Audio Library tracks with no attribution required where practical. For a shared commercial export across YouTube, Instagram and X, evaluate Artlist Music Pro first. A provider recommendation is not approval of every track. Before adding files to the trusted cycle, record the exact source/license, SHA-256, allowed destinations, acquisition date, listening review and any channel-clearance requirements. Subscription tracks also need publication-time entitlement checks, including reposts; the current file-based approval alone is insufficient. Retain the existing remaining cycle until a replacement is licensed and registered.

Primary sources checked:
- YouTube Audio Library: https://support.google.com/youtube/answer/3376882
- Mixkit music uses and attribution: https://mixkit.co/free-stock-music/
- Artlist Pro and Social scope: https://help.artlist.io/hc/en-us/articles/29559573229725-Artlist-s-Music-and-SFX-plans-explained
- Artlist Clearlist and active subscription requirements: https://help.artlist.io/hc/en-us/articles/29648622402333-Understanding-Artlist-s-Clearlist
- Epidemic commercial licensing: https://www.epidemicsound.com/how-it-works/business-music-licensing/
- Epidemic safelisting and cancellation: https://www.epidemicsoundhelp.com/hc/en-us/articles/26248340314258-Safelisting
