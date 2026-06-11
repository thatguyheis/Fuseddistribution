# Reel Data: silver-etf-vs-physical
topic: silver
format: long-form

hook: Silver ETFs are taxed the same as physical silver. Most investors don't know this.
hook_type: contrarian_stat

## stats
- text: 28% IRS COLLECTIBLES RATE
  explanation: Both SLV and physical silver face the same 28 percent max tax rate
  graphic_type: percent_fill
  graphic:
    value: 28
    label: Collectibles rate
    remainder_label: Remaining
  narration: The IRS classifies physical silver as a collectible under Section 408(m). Long-term gains are taxed at a maximum rate of 28 percent. Here is what surprises most people: ETFs like SLV and PSLV that hold physical precious metals are also taxed at 28 percent in taxable accounts. You don't get the 20 percent stock rate just because you bought a fund.

- text: 0.50% SLV ANNUAL FEE
  explanation: SLV deducts its fee by reducing the silver per share each year
  graphic_type: percent_fill
  graphic:
    value: 50
    label: Annual drag
    remainder_label: Held
  narration: The iShares Silver Trust charges 0.50 percent per year. That fee gets paid by gradually reducing the silver backing per share. A new SLV share represented 1.0 ounce at inception and represents roughly 0.927 ounces in 2026. After 10 years, you have paid about 5 percent of your original investment in fees without a single trade.

- text: PSLV PFIC TAX ADVANTAGE
  explanation: PSLV with QEF election gets standard long-term capital gains rates, not the 28% collectibles rate
  graphic_type: none
  narration: PSLV is a Canadian trust and qualifies as a Passive Foreign Investment Company for USA investors. With a Qualified Electing Fund election, gains from PSLV are taxed at standard long-term capital gains rates of 0, 15, or 20 percent, not the 28 percent collectibles rate that applies to both physical silver and SLV. This is the one area where PSLV has a structural tax advantage. It requires an election with your annual tax return.

- text: 3-15% PHYSICAL PREMIUM
  explanation: What you pay above spot price depends on the product type
  graphic_type: gauge
  graphic:
    value: 8
    min: 3
    max: 15
    low_label: Generic rounds
    high_label: Silver Eagles
  narration: Physical silver trades at a premium over spot price. Generic 1-ounce rounds run 3 to 6 percent over spot from major dealers. American Silver Eagles carry 12 to 18 percent premiums due to the USA Mint's distribution system and collector demand. Bars run lower per ounce, with 100-ounce bars carrying the cheapest premium at around 2 to 4 percent.

- text: $0 ANNUAL FEE PHYSICAL
  explanation: Home-stored physical silver has no ongoing fees after the safe purchase
  graphic_type: growth
  graphic:
    from_value: 500
    from_label: Safe (one-time)
    to_value: 0
    to_label: Annual fee
    unit: USD
  narration: Physical silver held at home in a quality fireproof safe has zero annual fees. The safe itself runs $150 to $500 as a one-time cost. Third-party vault storage costs 0.10 to 0.20 percent per year, still below SLV's 0.50 percent for larger holdings. Over a 10-year hold, the economics of physical storage often beat the ETF fee even after counting the premium paid at purchase.

- text: NO COUNTERPARTY PHYSICAL
  explanation: Physical silver in your safe has no bank, fund, or custodian between you and the metal
  graphic_type: none
  narration: When you hold SLV, the ownership chain runs from your brokerage account to the trust to JP Morgan and potentially to sub-custodians. Each link is a contractual relationship. Physical silver in a home safe has no counterparty at all. You can sell it at a coin shop, pawn shop, or privately for cash without a brokerage account or functioning financial network. For buyers whose primary reason for holding silver is systemic risk protection, that distinction is the whole point.

## chart
title: 10-Year Total Cost Per $10,000 Position
bars:
  - SLV (0.50%/yr fees): ~$500
  - PSLV (0.35%/yr fees): ~$350
  - Physical rounds (3-6% premium): $300-600
  - Physical 100-oz bar (2-4% premium): $200-400
  - Physical Eagles (12-18% premium): $1,200-1,800
narration: Over 10 years, SLV costs about $500 per $10,000 invested in ongoing fees. PSLV costs about $350. Physical generic rounds cost $300 to $600 upfront in premium and zero afterward. A 100-ounce bar has the lowest upfront cost at $200 to $400. Silver Eagles have the highest upfront cost but no ongoing fees. The crossover where physical rounds beat SLV on total cost happens around year 6 to 8.

## question
text: ETF OR PHYSICAL: WHICH DO YOU HOLD?
subtext: TYPE ETF OR PHYSICAL BELOW
narration: Follow for more silver news.

## shared
discussion_question: Do you hold silver as an ETF, physical coins or bars, or both?
hashtags: #SilverInvesting #PreciousMetals #SilverBugs #HardAssets #SilverETF

## media_queries
- segment: 0
  query: "silver coins bars investment stack"
  prefer: video
- segment: 1
  query: "silver bullion coins close up"
  prefer: video
- segment: 2
  query: "financial charts investment portfolio screen"
  prefer: video
- segment: 3
  query: "silver coins stack precious metals"
  prefer: photo
- segment: 4
  query: "home safe fireproof secure storage"
  prefer: photo
- segment: 5
  query: "silver bars vault storage secure"
  prefer: photo
- segment: 6
  query: "investment comparison chart finance"
  prefer: photo
- segment: 7
  query: "silver coins physical precious metals"
  prefer: photo
