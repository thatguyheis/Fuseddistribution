# Reel Script: building-a-test-set-for-ai-customer-support-drafts
format: long-form
engagement-policy: 1
content-kind: educate
segments: 6
target-duration: 120s

---

## HOOK

**Visual:** Test the draft before it travels
**Duration:** 18s minimum

Narration: Build a support-draft test set from representative questions, approved answers and explicit failure cases. Keep it separate from the live support channel. The test should tell you whether a draft is useful and safe to review, not merely whether the model can produce a fluent response.

---

## OVERLAY: DEFINE DRAFT BOUNDARIES

**Visual:** Define draft boundaries
**Duration:** 19s minimum

Narration: Write down the allowed task. For example, the model may draft an answer using an approved service description and a supplied question. It may not invent a refund exception, promise availability or claim an action has already happened. These examples describe proposed boundaries; adapt them to your actual service.

---

## OVERLAY: INCLUDE DIFFICULT CASES

**Visual:** Include difficult cases
**Duration:** 19s minimum

Narration: Include routine questions the chosen task is expected to handle. Add cases with missing information, ambiguous wording, conflicting instructions and requests beyond the service's scope. These are useful categories to consider, not a fixed checklist that proves complete coverage. Choose cases based on how the real task can fail.

---

## OVERLAY: SET EXPECTED OUTCOMES

**Visual:** Set expected outcomes
**Duration:** 19s minimum

Narration: For each case, record the acceptable answer elements, the facts that must not appear and the reason for the expected behavior. Exact wording usually matters less than whether the response uses the approved facts, preserves important conditions and avoids unsupported commitments. Define exact matching only where the format genuinely requires it.

---

## OVERLAY: PRESERVE THE COMPARISON

**Visual:** Preserve the comparison
**Duration:** 37s minimum

Narration: Save the input, prompt, allowed source, model configuration and raw output for each run. Keep a portion of the cases unchanged while refining the workflow. Otherwise an apparent improvement might simply reflect easier questions or different reference material. Record changes instead of relying on a memory of how the last run looked. At the end of the trial, document the tested scope, unresolved failures and next decision. You may keep drafting with review, revise the task or stop. If you later add new information sources or permission to send replies, evaluate that changed workflow explicitly. Keep the evidence attached to the version that produced it.

---

## QUESTION

**Visual:** Keep the evidence
**Duration:** 10s minimum

Text: For AI support drafts, would you prioritize speed or catching unsupported promises?
Subtext: COMMENT BELOW
Engagement-beat: debate
Narration: For AI support drafts, would you prioritize speed or catching unsupported promises?
