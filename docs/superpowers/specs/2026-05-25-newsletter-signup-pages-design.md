# Newsletter Signup Pages Design
**Date:** 2026-05-25  
**Project:** Fused Distribution — fuseddistribution.com

---

## Overview

Two dedicated newsletter signup pages, one per service. Each page is a focused, always-visible signup form with a benefits list and the same offer as the existing popups. Parent pages get a new "Stay in the loop" section linking to each signup page.

---

## New Pages

### `/newsletter/silver/index.html` — The Silver Report

- **URL:** fuseddistribution.com/newsletter/silver/
- **Theme:** Dark `#090b0f` background, gold accent `#f2c66d` — matches Reserve page
- **MailerLite group:** Silver Report (`188457997474727782`) — same as popup
- **Form fields:** Email only
- **Headline:** "Get free shipping and straight talk on silver"
- **Subhead:** "Join The Silver Report. Written by Robert Paulson."
- **Benefit bullets:**
  - Silver spot price moves when they matter
  - Deals and low-premium inventory before they go wide
  - Straight read on what's worth buying and when to wait
- **CTA button:** "Claim free shipping"
- **Success state:** "Check your inbox to confirm. Free shipping code on its way."
- **Email validation:** regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### `/newsletter/tech/index.html` — The Tech Brief

- **URL:** fuseddistribution.com/newsletter/tech/
- **Theme:** Dark `#07131a` background, cyan accent `#58d6ff` — matches Projects page
- **MailerLite group:** Tech Brief (`188458016342804399`) — same as popup
- **Form fields:** Name + Email
- **Headline:** "Get a free 15-minute call and practical tech guides"
- **Subhead:** "Join The Tech Brief. AI tools and new tech, no noise."
- **Benefit bullets:**
  - Practical AI how-to guides you can use the same day
  - Tool reviews that skip the hype and show what actually works
  - New tech explained plainly, no jargon
- **CTA button:** "Claim free session"
- **Success state:** "Check your inbox to confirm. We will reach out to schedule your call."
- **Email validation:** regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

---

## Parent Page Sections

### Reserve page (`/reserve/index.html`)

Add new section near bottom, before footer:

- **Heading:** "Stay in the loop"
- **Copy:** "The Silver Report goes out when something worth knowing happens. Sign up and get free shipping on your first order."
- **Button:** "Join The Silver Report" → `/newsletter/silver/`
- **Style:** Gold accent, consistent with existing Reserve page sections

### Projects page (`/projects/index.html`)

Add new section near bottom, before footer:

- **Heading:** "Stay in the loop"
- **Copy:** "The Tech Brief covers AI tools and new tech in plain language. Sign up and claim a free 15-minute call."
- **Button:** "Join The Tech Brief" → `/newsletter/tech/`
- **Style:** Cyan accent, consistent with existing Projects page sections

Both parent sections contain no inline form — copy and link button only.

---

## Technical Notes

- Both signup pages use the same MailerLite API key and endpoint as the existing popups
- No localStorage suppression (forms are always visible, not timed popups)
- No delay timer or dismiss logic
- API POST body matches existing popup implementation:
  - Silver: `{ email, groups: ['188457997474727782'] }`
  - Tech: `{ email, fields: { name }, groups: ['188458016342804399'] }`
- Both new pages follow existing single-file HTML pattern (no build step)
- Silver page color vars match `/reserve/index.html`
- Tech page color vars match `/projects/index.html`

---

## Writing Rules (all copy)

- No em-dashes
- No hyphenated compound words
- No buzzwords
- Plain first-person tone, short sentences

---

## Files

| Action | File |
|--------|------|
| Create | `newsletter/silver/index.html` |
| Create | `newsletter/tech/index.html` |
| Modify | `reserve/index.html` — add "Stay in the loop" section |
| Modify | `projects/index.html` — add "Stay in the loop" section |

---

## Out of Scope

- Source tracking (popup vs. page) — same groups used for both
- Navigation menu links — pages discovered via parent page sections and direct URLs
- Terms of service — covered by existing privacy policy update
