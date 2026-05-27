# Voice Sample for Coqui XTTS v2

Coqui needs a reference WAV file of your voice (minimum 6 seconds, 10–30 seconds is ideal).

## How to record

Open QuickTime Player → File → New Audio Recording → record yourself reading the text below → export as WAV.

Or use this one-liner in Terminal (records for 20 seconds):

```bash
sox -t coreaudio default voice-reference.wav trim 0 20
```

(Install sox first if needed: `brew install sox`)

## What to say

Read this naturally — conversational, not scripted-sounding:

> "Silver has been used as money for thousands of years. Before 1965, every dime, quarter, and half dollar in your pocket was ninety percent pure silver. Today those same coins trade as bullion, at a fraction of the premium you'd pay for branded silver like Eagles or Maples."

## File placement

Save the recording as:
```
video/voice-sample/voice-reference.wav
```

Keep it under 30 seconds. One clean take, no background noise.

## After recording

Run the test script to confirm Coqui can clone your voice:
```bash
cd "/Users/nick/Documents/New project/video"
node scripts/test-voice.mjs
```
