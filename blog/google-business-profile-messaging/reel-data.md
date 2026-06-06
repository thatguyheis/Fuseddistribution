# Reel Data: google-business-profile-messaging
topic: tech
format: long-form

hook: 45% of business chats get a response. Only 6% of emails do.
hook_type: contrarian_stat

## stats
- text: 45% CHAT RESPONSE RATE
  explanation: Customers are 7x more likely to reply to a business chat than an email
  graphic_type: percent_fill
  graphic:
    value: 45
    label: Chat/Text
    remainder_label: No Response
  narration: Research from Gartner shows business chat and text messages achieve a 45 percent average response rate from customers. Email sits at just 6 percent. That gap isn't about the message. It's about the channel.

- text: 6% EMAIL RESPONSE RATE
  explanation: Email gets buried; chat arrives where customers are already looking
  graphic_type: percent_fill
  graphic:
    value: 6
    label: Email
    remainder_label: No Response
  narration: Email open rates for local businesses average around 20 percent, but even opened emails rarely produce a reply. A customer tapping a button from their Google search result is in a completely different headspace.

- text: 3 MINUTES TO ENABLE
  explanation: GBP messaging is free and takes under 5 minutes to activate
  graphic_type: none
  narration: Enabling Google Business Profile messaging takes about 3 minutes. Open Google Maps, go to your Business Profile, tap Messages, and toggle it on. Your listing shows a Message button within minutes. Zero cost. No third-party app.

- text: 24 HR RESPONSE RULE
  explanation: Google disables messaging if average response time exceeds 24 hours
  graphic_type: timeline
  graphic:
    min: 0
    max: 24
    unit: hours
    label: Max Response Window
  narration: Google monitors how fast you respond. If your average response time exceeds 24 hours, Google turns messaging off automatically. You lose the button on your listing. Most businesses that check messages once in the morning and once in the evening stay well inside that limit.

- text: 2 OPTIONS FOR BOOKING
  explanation: Offering two specific time slots doubles the chance of a confirmed appointment
  graphic_type: growth
  graphic:
    from_value: 1
    from_label: Open invite
    to_value: 2
    to_label: Two slots
    unit: booking rate
  narration: When you offer two specific time slots in a chat reply instead of an open-ended invitation, customers are significantly more likely to commit. Open-ended scheduling questions produce maybe answers. Two choices produce decisions. Tuesday at 2pm or Wednesday at 10am gets a booking.

- text: 38% PHONE RESPONSE RATE
  explanation: Phone call answer rates sit between chat and email for business inquiries
  graphic_type: percent_fill
  graphic:
    value: 38
    label: Phone
    remainder_label: No Response
  narration: Phone calls have a 38 percent response rate for business inquiries, sitting between chat and email. Many customers are reluctant to call for a quick question, especially on mobile. Messaging removes that friction entirely.

- text: 3 WELCOME MESSAGE TYPES
  explanation: A qualifying welcome message reduces back-and-forth before booking
  graphic_type: none
  narration: A good welcome message does two things: it acknowledges the customer and asks one qualifying question. Service businesses ask for the service and zip code. Appointment businesses ask for the preferred day. Retail asks what product the customer needs. One question. That's it.

## chart
title: Average Response Rates by Business Communication Channel
bars:
  - Chat / Text: 45%
  - Phone Call: 38%
  - Social DM: 31%
  - Email: 6%
narration: The channel gap is real. Chat converts at nearly 8 times the rate of email. That's not just because customers prefer texting. It's because a customer messaging from a Google search result is actively looking for your service at that moment.

## question
text: DO YOU USE GBP MESSAGING FOR YOUR BUSINESS?
subtext: YES OR NO BELOW
narration: Follow for more tips to grow your business.

## shared
discussion_question: Does your business have GBP messaging turned on, or is it something you've been putting off?
hashtags: #LocalBusiness #SmallBusinessTips #GoogleMyBusiness #DigitalMarketing #WebDesign

## media_queries
- segment: 0
  query: "smartphone screen messaging app business"
  prefer: video
- segment: 2
  query: "business owner replying customer phone"
  prefer: video
- segment: 4
  query: "local business storefront sign"
  prefer: video
- segment: 5
  query: "google maps phone search"
  prefer: video
- segment: 7
  query: "booking appointment calendar phone"
  prefer: photo
