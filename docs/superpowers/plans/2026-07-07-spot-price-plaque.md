# Spot Price Market Plaque + Header Ticker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distinct silver/gold spot display with day-over-day change on all Fused Reserve pages: engraved Market Plaque in the reserve hero, slim Ag/Au ticker in every reserve topbar, KV-backed daily snapshots powering the change metric.

**Architecture:** Worker cron writes one KV snapshot per day (`spot:YYYY-MM-DD`). `/api/spot` returns current rates plus the most recent prior snapshot (`prev`, ≤7-day walk-back). Client JS computes and renders deltas; missing `prev` degrades to prices only. Frontend is static HTML/CSS/vanilla JS with worker-injected CSP nonces (HTMLRewriter adds `nonce` to all `<script>` tags automatically — inline scripts are safe).

**Tech Stack:** Cloudflare Worker (`src/worker.js`), Workers KV, cron trigger, static HTML in `public/reserve/`. No test framework at repo root — verification is `wrangler dev` + `curl` + Chrome inspection.

**Spec:** `docs/superpowers/specs/2026-07-07-spot-price-plaque-design.md`

---

### Task 1: KV namespace + wrangler config

**Files:**
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Create the KV namespace**

Run: `cd /Users/nick/projects/fuseddistribution && npx wrangler kv namespace create SPOT_KV`
Expected: output containing `"id": "<32-hex-id>"`. Copy the id.

- [ ] **Step 2: Add KV binding and cron trigger to `wrangler.jsonc`**

Insert after the `durable_objects` block (keep JSON valid — mind commas):

```jsonc
  "kv_namespaces": [
    {
      "binding": "SPOT_KV",
      "id": "<id-from-step-1>"
    }
  ],
  "triggers": {
    "crons": ["5 0 * * *"]
  },
```

- [ ] **Step 3: Validate config**

Run: `npx wrangler dev --test-scheduled` (start, confirm no config errors, leave running for Task 2 verification or kill).
Expected: dev server boots, binding `SPOT_KV` listed.

- [ ] **Step 4: Commit**

```bash
git add wrangler.jsonc
git commit -m "Add SPOT_KV namespace and daily spot snapshot cron trigger"
```

---

### Task 2: Worker — snapshot cron + prev in /api/spot

**Files:**
- Modify: `src/worker.js` (handleSpot at ~line 322, export default at ~line 432)

- [ ] **Step 1: Extract upstream fetch into `fetchSpotRates` and add helpers**

Replace the existing `handleSpot` (lines 322–340) with:

```js
async function fetchSpotRates(env) {
  const upstream = await fetch(
    `https://api.metalpriceapi.com/v1/latest?api_key=${env.METAL_PRICE_API_KEY}&base=USD&currencies=XAG,XAU`,
    { cf: { cacheTtl: 3600, cacheEverything: true } },
  );
  const data = await upstream.json();
  if (!upstream.ok || !data.success) return null;
  return { silver: data.rates.USDXAG, gold: data.rates.USDXAU };
}

function utcDateString(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

async function readPreviousSpot(env) {
  if (!env.SPOT_KV) return null;
  for (let i = 1; i <= 7; i++) {
    const date = utcDateString(-i);
    const raw = await env.SPOT_KV.get(`spot:${date}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.silver === "number" && typeof parsed.gold === "number") {
          return { silver: parsed.silver, gold: parsed.gold, date };
        }
      } catch {
        return null;
      }
      return null;
    }
  }
  return null;
}

async function handleSpot(env) {
  if (!env.METAL_PRICE_API_KEY) {
    return json({ error: "Spot price not configured." }, { status: 503 });
  }

  try {
    const rates = await fetchSpotRates(env);
    if (!rates) {
      return json({ error: "Upstream error." }, { status: 502 });
    }
    const prev = await readPreviousSpot(env);
    return json(prev ? { ...rates, prev } : rates);
  } catch {
    return json({ error: "Could not fetch spot price." }, { status: 502 });
  }
}
```

- [ ] **Step 2: Add `scheduled` handler to the default export**

In `export default { ... }`, after the `fetch` method:

```js
  async scheduled(event, env) {
    if (!env.METAL_PRICE_API_KEY || !env.SPOT_KV) return;
    try {
      const rates = await fetchSpotRates(env);
      if (!rates) return;
      await env.SPOT_KV.put(`spot:${utcDateString()}`, JSON.stringify(rates), {
        expirationTtl: 60 * 60 * 24 * 40,
      });
    } catch (error) {
      console.error(JSON.stringify({ event: "spot_snapshot_failed", error: String(error) }));
    }
  },
```

- [ ] **Step 3: Verify locally**

```bash
npx wrangler dev --test-scheduled
# in second shell:
curl -s "http://localhost:8787/cdn-cgi/handler/scheduled"   # trigger cron
curl -s http://localhost:8787/api/spot
```

Expected: `/api/spot` returns `{"silver":..,"gold":..}`. `prev` only appears once a key dated before today exists. Seed one to test the full shape:

```bash
YESTERDAY=$(date -u -v-1d +%F)
npx wrangler kv key put --binding SPOT_KV --local "spot:$YESTERDAY" '{"silver":81.17,"gold":5440.30}'
curl -s http://localhost:8787/api/spot
```

Expected: response includes `"prev":{"silver":81.17,"gold":5440.3,"date":"<yesterday>"}`.
(Requires `METAL_PRICE_API_KEY` in `.dev.vars`; if absent, expect 503 and verify shape logic by reading code — note it in the report.)

- [ ] **Step 4: Commit**

```bash
git add src/worker.js
git commit -m "Return previous-day spot snapshot from /api/spot via KV cron"
```

---

### Task 3: Market Plaque on /reserve/

**Files:**
- Modify: `public/reserve/index.html` — CSS `.spot-card` block (~lines 657–706), markup (~lines 1286–1299), spot script (~lines 1674–1700), mobile rule (~line 1164)

- [ ] **Step 1: Replace `.spot-card` CSS block with plaque styles**

Replace lines ~657–706 (`.spot-card` through `.spot-meta`) with:

```css
      .spot-card {
        position: absolute;
        left: 58px;
        bottom: 72px;
        width: 300px;
        padding: 18px 22px 16px;
        border-radius: 14px;
        border: 1px solid rgba(200, 170, 85, 0.28);
        background: linear-gradient(160deg, rgba(30, 27, 22, 0.95), rgba(13, 12, 10, 0.95));
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 18px 40px rgba(0, 0, 0, 0.6);
        opacity: 1;
        transform: translateY(0);
        transition: opacity 250ms var(--ease-out), transform 250ms var(--ease-out);
      }

      @starting-style {
        .spot-card { opacity: 0; transform: translateY(8px); }
      }

      @media (prefers-reduced-motion: reduce) {
        .spot-card { transition: opacity 200ms ease; }
        @starting-style {
          .spot-card { transform: none; }
        }
      }

      .spot-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        border-bottom: 1px solid rgba(200, 185, 140, 0.14);
        padding-bottom: 8px;
        margin-bottom: 12px;
      }

      .spot-card h3 {
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.68rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--muted);
        margin: 0;
      }

      .spot-live {
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.6rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #8fc9a0;
      }

      .metal-ag {
        background: linear-gradient(180deg, #eef2f8 0%, #d0d8e4 45%, #8d99a6 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
      }

      .metal-au {
        background: linear-gradient(180deg, #ffe9b8 0%, #f2c66d 45%, #c9922a 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
      }

      .spot-metals { display: flex; gap: 24px; margin-bottom: 10px; }
      .spot-metal  { display: flex; flex-direction: column; gap: 3px; flex: 1; }

      .spot-metal-label {
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.68rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .spot-metal-price {
        font-size: 1.55rem;
        font-weight: 700;
        line-height: 1.1;
      }

      .spot-delta {
        align-self: flex-start;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.68rem;
        letter-spacing: 0.03em;
        border-radius: 999px;
        padding: 2px 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.04);
        margin-top: 3px;
      }

      .spot-delta.up   { color: #8fc9a0; }
      .spot-delta.down { color: #d99a8f; }

      .spot-meta {
        margin: 0;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.7rem;
        font-style: italic;
        color: rgba(150, 145, 127, 0.6);
        border-top: 1px solid rgba(200, 185, 140, 0.1);
        padding-top: 8px;
      }
```

Note: gold price no longer smaller than silver — both metals equal weight, distinguished by gradient color. Remove the now-unused `.spot-metal-price.gold` rule.

- [ ] **Step 2: Replace plaque markup (~lines 1286–1299)**

```html
              <div class="spot-card">
                <div class="spot-head">
                  <h3>Today's Spot · Troy Oz</h3>
                  <span class="spot-live" id="spot-live" hidden>● Live</span>
                </div>
                <div class="spot-metals">
                  <div class="spot-metal">
                    <span class="spot-metal-label metal-ag">Silver</span>
                    <span class="spot-metal-price metal-ag" id="live-silver">...</span>
                    <span class="spot-delta" id="delta-silver" hidden></span>
                  </div>
                  <div class="spot-metal">
                    <span class="spot-metal-label metal-au">Gold</span>
                    <span class="spot-metal-price metal-au" id="live-gold">...</span>
                    <span class="spot-delta" id="delta-gold" hidden></span>
                  </div>
                </div>
                <p class="spot-meta" id="live-meta">per troy oz | loading...</p>
              </div>
```

- [ ] **Step 3: Update the spot script (~lines 1674–1700)**

Replace the `<!-- Spot prices -->` script body with:

```js
    (function () {
      var PREMIUM = 0.05;
      function usd(n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
      function renderDelta(id, current, prevValue) {
        var el = document.getElementById(id);
        if (!el || !prevValue) return;
        var diff = current - prevValue;
        var up = diff >= 0;
        var pct = Math.abs((diff / prevValue) * 100);
        el.hidden = false;
        el.classList.add(up ? 'up' : 'down');
        el.textContent = (up ? '▲ +$' : '▼ −$') + Math.abs(diff).toFixed(2) + ' · ' + pct.toFixed(1) + '%';
      }
      async function loadSpot() {
        try {
          var res = await fetch('/api/spot');
          var data = await res.json();
          if (!data.silver) return;
          var silver = data.silver, gold = data.gold;
          var elS = document.getElementById('live-silver');
          var elG = document.getElementById('live-gold');
          var elM = document.getElementById('live-meta');
          var elLive = document.getElementById('spot-live');
          if (elS) elS.textContent = usd(silver);
          if (elG) elG.textContent = usd(gold);
          if (elLive) elLive.hidden = false;
          if (data.prev) {
            renderDelta('delta-silver', silver, data.prev.silver);
            renderDelta('delta-gold', gold, data.prev.gold);
            if (elM) elM.textContent = 'vs ' + (data.prev.date === yesterdayUTC() ? "yesterday's close" : data.prev.date) + ' · updated ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          } else if (elM) {
            elM.textContent = 'per troy oz | ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
          renderTicker(silver, gold, data.prev);
          var oz100 = 100 / (silver * (1 + PREMIUM));
          var oz250 = 250 / (silver * (1 + PREMIUM));
          var oz500 = 500 / (silver * (1 + PREMIUM));
          var elEst = document.getElementById('plan-spot-est');
          if (elEst) elEst.textContent = 'At current spot (' + usd(silver) + '/oz): Starter about ' + oz100.toFixed(1) + ' oz | Stacker about ' + oz250.toFixed(1) + ' oz | Collector Access about ' + oz500.toFixed(1) + ' oz';
        } catch (e) {}
      }
      function yesterdayUTC() {
        return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      }
      function renderTicker(silver, gold, prev) {
        var ticker = document.getElementById('spot-ticker');
        if (!ticker) return;
        var ts = document.getElementById('tick-silver');
        var tg = document.getElementById('tick-gold');
        if (ts) ts.textContent = usd(silver);
        if (tg) tg.textContent = '$' + Math.round(gold).toLocaleString('en-US');
        if (prev) {
          setArrow('tick-silver-arrow', silver - prev.silver);
          setArrow('tick-gold-arrow', gold - prev.gold);
        }
        ticker.hidden = false;
      }
      function setArrow(id, diff) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = diff >= 0 ? ' ▲' : ' ▼';
        el.className = 't-arrow ' + (diff >= 0 ? 'up' : 'down');
      }
      loadSpot();
    })();
```

- [ ] **Step 4: Verify in browser**

`npx wrangler dev` (allow ~5s startup), open `http://localhost:8787/reserve/` in Chrome. Check: plaque renders, gradients on both metals, deltas show when local KV has yesterday key (both ▲ and ▼ by seeding higher/lower values), hidden when no key. Screenshot desktop + 680px width.

- [ ] **Step 5: Commit**

```bash
git add public/reserve/index.html
git commit -m "Redesign reserve spot card as market plaque with day-over-day change"
```

---

### Task 4: Header ticker on /reserve/

**Files:**
- Modify: `public/reserve/index.html` — topbar markup (~line 1243, before `.status-chip`), topbar CSS section, mobile media query (~line 1164 region)

- [ ] **Step 1: Add ticker CSS (after `.status-chip` rules in the TOPBAR CSS section)**

```css
      .spot-ticker {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        white-space: nowrap;
      }

      .ticker-sep { color: rgba(200, 185, 140, 0.35); }

      .t-arrow { font-size: 0.62rem; }
      .t-arrow.up   { -webkit-text-fill-color: #8fc9a0; color: #8fc9a0; }
      .t-arrow.down { -webkit-text-fill-color: #d99a8f; color: #d99a8f; }
```

(`.metal-ag` / `.metal-au` gradient classes from Task 3 are reused. Arrow spans live inside the gradient span, so they need `-webkit-text-fill-color` to override the parent's transparent fill.)

Add inside the existing `@media (max-width: 1080px)` block:

```css
        .spot-ticker { display: none; }
```

- [ ] **Step 2: Add ticker markup in topbar, before `<div class="status-chip">`**

```html
        <div class="spot-ticker" id="spot-ticker" hidden aria-label="Live spot prices">
          <span class="metal-ag">Ag <span id="tick-silver"></span><span class="t-arrow" id="tick-silver-arrow"></span></span>
          <span class="ticker-sep">·</span>
          <span class="metal-au">Au <span id="tick-gold"></span><span class="t-arrow" id="tick-gold-arrow"></span></span>
        </div>
```

(The `renderTicker` function from Task 3 already populates it.)

- [ ] **Step 3: Verify in Chrome** — ticker appears after fetch, gradient text, arrows colored; hidden below 1080px.

- [ ] **Step 4: Commit**

```bash
git add public/reserve/index.html
git commit -m "Add Ag/Au spot ticker to reserve topbar"
```

---

### Task 5: FAQ page ticker + spot script

**Files:**
- Modify: `public/reserve/faq/index.html` — topbar `.nav-actions` (~line 629), CSS `<style>` block (before closing at ~line 572), scripts at end of body

- [ ] **Step 1: Add CSS** — same `.spot-ticker`, `.ticker-sep`, `.t-arrow`, `.metal-ag`, `.metal-au` rules as Task 3/4 (FAQ page has its own stylesheet; copy the five rule groups verbatim). Mobile behavior differs — inside the existing `@media (max-width: 1080px)` block add:

```css
        .spot-ticker { order: 3; }
```

(Topbar goes `flex-direction: column` at that width; ticker stays visible as its own row per spec — FAQ has no plaque.)

- [ ] **Step 2: Add ticker markup** inside `.nav-actions`, before the status chip:

```html
          <div class="nav-actions">
            <div class="spot-ticker" id="spot-ticker" hidden aria-label="Live spot prices">
              <span class="metal-ag">Ag <span id="tick-silver"></span><span class="t-arrow" id="tick-silver-arrow"></span></span>
              <span class="ticker-sep">·</span>
              <span class="metal-au">Au <span id="tick-gold"></span><span class="t-arrow" id="tick-gold-arrow"></span></span>
            </div>
            <div class="status-chip">Silver-first memberships</div>
          </div>
```

- [ ] **Step 3: Add spot script** before `</body>` (ticker-only subset; nonce injected by worker):

```html
    <!-- Spot ticker -->
    <script>
    (function () {
      function usd(n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
      function setArrow(id, diff) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = diff >= 0 ? ' ▲' : ' ▼';
        el.className = 't-arrow ' + (diff >= 0 ? 'up' : 'down');
      }
      async function loadSpot() {
        try {
          var res = await fetch('/api/spot');
          var data = await res.json();
          if (!data.silver) return;
          var ts = document.getElementById('tick-silver');
          var tg = document.getElementById('tick-gold');
          if (ts) ts.textContent = usd(data.silver);
          if (tg) tg.textContent = '$' + Math.round(data.gold).toLocaleString('en-US');
          if (data.prev) {
            setArrow('tick-silver-arrow', data.silver - data.prev.silver);
            setArrow('tick-gold-arrow', data.gold - data.prev.gold);
          }
          document.getElementById('spot-ticker').hidden = false;
        } catch (e) {}
      }
      loadSpot();
    })();
    </script>
```

- [ ] **Step 4: Verify** `http://localhost:8787/reserve/faq/` — ticker renders desktop + mobile width (visible both).

- [ ] **Step 5: Commit**

```bash
git add public/reserve/faq/index.html
git commit -m "Add Ag/Au spot ticker to reserve FAQ header"
```

---

### Task 6: Polish pass (emil rules)

**Files:**
- Modify: `public/reserve/index.html`, `public/reserve/faq/index.html`

- [ ] **Step 1: Button press feedback** — in `public/reserve/index.html`, find the `.btn` rules; add:

```css
      .btn { transition: transform 160ms var(--ease-out), background 0.2s, border-color 0.2s; }
      .btn:active { transform: scale(0.97); }
```

(Merge with existing `.btn` transition declarations rather than duplicating selectors — check what's already there and extend the transition list.)

- [ ] **Step 2: Gate hover-only effects** — audit `:hover` rules touched by this change (ticker, plaque); wrap any new hover styling in `@media (hover: hover) and (pointer: fine)`. Existing site hover rules stay untouched.

- [ ] **Step 3: Verify reduced motion** — Chrome DevTools → Rendering → emulate `prefers-reduced-motion: reduce`; plaque entrance falls back to opacity fade.

- [ ] **Step 4: Commit**

```bash
git add public/reserve/index.html public/reserve/faq/index.html
git commit -m "Polish reserve interactions: press feedback, reduced motion, hover gating"
```

---

### Task 7: Final verification (no deploy)

- [ ] **Step 1:** `npx wrangler dev`; curl `/api/spot` (with seeded local KV yesterday key) — confirm `prev` shape.
- [ ] **Step 2:** Chrome screenshots: `/reserve/` desktop (1440), tablet (900), mobile (390); `/reserve/faq/` desktop + mobile. Check plaque, ticker, deltas ▲ and ▼, no layout breakage, no console errors.
- [ ] **Step 3:** Present screenshots + summary to Nick. **Do NOT `git push` or `wrangler deploy`** — explicit approval required (non-content change). Production KV id + first cron run + `METAL_PRICE_API_KEY` secret presence must be confirmed at deploy time.
