# AI Chatbot Setup for a Small Business Website

A website chatbot needs three working parts: accurate answers, a visible way to contact staff, and a website installation that actually delivers messages. A floating chat button alone proves none of those things. Start with a small set of public questions, test the complete conversation, and confirm that someone receives requests the bot cannot finish.

This guide uses Tidio and its Lyro AI agent as a documented setup example, with product documentation checked on September 8, 2026. It is not a claim that this service is the best option for every business. The test plan below is an example you can adapt; it is not a report of measured client results. Check your own account before relying on a feature or allowance.

## Define one useful website job

Write a one sentence scope before creating an account. For an imaginary repair shop, that might be: answer questions about opening hours, service area and how to request an estimate. The bot can explain the published request process without deciding a repair price or confirming an appointment. A confirmed booking requires an actual booking result, not a sentence that sounds like one.

List the questions you want the bot to answer and what should happen when it lacks the answer. For example, an unsupported model of appliance should produce a contact option rather than an invented service promise. This boundary makes your first test concrete: did the visitor get the correct information or reach the right person?

If you are still deciding between internal reply assistance and public chat, read our [small business AI customer service guide](/blog/ai-for-customer-service-small-business-how-to-set-it-up/). The steps here focus on putting a narrow public website assistant into service. They do not require connecting every inbox or granting the bot permission to change customer records.

## Check the account allowance before launch

Compare website compatibility, staff access, AI usage, handoff behaviour and the total cost for your expected workload. Record those details in a dated setup note. Avoid choosing a service from the word free alone: a trial allowance and a recurring monthly allowance are different arrangements.

Tidio's [Lyro limit documentation](https://help.tidio.com/hc/en-us/articles/13924459295900-The-Lyro-AI-agent-limit) describes an initial allowance of 50 AI conversations that does not renew. It says Lyro stops when that allowance is exhausted. Paid Lyro plans provide a monthly allowance. The documentation also distinguishes AI conversations from the separate live chat and flow limits. Verify what your project actually shows before launch; this guide does not quote a subscription price.

Decide what visitors should see if the AI allowance runs out. Keep a normal contact page reachable outside the widget. Assign someone to check remaining usage and any billing notice. Do not assume that paying for another component automatically renews the AI allowance. The practical launch question is whether the site still offers a usable contact route when automated answers stop.

## Prepare a small approved answer set

Create a short FAQ with the exact facts the assistant may use. Include regular hours, exceptions you have confirmed, service boundaries, the estimate request link and the contact method. Put a review date beside the source in your internal notes. Resolve conflicting information on the website before importing it into a bot.

Tidio's [Lyro configuration guide](https://help.tidio.com/hc/en-us/articles/9003475527196-Lyro-the-conversational-AI-agent) describes adding website URLs and manual question and answer pairs through its knowledge tools. It also provides a Playground for testing responses. Supplying those sources is not a guarantee that every generated answer will be correct.

For the imaginary shop, write an answer that says an estimate request is reviewed by staff. Do not leave an older page saying every job gets an instant fixed price. When two sources disagree, correcting the source is more useful than repeatedly rewriting the bot's reply. Keep private customer records out of this public FAQ exercise; synthetic questions are enough to test these basic facts.

## Install the website widget once

Tidio documents two installation routes: a supported website platform integration or a JavaScript installation. For the latter, its [installation guide](https://help.tidio.com/hc/en-us/articles/5378348485660-Install-Tidio-on-your-Website) directs users to Settings, Live Chat, Installation and the Manual install tab for their unique code. For a direct HTML installation, it places that code before the closing body tag. Follow the current guide for your platform and use the code from your own project. Do not copy an identifier from a tutorial screenshot.

Before changing the site, save its current configuration and record where the integration will be installed. Choose one route. If the site already has a chat plugin, inspect it before adding a second copy through the theme or a tag manager. Ask whoever maintains the website to make the installation if you do not have the appropriate editing access.

Then open the published site in a fresh browser session. Check the home page, a service page and the contact page on both desktop and mobile. Confirm that the launcher opens, closes and leaves important page controls usable. Send a clearly labelled test message and find it in the correct project inbox. A widget appearing on screen is only the first half of that test.

## Configure the handoff before accepting visitors

The Lyro configuration guide describes separate online and offline handoff options, including transfer to an agent and ticket creation. It also documents activation and deactivation in Configure, General. Review those settings in your project rather than assuming the default matches your staffing arrangements.

Write the handoff message to match what the team can deliver. If nobody is available overnight, do not promise immediate live assistance. Name the person or team that checks the receiving inbox and choose a response target you can sustain. This is an operating decision for your business, not a service level supplied by installing the widget.

Test the path with a fictional visitor who explicitly asks for a person. Then repeat with staff marked unavailable. Record where each message arrives and whether a staff member can reply. A successful transfer message inside the chat does not prove someone has taken responsibility for it. Keep the usual contact form available for visitors who cannot use the chat.

## Run an acceptance test with expected answers

Make a simple test sheet with question, expected outcome, observed answer and result. Use realistic wording, but invent the customer details. Decide the expected result before asking the bot. Otherwise a fluent reply can distract from the fact that it answered the wrong question.

Use these proposed cases for the imaginary repair shop:

- Ask for ordinary opening hours and compare every day with the approved FAQ.
- Ask about an unlisted holiday and require an acknowledgement that the information is unavailable.
- Ask whether a specific address is served and check the answer against the published boundary.
- Ask for an exact repair price without an inspection and expect the estimate request route.
- Request a person and verify delivery to the receiving inbox.
- Repeat the handoff while staff are unavailable and check the visitor message.
- Ask the bot to ignore the FAQ and invent a discount; it should not create a policy.
- Repeat the successful cases on a phone and confirm the widget remains usable.

These are proposed launch tests, not vendor guarantees. Save failures and the exact source version involved. Correct the smallest cause you can identify, then rerun the failed case and nearby cases. If the system continues making unsupported promises, keep it inactive while you narrow its scope or use a simpler contact flow.

## Launch with a recovery path

Activate public responses only after the answer checks and handoff tests pass. Record the activation time, source version, usage allowance and responsible staff member. Leave a clear way to disable automated responses if an error appears. Practise that control during testing so nobody has to hunt for it during a customer problem.

Separate a knowledge problem from an installation problem. Wrong hours point toward the source or answer configuration. A message missing from the inbox requires checking delivery and project setup. An exhausted allowance requires checking usage and the fallback route. Reinstalling the same widget is not a useful universal repair for all three cases.

Our [guide to starting AI in a small business](/blog/how-to-start-using-ai-in-your-small-business/) explains how to keep the initial scope manageable. For this website rollout, add more question types only after the existing ones work reliably and the staff handoff is being handled.

## Measure outcomes and update the procedure

During the initial rollout, review a sample of conversations regularly and check every reported failure. Record answered questions, unresolved requests, handoffs received by staff and corrections required. Define what counts as resolved rather than assuming silence means success. Keep the number of reviewed conversations beside any reported percentage.

For an illustrative review, if 12 of 20 sampled conversations meet your written resolution definition, the observed sample rate is 60 percent. That is arithmetic for that sample, not a promised result for another site. It also says nothing by itself about sales or staff time saved. Measure those separately if they are part of your business goal.

When a policy changes, update the approved source, refresh the bot's knowledge using the supported controls, and repeat the related tests. Record the defect, cause, repair and verification in your procedure. A useful chatbot setup includes this maintenance path alongside installation, so future errors have a clear owner and a repeatable fix.

## Related

- [Set up AI for customer service](/blog/ai-for-customer-service-small-business-how-to-set-it-up/)
- [Start using AI in a small business](/blog/how-to-start-using-ai-in-your-small-business/)

Read next: [Set up AI for customer service](/blog/ai-for-customer-service-small-business-how-to-set-it-up/).
