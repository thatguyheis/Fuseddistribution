# Mailing List System Design
**Date:** 2026-05-25  
**Project:** Fused Distribution — fuseddistribution.com

---

## Overview

Add two email mailing lists to fuseddistribution.com using self-hosted Listmonk. Each list targets a distinct audience, has its own signup popup, and delivers a unique signup incentive via welcome email. Both lists serve as ongoing newsletters.

---

## Lists

### 1. Fused Reserve — "The Silver Report"
- **Page:** fuseddistribution.com/reserve/
- **File:** `/Users/nick/Documents/New project/reserve/index.html`
- **Audience:** People interested in silver investing, precious metals, reserve plans
- **Incentive:** Free shipping on first order
- **Ongoing content:** Silver spot price updates, buying opportunities, reserve plan news, deals
- **Send frequency:** Event-driven (price moves, new stock, promotions)

### 2. Fused Technical Solutions — "The Tech Brief"
- **Page:** fuseddistribution.com/projects/
- **File:** `/Users/nick/Documents/New project/projects/index.html`
- **Audience:** People interested in AI tools, new technology, practical how-to content
- **Incentive:** Free 15-minute consultation call
- **Ongoing content:** AI how-to guides, tool reviews, workflow tips, new tech explainers
- **Send frequency:** Weekly or bi-weekly

---

## Infrastructure

### Server
- Hardware: Old PC repurposed as home server
- OS: Ubuntu Server (LTS)
- Runtime: Docker + Docker Compose
- App: Listmonk via official Docker image
- Reverse proxy: nginx
- SSL: Let's Encrypt via Certbot (auto-renew)
- Subdomain: `lists.fuseddistribution.com` (or `mail.fuseddistribution.com`)
- Router: Port forward 80 and 443 to the PC

### Listmonk Configuration
- Two lists created: `Fused Reserve` and `Fused Technical Solutions`
- Double opt-in enabled on both lists (required for CAN-SPAM compliance)
- SMTP: Resend (already in use on the main site)
- Two transactional email templates: one per list, each delivers the signup offer post-confirmation

---

## Popups

### Behavior (both popups)
- Trigger: 30-second delay after page load
- Fields: see per-popup below
- On submit: POST to Listmonk public subscription API, show inline success message
- Dismiss: "No thanks" text link below CTA
- Implementation: pure HTML/CSS/JS injected into each page file, no external dependencies

### Fused Reserve Popup
- **Headline:** Get free shipping on your first order
- **Body:** Join The Silver Report. We send updates on silver prices, deals, and what's worth buying. No noise.
- **Fields:** Email only
- **CTA:** Claim free shipping
- **Success message:** Check your email to confirm your spot. Your free shipping code is on its way.

### Fused Technical Solutions Popup
- **Headline:** Get a free 15-minute call
- **Body:** Join The Tech Brief. Practical guides on AI tools and new tech, straight to your inbox.
- **Fields:** Name + Email
- **CTA:** Claim free session
- **Success message:** Check your email to confirm. We will reach out to schedule your call.

### Copy Rules (applied to all copy)
- No em-dashes
- No hyphenated compound words
- No buzzwords (leverage, seamless, streamline, innovative, etc.)
- Plain first-person tone, short sentences, sounds like a person

---

## Email Templates

### Double Opt-In Confirmation (both lists)
- Sent by Listmonk automatically after form submission
- Contains: confirmation link, brief reminder of what they signed up for
- Subject line examples:
  - Reserve: "Confirm your spot on The Silver Report"
  - Tech: "Confirm your spot on The Tech Brief"

### Welcome Email — Fused Reserve
- Triggered after confirmation click
- Delivers: free shipping promo code
- Content: brief intro to what they will receive, when to expect emails
- Must include: physical mailing address, unsubscribe link

### Welcome Email — Fused Technical Solutions
- Triggered after confirmation click
- Delivers: instructions to reply to email to book free 15-minute call (Calendly integration planned for future phase)
- Content: brief intro to what they will receive, when to expect emails
- Must include: physical mailing address, unsubscribe link

---

## Legal and Compliance

### Privacy Policy Update
- **File:** `/Users/nick/Documents/New project/privacy/index.html`
- **Current state:** Explicitly states data is not used for marketing. This directly contradicts a mailing list and must be rewritten before going live.
- **Required additions:**
  - Email addresses collected via signup forms are used to send marketing communications
  - Data is stored on a self-hosted Listmonk instance (your own server, not a third party)
  - Subscribers can unsubscribe at any time via the link in every email
  - Data is retained until the subscriber unsubscribes or requests deletion
  - Data is not sold, rented, or shared with third parties

### CAN-SPAM Compliance (US federal law)
- Every marketing email must include a physical mailing address
- Every email must include a working unsubscribe link
- Unsubscribe requests must be honored within 10 business days
- No deceptive subject lines
- Listmonk handles unsubscribe mechanics automatically

### No separate Terms of Service required at this stage. Add when payments or a store are introduced.

---

## Implementation Order

1. Set up Ubuntu Server on old PC
2. Install Docker, Docker Compose, nginx, Certbot
3. Point `lists.fuseddistribution.com` subdomain to home IP, configure port forwarding
4. Deploy Listmonk via Docker Compose
5. Configure Listmonk: SMTP via Resend, create two lists, enable double opt-in
6. Write and configure transactional email templates in Listmonk
7. Update privacy policy at `/Users/nick/Documents/New project/privacy/index.html`
8. Build and add Reserve popup to `/Users/nick/Documents/New project/reserve/index.html`
9. Build and add Technical Solutions popup to `/Users/nick/Documents/New project/projects/index.html`
10. Test full signup flow on both pages (submit form, receive confirmation email, click confirm, receive welcome email)
11. Commit and push all HTML changes to deploy

---

## Out of Scope
- Terms of service page (not needed until payments/store)
- Analytics or tracking (current privacy policy explicitly excludes it)
- Paid email platform (Listmonk covers all needs at zero cost)
