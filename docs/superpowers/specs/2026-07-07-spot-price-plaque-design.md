# Spot Price Market Plaque + Header Ticker — Design Spec

Date: 2026-07-07
Status: Approved by Nick (Option C from visual companion session)

## Goal

Make the silver/gold spot price display distinct and graphically appealing across all Fused Reserve pages, and add a day-over-day change metric computed against yesterday's price.

## Scope

- `src/worker.js` — spot endpoint upgrade + daily snapshot cron
- `wrangler.jsonc` — KV namespace binding + cron trigger
- `public/reserve/index.html` — Market Plaque + header ticker + polish pass
- `public/reserve/faq/index.html` — header ticker + spot fetch script

Out of scope: other site sections, gold subscription content, any push/deploy (requires explicit approval per standing rules).

## 1. Data layer (Worker)

### KV + cron

- New KV namespace binding `SPOT_KV` in `wrangler.jsonc` (created via `wrangler kv namespace create SPOT_KV`).
- Cron trigger `5 0 * * *` (00:05 UTC daily). `scheduled` handler fetches metalpriceapi `/v1/latest` (same call as today) and writes key `spot:YYYY-MM-DD` (UTC date) with value `{"silver": <num>, "gold": <num>}`. TTL 40 days.

### /api/spot response shape

```json
{
  "silver": 82.14,
  "gold": 5418.60,
  "prev": { "silver": 81.17, "gold": 5440.30, "date": "2026-07-06" }
}
```

- `prev` = yesterday's snapshot. If missing, walk back up to 7 days for the most recent snapshot; if none found, omit `prev` entirely.
- Client computes dollar and percent change. No `prev` → change chips hidden, prices render normally.
- Existing 1h edge cache on the upstream fetch stays. KV reads are cheap; response itself may also be edge-cached 1h.
- Error behavior unchanged: 503 when key not configured, 502 on upstream failure.

## 2. Market Plaque (`/reserve/` hero)

Replaces the current `.spot-card` inside `.hero-visual .vault`.

- Panel: brass-edged plaque — `linear-gradient(160deg, rgba(30,27,22,.95), rgba(13,12,10,.95))`, 1px border `rgba(200,170,85,.28)`, inset top highlight, deep drop shadow, radius 14px.
- Header row: `TODAY'S SPOT · TROY OZ` label (small caps, letterspaced, muted) + `● LIVE` badge (muted green) right-aligned.
- Two cells side by side:
  - Silver: name + price in cool silver gradient text (`#eef2f8 → #d0d8e4 → #8d99a6`, background-clip: text).
  - Gold: name + price in warm gold gradient text (`#ffe9b8 → #f2c66d → #c9922a`).
  - Price size ~26px bold Georgia.
  - Under each price: change chip, pill with hairline border — `▲ +$0.97 · 1.2%` muted green `#8fc9a0` or `▼ −$21.70 · 0.4%` muted red `#d99a8f`. Trebuchet MS (matches existing utility face).
- Footer: `Change vs yesterday's close · updated <local time>` italic muted.
- `plan-spot-est` oz estimate line elsewhere on page keeps working (same silver value).
- Mobile: existing responsive rule pattern for `.spot-card` carries over (full-width, pinned bottom of hero).

## 3. Header ticker (all reserve pages)

Slim inline element in `.topbar`, between nav and status chip:

- `Ag $82.14 ▲` (silver gradient) · `Au $5,418 ▼` (gold gradient), ~11-12px, bold.
- Arrow colored by direction; no chip, no % (space-constrained — plaque carries detail).
- Present on `/reserve/` and `/reserve/faq/`. Snippet is copy-paste portable for future reserve pages.
- FAQ page gets the shared spot-fetch script (same `/api/spot` call, populates ticker only).
- Mobile (below topbar collapse breakpoint): on `/reserve/` the ticker is hidden — the plaque already carries prices. On `/reserve/faq/` (and future pages without a plaque) the ticker renders as a compact row under the brand block.

## 4. Polish pass (emil rules)

- Plaque entrance: opacity 0 → 1 + translateY(8px) → 0, ~250ms, `cubic-bezier(0.23, 1, 0.32, 1)`, via `@starting-style`. Wrapped in `@media (prefers-reduced-motion: reduce)` fallback (opacity only).
- CTA buttons (`.btn`): `:active { transform: scale(0.97) }`, `transition: transform 160ms ease-out`.
- Hover-only effects gated behind `@media (hover: hover) and (pointer: fine)`.
- No animation on price/ticker values (high-frequency data, not decoration).
- Only `transform`/`opacity` animated.

## 5. Failure modes

| Condition | Behavior |
|---|---|
| `/api/spot` fails | Plaque shows `...` placeholders (current behavior), ticker hidden |
| No `prev` in response | Change chips + footer "vs yesterday" line hidden; prices show |
| Cron missed a day | 7-day walk-back finds latest snapshot; footer date reflects actual comparison date |
| KV not bound (dev) | `/api/spot` still returns current prices, omits `prev` |

## 6. Verification

- `wrangler dev` locally; Chrome check of `/reserve/` and `/reserve/faq/` desktop + mobile widths.
- Manually seed a `spot:<yesterday>` KV key in dev to verify change chips both directions (▲ and ▼) and missing-prev fallback.
- Screenshots for Nick before any deploy. Push/deploy only after explicit OK.
