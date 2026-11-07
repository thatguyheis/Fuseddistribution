# How to Use Gmail with a Custom Domain for Your Business

A business address such as you@yourcompany.com can use Gmail as its inbox. The address matches a domain you control, while Gmail provides the mail interface. Google Workspace is one way to set this up. The important work happens in a sequence: choose a domain, verify that you control it, create the Workspace account and users, point mail delivery to Google, then test both directions.

This guide explains the steps at a practical level. Exact screens and DNS instructions can change, so use the Google Admin setup wizard and your domain provider's current instructions when making changes.

## What a custom domain changes

A custom domain is the part after the @ sign. If your business owns example.com, an address might be hello@example.com or name@example.com. Gmail is the mail service and interface; the domain gives you control over the address. Google describes Workspace business email as using your own domain with Gmail.

A matching address can make it easier for customers to recognize who is contacting them. It also lets an organization create separate accounts for people and roles. It does not, by itself, prove that a business is legitimate, guarantee that messages reach inboxes, or replace good customer communication.

Before you start, confirm who controls the domain registrar and DNS. You need access to add records. If someone else manages the domain, coordinate with them before changing anything. Keep the current mail service and DNS details available until the new setup has been tested.

## Step 1: choose the domain and address

Pick a domain the business is authorized to use. Decide which addresses people need. For a small team, this might include a named account for each person and a few role addresses such as sales@ or support@. Google recommends accounts for individual users; do not share one person's login across a team. Ask your administrator which account type is appropriate for shared role mail.

Check spelling carefully. A typo in the domain or address can affect customer communication. Also decide whether an existing address must remain in service during the changeover.

## Step 2: verify domain ownership

Follow the Google Workspace setup wizard. Google provides a verification record that you add through the domain host. This proves control of the domain; it does not yet route incoming mail. Copy the record exactly, including its type and value, and save the change at the provider. Return to the wizard and confirm verification.

DNS interfaces differ between providers. Avoid copying a record from an old tutorial if the current Admin console supplies a different value. If verification does not appear immediately, allow time for the DNS change to be recognized and check the provider's instructions before adding duplicates.

## Step 3: create the Workspace account and users

Complete the Workspace setup and add the users who need mail. Use a separate account for each person who will sign in. Select addresses deliberately and document who owns administrative access. Protect administrator sign-in with strong account security and keep recovery details current.

If you already use Google accounts, decide what you mean by “move.” Verifying a domain for an account that was signed up for Workspace with Gmail has a specific Google-supported path. It is different from creating a new Workspace organization and importing mail from a separate personal Gmail account. Do not assume that all mail, Drive files, calendars, or services automatically merge into a new account. Review the exact account path and migration options first.

## Step 4: route mail by updating MX records

Google's current setup instructions tell administrators to update the domain's MX records and activate Gmail. MX records tell other mail systems where to deliver messages for the domain. Use the exact value and priority shown in current Google Admin guidance. Google currently documents smtp.google.com with priority 1 for the standard setup; older working Workspace configurations may have legacy values and may not need a change.

Before replacing any existing MX records, identify whether the domain already receives business email. Changing mail routing can interrupt delivery if done without a plan. Follow Google's directions, remove conflicting records only as instructed, and make sure Gmail is activated in the Admin console. DNS changes may take time to propagate, so do not judge the result from one immediate check.

## Step 5: test real delivery

Send a message from the new address to an external inbox, then reply to the custom address. Check both inboxes, spam folders, and the sender shown on each message. Test every new user and important role address. If messages fail, verify the domain spelling, MX records, Gmail activation, and DNS propagation before changing unrelated settings.

Google also recommends configuring SPF and other sender authentication for a domain. Treat that as a separate deliverability and anti-spoofing step, not a substitute for testing Gmail routing. Follow current Google guidance for the exact records and rollout.

## A safe changeover checklist

- Confirm domain and DNS administrator access.
- Verify the domain using the record from the current Workspace setup flow.
- Create individual user accounts and confirm administrator recovery access.
- Review any existing mail and data before selecting an account or migration path.
- Update MX records exactly as current Google Admin instructions specify.
- Activate Gmail, allow for DNS propagation, and test sending and receiving.
- Keep the previous mail service available until the important addresses work.

A custom-domain address is a manageable setup when each step has a clear owner. The domain proves which address you control; DNS points incoming mail to the service; and end-to-end tests confirm that the change works for real users.

To compare Google Workspace options, use the referral link below. This is a referral link. I may earn a reward. Review current plans, eligibility, and terms before signing up.

[Compare plans and sign up](https://referworkspace.app.goo.gl/kSMy)

For a practical overview of email, files, and scheduling, read [this Google Workspace workflow guide](/blog/google-workspace-small-business-connected-workflow/) and [email marketing basics for a small business](/blog/email-marketing-for-small-business-getting-started/).

## Related

- [Google Workspace for a small business](/blog/google-workspace-small-business-connected-workflow/)
- [Email marketing for small business](/blog/email-marketing-for-small-business-getting-started/)

Read next: [Google Workspace for a small business](/blog/google-workspace-small-business-connected-workflow/)

## Sources

- [Google Workspace business email](https://workspace.google.com/solutions/business-email/)
- [Google Workspace setup for a new business](https://workspace.google.com/business/new-business/)
- [Google quick start guide for small businesses](https://knowledge.workspace.google.com/admin/getting-started/quick-start-guide-for-small-businesses)
- [Google instructions for setting up MX records](https://knowledge.workspace.google.com/admin/domains/set-up-mx-records-for-google-workspace)
- [Google Workspace referral guidance](https://storage.googleapis.com/referworkspace-asset/pdf/referral_tips/gws_referral_tips_en-us.pdf)
