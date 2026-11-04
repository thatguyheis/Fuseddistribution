# Checking Names and Numbers in Whisper Transcripts Before You Publish

Whisper can give a reel useful captions and word timing, but it does not give you permission to trust every word it prints. Proper names, product codes, dates, quantities, and prices are small pieces of text with large consequences. A single wrong character can change who did what, how many items were discussed, or what a viewer is supposed to remember.

The safest workflow is simple: use the transcript to find places to inspect, then compare those words with the actual audio and the approved narration. Correct the visible text without casually moving its timing. Treat a caption as a timed interpretation of speech, not as a recording of the speech itself.

## Know which Whisper you are using

OpenAI’s open source Whisper repository describes word level timestamps as an option that estimates each word’s start and end time. Its model card also warns that predictions can contain text that was not spoken, including hallucinated text. Timestamps can be useful and still require editorial review. Initial prompts and silence controls do not turn recognition into proof.

This project’s `video/whisper-runtime.json` selects the local `faster-whisper` implementation from SYSTRAN. It uses `Systran/faster-whisper-base.en`, CPU inference, int8 computation, beam size 5, word timestamps, and VAD. `video/scripts/generate-captions.mjs` sends each narration audio segment to the local transcription worker, caches results by audio, narration, and runtime configuration, then groups recognized words into readable caption blocks.

That is different from sending audio to a hosted transcription service. A hosted service may have different model versions, request options, processing location, retention terms, and output behavior. Do not describe this local run as an OpenAI hosted transcription, and do not assume a hosted result would match it. OpenAI’s audio documentation covers its hosted API separately, while this repository’s release captions come from the configured local faster-whisper path.

## Start with the approved words

Before opening the caption file, keep the final narration text beside the audio. Read the approved script aloud or listen to the generated segment from beginning to end. Mark every item that is easy to misrecognize:

- Personal names and business names
- Street names, product names, and uncommon terms
- Numbers, dates, percentages, prices, and measurements
- Initialisms, letter sequences, and model numbers
- The last sentence, especially if it ends near silence

For a synthetic example, the approved line might be: “Jordan Bell ordered sixteen blue notebooks.” It is synthetic, not a customer story. If the transcript says “Jordan Bell ordered sixty blue notebooks,” the caption is wrong even if its timing looks smooth. If it says “Jordan built ordered sixteen,” the name and sentence meaning both need review. Listen again at normal speed, then slower, and decide what the audio actually says.

Do not use the script as evidence that the voice said the line correctly. The script tells you what was intended. The audio tells you what was spoken. The transcript tells you what the recognizer inferred. Those are three separate checks.

## Recheck names and numbers deliberately

For a proper name, replay the smallest useful audio window, then replay the whole sentence. Listen for consonants, syllable count, and nearby words that could pull the recognizer toward a familiar phrase. If the name is important, compare the spoken audio with a pronunciation reference or spelling supplied by the person or organization. Do not silently replace a hard to hear name with the most familiar spelling.

Numbers deserve a second method. Write down what you hear before looking at the transcript. Then compare the written number with the approved narration and the caption. Pay attention to pairs that sound alike, such as sixteen and sixty, fifteen and fifty, or two and too. Also check whether the audio says a numeral, a word, a decimal, a date, or a unit. A caption that changes “three point five” to “35” is not a harmless style edit. For more on this, see [How to Use Chatterbox for Business Voiceovers](/blog/using-chatterbox-for-business-voiceovers/).

If the audio itself is unclear, mark the item unresolved. Ask for a cleaner recording, revise the narration, or remove the claim. Do not manufacture certainty by selecting whichever transcript looks more plausible. For more on this, see [How to Use Remotion to Make a Business Reel](/blog/using-remotion-to-make-a-business-reel/).

## Correct words while preserving timing

The project’s caption generator produces word timings, then groups those words into readable blocks. When the audio is correct and only the recognized text is wrong, preserve the existing start and end times and replace the caption text with the verified wording. This keeps the visible correction aligned with the speech and avoids a needless audio rerender.

That correction is safe only when the replacement has roughly the same spoken span. If the approved audio says “sixteen” but the caption says “sixty,” replacing the word is usually enough. If the narration changed, a phrase was added, or timing is attached to the wrong word, regenerate the audio and run local transcription again. Do not stretch a caption across silence just to make a corrected sentence fit.

After editing, check the caption file as a whole. Confirm that timestamps remain nonnegative and ordered, that every caption has readable duration, and that the corrected text does not introduce a word the audio never says. The generator’s metadata intentionally marks text review as required. That is a release cue, not paperwork.

## Reject invented ending speech

One failure to check for is text after the real narration ends. Whisper may infer a phrase from room tone, a breath, a music tail, or silence. An ending caption is especially risky because viewers may treat it as a final instruction or claim. If the final words are not audible, remove them. Do not keep them because they make the caption sequence look complete.

The local runtime uses VAD, which is designed to filter portions of audio without speech. That can reduce silence related errors, but it cannot replace listening. OpenAI’s Whisper code also documents silence and hallucination related controls, including a threshold for skipping silent periods when a possible hallucination is detected. These are useful defenses, not proof that every remaining word is real.

Use a hard ending check: play the last sentence and the following second or two of audio. Compare the last spoken word with the last caption word. If the caption continues after speech, delete the extra text and preserve the real ending time. If the ending question is part of the approved reel, verify it word for word and make sure the visible question matches the spoken question exactly.

## A repeatable review checklist

1. Open the approved narration, generated audio, caption output, and runtime metadata together.
2. Highlight every name, number, date, code, price, and unit in the narration.
3. Listen to each highlighted phrase without looking at the transcript first.
4. Compare what you heard with the approved text and then with the recognized text.
5. Replay any disagreement at normal and slower speed.
6. Correct text only when the audio is already right and the timing still fits.
7. Regenerate audio and captions when the spoken words changed or timing no longer matches.
8. Inspect the final seconds for invented speech, repeated phrases, or captions after silence.
9. Read the captions on a phone sized preview and confirm names and numbers remain legible.
10. Record the exact reviewed files and hashes before release.

This process also makes failures easier to explain. “The local recognizer wrote sixty” is different from “the voice said sixty” and different again from “the caption was corrected to sixteen.” Keep those facts separate in your notes.

## Sources and next step

For implementation details, see the [OpenAI Whisper repository](https://github.com/openai/whisper), its [model card](https://github.com/openai/whisper/blob/main/model-card.md), the [OpenAI hosted speech to text docs](https://developers.openai.com/api/docs/guides/speech-to-text), and the [SYSTRAN faster-whisper README](https://github.com/SYSTRAN/faster-whisper/blob/master/README.md). The README documents word timestamps and Silero VAD, while the OpenAI materials document hosted transcription, word timing, and hallucination risk. For the project path, inspect `video/whisper-runtime.json` and `video/scripts/generate-captions.mjs`.

The next time a transcript contains a name or number, pause before publishing. Listen first, correct second, and release only after the final seconds are real. Save this checklist for the next caption review.

**CTA:** Save this checklist and use it on your next transcript review.

## Related

- [How to Use Remotion to Make a Business Reel](/blog/using-remotion-to-make-a-business-reel/)
- [How to Use Chatterbox for Business Voiceovers](/blog/using-chatterbox-for-business-voiceovers/)
- [Step by Step: The One Number Every Small Business Should Check Weekly](/blog/calculate-customer-acquisition-cost-weekly-step-by-step/)

Read next: [How to Use Remotion to Make a Business Reel](/blog/using-remotion-to-make-a-business-reel/)

