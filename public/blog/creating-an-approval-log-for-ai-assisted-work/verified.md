# Create an Approval Log for AI-Assisted Work

When AI helps produce work that affects a customer, a business decision, or a public claim, a short approval record can make the decision easier to review later. The record should connect the task, the evidence, the human decision, and the exact version that was approved.

There is no single approval-log format that fits every business. NIST's AI Risk Management Framework is voluntary guidance organized around Govern, Map, Measure, and Manage. Its Generative AI Profile describes practices that may include additional human review, tracking, documentation, and oversight. Neither document prescribes the template below. Treat it as a practical starting point and adjust it to the work and its likely impact.

## Record the work and its context

Start with a name for the task, its purpose, and the person responsible for the outcome. Add the date and the system or model used when that detail helps someone understand how the work was produced. Reference the input and source material rather than copying more personal or confidential information into the log than the reviewer needs.

For example, a team using an assistant to prepare a customer-facing policy summary could record the policy version, the requested audience, and the system used. The log should point to the source policy and the saved draft. It should not imply that the example is a required NIST process or that naming a model proves the summary is correct.

If work can pause or fail partway through, an [exception handling log](/blog/creating-a-small-business-exception-handling-log/) can track the owner and next action separately from content approval.

## Show what was checked

Write down the checks that matter for the task. A reviewer might confirm that important claims match the current source, that the draft answers the request, and that it does not make an unauthorized promise. Record limitations that remain, such as an unavailable source or a question outside the reviewer's authority.

Choose the depth of review for the context and the potential consequences of an error. A low impact internal outline may need a lighter check than a customer commitment or a decision that affects someone's access or eligibility. A log does not make an unsafe workflow safe by itself; the workflow still needs a responsible owner, appropriate controls, and a way to stop when evidence is missing.

## Make the decision specific

Record who reviewed the work and whether they approved it, requested a revision, or held it. Link or identify the exact approved version. A revision after approval is a new version and should not inherit the earlier decision automatically. A content hash can help identify a file precisely, but it does not establish that the file is accurate or that the reviewer had authority.

Keep approval for the content separate from permission to take an action. Approving a draft does not by itself authorize sending it, changing a record, or making a commitment. State the allowed next step and who owns it. If the reviewer cannot resolve a missing fact or conflict, record the hold and route the question to the right person.

For AI support drafts, a [test set with missing-information cases](/blog/building-a-test-set-for-ai-customer-support-drafts/) can help expose gaps before the workflow is changed.

## Keep the record useful and proportionate

A compact record can include:

- Task purpose, accountable owner, and date.
- Input and source references, with sensitive details minimized.
- Tool or model information when useful for review.
- Checks performed, evidence consulted, and known limitations.
- Reviewer, decision, and the exact version approved.
- Authorized next action, follow-up owner, and retention location.

Set access and retention rules for the record, especially when source material contains customer or employee information. Keep only what the business needs to explain and improve the decision. Use recurring corrections to find weak instructions, missing sources, or unclear review responsibilities. Update the process and check it again before reducing review.

## Sources

- [NIST AI Risk Management Framework 1.0](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf) and [AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/): voluntary framework organized around Govern, Map, Measure, and Manage.
- [NIST Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf): discusses risks and practices that can include human review, tracking, documentation, and management oversight; it does not specify this log schema.
- [NIST AI RMF Playbook](https://www.nist.gov/itl/ai-risk-management-framework/nist-ai-rmf-playbook): suggested actions accompanying the voluntary framework.

## Related

- [Create a small business exception handling log](/blog/creating-a-small-business-exception-handling-log/)
- [Build a test set for AI support drafts](/blog/building-a-test-set-for-ai-customer-support-drafts/)

Should approval logs keep every prompt or only key inputs?

Read next: [Create a small business exception handling log](/blog/creating-a-small-business-exception-handling-log/).
