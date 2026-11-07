# Reel Script: SPF, DKIM, and DMARC for Google Workspace: A Simple Setup Guide
format: long-form
engagement-policy: 1
content-kind: educate

---
## HOOK
**Visual:** Inventory every service that sends for your domain.
**Duration:** 4s
Narration: Can someone spoof your business email address?

---
## OVERLAY: SPF authorizes senders
**Visual:** Inventory every service that sends for your domain.
**Duration:** 24s
Narration: SPF, DKIM, and DMARC help receiving mail systems assess messages that claim to come from your domain. They do different jobs, and none guarantees inbox placement or replaces account security. Start by listing every service that sends as your business, including Workspace and tools for invoices or newsletters.

---
## OVERLAY: DKIM signs outgoing mail
**Visual:** Use the exact selector and DNS value from Admin.
**Duration:** 24s
Narration: SPF tells receiving systems which mail servers are authorized to send for the domain. Google recommends an SPF record for Workspace. Include other legitimate senders in the policy and follow their current instructions. Do not create multiple SPF records. A missing sender can cause real business mail to fail checks.

---
## OVERLAY: DMARC monitors alignment
**Visual:** Start by monitoring results.
**Duration:** 24s
Narration: DKIM adds a digital signature to outgoing messages. Google Admin provides the selector and DNS record used to publish the key, then lets you turn on authentication. Copy the current values exactly and allow DNS to update. If another service sends using your domain, review that provider’s signing setup too.

---
## OVERLAY: Review before enforcement
**Visual:** Fix legitimate senders before tightening policy.
**Duration:** 24s
Narration: DMARC tells receivers how to handle messages that fail alignment checks for SPF or DKIM, and can request aggregate reports. Google recommends a monitoring start. Use a report address someone will review, then identify legitimate senders that are missing or misconfigured before asking receivers to quarantine or reject mail.

---
## OVERLAY: Roll out in measured steps
**Visual:** Protect accounts as a separate security layer.
**Duration:** 24s
Narration: Roll out carefully: inventory senders, configure SPF, enable DKIM, publish DMARC in monitoring mode, and review results. Correct the setup before tightening enforcement. Keep account security strong as well. These DNS records support authentication, but they cannot prove a message is honest or prevent every form of impersonation. Record changes so another administrator can review the rollout. Keep an approved rollback record for DNS. Test from an outside sender, and review the failure reports.

---
## QUESTION
**Visual:** Show a QR signup card with the referral disclosure.
**Duration:** 10s
Text: Ready to authenticate your business email?
Subtext: Scan to compare plans. This is a referral link. I may earn a reward.
Engagement-beat: identity
Narration: Ready to authenticate your business email?
