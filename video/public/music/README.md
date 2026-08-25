# Ambient Music Tracks

Production status as of 2026-07-08: use the approved Mixkit stock tracks in
the trusted cycle. Do not use the old bundled `ambient-*.mp3` files for new social reels.
They are blocked in `video/data/audio-rights.json` pending rights re-clearance
because platform uploads reported copyright claims, including
`Happy Mysterious Full Track 102 BPM, F Major` from Rapid Entertainment / Airbit
SG Pte. Ltd.

The current default is `--music=cycle`, which picks one approved Mixkit track
from `policy.trustedCycle` in `video/data/audio-rights.json`.

Higher-quality ACE-Step candidates must stay in `video/music-candidates/ace-step/`
until reviewed and promoted:

```bash
npm run video:music:register -- --source=<candidate.wav> --id=<track-id> --title="<Track Title>"
```

## Tracks

| File | Approx length |
|------|--------------|
| ambient-01.mp3 | 46s (short loop) |
| ambient-02.mp3 | 16 min |
| ambient-03.mp3 | 10 min |
| ambient-04.mp3 | 6 min |
| ambient-05.mp3 | 5 min |
| ambient-06.mp3 | 8 min |
| ambient-07.mp3 | 6.5 min |
| ambient-08.mp3 | 7.8 min |
| ambient-09.mp3 | 5.6 min |
| ambient-10.mp3 | 6.3 min |
| mixkit-driving-ambition-32.mp3 | 1.7 min |
| mixkit-serene-view-443.mp3 | 1.9 min |
| mixkit-valley-sunset-127.mp3 | 2.2 min |
| mixkit-relax-beat-292.mp3 | 1.8 min |
| mixkit-spirit-in-the-woods-139.mp3 | 1.9 min |
| mixkit-relaxation-05-749.mp3 | 2.0 min |
| mixkit-forest-treasure-138.mp3 | 1.7 min |
| mixkit-vastness-184.mp3 | 3.8 min |
| mixkit-feedback-dreams-588.mp3 | 2.5 min |
| mixkit-meditation-441.mp3 | 2.0 min |
| fused-original-01.mp3 | 3 min |
| fused-original-02.mp3 | 3 min |
| fused-original-03.mp3 | 3 min |
| fused-original-04.mp3 | 3 min |
| fused-original-05.mp3 | 3 min |

## Requirements For Any New Track

- Format: MP3, 60s minimum (looped automatically if shorter than video)
- No vocals or lyrics
- Volume is auto-ducked to 15% under narration
- Rights status must be `approved` in `video/data/audio-rights.json`
- Store source URL, license, acquisition date, verification date, allowed
  platforms, and SHA-256 hash in the rights record
- Keep a local evidence copy outside generated output when possible

## Usage

Use the approved local cycle:

```bash
node scripts/render.mjs --post=<slug> --music=cycle --voice=chatterbox
```

Audit the catalog and rendered reels:

```bash
npm run video:audio-rights
```
