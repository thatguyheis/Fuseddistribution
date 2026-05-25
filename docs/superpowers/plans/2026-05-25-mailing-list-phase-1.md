# Mailing List — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email signup popups to the Reserve and Projects pages plus update the privacy policy — all frontend work, ready to wire to Listmonk in Phase 2.

**Architecture:** Pure HTML/CSS/JS injected into each existing single-file page. Popups trigger after 30 seconds, post to a `LISTMONK_URL` constant that starts empty (optimistic success in transition period, no server needed). Swap the URL to go live. Privacy policy gets a new email marketing section.

**Tech Stack:** Vanilla HTML/CSS/JS, no dependencies. All changes to existing `.html` files. No build step.

---

## File Map

| File | Change |
|------|--------|
| `reserve/index.html` | Add popup `<style>`, popup `<div>`, popup `<script>` before `</body>` |
| `projects/index.html` | Add popup `<style>`, popup `<div>`, popup `<script>` before `</body>` |
| `privacy/index.html` | Add new email marketing section, update "last updated" date |

---

## Task 1: Reserve Page Popup

**Files:**
- Modify: `reserve/index.html` — append before `</body>` (line 1464)

### What it does
- Triggers 30 seconds after page load
- Suppressed for 7 days if user dismissed or signed up (localStorage)
- Email-only field
- Posts to `LISTMONK_URL` constant; if empty (transition period), skips POST and shows success
- Escape key and overlay click dismiss the popup

- [ ] **Step 1: Add popup styles and HTML**

Open `reserve/index.html`. Find the closing `</body>` tag (line 1464). Insert the following immediately before it:

```html
  <!-- MAILING LIST POPUP — FUSED RESERVE -->
  <style>
    #rv-popup-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.72);
      z-index: 9000;
      align-items: center;
      justify-content: center;
    }
    #rv-popup-overlay.rv-open { display: flex; }
    #rv-popup {
      background: linear-gradient(160deg, #13181f 0%, #0b0e14 100%);
      border: 1px solid rgba(242,198,109,0.22);
      border-radius: 14px;
      padding: 36px 32px 28px;
      width: min(420px, calc(100vw - 32px));
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      position: relative;
    }
    #rv-popup-close {
      position: absolute;
      top: 14px;
      right: 18px;
      background: none;
      border: none;
      color: #b7bfcb;
      font-size: 1.3rem;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
    }
    #rv-popup-close:hover { color: #f5f7fb; }
    #rv-popup h2 {
      margin: 0 0 8px;
      font-size: 1.25rem;
      font-weight: 700;
      color: #f2c66d;
      letter-spacing: 0.01em;
    }
    #rv-popup p {
      margin: 0 0 20px;
      font-size: 0.9rem;
      color: #b7bfcb;
      line-height: 1.55;
    }
    #rv-popup-form { display: flex; flex-direction: column; gap: 10px; }
    #rv-popup-email {
      padding: 11px 14px;
      border-radius: 8px;
      border: 1px solid rgba(242,198,109,0.28);
      background: rgba(255,255,255,0.05);
      color: #f5f7fb;
      font-size: 0.92rem;
      outline: none;
    }
    #rv-popup-email:focus { border-color: rgba(242,198,109,0.65); }
    #rv-popup-btn {
      padding: 12px;
      border-radius: 8px;
      border: none;
      background: #f2c66d;
      color: #0b0e14;
      font-size: 0.92rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    #rv-popup-btn:hover { opacity: 0.88; }
    #rv-popup-dismiss {
      display: block;
      text-align: center;
      margin-top: 12px;
      font-size: 0.8rem;
      color: #6b7480;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
    }
    #rv-popup-dismiss:hover { color: #b7bfcb; }
    #rv-popup-success { display: none; text-align: center; }
    #rv-popup-success p {
      color: #f2c66d;
      font-size: 0.95rem;
      margin: 0;
    }
  </style>

  <div id="rv-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="rv-popup-heading">
    <div id="rv-popup">
      <button id="rv-popup-close" aria-label="Close">&#x2715;</button>
      <div id="rv-popup-form-wrap">
        <h2 id="rv-popup-heading">Get free shipping on your first order</h2>
        <p>Join The Silver Report. We send updates on silver prices, deals, and what is worth buying. No noise.</p>
        <form id="rv-popup-form" novalidate>
          <input id="rv-popup-email" type="email" placeholder="Your email address" autocomplete="email" required />
          <button id="rv-popup-btn" type="submit">Claim free shipping</button>
        </form>
        <button id="rv-popup-dismiss" type="button">No thanks</button>
      </div>
      <div id="rv-popup-success">
        <p>Check your email to confirm your spot. Your free shipping code is on its way.</p>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Add popup script**

Immediately after the HTML block above (still before `</body>`), insert:

```html
  <script>
    (function () {
      // Phase 2: replace empty string with your Listmonk subscription URL
      // e.g. 'https://lists.fuseddistribution.com/api/public/subscription'
      var LISTMONK_URL = '';
      var LIST_UUID = 'RESERVE_LIST_UUID'; // replace with real UUID from Listmonk

      var STORAGE_KEY = 'rv_popup_dismissed';
      var DELAY_MS = 30000;

      function isDismissed() {
        try {
          var ts = localStorage.getItem(STORAGE_KEY);
          if (!ts) return false;
          return Date.now() - parseInt(ts, 10) < 7 * 24 * 60 * 60 * 1000;
        } catch (e) { return false; }
      }

      function dismiss() {
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) {}
      }

      function open() {
        document.getElementById('rv-popup-overlay').classList.add('rv-open');
      }

      function close() {
        document.getElementById('rv-popup-overlay').classList.remove('rv-open');
        dismiss();
      }

      function showSuccess() {
        document.getElementById('rv-popup-form-wrap').style.display = 'none';
        document.getElementById('rv-popup-success').style.display = 'block';
        setTimeout(function () { close(); }, 3000);
      }

      if (isDismissed()) return;

      setTimeout(open, DELAY_MS);

      document.getElementById('rv-popup-close').addEventListener('click', close);
      document.getElementById('rv-popup-dismiss').addEventListener('click', close);

      document.getElementById('rv-popup-overlay').addEventListener('click', function (e) {
        if (e.target === this) close();
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
      });

      document.getElementById('rv-popup-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var email = document.getElementById('rv-popup-email').value.trim();
        if (!email || !email.includes('@')) {
          document.getElementById('rv-popup-email').focus();
          return;
        }
        dismiss();

        if (!LISTMONK_URL) {
          // Transition period: no server yet, show success optimistically
          showSuccess();
          return;
        }

        fetch(LISTMONK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, list_uuids: [LIST_UUID] })
        })
          .then(function (res) { if (!res.ok) throw new Error('bad response'); })
          .catch(function () {})
          .finally(function () { showSuccess(); });
      });
    })();
  </script>
```

- [ ] **Step 3: Manual browser test**

Open `reserve/index.html` in a browser (file:/// is fine for this test). Open browser console. Paste and run:

```js
// Force popup open immediately (bypass 30-sec timer)
document.getElementById('rv-popup-overlay').classList.add('rv-open');
```

Verify:
- Popup appears centered over dark overlay
- Email field accepts input
- Submit with empty field: no action, focus returns to email
- Submit with valid email: success message shows, popup closes after 3 seconds
- X button closes popup
- Clicking outside popup closes popup
- Escape key closes popup

- [ ] **Step 4: Verify localStorage suppression**

After dismissing, reload the page and wait 30 seconds. Popup should NOT reappear. Then clear localStorage (`localStorage.removeItem('rv_popup_dismissed')`) and reload — popup should appear again after 30 seconds.

- [ ] **Step 5: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add reserve/index.html
git commit -m "feat: add email signup popup to Reserve page (phase 1, stub endpoint)"
```

---

## Task 2: Projects Page Popup

**Files:**
- Modify: `projects/index.html` — append before `</body>` (line 1572)

### What it does
- Same behavior as Reserve popup (30-sec delay, 7-day suppression)
- Name + Email fields (name needed to address the consultation email)
- Cyan accent to match Projects page color scheme

- [ ] **Step 1: Add popup styles and HTML**

Open `projects/index.html`. Find the closing `</body>` tag (line 1572). Insert immediately before it:

```html
  <!-- MAILING LIST POPUP — FUSED TECH SOLUTIONS -->
  <style>
    #ts-popup-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.72);
      z-index: 9000;
      align-items: center;
      justify-content: center;
    }
    #ts-popup-overlay.ts-open { display: flex; }
    #ts-popup {
      background: linear-gradient(160deg, #0d1f29 0%, #07131a 100%);
      border: 1px solid rgba(88,214,255,0.22);
      border-radius: 14px;
      padding: 36px 32px 28px;
      width: min(420px, calc(100vw - 32px));
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      position: relative;
    }
    #ts-popup-close {
      position: absolute;
      top: 14px;
      right: 18px;
      background: none;
      border: none;
      color: #afc6cf;
      font-size: 1.3rem;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
    }
    #ts-popup-close:hover { color: #ecf8fb; }
    #ts-popup h2 {
      margin: 0 0 8px;
      font-size: 1.25rem;
      font-weight: 700;
      color: #58d6ff;
      letter-spacing: 0.01em;
    }
    #ts-popup p {
      margin: 0 0 20px;
      font-size: 0.9rem;
      color: #afc6cf;
      line-height: 1.55;
    }
    #ts-popup-form { display: flex; flex-direction: column; gap: 10px; }
    #ts-popup-name,
    #ts-popup-email {
      padding: 11px 14px;
      border-radius: 8px;
      border: 1px solid rgba(88,214,255,0.25);
      background: rgba(255,255,255,0.05);
      color: #ecf8fb;
      font-size: 0.92rem;
      outline: none;
    }
    #ts-popup-name:focus,
    #ts-popup-email:focus { border-color: rgba(88,214,255,0.6); }
    #ts-popup-btn {
      padding: 12px;
      border-radius: 8px;
      border: none;
      background: #58d6ff;
      color: #07131a;
      font-size: 0.92rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    #ts-popup-btn:hover { opacity: 0.88; }
    #ts-popup-dismiss {
      display: block;
      text-align: center;
      margin-top: 12px;
      font-size: 0.8rem;
      color: #5a7a87;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
    }
    #ts-popup-dismiss:hover { color: #afc6cf; }
    #ts-popup-success { display: none; text-align: center; }
    #ts-popup-success p {
      color: #58d6ff;
      font-size: 0.95rem;
      margin: 0;
    }
  </style>

  <div id="ts-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="ts-popup-heading">
    <div id="ts-popup">
      <button id="ts-popup-close" aria-label="Close">&#x2715;</button>
      <div id="ts-popup-form-wrap">
        <h2 id="ts-popup-heading">Get a free 15-minute call</h2>
        <p>Join The Tech Brief. Practical guides on AI tools and new tech, straight to your inbox.</p>
        <form id="ts-popup-form" novalidate>
          <input id="ts-popup-name" type="text" placeholder="Your name" autocomplete="given-name" required />
          <input id="ts-popup-email" type="email" placeholder="Your email address" autocomplete="email" required />
          <button id="ts-popup-btn" type="submit">Claim free session</button>
        </form>
        <button id="ts-popup-dismiss" type="button">No thanks</button>
      </div>
      <div id="ts-popup-success">
        <p>Check your email to confirm. We will reach out to schedule your call.</p>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Add popup script**

Immediately after the HTML block above (still before `</body>`), insert:

```html
  <script>
    (function () {
      // Phase 2: replace empty string with your Listmonk subscription URL
      // e.g. 'https://lists.fuseddistribution.com/api/public/subscription'
      var LISTMONK_URL = '';
      var LIST_UUID = 'TECHSOLUTIONS_LIST_UUID'; // replace with real UUID from Listmonk

      var STORAGE_KEY = 'ts_popup_dismissed';
      var DELAY_MS = 30000;

      function isDismissed() {
        try {
          var ts = localStorage.getItem(STORAGE_KEY);
          if (!ts) return false;
          return Date.now() - parseInt(ts, 10) < 7 * 24 * 60 * 60 * 1000;
        } catch (e) { return false; }
      }

      function dismiss() {
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) {}
      }

      function open() {
        document.getElementById('ts-popup-overlay').classList.add('ts-open');
      }

      function close() {
        document.getElementById('ts-popup-overlay').classList.remove('ts-open');
        dismiss();
      }

      function showSuccess() {
        document.getElementById('ts-popup-form-wrap').style.display = 'none';
        document.getElementById('ts-popup-success').style.display = 'block';
        setTimeout(function () { close(); }, 3000);
      }

      if (isDismissed()) return;

      setTimeout(open, DELAY_MS);

      document.getElementById('ts-popup-close').addEventListener('click', close);
      document.getElementById('ts-popup-dismiss').addEventListener('click', close);

      document.getElementById('ts-popup-overlay').addEventListener('click', function (e) {
        if (e.target === this) close();
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
      });

      document.getElementById('ts-popup-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var name = document.getElementById('ts-popup-name').value.trim();
        var email = document.getElementById('ts-popup-email').value.trim();
        if (!name) {
          document.getElementById('ts-popup-name').focus();
          return;
        }
        if (!email || !email.includes('@')) {
          document.getElementById('ts-popup-email').focus();
          return;
        }
        dismiss();

        if (!LISTMONK_URL) {
          // Transition period: no server yet, show success optimistically
          showSuccess();
          return;
        }

        fetch(LISTMONK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, name: name, list_uuids: [LIST_UUID] })
        })
          .then(function (res) { if (!res.ok) throw new Error('bad response'); })
          .catch(function () {})
          .finally(function () { showSuccess(); });
      });
    })();
  </script>
```

- [ ] **Step 3: Manual browser test**

Open `projects/index.html` in browser. Paste in console:

```js
document.getElementById('ts-popup-overlay').classList.add('ts-open');
```

Verify:
- Popup appears with cyan styling
- Empty name field: no submit, focus goes to name
- Filled name, empty email: focus goes to email
- Both filled: success message shows, popup closes after 3 seconds
- X, overlay click, Escape all close popup

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add projects/index.html
git commit -m "feat: add email signup popup to Projects page (phase 1, stub endpoint)"
```

---

## Task 3: Update Privacy Policy

**Files:**
- Modify: `privacy/index.html`

### What to change

The current policy (line 183) says: *"We do not use your information for marketing, advertising, or any purpose beyond responding to your inquiry."*

This needs a new section added and the existing data use language qualified to exclude newsletter subscribers.

- [ ] **Step 1: Update "last updated" date**

Find the date in the privacy policy header (search for `2026-04-17` or `Last updated`). Change it to `2026-05-25`.

- [ ] **Step 2: Qualify the existing "use of data" language**

Find line 183:
```html
        <p>We do not use your information for marketing, advertising, or any purpose beyond responding to your inquiry.</p>
```

Replace with:
```html
        <p>We do not use contact form submissions for marketing or advertising. If you sign up for one of our mailing lists, that is covered separately in the Email List section below.</p>
```

- [ ] **Step 3: Add email marketing section**

Find the `<h2>Data Retention</h2>` section. Insert the following new section immediately before it:

```html
        <h2>Email Lists</h2>
        <p>
          We run two optional mailing lists: The Silver Report (Fused Reserve) and The Tech Brief (Fused Technology Solutions).
          You sign up for these separately via forms on the site. We will never add you without your opt-in.
        </p>
        <p>What we collect when you sign up:</p>
        <ul>
          <li>Your email address (both lists)</li>
          <li>Your name (Tech Brief only, used to address your consultation email)</li>
        </ul>
        <p>
          We use this information to send you the newsletter you signed up for, deliver your signup offer,
          and send related updates. We do not use it for anything else.
        </p>
        <p>
          Your subscriber data is stored on a self-hosted server we operate. It is not sent to third-party
          marketing platforms. We use
          <a href="https://resend.com" target="_blank" rel="noopener">Resend</a>
          to deliver emails.
        </p>
        <p>
          Every email includes an unsubscribe link. You can opt out at any time. We will remove you within
          10 business days of your request. Once removed, we do not retain your email address and we do
          not sell or share subscriber data with any third party.
        </p>
        <p>
          All marketing emails include a physical mailing address as required by US law (CAN-SPAM Act).
        </p>
```

- [ ] **Step 4: Update data retention section to cover subscribers**

Find:
```html
          We retain inquiry information only as long as necessary to respond to and manage
          your request. We do not maintain a marketing database or CRM populated from this
          form.
```

Replace with:
```html
          We retain contact form inquiry information only as long as necessary to respond to and manage
          your request. For email list subscribers, we retain your data until you unsubscribe or request
          deletion. We do not add contact form submissions to our mailing lists.
```

- [ ] **Step 5: Manual check**

Open `privacy/index.html` in browser. Read through the new email section. Confirm:
- No em-dashes
- No hyphenated words
- No buzzwords
- Plain first-person tone
- Unsubscribe instructions present
- CAN-SPAM physical address mention present

- [ ] **Step 6: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add privacy/index.html
git commit -m "docs: update privacy policy to cover email mailing lists"
```

---

## Task 4: Deploy

- [ ] **Step 1: Push all commits**

```bash
cd "/Users/nick/Documents/New project"
git push origin main
```

Verify live pages load correctly at:
- https://fuseddistribution.com/reserve/
- https://fuseddistribution.com/projects/
- https://fuseddistribution.com/privacy/

- [ ] **Step 2: Live popup smoke test**

Visit each page, wait 30 seconds. Confirm popup appears. Submit a real email address. Confirm success state shows. No console errors.

---

## Phase 2 Checklist (when server is ready)

These steps are NOT part of this plan. They are listed here so you know what comes next.

- [ ] Set up Ubuntu Server on old PC
- [ ] Install Docker, Docker Compose, nginx, Certbot
- [ ] Point `lists.fuseddistribution.com` to home IP, configure router port forward (80, 443)
- [ ] Deploy Listmonk via Docker Compose
- [ ] Configure Listmonk: SMTP via Resend, create two lists, enable double opt-in
- [ ] Write transactional email templates in Listmonk (confirmation + welcome emails)
- [ ] Copy the list UUIDs from Listmonk admin
- [ ] In `reserve/index.html`: set `LISTMONK_URL` and `LIST_UUID` to real values
- [ ] In `projects/index.html`: set `LISTMONK_URL` and `LIST_UUID` to real values
- [ ] Test full double opt-in flow end to end
- [ ] Update privacy policy with physical mailing address (required for CAN-SPAM)
- [ ] Commit and push
