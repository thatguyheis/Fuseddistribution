# Reel Data: how-to-read-silver-spot-price-charts
topic: silver
format: long-form

hook: Silver swings twice as hard as gold. Here is how to read a spot chart without the trader jargon.
hook_type: contrarian_stat

## stats
- text: ~30% ANNUAL VOLATILITY
  explanation: Silver's price swings average around 30 percent per year, roughly double gold's, so daily moves of 1 to 3 percent are normal noise
  graphic_type: percent_fill
  graphic:
    value: 30
    label: Silver Volatility
    remainder_label: Stable Range
  narration: Silver's annual volatility runs near 30 percent. That is roughly double gold. A 2 percent move in one day is normal for silver. It is not a signal to panic or to chase. Wide swings reward buyers who spread purchases out instead of buying all at once.

- text: 23 HOURS A DAY
  explanation: The spot price comes from COMEX futures trading, which runs almost 23 hours a day from Sunday evening to Friday afternoon
  graphic_type: none
  narration: The spot price is the cost of silver for immediate delivery. It comes from COMEX futures trading, and it updates almost 23 hours a day, Sunday evening through Friday afternoon. When a dealer quotes you a price, this is the number they start from.

- text: SPOT IS NOT FUTURES
  explanation: Spot is the price for silver delivered today. Futures are agreements for delivery months out. Physical buyers only need spot.
  graphic_type: none
  narration: Spot and futures are different numbers. Futures are agreements for delivery months from now. They reflect expectations, storage costs, and interest rates. Spot is what the metal costs today. Dealer charts show spot. Financial news often quotes futures. As a physical buyer, spot is the only number you need.

- text: 31.1 GRAMS PER TROY OUNCE
  explanation: Silver is quoted per troy ounce of 31.1 grams, not the standard 28.35 gram ounce. A common point of confusion for new buyers.
  graphic_type: none
  narration: Silver is quoted per troy ounce. That is 31.1 grams, not the 28.35 grams in a standard ounce. Every bullion product is weighed in troy ounces, so the chart and the product label always match. Just do not compare either one to a kitchen scale.

- text: 124:1 RATIO PEAK IN 2020
  explanation: The gold-silver ratio averages near 60 to 1 long term. It spiked to roughly 124 to 1 in March 2020 and silver nearly doubled in the following year.
  graphic_type: none
  narration: The gold silver ratio is gold's price divided by silver's. The long run average sits near 60 to 1. In March 2020 it spiked to roughly 124 to 1, and silver nearly doubled over the following year. Above 80, silver has historically been cheap relative to gold.

- text: 12.5% TRUE PREMIUM
  explanation: Total paid divided by troy ounces received, compared to spot, gives your true premium. A 36 dollar coin at 32 dollar spot is 12.5 percent.
  graphic_type: percent_fill
  graphic:
    value: 12
    label: Premium
    remainder_label: Silver Value
  narration: The chart is never the price you pay. Take the total you paid, including shipping, and divide it by the troy ounces you received. A 1 oz coin at 36 dollars with spot at 32 is a 12.5 percent premium. A 10 oz bar at 346 dollars lands at 8 percent. Run that math on every quote.

- text: 3-18% BY CHANNEL
  explanation: Premiums over spot range from about 3 to 8 percent at online dealers up to 18 percent at retail coin shops
  graphic_type: percent_fill
  graphic:
    value: 18
    label: Coin Shop Premium
    remainder_label: Spot Baseline
  narration: Premiums vary by where you buy. Online dealers typically run 3 to 8 percent over spot for common products. Retail coin shops run 8 to 18. The spot chart is the same for everyone. The premium is where you win or lose.

## chart
title: Average Annual Price Volatility: Silver vs Gold
bars:
  - Silver: 30%
  - Gold: 15%
narration: This is the volatility gap. Silver averages near 30 percent annual volatility. Gold sits near 15. The same news moves silver twice as far, because the silver market is smaller and carries heavy industrial demand. Zoom out to a one year chart before you judge any single red day.

## question
text: Do you check the chart before every silver purchase, or just buy on schedule?
subtext: Chart watcher or auto-buyer?
narration: Follow for more silver news.

## shared
discussion_question: Do you check the spot chart before every silver purchase, or do you just buy on a schedule and ignore it?
hashtags: #SilverInvesting #PreciousMetals #SilverBugs #HardAssets #InflationHedge

## media_queries
- segment: 0
  query: "silver price chart trading screen"
  prefer: video
- segment: 1
  query: "stock market chart volatility screen"
  prefer: video
- segment: 2
  query: "commodity trading floor screens"
  prefer: video
- segment: 4
  query: "silver coins weighing scale"
  prefer: photo
- segment: 5
  query: "gold and silver bars together"
  prefer: photo
- segment: 6
  query: "calculator money desk finance"
  prefer: video
- segment: 8
  query: "silver bullion coins close up"
  prefer: photo
