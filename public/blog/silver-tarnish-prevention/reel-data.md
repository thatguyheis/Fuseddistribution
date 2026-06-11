# Reel Data: silver-tarnish-prevention
topic: silver
format: long-form

hook: Rubber bands are one of the fastest ways to ruin silver. Most collectors use them without knowing why their coins keep tarnishing.
hook_type: pain_point

## stats
- text: RUBBER RUINS SILVER FAST
  explanation: Natural rubber contains sulfur, causing rapid irreversible tarnish on contact
  graphic_type: none
  narration: Natural rubber contains sulfur as a vulcanizing agent. Direct contact with rubber causes fast, deep tarnish on silver, sometimes within hours. Yet most new collectors wrap their coins with rubber bands or store them in cases with rubber linings, and wonder why their silver keeps turning black.

- text: &lt;50% HUMIDITY TARGET
  explanation: Tarnish rate accelerates sharply above 50 percent relative humidity
  graphic_type: gauge
  graphic:
    value: 50
    min: 0
    max: 100
    low_label: Safe Zone
    high_label: Danger Zone
  narration: Relative humidity below 50 percent is the target for silver storage, per the American Numismatic Association's preservation guidelines. Above 60 percent, tarnish rates accelerate sharply. The chemical reaction that forms silver sulfide needs both hydrogen sulfide gas and moisture to proceed. Eliminate the moisture and you cut the reaction rate dramatically.

- text: 5 MATERIALS TO NEVER USE
  explanation: Rubber, newspaper, cardboard, wood cases, and PVC flips all off-gas sulfur compounds
  graphic_type: none
  narration: There are five storage materials that actively accelerate silver tarnish. Rubber bands emit sulfur directly. Newspaper ink contains sulfur compounds. Standard cardboard off-gasses in humid environments. Wood cases release acetic acid and sulfur. PVC plastic coin flips deposit a green residue called PVC damage over time. All five are commonly used. None should be near silver.

- text: 6-12 MONTHS PER STRIP
  explanation: 3M anti-tarnish strips absorb sulfur gas in sealed containers for 6 to 12 months
  graphic_type: timeline
  graphic:
    min: 6
    max: 12
    unit: months
    label: Strip Lifespan
  narration: 3M anti-tarnish strips work by adsorbing sulfur dioxide and hydrogen sulfide from the enclosed air before those gases reach the silver surface. Each strip is rated for 6 to 12 months in a sealed container depending on how often you open it and the ambient sulfur concentration. Replace them when they show any discoloration. A saturated strip stops working.

- text: .999 SILVER TARNISHES SLOWER
  explanation: Fine silver has less copper content than sterling, reducing reaction sites for sulfide formation
  graphic_type: percent_fill
  graphic:
    value: 99.9
    label: Fine Silver
    remainder_label: Alloy
  narration: Fine silver at .999 purity tarnishes more slowly than sterling silver at .925 because sterling's 7.5 percent copper content provides additional reaction sites. But .999 fine silver, including American Silver Eagles, Canadian Maples, and standard bullion rounds, will still tarnish without protection. The purity gives you more time. It doesn't stop the reaction.

- text: VCI PROTECTION 12-24 MONTHS
  explanation: Volatile Corrosion Inhibitor emitters protect silver surfaces for up to 24 months sealed
  graphic_type: timeline
  graphic:
    min: 12
    max: 24
    unit: months
    label: VCI Protection
  narration: VCI stands for Volatile Corrosion Inhibitor. These products release a chemical vapor that deposits an invisible protective layer on metal surfaces, blocking the electrochemical reactions that cause tarnish. According to Cortec Corporation's technical data, silver-specific VCI emitters maintain protection in enclosed spaces for 12 to 24 months. Combined with an airtight capsule, they give you the strongest passive protection available.

- text: SILICA GEL HOLDS HUMIDITY
  explanation: Color-indicating silica gel keeps sealed containers below 50 percent RH for 6 to 12 months
  graphic_type: none
  narration: A single color-indicating silica gel canister rated for your container's volume will hold humidity below 50 percent for 6 to 12 months between rechargings. When it turns pink, it's saturated. Bake it at 250 degrees Fahrenheit for two hours to regenerate. One rechargeable canister, an airtight container, and a strip of anti-tarnish paper costs under $20 total and outperforms any dedicated silver storage product at ten times the price.

- text: CHECK SAFE HUMIDITY INSIDE
  explanation: Fire-rated safes trap moisture from insulation, creating unexpectedly high humidity inside
  graphic_type: none
  narration: If you store silver in a home safe, check the humidity inside the safe independently. Many fire-rated safes trap moisture inside their insulation layer, creating a high-humidity environment even when the room humidity is controlled. A small digital hygrometer placed inside the safe confirms whether your setup is working. This is the step most stacking guides skip, and it explains why carefully stored silver still tarnishes inside safes.

## chart
title: Relative Tarnish Rate by Storage Condition (Lower = Better)
bars:
  - Rubber contact: 100
  - Open cardboard: 65
  - Wood case: 55
  - Zip-lock bag: 20
  - Airtight capsule: 10
  - Capsule + strip: 5
narration: Rubber contact is the worst storage condition for silver, producing the fastest tarnish rate. An airtight capsule alone cuts the rate to about 10 percent of that. Add an anti-tarnish strip inside the capsule and you're down to 5 percent. That's a 20-to-1 difference between the worst and best common storage approaches, and it costs about $1.50 per coin to get there.

## question
text: DO YOU USE ANTI-TARNISH STRIPS OR JUST CAPSULES?
subtext: DROP YOUR SETUP BELOW
narration: Follow for more silver news.

## shared
discussion_question: Do you use anti-tarnish strips or just airtight capsules for your silver storage?
hashtags: #SilverInvesting #PreciousMetals #SilverBugs #HardAssets #InflationHedge

## media_queries
- segment: 0
  query: "silver coins tarnished dark collection storage"
  prefer: video
- segment: 1
  query: "rubber band elastic office supplies"
  prefer: photo
- segment: 2
  query: "humidity gauge hygrometer measurement indoor"
  prefer: photo
- segment: 3
  query: "cardboard box storage newspaper old paper"
  prefer: photo
- segment: 4
  query: "silver coin capsule airtight protective case"
  prefer: video
- segment: 5
  query: "silver coins fine bullion precious metals"
  prefer: video
- segment: 6
  query: "silica gel desiccant humidity control packet"
  prefer: photo
- segment: 7
  query: "home safe security storage vault"
  prefer: video
