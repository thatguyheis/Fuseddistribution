# Google Analytics for Small Business: What to Track

Google Analytics can answer a practical small-business question: which visits turn into calls, quote requests, bookings, or sales? Start with those outcomes. Traffic totals are useful context, but they do not prove that a website is producing business. A short measurement plan built around leads, landing pages, and traffic sources is more useful than a dashboard filled with numbers no one acts on.

## Start With the Actions That Create Revenue

Write down the actions a valuable visitor can take on your site. For a local service business, that list usually includes submitting a quote form, clicking a phone number, [booking an appointment](/blog/best-appointment-booking-tools-for-small-business-2026/), requesting directions, or completing a purchase. Track each action as an event and mark the most important ones as key events in Google Analytics 4.

Google defines a key event as an event that measures an action important to the success of the business. Its recommended `generate_lead` event is intended for a submitted form or request for information. Using that standard event name makes reports easier to understand and supports Google's lead reporting features. See Google's documentation for [key events](https://support.google.com/analytics/answer/9267568) and [recommended events](https://support.google.com/analytics/answer/9267735).

Do not mark every click as a key event. A menu click is behavior; a completed estimate request is an outcome. Keeping that distinction clear prevents minor interactions from inflating your lead totals.

## Track Form Submissions and Phone Clicks Separately

A lead form and a phone click show different levels of intent and need different names. Use `generate_lead` for a successful form submission, not for someone merely opening the contact page. Give phone clicks a clear custom event name such as `click_phone`. If you have several phone buttons, add parameters that identify the page and button location.

Google explains that event parameters add context to an interaction, such as which button was clicked. That detail lets you compare a phone button in the site header with one on a service page. Review the official [event parameter guide](https://support.google.com/analytics/answer/13675006) when planning those fields.

Test every event yourself. Submit the form, click the phone link on a mobile device, and confirm the event appears in Analytics. A dashboard built on an event that never fires is worse than having no dashboard because it creates false confidence.

## Measure Key Event Rate, Not Traffic Alone

Sessions tell you how often people visited. Session key event rate tells you what percentage of sessions produced at least one key event. Review both numbers together.

For example, a service page with 80 sessions and 10 lead events may be more valuable than a blog post with 800 sessions and no next step. The blog post may still support awareness, but the service page is doing more immediate sales work. Compare pages by intent instead of assuming the page with the most visits is the winner.

Watch the trend over several weeks. Small businesses often have limited traffic, so a single day can be misleading. Use a consistent date range and annotate major changes such as a new ad campaign, a redesigned form, or a seasonal promotion.

## Find the Landing Pages That Produce Leads

The Landing page report shows the first page visited during a session. Add key events and session key event rate to identify the pages that begin productive visits. Google's [Landing page report documentation](https://support.google.com/analytics/answer/12931766) explains that you can also add Session source / medium as a secondary dimension.

Look for three conditions:

1. High traffic with a healthy key event rate. Protect and improve these pages.
2. High traffic with a low key event rate. Check whether the offer, proof, or call to action matches the visitor's intent.
3. Low traffic with a healthy key event rate. These pages may deserve stronger internal links, local search work, or paid promotion.

Do not judge a page on bounce rate alone. A visitor may read a phone number and call without triggering a tracked event. Fix measurement gaps before changing a page that might already be working.

## Compare Traffic Sources by Lead Quality

Open Reports, then Acquisition, then Traffic acquisition to compare organic search, paid search, referrals, email, social, and direct visits. The report is session-scoped and can display sessions, engagement, key events, and session key event rate. Google's [Traffic acquisition guide](https://support.google.com/analytics/answer/12923437) documents those metrics.

Start with source / medium and key events. If paid traffic creates many form submissions but few qualified leads, Analytics alone cannot show the full problem. Pass the source and campaign information into your lead system, then compare booked jobs or closed sales. The business outcome matters more than the cheapest form submission.

Use campaign tags consistently on email, social, directory, and partnership links. Without consistent tagging, useful traffic can fall into broad or misleading categories.

## Connect Google Business Profile Performance

Website analytics does not capture every local interaction. A customer can call, request directions, send a message, or use a [Google Business Profile booking link](/blog/calendar-booking-link-how-to-add-to-google-business-pro/) without visiting the website.

Google now supports linking eligible Business Profiles to a Google Analytics property. The shared performance data can include interactions, website clicks, calls, directions, messages, bookings, and menu clicks. Google's [Business Profile connection guide](https://support.google.com/analytics/answer/16930347) also notes that linked profile data is aggregated and available for the most recent six months.

Review profile actions beside website key events. This gives you a broader view of local demand and reduces the temptation to credit every customer to the website alone.

## Add Business Context to Every Report

Analytics reports activity, not profit. Add a small set of business numbers outside Analytics: qualified leads, appointments, jobs won, average sale value, and revenue by source when known. A weekly scorecard might contain sessions, lead events, qualified leads, booked jobs, and estimated revenue.

This exposes measurement problems quickly. If form leads rise but booked work falls, review lead quality and response time. If phone clicks fall after a redesign, test the call button. If organic traffic rises while key events stay flat, inspect the landing pages attracting that traffic.

Protect customer privacy while connecting systems. Collect only the data you need, avoid sending personally identifiable information to Analytics, limit access, and make sure your consent setup matches the laws and policies that apply to your business.

## Use a 20-Minute Weekly Review

Keep the routine simple enough to repeat. Once a week:

1. Confirm that form, phone, booking, and purchase events are still firing.
2. Compare sessions, key events, and session key event rate with the prior period.
3. Review the top landing pages and traffic sources by key events.
4. Check Google Business Profile calls, directions, and website clicks.
5. Choose one change, assign an owner, and record the expected result.

The goal is not to spend more time reading reports. It is to find the next useful decision. If your tracking cannot connect visits to real customer actions, [contact Fused Distribution](/#contact) for a focused analytics setup built around leads and revenue.

## Related

- [Website Analytics for Local Business: A Beginner Guide](/blog/website-analytics-for-local-business-beginner-guide/)
- [Best Appointment Booking Tools for Small Business 2026](/blog/best-appointment-booking-tools-for-small-business-2026/)
- [Calendar Booking Links: How to Add Them to Your Google Business Profile](/blog/calendar-booking-link-how-to-add-to-google-business-pro/)

Read next: [Website Analytics for Local Business: A Beginner Guide](/blog/website-analytics-for-local-business-beginner-guide/)
