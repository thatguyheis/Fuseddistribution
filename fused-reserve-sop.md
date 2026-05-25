# Fused Reserve — Internal SOP
## Silver Sourcing & Fulfillment Standard Operating Procedure

**Version:** 1.0
**Last Updated:** 2026-04-21
**Owner:** Fused Distribution

---

## Purpose

This SOP governs how Fused Reserve sources, qualifies, stores, and fulfills physical silver for active subscribers. The goal is consistent execution: buying at the lowest achievable premium, maintaining enough inventory to fulfill on time, and keeping accurate records for pricing transparency and margin review.

---

## Section 1 — Roles & Triggers

| Trigger | Action Required |
|---|---|
| Daily (weekdays) | Check spot price, log to tracker |
| Spot drops >2% from 30-day average | Flag as buy opportunity — review sourcing channels |
| 7 days before billing cycle | Run demand forecast against inventory |
| 3 days before billing cycle | Execute emergency buys if inventory is short |
| Day of billing | Finalize fulfillment allocations per subscriber |
| Post-fulfillment | Log all purchases, update inventory, record metrics |

---

## Section 2 — Silver Spot Monitoring

**Frequency:** Daily on business days

**Process:**
1. Check spot price via one of: [Kitco](https://kitco.com), [APMEX spot](https://apmex.com), or Metals-API (if automated)
2. Log in the Sourcing Tracker: date, spot price (USD/oz), 30-day average, % vs. 30-day average
3. If spot is ≥2% below the 30-day average → flag as **Buy Window**
4. During a Buy Window, prioritize sourcing ahead of fulfillment need (buy for buffer inventory)

**Reference spot sources (in order of preference):**
- Kitco silver spot (live, free)
- APMEX spot price page
- Metals-API (for future automation — JSON endpoint, free tier available)

---

## Section 3 — Sourcing Channels

Source in this priority order. Move to the next channel only when the prior channel has been checked and does not have qualifying inventory.

### Priority 1 — Local Coin Dealers & Coin Shows
- **Why first:** Most negotiable pricing, no shipping, bulk deals available, relationship-building compounds over time
- **How:** Call or visit known dealers weekly; attend local coin shows on schedule
- **What to look for:** Bulk junk silver bags, cull Morgan/Peace dollar lots, generic rounds at low premium
- **Negotiation target:** Spot + 5% or less on junk; spot + 8% or less on bullion
- **Track:** Dealer name, date, inventory offered, price quoted, purchase made

### Priority 2 — eBay Completed Listings
- **Why:** Real cleared-market pricing data and a live secondary market
- **How:** Search "90% silver lot", "junk silver", "Morgan dollar cull", etc. — filter **Sold listings only**
- **Use for:** Price benchmarking and gap-filling when local dealers are out
- **Caution:** Factor in seller fees and shipping when comparing to local pricing
- **Negotiation target:** Below the average sold price for comparable lots

### Priority 3 — SD Bullion / JM Bullion / APMEX
- **Why:** Reliable, consistent, ships quickly — but higher premiums
- **Use for:** Gap-filling only when local and eBay options are exhausted
- **Watch:** Spot + 10–15% is typical here; only use when subscriber demand requires it
- **Never use as primary source for Best Price preference orders**

### Priority 4 — Facebook Marketplace / Local Online Forums
- **Why:** Occasional below-spot finds from private sellers who don't know current prices
- **How:** Search "[city] junk silver", "silver coins", "coin collection"
- **Caution:** Verify authenticity before purchase; meet in safe public location
- **Effort:** High effort, unpredictable — treat as opportunistic, not systematic

### Priority 5 — Estate Sales / Pawn Shops
- **Why:** Highest upside for below-spot finds; sellers often unaware of silver content value
- **How:** Check estate sale listings (EstateSales.net, local classifieds); build relationships with 1–2 trusted pawn shops
- **What to look for:** Pre-1965 coin collections, silverware lots with silver content, uncatalogued coin boxes
- **Caution:** Requires authentication on-site; can't always rely on timing

---

## Section 4 — Purchase Qualification

A purchase is **qualified** if it meets all three of the following:

| Criterion | Standard |
|---|---|
| Premium over spot | Junk silver: ≤8% · Bullion: ≤10% · Silver Dollars (cull): ≤10% · World Coins: ≤12% · Numismatic: case-by-case (document reason) |
| Authenticity | Verified by magnet test, weight, and/or acid test before purchase |
| Inventory fit | Matches at least one active subscriber preference |

**Disqualify if:**
- Premium exceeds threshold with no documented justification
- Authenticity cannot be confirmed on-site
- Inventory already covers 4+ weeks of projected demand in that category (no overbuying)

**Document every purchase**, qualified or not, in the Sourcing Log (see Section 7).

---

## Section 5 — Subscriber Demand Forecasting

**Run:** 7 days before each billing cycle

**Steps:**
1. Pull active subscriber list: name, plan, preference slots, split weighting (Collector Access only)
2. Calculate total silver needed by preference category:
   - Junk Silver: total face value needed (in dollars)
   - Bullion: total oz needed
   - Silver Dollars: total coin count needed
   - Numismatic: case-by-case
   - World Coins: total oz needed
   - Best Price: dollar budget available (no category target)
3. Compare against current inventory
4. Identify shortfalls per category
5. Execute sourcing to close shortfalls (prioritize Priority 1 & 2 channels)

---

## Section 6 — Inventory Buffer Policy

Maintain a **rolling 2–4 week buffer** above current subscriber demand for each active preference category.

| Buffer level | Status | Action |
|---|---|---|
| >4 weeks supply on hand | Over-stocked | Pause buying for that category |
| 2–4 weeks supply | Healthy | Continue normal sourcing cadence |
| 1–2 weeks supply | Low | Increase sourcing urgency — prioritize buy window |
| <1 week supply | Critical | Execute emergency purchase regardless of spot price |

**Storage:** All inventory must be logged by category, acquisition date, quantity, face value or weight, and purchase price. Keep physically separated by category (labeled bags/containers).

---

## Section 7 — Pre-Fulfillment Reconciliation

**Run:** 3 days before billing cycle

1. Confirm inventory covers all active subscriber preferences for the upcoming cycle
2. If short in any category: execute priority buy immediately
3. Assign inventory to each subscriber order based on:
   - Plan tier (preference slot count)
   - Split weighting (Collector Access only)
   - Current spot price at time of processing
4. Calculate final face value / oz / coin count per order
5. Prepare shipment or hold notation per subscriber preference

---

## Section 8 — Fulfillment Allocation by Preference

| Preference | Fulfillment logic |
|---|---|
| **Junk Silver** | Source closest to $X face value that fits budget at current spot + premium paid. Mix of dimes, quarters, halves unless subscriber specified denomination. |
| **Bullion** | Source oz amount that fits budget. Prefer generic rounds over named-mint rounds for cost efficiency. |
| **Silver Dollars** | Source cull/junk-grade Morgans or Peace dollars. Do not substitute numismatic-grade coins. Approximately 0.7734 oz per coin. |
| **Numismatic** | Source collectible coins with clear above-melt value. Document what was sourced and why premium is justified. |
| **World Coins** | Source foreign silver coins by silver content (oz). Document country/type for customer transparency. |
| **Best Price** | No restriction. Source whatever category produced the lowest premium over spot that cycle. Document what was purchased and the effective premium. |

**Split fulfillment (Stacker — 2 preferences):**
- 50/50 split by dollar value. If exact split isn't achievable due to coin denominations, round in favor of the customer.

**Custom split (Collector Access — 3 preferences):**
- Honor the subscriber's stated percentage split as closely as possible.
- Document any variance and reason (e.g., "rounded to nearest half-dollar denomination").

---

## Section 9 — Record Keeping

### Sourcing Log (per purchase)
| Field | Notes |
|---|---|
| Date | Date of purchase |
| Source channel | Dealer / eBay / APMEX / Facebook / Estate sale |
| Source name | Specific dealer or seller name |
| Category | Junk / Bullion / Silver Dollar / Numismatic / World / Mixed |
| Quantity | Face value (junk), oz (bullion), coin count (dollars) |
| Total paid | Dollar amount |
| Spot at purchase | USD/oz at time of purchase |
| Effective premium | % over melt value |
| Notes | Any reason for above-threshold purchase, authenticity notes |

### Monthly Performance Report
Run after each billing cycle closes:

- **Average effective premium paid** — all categories combined and per category
- **Total oz sourced** vs. **total oz fulfilled**
- **Inventory buffer status** — weeks of supply per category at end of cycle
- **Channel performance** — % of sourcing volume by channel, avg premium by channel
- **Below-spot purchases** — how many, which channel, oz value

---

## Section 10 — Silver Content Reference

| Type | Silver content per unit |
|---|---|
| Junk silver (90% coins) | 0.715 troy oz per $1.00 face value |
| Morgan dollar | 0.7734 troy oz per coin |
| Peace dollar | 0.7734 troy oz per coin |
| Walking Liberty half | 0.3617 troy oz per coin |
| Franklin half | 0.3617 troy oz per coin |
| Kennedy half (1964) | 0.3617 troy oz per coin |
| Washington quarter (pre-1965) | 0.1809 troy oz per coin |
| Roosevelt dime (pre-1965) | 0.0723 troy oz per coin |
| Mercury dime | 0.0723 troy oz per coin |
| Generic .999 round (1 oz) | 1.000 troy oz |
| Generic .999 bar (10 oz) | 10.000 troy oz |

---

## Section 11 — Automation Roadmap

These manual steps are candidates for future automation:

| Step | Tool | Status |
|---|---|---|
| Daily spot price logging | Metals-API → Google Sheet or CSV | Planned |
| Buy window alert (spot dips) | Script + notification via OpenClaw/phone | Planned |
| eBay sold price monitoring | Python scraper → sourcing log | Planned |
| Subscriber demand forecast | Script pulling from subscriber data | Planned |
| Monthly performance report | Automated summary from sourcing log | Planned |

---

## Appendix — Sourcing Channels Quick Reference

| Channel | Best for | Avg premium | Effort |
|---|---|---|---|
| Local dealers / coin shows | Bulk junk, cull dollars | Spot +3–6% | Medium |
| eBay sold listings | Gap fill, price benchmark | Spot +5–10% | Low |
| SD / JM / APMEX | Emergency fill | Spot +10–15% | Very low |
| Facebook / local forums | Below-spot opportunistic | Spot +0–5% | High |
| Estate sales / pawn shops | Below-spot opportunistic | Spot -5% to +5% | Very high |
