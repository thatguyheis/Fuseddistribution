# Draft a Customer Email With AI, Then Review It

## Use AI for a draft, not for the send button

Would you let AI send a customer reply without checking it? Start with a safer setup: use the tool to draft a response, then have a person verify the facts, tone, and next step before sending. A draft can save time on wording, but it cannot know which details are approved unless you provide them.

Choose a low-risk example first. You could ask for a polite reply confirming a public appointment window or acknowledging a general question. Avoid uploading a real customer thread while learning. Remove names, account numbers, contact details, health information, payment data, and anything else your business has not approved for this tool.

## Give only the context needed

Tell the model who the message is for, what the customer asked, what facts are confirmed, and what outcome you want. Use placeholders instead of personal information. For example: “A customer asks whether a public workshop is open to beginners. The event page says it is open to all experience levels and starts at 10 a.m. Draft a warm reply under 90 words. Do not add a price, address, or registration link.”

That example contains the facts the model can use and names what it must not invent. If the answer depends on a policy, quote the relevant approved text or point to the source. Do not ask the model to guess how your business handles refunds, warranties, safety issues, or other sensitive matters.

## Set a clear format and tone

Specify whether the result needs a subject line, greeting, short paragraphs, or a single question for the customer. Describe the tone in ordinary terms, such as “friendly and direct.” Avoid vague requests like “make it perfect.” A useful instruction says what the reader should understand or do after reading.

Keep the draft short enough for the situation. A routine confirmation does not need a long explanation. If the customer raised several questions, ask the model to answer each one separately and flag any question that lacks an approved answer. It is better to leave a gap for a person than to invent a policy.

## Review names, facts, and commitments

Read the draft against the original message and the business source. Check names, dates, amounts, availability, links, and promises. Confirm that the model did not claim that something is complete, guaranteed, or approved when it is not. Remove details that are unnecessary for the reply.

ChatGPT can produce inaccurate information, including confident errors. OpenAI recommends checking important details against reliable sources in its [accuracy guidance](https://help.openai.com/en/articles/8313428-does-chatgpt-tell-the-truth). A review step should be part of the workflow, not an optional final glance.

## Keep approval with a person

For a simple reply, the reviewer can check the facts and send it. For a complaint, legal issue, refund request, safety concern, or private account question, route it to the responsible person. Do not let a generated draft decide the outcome or send itself unless a separately approved system defines that permission and its safeguards.

This distinction belongs in your [standard operating procedure](/blog/what-is-an-sop-and-why-ai-needs-one/). State which messages may use a draft, what data is allowed, who approves the final answer, and when the system must stop. If a tool or integration cannot show what it is about to send, keep that step manual. Use a [clear prompt for one bounded task](/blog/write-a-useful-ai-prompt-for-one-small-business-task/) and include the approval step in the instructions.

## Use a small review card

## Walk through a fictional customer question

Imagine a customer writes, “Can someone visit Friday afternoon, and is there a call-out fee?” A made-up public service page says the business serves the customer’s town and is open on weekdays, but the page does not list Friday appointment availability or a fee. This is a fictional practice example. It is not an actual Fused service promise or a real customer exchange.

A safe draft instruction would ask for a brief reply acknowledging both questions, state only the confirmed service area and published weekday hours, and tell the model to mark appointment availability and fees as unconfirmed. A reviewer can then see whether the answer stayed inside those facts. If the draft says “We can arrive Friday at 2 p.m.” or “There is no call-out fee,” the reviewer should remove those claims because the source did not support them.

This example also shows why a prompt should separate facts from the requested wording. The model can arrange the approved details into a readable sentence. It cannot decide the schedule or fee on behalf of the business. If the customer needs those answers, send the draft to the person who owns scheduling and pricing before replying.

## Handle missing details without guessing

When a source is incomplete, name the gap in the prompt and decide who can resolve it. A useful draft may say that the team will confirm the appointment window, but only if that is a real process your business has approved. Otherwise, leave a note for the reviewer and hold the message. Do not promise a follow-up time unless someone can meet it.

Use a small answer library or current service page as the source for routine details. Give the model only the excerpt it needs, then keep a human check for anything that changes a customer’s decision. If a complaint mentions damage, a disputed payment, a safety issue, or a legal threat, route it to the responsible person instead of trying to make the draft sound reassuring.

After the review, keep the approved response with the relevant question type in your SOP. Note the source used, the reviewer role, and the escalation point. Do not store unnecessary customer information just to preserve a sample. A fictional case is enough to test whether the prompt flags missing availability and pricing. That test can reveal whether your workflow needs a clearer stop rule before real customer messages enter it.

Before sending, verify:

- The reply answers the customer’s actual question.
- Every factual claim matches an approved source.
- Names, dates, links, and amounts are correct.
- The message contains no extra private data.
- A person approved the wording and the next action.

If an item is uncertain, hold the draft and ask for the missing information. Do not solve uncertainty by making the email sound more confident. For a repeatable workflow, record the review card in the same SOP that governs the prompt and handoff.

## Test with a fictional example

Create a made-up message with no real customer details. Run the draft prompt, check it against the fictional source, and note any correction. Repeat with a second example that has a missing fact. The tool should flag the gap instead of making up a price or commitment.

After the pilot, decide whether the draft step is useful and safe for that type of email. Keep a person in control of customer communication until the rules, data handling, and review process are clear. What part of a routine customer reply would you let AI draft first?

## Sources

- [OpenAI Academy: responsible and safe use](https://openai.com/academy/responsible-and-safe-use/)
- [Does ChatGPT tell the truth?](https://help.openai.com/en/articles/8313428-does-chatgpt-tell-the-truth)

## Related

- [Write a Useful AI Prompt for One Small Business Task](/blog/write-a-useful-ai-prompt-for-one-small-business-task/)
- [What Is an SOP and Why Does AI Need One?](/blog/what-is-an-sop-and-why-ai-needs-one/)

Read next: [Write a Useful AI Prompt for One Small Business Task](/blog/write-a-useful-ai-prompt-for-one-small-business-task/)
