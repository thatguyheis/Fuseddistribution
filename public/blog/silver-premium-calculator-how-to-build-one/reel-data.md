# Reel Data: silver-premium-calculator-how-to-build-one
topic: silver
focus: build a silver premium calculator
format: long-form

hook: A premium calculator is only useful when every quote uses the same ounce.
hook_type: practical

## segments
- type: overlay
 text: START WITH FINE TROY OUNCES
 narration: Start with fine troy ounces, because a silver quote and a calculator must use the same unit. NIST gives one troy ounce as 31.1034768 grams. If measured gross weight is 31.2 grams and fineness is confirmed at .999, that is 31.1688 fine grams, or about 1.0021 fine troy ounces. A generic label is not a certified fine content.
- type: overlay
 text: ADD DELIVERED PURCHASE COST
 narration: Treat item price as the full lot total. Add shipping, insurance, payment fee, and actual tax, then subtract a discount once. If tax is unknown, label the result an ex-tax subtotal. Record each charge separately.
- type: overlay
 text: DIVIDE COST BY FINE OUNCES
 narration: Divide the all-in lot cost by fine troy ounces per item multiplied by quantity. With 39 dollars and 72 cents and 1.0021 ounces for one item, the result is about 39 dollars and 64 cents per ounce. Keep full precision and round only the display.
- type: overlay
 text: CALCULATE PREMIUM PERCENTAGE
 narration: Enter a clearly labeled spot price for the same currency and unit. Using a hypothetical 30 dollar spot input, subtract it from 39 dollars and 64 cents to get 9 dollars and 64 cents premium per ounce. Divide 9 dollars and 64 cents by 30 dollars for a 32.12 percent premium. This is teaching arithmetic, not a live quote.
- type: overlay
 text: TEST EVERY PRICE BASIS
 narration: Test the sheet with two items at one troy ounce each, a 75 dollar all-in lot, and a 30 dollar spot input. Cost per ounce is 37 dollars and 50 cents, premium is 7 dollars and 50 cents, and premium percentage is 25 percent. Also test a six dollar tax, fees, discounts, and zero inputs.

## question
text: Would a calculator make your silver quotes easier to compare?
subtext: COMMENT BELOW
narration: Would a calculator make your silver quotes easier to compare? Follow for more silver news.

## shared
discussion_question: Which calculator input is easiest to overlook?
hashtags: #Silver #PreciousMetals #PersonalFinance

## media_queries
- segment: 0
 query: "silver premium calculator spreadsheet fine troy ounce"
 prefer: video
- segment: 1
 query: "silver scale grams bullion troy ounce calculation"
 prefer: photo
- segment: 2
 query: "silver purchase invoice shipping fee calculator"
 prefer: photo
- segment: 3
 query: "spreadsheet calculator price per ounce silver"
 prefer: photo
- segment: 4
 query: "silver spot price premium comparison notes"
 prefer: photo
- segment: 5
 query: "checking spreadsheet formulas calculator arithmetic"
 prefer: photo