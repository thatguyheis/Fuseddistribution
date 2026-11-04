# Reel Script: Checking Names and Numbers in Whisper Transcripts
format: long-form
segments: 6
target-duration: 123s
engagement-policy: 1
content-kind: educate

---
## HOOK
**Visual:** Approved hero at frame zero; question remains readable.
**Duration:** 3s
Narration: Can you trust every Whisper caption?

---
## OVERLAY: Replay names and numbers
**Visual:** Synthetic transcript comparison: Jordan Bell ordered sixteen blue notebooks.
**Duration:** 30s
Narration: Start with the approved narration, then mark every proper name, number, date, price, code, and unit. Listen to each one before looking at the transcript. Synthetic example: Jordan Bell ordered sixteen blue notebooks. If the caption says sixty, replay the audio and decide what was actually spoken. The script shows intent, the audio shows speech, and the transcript shows a model’s interpretation. Keep those checks separate.

---
## OVERLAY: Local versus hosted transcription
**Visual:** Local faster-whisper path beside a separate hosted service path.
**Duration:** 30s
Narration: This project uses local faster-whisper, configured for an English base model, word timestamps, CPU inference, and voice activity detection. The caption script sends each narration segment to that local worker and caches its result. That is not the same as sending audio to a hosted transcription service. Models, settings, processing, and output can differ. Know which path produced your captions before you describe the result or approve it.

---
## OVERLAY: Correct text, keep timing
**Visual:** Word caption correction with unchanged start and end markers.
**Duration:** 30s
Narration: When the audio is right and only the recognized word is wrong, replace the caption text while preserving its start and end times. That keeps the visible correction aligned with the speech. If the narration changed, a phrase was added, or timing is attached to the wrong word, regenerate the audio and run transcription again. Never stretch a caption across silence just to make a corrected sentence fit.

---
## OVERLAY: Reject invented endings
**Visual:** Final waveform ends; extra caption words fade as unverified.
**Duration:** 30s
Narration: Check the ending separately. Whisper documentation warns that recognition can include text that was not spoken, and silence controls are only defenses. Play the final sentence plus the following moment. If captions continue after real speech ends, remove the extra words. Verify the final question word for word, compare the visible card with the spoken line, and release only what you can hear in the actual audio.

---
## QUESTION
**Visual:** One clear identity prompt.
**Duration:** 3s
Text: Which caption detail do you check first?
Subtext: COMMENT BELOW
Engagement-beat: identity
Narration: Which caption detail do you check first?
