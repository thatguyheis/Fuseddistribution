# Build a Test Set for AI Support Drafts

hook: Test the draft before it travels

## segments
- type: overlay
 text: DEFINE DRAFT BOUNDARIES
 narration: Write down the allowed task. For example, the model may draft an answer using an approved service description and a supplied question. It may not invent a refund exception, promise availability or claim an action has already happened. These examples describe proposed boundaries; adapt them to your actual service.
- type: overlay
 text: INCLUDE DIFFICULT CASES
 narration: Include routine questions the chosen task is expected to handle. Add cases with missing information, ambiguous wording, conflicting instructions and requests beyond the service's scope. These are useful categories to consider, not a fixed checklist that proves complete coverage. Choose cases based on how the real task can fail.
- type: overlay
 text: SET EXPECTED OUTCOMES
 narration: For each case, record the acceptable answer elements, the facts that must not appear and the reason for the expected behavior. Exact wording usually matters less than whether the response uses the approved facts, preserves important conditions and avoids unsupported commitments. Define exact matching only where the format genuinely requires it.
- type: overlay
 text: PRESERVE THE COMPARISON
 narration: Save the input, prompt, allowed source, model configuration and raw output for each run. Keep a portion of the cases unchanged while refining the workflow. Otherwise an apparent improvement might simply reflect easier questions or different reference material. Record changes instead of relying on a memory of how the last run looked. At the end of the trial, document the tested scope, unresolved failures and next decision. You may keep drafting with review, revise the task or stop. If you later add new information sources or permission to send replies, evaluate that changed workflow explicitly. Keep the evidence attached to the version that produced it.

## question
For AI support drafts, would you prioritize speed or catching unsupported promises?
