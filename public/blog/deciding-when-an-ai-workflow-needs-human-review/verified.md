# When an AI Workflow Needs Human Review

An AI workflow needs human review at the point where an unchecked mistake could change a customer commitment, a business record or another consequential action. Start with the action the system can take, not how convincing its answer sounds. A draft suggestion and a sent message have different consequences even when their wording is identical.

The following decision method is original practical guidance for a small business. NIST's AI Risk Management Framework discusses clear oversight responsibilities and documentation. It does not make this worksheet a certification or replace the specific requirements that apply to your business. Use the worksheet to identify a review step you can actually carry out.

## Locate the AI workflow decision point

Map the request, the generated result and the next action. Mark where information leaves your organization or changes an authoritative record. Ask what happens if the result is wrong at that exact point. Our guide to [mapping a manual process](/blog/mapping-a-manual-business-process-before-automating-it/) can help identify these handoffs before you add automation.

Keep drafting separate from execution. In a hypothetical appointment workflow, suggesting a reply is different from confirming a time in the booking system. Write down which step the AI is allowed to perform and which evidence establishes completion. Otherwise, a successful generation can be mistaken for a correctly completed customer task.

## Choose explicit triggers for human review

List the situations that require someone to inspect the output before the next action. Useful starting questions include whether the input is incomplete, whether two sources disagree, and whether the proposed response makes a commitment outside an approved policy. Choose triggers tied to the work rather than a vague instruction to review anything unusual.

Give each trigger an observable test. For example, a draft that includes an unconfirmed delivery date should wait for a person to check the order record. Do not use the AI's confidence in its own answer as the only test. A reviewer needs access to the underlying evidence and authority to hold or correct the action.

## Make the human review step usable

Show the reviewer the original request, the proposed result and the relevant source record together. Ask for a specific decision, such as approve, revise or hold. Record who decided and what version they saw. If the output changes after approval, the old decision should not silently apply to the replacement.

Plan what happens when the reviewer is unavailable. A task may need to wait or use an established manual route. Avoid turning a missed review deadline into automatic approval. The [AI error record](/blog/what-to-record-when-an-ai-answer-is-wrong/) provides a way to preserve evidence when the review discovers a problem, including whether an incorrect output already reached anyone.

## Test the workflow before relaxing review

Use representative examples that include missing information, conflicting inputs and a request outside the intended scope. Record whether the workflow stops at the right point and whether the reviewer can resolve the issue. A good ordinary example does not establish that the exception route works. Keep test cases with the change they were used to assess.

Review the burden as well as the outcomes. If a person repeatedly fixes the same issue, improve the input or the drafting step rather than treating endless correction as success. Reduce review only when the evidence supports a narrower, well understood task. Keep a clear way to restore review when the task, source material or operating conditions change.

## Sources

- [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/): oversight roles and documentation context. The decision worksheet and appointment example above are original guidance.

## Related

- [Map a manual business process](/blog/mapping-a-manual-business-process-before-automating-it/)
- [Record a wrong AI answer](/blog/what-to-record-when-an-ai-answer-is-wrong/)

Read next: [Keep evidence when an AI answer is wrong](/blog/what-to-record-when-an-ai-answer-is-wrong/).
