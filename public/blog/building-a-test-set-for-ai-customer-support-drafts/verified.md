# Build a Test Set for AI Customer Support Drafts

Build a support-draft test set from representative questions, approved answers and explicit failure cases. Keep it separate from the live support channel. The test should tell you whether a draft is useful and safe to review, not merely whether the model can produce a fluent response.

This is a proposed internal evaluation method. It does not authorize automated sending or establish that a system is reliable for every customer. Begin with a narrow support task and a reviewer who knows the relevant service policies. If those policies are unclear, resolve the ambiguity before using them as expected answers.

## Define what the support draft may do

Write down the allowed task. For example, the model may draft an answer using an approved service description and a supplied question. It may not invent a refund exception, promise availability or claim an action has already happened. These examples describe proposed boundaries; adapt them to your actual service.

Specify what the reviewer receives alongside the draft. Include the original question, the allowed source material and any relevant restrictions. A response can look correct while answering a different question or omitting a condition. The reviewer needs enough context to detect those errors without reconstructing the case from memory.

If the draft refers to an action, distinguish proposing that action from carrying it out. An answer saying a booking is confirmed needs authoritative confirmation evidence. A language model's confidence is not that evidence. Keep account changes, payments and external messages outside the draft test unless a separately reviewed workflow explicitly covers them.

## Create cases that reveal different failures

Include routine questions the chosen task is expected to handle. Add cases with missing information, ambiguous wording, conflicting instructions and requests beyond the service's scope. These are useful categories to consider, not a fixed checklist that proves complete coverage. Choose cases based on how the real task can fail.

For a missing-information case, the expected behavior might be a concise clarification request. For an out-of-scope question, it might be an accurate explanation of the limit and a handoff to a person. Do not score every refusal as a failure or every completed answer as a success. The desired behavior depends on the case.

Use information you are authorized to process. Remove personal details from illustrative cases and check the selected tool's data controls before uploading business records. Where real examples are unsuitable, write synthetic cases and label them as synthetic. A made-up test question must not later be presented as an actual customer interaction.

## Write expected outcomes before running the model

For each case, record the acceptable answer elements, the facts that must not appear and the reason for the expected behavior. Exact wording usually matters less than whether the response uses the approved facts, preserves important conditions and avoids unsupported commitments. Define exact matching only where the format genuinely requires it.

Keep critical failures distinct from style preferences. A wrong deadline or invented refund promise is not equivalent to a sentence that is slightly too long. If you combine every issue into one score, a polished tone can obscure a serious factual error. A simple case record can contain a pass/fail judgment plus named issues and reviewer notes.

Do not rewrite the expected outcome after seeing the answer just to make the model pass. If the original expectation was wrong, correct it transparently and record why. That preserves the value of the test while acknowledging that test cases themselves need review.

## Preserve a stable comparison

Save the input, prompt, allowed source, model configuration and raw output for each run. Keep a portion of the cases unchanged while refining the workflow. Otherwise an apparent improvement might simply reflect easier questions or different reference material. Record changes instead of relying on a memory of how the last run looked.

Separate cases used to refine the prompt from cases reserved for a later check. Success on examples repeatedly shown during development is not strong evidence of performance on unfamiliar requests. The exact split depends on your task and available examples; do not treat a suggested arrangement as a statistical guarantee.

Our guide to [choosing a first AI task](/blog/choosing-a-low-risk-first-ai-task-for-a-small-business/) covers keeping the experiment narrow. The [website change review guide](/blog/how-to-review-website-changes-before-they-go-live/) provides a related way to distinguish a prepared change from an approved release.

## Measure correction work as well as output quality

Record how long the reviewer spends checking and correcting the draft, along with whether the final answer is usable. Include preparation and saving time when comparing with the manual task. A quick generated response is not necessarily a faster completed support process.

Review the failures by type. Repeated missing conditions may require clearer source material. Unsupported claims may require a narrower task or stronger rejection behavior. Formatting problems may be addressable with deterministic checks. Do not assume every failure calls for a larger model, and do not weaken the acceptance criteria simply to make the experiment look successful.

## Decide what the evidence supports

The [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) provides voluntary context for considering trustworthiness across AI use and evaluation. This article's test procedure is original guidance, not a NIST certification. Passing a local test set does not by itself authorize customer-facing automation.

At the end of the trial, document the tested scope, unresolved failures and next decision. You may keep drafting with review, revise the task or stop. If you later add new information sources or permission to send replies, evaluate that changed workflow explicitly. Keep the evidence attached to the version that produced it.

## Sources

- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework): voluntary evaluation context. Test design suggestions are original and contain no measured customer outcomes.

## Related

- [Choose a first AI task](/blog/choosing-a-low-risk-first-ai-task-for-a-small-business/)
- [Review website changes before release](/blog/how-to-review-website-changes-before-they-go-live/)

Read next: [Define a narrow first AI experiment](/blog/choosing-a-low-risk-first-ai-task-for-a-small-business/).
