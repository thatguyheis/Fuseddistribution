# What to Record When an AI Answer Is Wrong

hook: Wrong answer? Keep the evidence.

## segments
- type: overlay
 text: PRESERVE THE REQUEST BEHIND THE WRONG ANSWER
 narration: Record the task identifier, time, tool and visible model version when available. Save the relevant prompt and input as they existed at the time. A rewritten prompt may be useful for a repair test, but it is a different input. Label it separately so someone can distinguish the original failure from the attempted fix.
- type: overlay
 text: EXPLAIN WHAT MADE THE AI ANSWER WRONG
 narration: Quote only the relevant part of the output in the internal record, then describe the expected behavior. Attach the source, business rule or acceptance criterion that supports the correction. Separate an incorrect factual statement from an incomplete answer, a formatting defect or a response that followed the wrong instruction. Use a clearly labeled hypothetical example: a draft reply promises delivery on a date that the order record does not confirm.
- type: overlay
 text: RECORD WHETHER THE WRONG ANSWER REACHED ANYONE
 narration: Mark whether the output remained a draft, was approved, was sent or triggered another action. Include the affected artifact or transaction identifier where appropriate. A generation log does not establish that a customer received the message. Likewise, editing the local draft does not prove that an already sent message has been corrected. Assign a person to decide what follow up is needed.
- type: overlay
 text: VERIFY THE CORRECTION AGAINST THE ORIGINAL REQUEST
 narration: Save the change made, the test input and the resulting output. Check the original failure and a few relevant neighboring cases. A successful answer to a rewritten question is useful evidence only for that question. Keep any remaining limitation visible, including situations that still require a person to review the result. Close the record when the affected work and the repair have both been checked.

## question
When an AI draft is wrong, is finding the cause or checking the correction harder?
