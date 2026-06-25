# Newsletter Signup Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two dedicated newsletter signup pages (`/newsletter/silver/` and `/newsletter/tech/`) and add a "Stay in the loop" CTA section to the Reserve and Projects parent pages.

**Architecture:** Four single-file HTML pages following the existing static site pattern — no build step, no frameworks, vanilla HTML/CSS/JS. New pages inherit their visual theme from their parent page (gold for Silver, cyan for Tech). Forms POST to the same MailerLite API and groups as the existing popups.

**Tech Stack:** Vanilla HTML/CSS/JS, MailerLite API (`https://connect.mailerlite.com/api/subscribers`), git push to deploy.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `newsletter/silver/index.html` | Silver Report signup page |
| Create | `newsletter/tech/index.html` | Tech Brief signup page |
| Modify | `reserve/index.html` | Add "Stay in the loop" section before `<footer>` |
| Modify | `projects/index.html` | Add "Stay in the loop" section before `<footer>` |

---

## Shared Constants (reference for all tasks)

```
MAILERLITE_API_KEY = [REDACTED_COMPROMISED_CREDENTIAL]

SILVER_GROUP_ID = 188457997474727782
TECH_GROUP_ID   = 188458016342804399
MAILERLITE_URL  = https://connect.mailerlite.com/api/subscribers
```

---

## Task 1: Silver Report Signup Page

**Files:**
- Create: `newsletter/silver/index.html`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p "/Users/nick/Documents/New project/newsletter/silver"
```

- [ ] **Step 2: Write the full page**

Create `/Users/nick/Documents/New project/newsletter/silver/index.html` with this exact content:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Join The Silver Report | Fused Reserve</title>
    <meta name="description" content="Sign up for The Silver Report. Get free shipping on your first order and straight talk on silver prices, deals, and what is worth buying." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://fuseddistribution.com/newsletter/silver/" />
    <meta name="theme-color" content="#090b0f" />
    <meta name="author" content="Fused Distribution" />
    <style>
      :root {
        --bg: #090b0f;
        --bg-2: #11151b;
        --panel: rgba(21, 26, 34, 0.88);
        --line: rgba(209, 217, 230, 0.16);
        --text: #f5f7fb;
        --muted: #b7bfcb;
        --accent: #f2c66d;
        --accent-soft: rgba(242, 198, 109, 0.14);
      }

      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        font-family: Georgia, "Times New Roman", serif;
        background:
          radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 26%),
          radial-gradient(circle at 85% 18%, rgba(242,198,109,0.09), transparent 20%),
          linear-gradient(180deg, #06080b 0%, #0c1015 40%, #080a0e 100%);
      }

      a { color: inherit; text-decoration: none; }

      .shell {
        width: min(760px, calc(100% - 32px));
        margin: 40px auto 64px;
        background: linear-gradient(180deg, rgba(17,21,27,0.97), rgba(10,13,18,0.98));
        border: 1px solid var(--line);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 28px 80px rgba(0,0,0,0.45);
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 32px;
        background: rgba(9,11,15,0.9);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--line);
      }

      .brand { display: flex; flex-direction: column; line-height: 1; }
      .brand-kicker { font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); font-family: "Trebuchet MS", "Segoe UI", sans-serif; }
      .brand-mark { font-size: 1.25rem; font-weight: 700; color: var(--accent); letter-spacing: 0.04em; }

      .back-link {
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.82rem;
        color: var(--muted);
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 6px 14px;
      }
      .back-link:hover { color: var(--text); border-color: rgba(209,217,230,0.32); }

      .main {
        padding: 52px 48px 56px;
      }

      .kicker {
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.75rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--accent);
        margin: 0 0 16px;
      }

      h1 {
        margin: 0 0 12px;
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.2;
        color: var(--text);
      }

      .subhead {
        margin: 0 0 32px;
        font-size: 1rem;
        color: var(--muted);
        line-height: 1.6;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      }

      .benefits {
        list-style: none;
        margin: 0 0 36px;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .benefits li {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.94rem;
        color: var(--text);
        line-height: 1.5;
      }

      .benefits li::before {
        content: "—";
        color: var(--accent);
        flex-shrink: 0;
        margin-top: 1px;
      }

      .divider {
        height: 1px;
        background: var(--line);
        margin: 0 0 32px;
      }

      .form-wrap { display: flex; flex-direction: column; gap: 12px; }

      .form-label {
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.8rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 4px;
        display: block;
      }

      .form-input {
        width: 100%;
        padding: 13px 16px;
        border-radius: 10px;
        border: 1px solid rgba(242,198,109,0.28);
        background: rgba(255,255,255,0.04);
        color: var(--text);
        font-size: 0.95rem;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        outline: none;
      }
      .form-input:focus { border-color: rgba(242,198,109,0.65); }

      .form-btn {
        padding: 14px;
        border-radius: 10px;
        border: none;
        background: var(--accent);
        color: #0b0e14;
        font-size: 0.95rem;
        font-weight: 700;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        cursor: pointer;
        transition: opacity 0.15s;
        letter-spacing: 0.03em;
      }
      .form-btn:hover { opacity: 0.88; }
      .form-btn:disabled { opacity: 0.5; cursor: default; }

      .form-note {
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.78rem;
        color: var(--muted);
        opacity: 0.7;
        text-align: center;
      }

      .success-msg {
        display: none;
        text-align: center;
        padding: 24px;
        background: var(--accent-soft);
        border: 1px solid rgba(242,198,109,0.28);
        border-radius: 12px;
      }
      .success-msg p {
        margin: 0;
        color: var(--accent);
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.95rem;
        line-height: 1.6;
      }

      .footer {
        padding: 20px 32px;
        text-align: center;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.82rem;
        color: rgba(183,191,203,0.6);
        border-top: 1px solid var(--line);
      }
      .footer a { opacity: 0.7; text-decoration: underline; }

      @media (max-width: 600px) {
        .main { padding: 36px 24px 40px; }
        .topbar { padding: 16px 20px; }
        h1 { font-size: 1.5rem; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="/reserve/">
          <span class="brand-kicker">Local sourcing network</span>
          <span class="brand-mark">Fused Reserve</span>
        </a>
        <a class="back-link" href="/reserve/">Back to Reserve</a>
      </header>

      <main class="main">
        <p class="kicker">Free newsletter</p>
        <h1>Get free shipping and straight talk on silver</h1>
        <p class="subhead">Join The Silver Report. Written by Robert Paulson.</p>

        <ul class="benefits">
          <li>Silver spot price moves when they matter</li>
          <li>Deals and low-premium inventory before they go wide</li>
          <li>Straight read on what is worth buying and when to wait</li>
        </ul>

        <div class="divider"></div>

        <div id="sr-form-wrap">
          <form class="form-wrap" id="sr-form" novalidate>
            <div>
              <label class="form-label" for="sr-email">Email address</label>
              <input class="form-input" id="sr-email" type="email" placeholder="you@example.com" autocomplete="email" required />
            </div>
            <button class="form-btn" id="sr-btn" type="submit">Claim free shipping</button>
            <p class="form-note">No spam. Unsubscribe any time.</p>
          </form>
        </div>

        <div class="success-msg" id="sr-success">
          <p>Check your inbox to confirm. Free shipping code on its way.</p>
        </div>
      </main>

      <footer class="footer">
        © 2026 Fused Reserve. All rights reserved.
        &nbsp;·&nbsp;
        <a href="/privacy/">Privacy Policy</a>
      </footer>
    </div>

    <script>
      (function () {
        var MAILERLITE_API_KEY = '[REDACTED_COMPROMISED_CREDENTIAL]';
        var GROUP_ID = '188457997474727782';

        document.getElementById('sr-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var email = document.getElementById('sr-email').value.trim();
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('sr-email').focus();
            return;
          }
          var btn = document.getElementById('sr-btn');
          btn.disabled = true;
          fetch('https://connect.mailerlite.com/api/subscribers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Bearer ' + MAILERLITE_API_KEY
            },
            body: JSON.stringify({ email: email, groups: [GROUP_ID] })
          })
            .then(function (res) { if (!res.ok) throw new Error('bad response'); })
            .catch(function (err) { console.error('MailerLite subscribe error:', err); })
            .finally(function () {
              document.getElementById('sr-form-wrap').style.display = 'none';
              document.getElementById('sr-success').style.display = 'block';
            });
        });
      })();
    </script>
  </body>
</html>
```

- [ ] **Step 3: Manual browser test**

Open `newsletter/silver/index.html` in browser (file:/// works). Verify:
- Page loads with dark/gold theme
- Three benefit bullets visible
- Email field accepts input
- Submit with empty field: no action, focus returns to email
- Submit with invalid email (no `@domain.tld`): no action
- Submit with valid email: success message shows ("Check your inbox to confirm...")
- Button disables on submit
- No console errors

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add newsletter/silver/index.html
git commit -m "feat: add Silver Report newsletter signup page"
```

---

## Task 2: Tech Brief Signup Page

**Files:**
- Create: `newsletter/tech/index.html`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "/Users/nick/Documents/New project/newsletter/tech"
```

- [ ] **Step 2: Write the full page**

Create `/Users/nick/Documents/New project/newsletter/tech/index.html` with this exact content:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Join The Tech Brief | Fused Technology Solutions</title>
    <meta name="description" content="Sign up for The Tech Brief. Claim a free 15-minute call and get practical guides on AI tools and new tech, straight to your inbox." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://fuseddistribution.com/newsletter/tech/" />
    <meta name="theme-color" content="#07131a" />
    <meta name="author" content="Fused Distribution" />
    <style>
      :root {
        --bg: #07131a;
        --bg-soft: #0d1f29;
        --panel: rgba(11, 24, 32, 0.82);
        --line: rgba(87, 219, 255, 0.16);
        --text: #ecf8fb;
        --muted: #afc6cf;
        --accent: #58d6ff;
        --accent-soft: rgba(88, 214, 255, 0.10);
      }

      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 10% 12%, rgba(88,214,255,0.12), transparent 24%),
          radial-gradient(circle at 84% 14%, rgba(77,255,184,0.08), transparent 18%),
          linear-gradient(180deg, #041018 0%, #07131a 48%, #040b10 100%);
      }

      a { color: inherit; text-decoration: none; }

      .shell {
        width: min(760px, calc(100% - 32px));
        margin: 40px auto 64px;
        background: linear-gradient(180deg, rgba(9,18,24,0.97), rgba(5,12,17,0.98));
        border: 1px solid var(--line);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 28px 80px rgba(0,0,0,0.45);
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 32px;
        background: rgba(7,16,22,0.92);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--line);
      }

      .brand { display: flex; flex-direction: column; line-height: 1; }
      .brand-kicker { font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
      .brand-mark { font-size: 1.25rem; font-weight: 900; color: var(--accent); letter-spacing: 0.08em; text-transform: uppercase; }

      .back-link {
        font-size: 0.82rem;
        color: var(--muted);
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 6px 14px;
      }
      .back-link:hover { color: var(--text); border-color: rgba(87,219,255,0.32); }

      .main { padding: 52px 48px 56px; }

      .kicker {
        font-size: 0.75rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--accent);
        margin: 0 0 16px;
      }

      h1 {
        margin: 0 0 12px;
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.2;
        color: var(--text);
      }

      .subhead {
        margin: 0 0 32px;
        font-size: 1rem;
        color: var(--muted);
        line-height: 1.6;
      }

      .benefits {
        list-style: none;
        margin: 0 0 36px;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .benefits li {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        font-size: 0.94rem;
        color: var(--text);
        line-height: 1.5;
      }

      .benefits li::before {
        content: "—";
        color: var(--accent);
        flex-shrink: 0;
        margin-top: 1px;
      }

      .divider {
        height: 1px;
        background: var(--line);
        margin: 0 0 32px;
      }

      .form-wrap { display: flex; flex-direction: column; gap: 12px; }

      .form-label {
        font-size: 0.8rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 4px;
        display: block;
      }

      .form-input {
        width: 100%;
        padding: 13px 16px;
        border-radius: 10px;
        border: 1px solid rgba(88,214,255,0.25);
        background: rgba(255,255,255,0.04);
        color: var(--text);
        font-size: 0.95rem;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        outline: none;
      }
      .form-input:focus { border-color: rgba(88,214,255,0.6); }

      .form-btn {
        padding: 14px;
        border-radius: 10px;
        border: none;
        background: var(--accent);
        color: #07131a;
        font-size: 0.95rem;
        font-weight: 700;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        cursor: pointer;
        transition: opacity 0.15s;
        letter-spacing: 0.03em;
      }
      .form-btn:hover { opacity: 0.88; }
      .form-btn:disabled { opacity: 0.5; cursor: default; }

      .form-note {
        font-size: 0.78rem;
        color: var(--muted);
        opacity: 0.7;
        text-align: center;
      }

      .success-msg {
        display: none;
        text-align: center;
        padding: 24px;
        background: var(--accent-soft);
        border: 1px solid rgba(88,214,255,0.22);
        border-radius: 12px;
      }
      .success-msg p {
        margin: 0;
        color: var(--accent);
        font-size: 0.95rem;
        line-height: 1.6;
      }

      .footer {
        padding: 20px 32px;
        text-align: center;
        font-size: 0.82rem;
        color: rgba(175,198,207,0.6);
        border-top: 1px solid var(--line);
      }
      .footer a { opacity: 0.7; text-decoration: underline; }

      @media (max-width: 600px) {
        .main { padding: 36px 24px 40px; }
        .topbar { padding: 16px 20px; }
        h1 { font-size: 1.5rem; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="/projects/">
          <span class="brand-kicker">Technology Solutions</span>
          <span class="brand-mark">Fused</span>
        </a>
        <a class="back-link" href="/projects/">Back to Projects</a>
      </header>

      <main class="main">
        <p class="kicker">Free newsletter</p>
        <h1>Get a free 15-minute call and practical tech guides</h1>
        <p class="subhead">Join The Tech Brief. AI tools and new tech, no noise.</p>

        <ul class="benefits">
          <li>Practical AI how-to guides you can use the same day</li>
          <li>Tool reviews that skip the hype and show what actually works</li>
          <li>New tech explained plainly, no jargon</li>
        </ul>

        <div class="divider"></div>

        <div id="tb-form-wrap">
          <form class="form-wrap" id="tb-form" novalidate>
            <div>
              <label class="form-label" for="tb-name">Your name</label>
              <input class="form-input" id="tb-name" type="text" placeholder="First name" autocomplete="given-name" required />
            </div>
            <div>
              <label class="form-label" for="tb-email">Email address</label>
              <input class="form-input" id="tb-email" type="email" placeholder="you@example.com" autocomplete="email" required />
            </div>
            <button class="form-btn" id="tb-btn" type="submit">Claim free session</button>
            <p class="form-note">No spam. Unsubscribe any time.</p>
          </form>
        </div>

        <div class="success-msg" id="tb-success">
          <p>Check your inbox to confirm. We will reach out to schedule your call.</p>
        </div>
      </main>

      <footer class="footer">
        © 2026 Fused Direct Distribution. All rights reserved.
        &nbsp;·&nbsp;
        <a href="/privacy/">Privacy Policy</a>
      </footer>
    </div>

    <script>
      (function () {
        var MAILERLITE_API_KEY = '[REDACTED_COMPROMISED_CREDENTIAL]';
        var GROUP_ID = '188458016342804399';

        document.getElementById('tb-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var name = document.getElementById('tb-name').value.trim();
          var email = document.getElementById('tb-email').value.trim();
          if (!name) { document.getElementById('tb-name').focus(); return; }
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('tb-email').focus();
            return;
          }
          var btn = document.getElementById('tb-btn');
          btn.disabled = true;
          fetch('https://connect.mailerlite.com/api/subscribers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Bearer ' + MAILERLITE_API_KEY
            },
            body: JSON.stringify({ email: email, fields: { name: name }, groups: [GROUP_ID] })
          })
            .then(function (res) { if (!res.ok) throw new Error('bad response'); })
            .catch(function (err) { console.error('MailerLite subscribe error:', err); })
            .finally(function () {
              document.getElementById('tb-form-wrap').style.display = 'none';
              document.getElementById('tb-success').style.display = 'block';
            });
        });
      })();
    </script>
  </body>
</html>
```

- [ ] **Step 3: Manual browser test**

Open `newsletter/tech/index.html` in browser. Verify:
- Page loads with dark/cyan theme
- Three benefit bullets visible
- Name field and email field present in that order
- Empty name: focus returns to name field
- Valid name + invalid email: focus returns to email
- Valid name + valid email: success message shows ("Check your inbox to confirm...")
- Button disables on submit
- No console errors

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add newsletter/tech/index.html
git commit -m "feat: add Tech Brief newsletter signup page"
```

---

## Task 3: "Stay in the loop" section on Reserve page

**Files:**
- Modify: `reserve/index.html` — insert section before `<footer class="footer">` (around line 1392)

- [ ] **Step 1: Find the insertion point**

Open `reserve/index.html`. Search for `<footer class="footer">`. Insert the following block immediately before that line:

```html
      <section class="nl-cta" aria-label="Newsletter signup">
        <div class="nl-cta-inner">
          <h2 class="nl-cta-heading">Stay in the loop</h2>
          <p class="nl-cta-body">The Silver Report goes out when something worth knowing happens. Sign up and get free shipping on your first order.</p>
          <a class="nl-cta-btn" href="/newsletter/silver/">Join The Silver Report</a>
        </div>
      </section>
```

- [ ] **Step 2: Add CSS for the section**

In the `<style>` block of `reserve/index.html`, find the `.footer {` rule (around line 808). Insert the following immediately before it:

```css
      .nl-cta {
        padding: 48px 28px;
        border-top: 1px solid var(--line);
        background: rgba(242,198,109,0.04);
      }

      .nl-cta-inner {
        max-width: 600px;
        margin: 0 auto;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .nl-cta-heading {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text);
      }

      .nl-cta-body {
        margin: 0;
        font-size: 0.95rem;
        color: var(--muted);
        line-height: 1.6;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        max-width: 480px;
      }

      .nl-cta-btn {
        display: inline-block;
        padding: 12px 28px;
        border-radius: 999px;
        background: var(--accent);
        color: #0b0e14;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.88rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        transition: opacity 0.15s;
      }

      .nl-cta-btn:hover { opacity: 0.88; }
```

- [ ] **Step 3: Verify visually**

Open `reserve/index.html` in browser, scroll to bottom. Confirm:
- Gold-tinted section appears above the footer
- "Stay in the loop" heading visible
- Copy matches spec exactly (no em-dashes, no hyphenated words)
- "Join The Silver Report" button is gold and links to `/newsletter/silver/`

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add reserve/index.html
git commit -m "feat: add newsletter CTA section to Reserve page"
```

---

## Task 4: "Stay in the loop" section on Projects page

**Files:**
- Modify: `projects/index.html` — insert section before `<footer` tag near end of file

- [ ] **Step 1: Find the insertion point**

Open `projects/index.html`. Search for `<footer` near the end of the file. Insert the following block immediately before it:

```html
      <section class="nl-cta" aria-label="Newsletter signup">
        <div class="nl-cta-inner">
          <h2 class="nl-cta-heading">Stay in the loop</h2>
          <p class="nl-cta-body">The Tech Brief covers AI tools and new tech in plain language. Sign up and claim a free 15-minute call.</p>
          <a class="nl-cta-btn" href="/newsletter/tech/">Join The Tech Brief</a>
        </div>
      </section>
```

- [ ] **Step 2: Add CSS for the section**

In the `<style>` block of `projects/index.html`, find the `.footer {` rule. Insert the following immediately before it:

```css
      .nl-cta {
        padding: 48px 28px;
        border-top: 1px solid var(--line);
        background: rgba(88,214,255,0.04);
      }

      .nl-cta-inner {
        max-width: 600px;
        margin: 0 auto;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .nl-cta-heading {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text);
      }

      .nl-cta-body {
        margin: 0;
        font-size: 0.95rem;
        color: var(--muted);
        line-height: 1.6;
        max-width: 480px;
      }

      .nl-cta-btn {
        display: inline-block;
        padding: 12px 28px;
        border-radius: 999px;
        background: var(--accent);
        color: #07131a;
        font-size: 0.88rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        transition: opacity 0.15s;
      }

      .nl-cta-btn:hover { opacity: 0.88; }
```

- [ ] **Step 3: Verify visually**

Open `projects/index.html` in browser, scroll to bottom. Confirm:
- Cyan-tinted section appears above footer
- "Stay in the loop" heading visible
- Copy matches spec (no em-dashes, no hyphenated words)
- "Join The Tech Brief" button is cyan and links to `/newsletter/tech/`

- [ ] **Step 4: Commit and push**

```bash
cd "/Users/nick/Documents/New project"
git add projects/index.html
git commit -m "feat: add newsletter CTA section to Projects page"
git push origin main
```

Expected output: `main -> main` with 4 new commits pushed.
