# Create a Small Business Exception Handling Log

hook: A stalled task needs an owner.

## segments
- type: overlay
 text: RECORD THE MINIMUM USEFUL DETAILS
 narration: Give each case an identifier, the time it was noticed, the affected step and a concise description of the problem. Add an owner, next action and review time. Link to authorized source records where needed rather than copying sensitive customer information into a widely shared log. Separate the observed problem from a proposed explanation. “Required approval missing” is an observation; “the customer ignored the message” may be an unverified interpretation.
- type: overlay
 text: CHOOSE A SAFE NEXT ACTION
 narration: Define whether the case waits for information, goes to a reviewer or uses an approved alternative process. Do not treat a retry as a universal solution. Repeating an outward action can create duplicates if the first attempt succeeded but its confirmation was lost. Our guide to choosing a first AI task discusses boundaries around automation. Apply the same principle here: the log should identify who can authorize a consequential next step.
- type: overlay
 text: CLOSE THE CASE WITH EVIDENCE
 narration: Record what resolved the exception and how the result was checked. A successful command or a sent request may not establish that the intended business outcome occurred. Include the evidence appropriate to the workflow, such as a confirmed record identifier or a reviewed final document. If automation is involved, use a test set with expected outcomes to exercise known failure cases. Keep unresolved cases open with a real next action.
- type: overlay
 text: USE RECURRING EXCEPTIONS TO IMPROVE THE PROCESS
 narration: Review repeated categories periodically. A frequent missing input may indicate unclear instructions, while repeated duplicate attempts may reveal a verification gap. Investigate the pattern before changing the workflow; a count alone does not explain the cause. Choose a specific correction, assign its owner and define how the team will know it worked. Keep the exception records available under the appropriate access and retention rules.

## question
When a task stalls, is the harder problem finding the cause or finding its owner?
