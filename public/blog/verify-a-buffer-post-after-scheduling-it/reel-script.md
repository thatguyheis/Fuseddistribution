# Reel Script: Verify a Buffer Post After Scheduling It
format: long-form
engagement-policy: 1
content-kind: educate

---
## HOOK
**Visual:** Approved hero at frame zero; redacted Buffer queue record remains readable.
**Duration:** 4s
Narration: Did Buffer actually schedule your reel?

---
## OVERLAY: Read back the post ID
**Visual:** Hypothetical redacted response with ID, channelId, dueAt, and status highlighted.
**Duration:** 30s
Narration: Treat creation and verification as separate steps. Save the returned post ID, but do not call it confirmed yet. Query Buffer again and read back the ID, channelId, dueAt, status, and assets. Redact account identifiers and keep the observation time with the record. Store the creation receipt immediately, then add the verification result. If the next step fails, you still have the identifier needed to investigate what happened without starting again.

---
## OVERLAY: Match channel and schedule
**Visual:** Intended channel and UTC schedule compared with the readback values.
**Duration:** 30s
Narration: Compare channelId with the intended channel. Then compare dueAt as an instant in UTC, not as unconverted clock strings. A scheduled post is waiting. A sending post is moving. A sent post is different, so label it accurately. Compare the full date as well as the clock time. A post can look correctly timed while belonging to tomorrow, or to a different time zone from the one you expected.

---
## OVERLAY: Confirm the retained video
**Visual:** Assets list with a video MIME type marked as verified.
**Duration:** 30s
Narration: Inspect assets, not just the caption. Read back the expected video asset and its video MIME type. An empty or wrong asset is not a verified reel. If you replace media later, confirm that the ID, text, channel, due time, and intended video still match. Before uploading, also verify the public video link returns the intended file. A local export can be valid while its hosted copy is missing, outdated, or an entirely different asset.

---
## OVERLAY: Investigate before retrying
**Visual:** Timeout branches to ID lookup, queue search, and a single safe checkpoint.
**Duration:** 30s
Narration: The dangerous moment is an unknown outcome. If a request times out, the post may still exist. Search by the saved ID, then match channel, text, and due time before creating again. The local workflow recovers matching live posts first, avoiding duplicate scheduled posts. A failed lookup is not proof that creation failed. Preserve the receipt, record the uncertainty, and wait for a reliable status response before deciding whether any new create request is needed.

---
## QUESTION
**Visual:** One clear comment prompt.
**Duration:** 5s
Text: What field do you verify first?
Subtext: COMMENT BELOW
Engagement-beat: identity
Narration: What field do you verify first?
