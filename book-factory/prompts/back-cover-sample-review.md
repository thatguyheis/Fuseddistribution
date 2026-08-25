# Back-Cover Sample Review

Use this gate after blueprint approval and before full manuscript drafting.

## Required Artifact

Review `book-factory/titles/<slug>/chapter_manuscripts/01_back_cover.md`.

## Approval Criteria

- The positioning is clear within the first two paragraphs.
- The source work is identified as a classic or public-domain source without implying original-author endorsement.
- The target reader is specific enough to judge market fit.
- The promise is useful, concrete, and not exaggerated.
- The copy shows meaningful differentiation beyond a lightly reformatted public-domain book.
- The tone matches the house style for the title.
- The copy avoids unsupported financial promises, real-person likeness risk, trademark risk, and active brand confusion.
- The sample is strong enough to justify spending time on a full draft.

## Blockers

Reject the gate when:

- The title sounds generic or undifferentiated.
- The target reader is vague.
- The adaptation angle is unclear.
- The copy overstates certainty or financial outcome.
- The source framing could confuse readers about authorship.
- Any 1930+ rights issue remains unresolved.

## Approval Command

After human approval:

```bash
node book-factory/scripts/book-factory.mjs approve <slug> back-cover-sample
```
