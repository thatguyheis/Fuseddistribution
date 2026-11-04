# Reel Script: Verify a Buffer Post After Scheduling It
format: long-form
engagement-policy: 1
content-kind: educate

---
## HOOK
**Visual:** Approved hero at frame zero; redacted Buffer queue record remains readable.
**Duration:** 4s
Narration: Did Buffer schedule your post, or only accept your request?

---
## OVERLAY: Read back the post ID
**Visual:** Hypothetical redacted response with ID, channelId, dueAt, and status highlighted.
**Duration:** 22s
Narration: Treat creation and verification as separate steps. Save the returned post ID, but do not call it confirmed yet. Query Buffer again and read back the ID, channelId, dueAt, status, and assets. Redact account identifiers and keep the observation time with the record.

---
## OVERLAY: Match channel and schedule
**Visual:** Intended channel and UTC schedule compared with the readback values.
**Duration:** 22s
Narration: Compare channelId with the intended channel. Then compare dueAt as an instant in UTC, not as unconverted clock strings. A scheduled post is waiting. A sending post is moving. A sent post is different, so label it accurately.

---
## OVERLAY: Confirm the retained video
**Visual:** Assets list with a video MIME type marked as verified.
**Duration:** 22s
Narration: Inspect assets, not just the caption. Read back the expected video asset and its video MIME type. An empty or wrong asset is not a verified reel. If you replace media later, confirm that the ID, text, channel, due time, and intended video still match.

---
## OVERLAY: Investigate before retrying
**Visual:** Timeout branches to ID lookup, queue search, and a single safe checkpoint.
**Duration:** 24s
Narration: The dangerous moment is an unknown outcome. If a request times out, the post may still exist. Search by the saved ID, then match channel, text, and due time before creating again. The local workflow recovers matching live posts first, avoiding duplicate scheduled posts.

---
## QUESTION
**Visual:** One clear comment prompt.
**Duration:** 5s
Text: What field do you verify first?
Subtext: COMMENT BELOW
Narration: What field do you verify first?
