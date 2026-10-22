# Map a Manual Business Process Before Automating It

Map a manual business process by following one real case from its trigger to its verified outcome. Record who acts, what information they use, where decisions occur and what happens when the normal route fails. That map gives an automation proposal something concrete to improve instead of treating a list of software features as a business process.

The method below is a proposed working exercise for a small team, not a report of measured savings. Choose a bounded task, use records you are authorized to inspect, and remove personal details that the exercise does not need. The useful output is an accurate description of current work and a testable proposal for a small change.

## Choose a process with a clear finish

Name the triggering event and the observable end state. “Handle enquiries” is broad; “route a new service enquiry to the responsible person and confirm receipt” has clearer boundaries. These are examples rather than assumed facts about your business. Write down what is outside the scope so the exercise does not expand indefinitely.

Distinguish the business outcome from an intermediate software event. A draft being generated is different from a message being approved or delivered. A form submission is different from a booking being confirmed. If the finish line is vague, a later automation can report success while leaving the actual customer task unfinished.

Use our guide to [choosing a low risk first AI task](/blog/choosing-a-low-risk-first-ai-task-for-a-small-business/) when selecting a trial. Prefer a task whose output can be reviewed before it creates an external commitment. The map should identify that review point explicitly.

## Observe a completed case

Ask the person doing the work to describe a recent authorized example. Follow the sequence using the records available, and distinguish what the records show from what someone remembers. Do not require private customer material in the map when a neutral case identifier and a description of the required fields will do.

Write each action as a verb with an object: check the address, compare the request with service scope, assign the owner, record the decision. Avoid naming only the application used. “Open a spreadsheet” does not explain what judgment the worker makes after opening it or how they know the action is complete.

Record waiting and handoffs as well as active work. A process can spend little time on a task but remain unfinished because nobody owns the next decision. Label those waits without guessing their duration. If timing matters to the proposed improvement, measure it in a defined sample later.

## Separate rules from judgment

For each decision, ask what evidence permits it and whether the rule is documented. A stable rule with a clear input may be suitable for a deterministic check. A decision that depends on ambiguous context may need human review. Do not call the second case an automation failure before defining what the machine was expected to decide.

Write the outcome when information is missing. Does the work stop, return for clarification, or proceed with a documented limitation? A blank branch in the diagram is a real design gap. Inventing a default can be more damaging than leaving a case visibly unfinished.

Our guide to [testing AI support drafts](/blog/building-a-test-set-for-ai-customer-support-drafts/) shows why expected outcomes matter. The same principle applies to non-AI automation: a test needs to know what should happen, not merely whether a script returned without an error.

## Map exceptions and authority

List the exceptions observed in the chosen cases and separate them from hypothetical risks raised during discussion. Both can be useful, but they are different kinds of evidence. Start with exceptions that change the next action or the permission required, rather than trying to imagine every possible failure.

Assign an owner to each unresolved branch. Say who can correct data, approve an exception, change a rule or contact a customer. Those authorities may belong to different people. An automation should not inherit all of them merely because it can access the same application.

Mark irreversible or outward actions clearly. Sending a reply, placing an order or changing an account has a different consequence from preparing a draft. Put the required approval or verification before the action and define what evidence is saved after it succeeds.

## Test the map with another case

Walk through a second authorized case without changing the map as you go. Record where the sequence fails to describe reality, then revise it deliberately. This makes disagreements visible. Otherwise a diagram can appear accurate because everyone silently supplies the missing steps from memory.

Use the map to propose one limited improvement. State which step changes, which controls remain, and what result would count as success. Include the time required to review and correct the output in any later efficiency comparison. A faster first draft is not necessarily a faster completed task.

Keep the current map, proposed version, owner and review date together. If the trial fails, that record helps the team return to the known process and understand why. The first goal is a workflow that can be explained and checked; automation follows from that understanding.

## Sources

- This process mapping exercise is original practical guidance. It makes no benchmark, product capability or measured savings claim.

## Related

- [Choose a first AI task](/blog/choosing-a-low-risk-first-ai-task-for-a-small-business/)
- [Build a support draft test set](/blog/building-a-test-set-for-ai-customer-support-drafts/)

Read next: [Define the expected output before testing](/blog/building-a-test-set-for-ai-customer-support-drafts/).
