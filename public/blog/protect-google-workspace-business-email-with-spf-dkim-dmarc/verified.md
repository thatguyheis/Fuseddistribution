# SPF, DKIM, and DMARC for Google Workspace: A Simple Setup Guide

After Gmail works on a custom domain, administrators should review how the domain identifies legitimate outgoing mail. SPF, DKIM, and DMARC are DNS based email authentication mechanisms. They have different roles and should be configured using current Google Admin guidance and the domain's actual sending services.

These records can help receiving systems assess whether a message is authorized and aligned with the domain. They do not guarantee inbox placement, stop every impersonation attempt, or replace account security. A small business should inventory every service that sends mail before publishing or tightening policies.

## SPF: list authorized sending sources

Sender Policy Framework, or SPF, tells receiving mail systems which servers are allowed to send email for a domain. Google recommends publishing an SPF record for Workspace mail. If the business also sends invoices, newsletters, booking notifications, or support responses through other services, those may need to be considered in the same policy.

Do not create multiple SPF records for one domain. Follow Google's current syntax and the instructions from every legitimate sender. An incomplete record can cause authorized messages to fail SPF checks.

## DKIM: sign outgoing messages

DomainKeys Identified Mail, or DKIM, adds a cryptographic signature to outgoing messages. The receiving system can use the public key published in DNS to check that the signature matches. Google Admin provides steps to generate or select a DKIM key and turn on authentication for the domain.

Follow the current key type, selector, and DNS value from the Admin console. Wait for the record to be recognized, then start authentication as Google directs. If other services send as the domain, configure their signing instructions separately where appropriate.

## DMARC: tell receivers how to handle alignment results

Domain-based Message Authentication, Reporting, and Conformance (DMARC) lets a domain publish a policy for messages that do not pass aligned SPF or DKIM checks. It can also request aggregate reports. Google's guidance recommends beginning with a monitoring policy and reviewing results before moving to stricter handling.

A gradual rollout matters because legitimate systems may be missing from the initial inventory. If a strict policy is published before all senders are identified and aligned, real business email could be rejected or quarantined. Configure a reporting mailbox that someone will review, and use the evidence to update the sending inventory.

## A cautious setup order

1. List all services that send messages using the domain, including Workspace and any other tools.
2. Configure the SPF record using current Google and sender-provider instructions. Confirm there is only one SPF record.
3. Turn on DKIM for Workspace using the exact selector and DNS values from Admin. Test that messages are signed.
4. Publish DMARC in monitoring mode with a working report address. Review reports for legitimate senders that are not aligned.
5. Correct the sender configuration and observe results before considering a stricter DMARC policy.

Keep a copy of the previous DNS values and make one deliberate change at a time. DNS propagation and provider interfaces vary. Ask the domain administrator for help if the organization has existing mail systems or legal retention requirements.

## Build a sender inventory before editing DNS

I would start with a simple worksheet rather than a copied DNS example. Give each sending service a row with its purpose, owner, sending domain and current provider instructions. A row might describe employee mail, invoices or booking confirmations. These are example categories, not a claim about the services configured for your domain. Mark unknown senders as unresolved until the responsible administrator identifies them.

The worksheet helps separate an intended setup from a verified result. Record which source supplied each value and when it was checked. A proposed TXT value belongs in a planned-change column; the currently published value belongs in another. Do not call a record active merely because someone copied it into a note or saved an unfinished form.

## Review one change with its evidence

For a small administrative handoff, I would keep the approved change, previous value, operator and check result together. That makes it possible to explain exactly what changed without reconstructing a chat. Keep credentials and private message details out of a public checklist or tutorial screenshot. Use an example domain when demonstrating the worksheet to other people.

Ask what the verification actually established. Finding a DNS value is one observation. Seeing the expected authentication result on a message is another. Record the message's sending service and the property checked, rather than turning a narrow result into a statement that every kind of business email is now protected. The current Google instructions remain the source for the specific technical checks and rollout sequence.

## Keep monitoring work assigned

A monitoring plan needs an owner and a review habit. I would write down who checks the available reports, where unresolved sender questions are recorded and who may approve a later policy change. A calendar entry is only a reminder; it is not evidence that somebody reviewed the reports or corrected a sending service.

Use plain states such as planned, published, checked and unresolved. If a result differs from the expectation, preserve the evidence and return to the administrator responsible for that sender. Do not invent a passing result to close the checklist. The aim is a current record of the work, including what still needs attention.

## Use AI to organize approved facts

An assistant can turn an approved sender inventory into a readable task list or help explain a provider's instructions. I would give it the relevant source and ask it to preserve unknown fields. The assistant should not generate a domain's final DNS values from a generic description or infer that a record was deployed from a proposed configuration.

Keep the source, the planned action and the actual check result separate. That makes this a useful continuation of the custom domain email lesson: a professional address is the beginning of a managed setup, and the supporting records need deliberate administrative work and verified results.

## What these records do not replace

Email authentication is one layer. Protect Workspace accounts with strong sign in security, limit administrator access, keep recovery methods current, and train staff to verify unusual payment or credential requests through a second channel. Authentication records do not prove that a message's contents are honest; they help receiving systems assess how the message relates to the sending domain.

The right setup reflects every service that sends mail for the domain. Start with an inventory, apply Google's current instructions, monitor the evidence, and tighten enforcement only when legitimate mail is accounted for.

To compare Google Workspace plans, use the referral link below. This is a referral link. I may earn a reward. Review current eligibility and terms before signing up.

[Compare plans and sign up](https://referworkspace.app.goo.gl/kSMy)

For a practical overview of email, files, and scheduling, read [this Google Workspace workflow guide](/blog/google-workspace-small-business-connected-workflow/) and [email marketing tools for small business](/blog/best-email-marketing-tools-for-small-business-2026/).

## Related

- [Google Workspace for a small business](/blog/google-workspace-small-business-connected-workflow/)
- [Email marketing tools for small business](/blog/best-email-marketing-tools-for-small-business-2026/)

Read next: [Google Workspace for a small business](/blog/google-workspace-small-business-connected-workflow/)

## Sources

- [Google: set up SPF](https://knowledge.workspace.google.com/admin/security/set-up-spf)
- [Google: set up DKIM](https://knowledge.workspace.google.com/admin/security/set-up-dkim)
- [Google: set up DMARC](https://knowledge.workspace.google.com/admin/security/set-up-dmarc)
