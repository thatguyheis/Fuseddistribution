# SPF, DKIM, and DMARC for Google Workspace: A Simple Setup Guide

After Gmail works on a custom domain, administrators should review how the domain identifies legitimate outgoing mail. SPF, DKIM, and DMARC are DNS-based email authentication mechanisms. They have different roles and should be configured using current Google Admin guidance and the domain's actual sending services.

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

1. List all services that send messages using the domain, including Workspace and any third-party tools.
2. Configure the SPF record using current Google and sender-provider instructions. Confirm there is only one SPF record.
3. Turn on DKIM for Workspace using the exact selector and DNS values from Admin. Test that messages are signed.
4. Publish DMARC in monitoring mode with a working report address. Review reports for legitimate senders that are not aligned.
5. Correct the sender configuration and observe results before considering a stricter DMARC policy.

Keep a copy of the previous DNS values and make one deliberate change at a time. DNS propagation and provider interfaces vary. Ask the domain administrator for help if the organization has existing mail systems or legal retention requirements.

## What these records do not replace

Email authentication is one layer. Protect Workspace accounts with strong sign-in security, limit administrator access, keep recovery methods current, and train staff to verify unusual payment or credential requests through a second channel. Authentication records do not prove that a message's contents are honest; they help receiving systems assess how the message relates to the sending domain.

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
