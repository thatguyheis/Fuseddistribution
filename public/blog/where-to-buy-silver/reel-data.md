# Reel Data: where-to-buy-silver
topic: silver
format: long-form

hook: American Silver Eagles sell online for 8 to 12 percent over spot. Walk into most coin shops and that same coin is 12 to 18 percent over spot.
hook_type: contrarian_stat

## stats
- text: 3-8% ONLINE ROUNDS
  explanation: Generic silver rounds at major online dealers carry the lowest premiums
  graphic_type: percent_fill
  graphic:
    value: 5
    label: Online Rounds
    remainder_label: Spot Price
  narration: Generic one-ounce silver rounds at major online dealers like JM Bullion and SD Bullion typically run 3 to 8 percent over spot. Paying by check or ACH instead of credit card cuts another 3 to 4 percent. On a 100-ounce order, that payment method choice saves nearly $100.

- text: 8-18% COIN SHOP COST
  explanation: Local coin shops charge more but offer immediate possession and inspection
  graphic_type: gap
  graphic:
    a_label: Online Eagles
    a_value: 11
    b_label: Coin Shop Eagles
    b_value: 16
    unit: "% over spot"
  narration: Local coin shops typically run 8 to 18 percent above spot on the same products you can buy online for less. That premium buys you three things: no shipping wait, the ability to physically inspect before buying, and a relationship with a buyer for when you eventually sell. Whether that tradeoff is worth it depends on how much you value immediacy.

## chart
title: Typical Premium Over Spot by Product (Online Dealers, 2026 Est.)
bars:
  - American Silver Eagle (1 oz): ~11%
  - 90% Junk Silver (face value): ~9%
  - Generic 1 oz Silver Rounds: ~5%
  - 100 oz Silver Bar: ~3%
narration: The premium you pay depends heavily on what you buy, not just where you buy it. A 100-ounce silver bar from the same online dealer that charges 11 percent on Eagles costs only about 3 percent over spot. The silver content is identical. The difference is the product's collectibility premium and the mint cost. For stackers, bars and rounds are the smarter buy.

- text: 12.9% EBAY SELLER FEE
  explanation: eBay's fee structure forces sellers to price well above what they actually want per ounce
  graphic_type: percent_fill
  graphic:
    value: 13
    label: eBay's Cut
    remainder_label: Seller Keeps
  narration: In 2025, eBay charged sellers a 12.9 percent final value fee on precious metals. That fee gets priced into every listing. A seller wanting $2 over spot on a one-ounce round must list it at roughly $4.50 over spot to net their target. The apparent deals on eBay are mostly illusions for common silver products.

- text: 3-4% PAYMENT DISCOUNT
  explanation: Paying by check or ACH instead of credit card is the single easiest way to reduce your cost per ounce
  graphic_type: percent_fill
  graphic:
    value: 4
    label: CC Surcharge
    remainder_label: Check/ACH Price
  narration: Every major online dealer charges 3 to 4 percent more for credit card purchases. On a $3,200 order, that is $96 to $128 you can save simply by using a check or bank transfer. Set up ACH with your bank, use it for silver purchases, and you have cut your effective premium by three to four percentage points with zero effort.

- text: AT-SPOT REDDIT DEALS
  explanation: r/pmsforsale connects verified buyers and sellers with no platform fee
  graphic_type: none
  narration: Reddit's r/pmsforsale community runs with no platform fee. Verified sellers with confirmed transaction flair regularly list silver at spot or $0.50 over spot for generic rounds and circulated junk silver. The risk is real. You are sending money to someone you have never met. The community uses flair to screen sellers, but always test every piece before sending payment.

- text: 5-8% LOWER ON ROUNDS
  explanation: Generic rounds and Eagles contain identical silver but rounds carry far lower premiums
  graphic_type: growth
  graphic:
    from_value: 11
    from_label: Eagles Premium
    to_value: 5
    to_label: Rounds Premium
    unit: "% over spot"
  narration: An American Silver Eagle and a generic one-ounce silver round contain identical amounts of .999 fine silver. The Eagle carries a higher premium because of its legal tender status and collector appeal. If silver content is your only goal, the round is the better deal every time. You get the same metal for several dollars less per ounce.

## question
text: COIN SHOP OR ONLINE: WHERE DO YOU BUY?
subtext: TYPE YOUR ANSWER BELOW
narration: Follow for more silver news.

## shared
discussion_question: Do you buy silver at a local coin shop or online? Which channel gives you the better deal?
hashtags: #SilverInvesting #PreciousMetals #SilverBugs #HardAssets #StackingSilver

## media_queries
- segment: 0
  query: "silver bullion bars coins collection dramatic"
  prefer: video
- segment: 1
  query: "silver coins close up stacking"
  prefer: video
- segment: 2
  query: "coin shop display case precious metals"
  prefer: photo
- segment: 3
  query: "silver bars ingots bullion weight"
  prefer: video
- segment: 4
  query: "online shopping precious metals computer"
  prefer: video
- segment: 5
  query: "credit card payment purchase"
  prefer: video
- segment: 6
  query: "silver round coins in hand"
  prefer: photo
- segment: 7
  query: "silver stacking collection organized"
  prefer: photo
