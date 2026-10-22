# What to Record When an AI Answer Is Wrong

When an AI answer is wrong, save enough context to reproduce the problem, explain the expected answer and verify a correction. A note that says only “the AI failed” leaves the next person guessing. Start with the original request, the actual output and the evidence showing why that output was unsuitable.

The record below is a practical small business template, not a claim that one form satisfies an AI standard. NIST's AI Risk Management Framework Playbook discusses monitoring, documenting errors and investigating impacts. Your record should support a real decision about the affected work, not just count mistakes.

## Preserve the request behind the wrong answer

Record the task identifier, time, tool and visible model version when available. Save the relevant prompt and input as they existed at the time. A rewritten prompt may be useful for a repair test, but it is a different input. Label it separately so someone can distinguish the original failure from the attempted fix.

Keep sensitive customer material in its authorized location. Reference it from the incident record instead of spreading copies into public tickets or chat messages. If you remove sensitive details for a test, document the change and consider whether it changes the behavior you are trying to reproduce. Missing context can make an apparently identical test a different task.

## Explain what made the AI answer wrong

Quote only the relevant part of the output in the internal record, then describe the expected behavior. Attach the source, business rule or acceptance criterion that supports the correction. Separate an incorrect factual statement from an incomplete answer, a formatting defect or a response that followed the wrong instruction.

Use a clearly labeled hypothetical example: a draft reply promises delivery on a date that the order record does not confirm. The issue is the unsupported promise, not merely the tone. A reviewer can then test whether a replacement preserves uncertainty rather than replacing one invented date with another. Do not present a hypothetical as a real customer incident.

## Record whether the wrong answer reached anyone

Mark whether the output remained a draft, was approved, was sent or triggered another action. Include the affected artifact or transaction identifier where appropriate. A generation log does not establish that a customer received the message. Likewise, editing the local draft does not prove that an already sent message has been corrected.

Assign a person to decide what follow up is needed. Keep the immediate containment action separate from the longer repair. For example, holding an unsent reply prevents that particular draft from going out, but it does not establish that future drafts will be accurate. Our guide to [an exception handling log](/blog/creating-a-small-business-exception-handling-log/) shows how to connect a stalled task to an owner.

## Verify the correction against the original request

Save the change made, the test input and the resulting output. Check the original failure and a few relevant neighboring cases. A successful answer to a rewritten question is useful evidence only for that question. Keep any remaining limitation visible, including situations that still require a person to review the result.

Close the record when the affected work and the repair have both been checked. Include the reviewer and date, along with the evidence that supports closure. Track repeated failure types so you can choose useful improvements. Counting accepted work and correction effort, as described in our [rework guide](/blog/measuring-rework-instead-of-counting-automated-tasks/), gives the error log a practical purpose.

## Sources

- [NIST AI RMF Playbook: Measure](https://airc.nist.gov/airmf-resources/playbook/measure/): monitoring and error documentation context. The suggested record and example are original practical guidance.

## Related

- [Create an exception handling log](/blog/creating-a-small-business-exception-handling-log/)
- [Measure rework in automated tasks](/blog/measuring-rework-instead-of-counting-automated-tasks/)

Read next: [Measure the corrections as well as the drafts](/blog/measuring-rework-instead-of-counting-automated-tasks/).
