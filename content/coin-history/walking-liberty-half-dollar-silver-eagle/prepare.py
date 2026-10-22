from pathlib import Path
import json
slug='walking-liberty-half-dollar-silver-eagle'; d=Path('public/blog')/slug; w=Path('content/coin-history')/slug
sources=[{'title':'U.S. Mint: American Eagle Coin Program','source_url':'https://www.usmint.gov/content/usmint/us/en/learn/coins-and-medals/collectible-coins/american-eagle.html'},{'title':'U.S. Mint: American Eagle Silver Proof Coin','source_url':'https://www.usmint.gov/learn/coins-and-medals/collectible-coins/american-eagle/silver-proof'},{'title':'U.S. Mint: History of U.S. Circulating Coins','source_url':'https://dispatcher.usmint.gov/learn/history/us-circulating-coins'}]
question='Would you collect the original half dollar or the later Silver Eagle?'
texts=[
('HOOK','SAME LIBERTY. DIFFERENT COIN.',"Why does this older half dollar look like a modern Silver Eagle? Look at Liberty walking left, with her arm reaching forward and sunlight beside her feet. Our photographs show the resemblance. It is not a coincidence. The newer coin brought back an older design, and that connection gives you a different way to read both coins."),
('OVERLAY','A DESIGN WITH TWO LIVES',"The story starts with the Walking Liberty half dollar, introduced in nineteen sixteen. Sculptor Adolph Weinman created its design. The United States Mint used that walking figure again when the American Eagle program began in nineteen eighty-six. A familiar image moved from a circulating half dollar to a new silver coin program. The design continued, even though the coin changed."),
('OVERLAY','FOLLOW THE POSE',"Start with the shape, before chasing a date or a mint mark. Liberty is shown in full stride, wrapped in the flag. Her right hand reaches outward, and her left arm carries branches. Those features make the relationship easier to see. The studio footage here illustrates artistic work today. It is not footage of Weinman creating the original design."),
('OVERLAY','1916 TO 1986',"The timeline helps separate the original from its return. Walking Liberty appeared on half dollars through nineteen forty-seven. The Silver Eagle program started in nineteen eighty-six. Our newer photograph shows a coin dated twenty twenty-one. That date belongs to the photographed example, not the beginning of the design. These are separate coins photographed separately, and the comparison is about their artwork."),
('OVERLAY','COMPARE DETAILS, NOT PRICES',"Compare the photographs again and follow the outline of the dress. Then look at the reaching arm and the sun beside Liberty. The older surface and the newer surface catch light differently, but a photograph alone cannot explain every mark. This comparison does not establish a grade, rarity, or selling price. It shows how one recognizable design connects different chapters of coin history."),
('QUESTION',question,"The resemblance comes from a revived design, not from these being the same coin. Would you collect the original half dollar or the later Silver Eagle?")]
meta={'slug':slug,'title':'Why Walking Liberty Appears on Two Different Silver Coins','description':'Compare our Walking Liberty half dollar and Silver Eagle photographs to follow a historic design from its 1916 debut to its return in the 1986 Eagle program.','alt':'Walking Liberty appears on different coins','brand':'silver','date':'2026-10-13','tags':['Coin history','Walking Liberty','Silver Eagles'],'ctaLine':question,'status':'comparison-draft','contentGraphic':{'label':'Walking Liberty design timeline','rows':[{'condition':'1916','action':'Half dollar design introduced'},{'condition':'1947','action':'Final Walking Liberty half dollar year'},{'condition':'1986','action':'American Eagle program begins'}]}}
(d/'meta.json').write_text(json.dumps(meta,indent=2)+'\n')
article='''# Why Walking Liberty Appears on Two Different Silver Coins

Why does an older half dollar look so much like a newer Silver Eagle? Put our two photographs next to each other and follow the figure rather than the shine. Liberty strides left, an arm reaches forward, and a sun sits near her feet. The resemblance leads to a story about a design returning on a different coin.

The U.S. Mint identifies the Silver Eagle obverse as a return to Adolph A. Weinman's Walking Liberty half dollar design. That makes this an unusually useful comparison: you can follow a visual idea across two coin programs without starting with a price guide.

![Two Walking Liberty coin designs compared](/blog/walking-liberty-half-dollar-silver-eagle/images/comparison.jpg "Original Fused photographs. Displayed at comparable sizes for studying the design, not physical scale.")

## Follow the Walking Liberty pose

In our older half dollar photograph, Liberty's flowing clothing creates a diagonal sweep across the coin. The extended arm gives your eye a second line to follow. On the newer example, the outline and gesture are easy to recognize again, even though the surfaces look different.

The Mint describes the figure as Liberty walking in the folds of the flag, with her right hand extended and branches held in her left. Match that description to the images rather than treating a holder label as your only evidence. These large design features are a better starting point here than a very small inscription.

If you enjoy this kind of observation, our guide to [reading a coin from center to rim](/blog/reading-a-coin-design-from-center-to-rim/) offers another way to slow down and study a design.

## A half dollar design returns

Weinman's Walking Liberty half dollar design dates to 1916. The Mint brought its image to the American Eagle silver coin when the Eagle program began in 1986. The newer program therefore had a connection to earlier American coin art from the beginning.

The old and new examples should not be treated as interchangeable objects. Our photographs demonstrate the shared artwork. They do not establish identical dimensions, composition, value or condition. We have enlarged each photograph for comparison, so their apparent size on this page is not a measurement.

![Walking Liberty half dollar photograph](/blog/walking-liberty-half-dollar-silver-eagle/images/half-dollar.jpg "Owner photograph cropped to exclude the nearby sales note and stamp. No coin detail has been generated or repaired.")

## Keep three moments separate

The first moment is the half dollar design's introduction in 1916. The second is 1947, the final year of the Walking Liberty circulating half dollar, according to the Mint's history. The third is 1986, when the American Eagle program began.

Our newer example has a visible 2021 date. That is the date on this photographed coin, not the year the Walking Liberty design originated. The distinction is simple but useful: an object can be recent while the image on it has a much longer history.

![Silver Eagle Walking Liberty obverse](/blog/walking-liberty-half-dollar-silver-eagle/images/silver-eagle.jpg "The date 2021 is visible on this separately photographed example. Holder serial information is excluded from the crop.")

## What the photographs can tell us

The comparison is strongest when you follow features that both pictures clearly show: the forward stride, the outstretched arm, the clothing and the sun. Lighting and surface appearance differ between the photographs. Those differences are visible, but they do not supply a complete explanation of how either coin was handled.

No grade, mint attribution, rarity or market price is assigned here. Nor do we assume that photos stored next to each other show opposite sides of one specimen. Each image has its own source record, and this article compares two separate examples.

The resemblance comes from a revived design. Once you recognize that connection, an older half dollar and a newer Silver Eagle become two ways to explore the same artistic idea. Would you collect the original half dollar or the later Silver Eagle? You can also compare [lettering styles on collectible coins](/blog/comparing-lettering-styles-on-collectible-coins/) to explore another visible design choice.

## Sources

'''+''.join(f"- [{s['title']}]({s['source_url']})\n" for s in sources)
article+='\n## Related\n\n- [Reading a coin from center to rim](/blog/reading-a-coin-design-from-center-to-rim/)\n- [Comparing coin lettering](/blog/comparing-lettering-styles-on-collectible-coins/)\n\nRead next: [Reading a coin from center to rim](/blog/reading-a-coin-design-from-center-to-rim/).\n'
(d/'verified.md').write_text(article)
(d/'research.json').write_text(json.dumps({'slug':slug,'stats':[],'sources':sources,'reviewedDate':'2026-10-13','status':'Primary source history checked; source photographs visually inspected; no mint, grading, price or specimen authentication claims.'},indent=2)+'\n')
script=f'# Reel Script: {slug}\nformat: long-form\nengagement-policy: 1\ncontent-kind: educate\nsegments: 6\ntarget-duration: 120s\n\n'
for i,(kind,label,narration) in enumerate(texts):
 script+='---\n\n## '+kind+('' if kind in ['HOOK','QUESTION'] else ': '+label)+'\n\n**Visual:** '+label+f'\n**Duration:** {12 if kind=="QUESTION" else 22}s minimum\n\n'
 if kind=='QUESTION':script+='Text: '+question+'\nSubtext: COMMENT BELOW\nEngagement-beat: debate\n'
 script+='Narration: '+narration+'\n\n'
(d/'reel-script.md').write_text(script)
media='\n## media_queries\n'
for i,q in enumerate(['walking liberty coin collection','coin design sculptor studio','artist sculpting clay','walking liberty timeline','drawing pencil sketch','coin collecting']):media+=f'- segment: {i}\n  query: "{q}"\n  prefer: {"video" if i in (2,4) else "photo"}\n'
(d/'reel-data.md').write_text('# Walking Liberty design history\ntopic: silver\nhook: SAME LIBERTY. DIFFERENT COIN.\n\n## segments\n'+''.join(f'- type: overlay\n  text: {t}\n  narration: {n}\n' for k,t,n in texts[1:-1])+'\n## question\n'+question+'\n'+media)
copy='Why does a half dollar resemble a Silver Eagle? Follow the Walking Liberty design through our own photographs. '+question
social={'slug':slug,'topic':'silver','blog_url':f'https://fuseddistribution.com/blog/{slug}/','reel':{p:copy for p in ['facebook','instagram','linkedin','x']},'photo':{p:copy for p in ['facebook','instagram','linkedin']},'hashtags':'#CoinHistory #WalkingLiberty #SilverEagle','discussion_question':question,'cta_slot':'engagement'}
(d/'social-copy.json').write_text(json.dumps(social,indent=2)+'\n')
(w/'narration-v1.txt').write_text('\n\n'.join(n for k,t,n in texts))
(w/'overview.md').write_text('''# Walking Liberty: two coins, one design lineage

Status: comparison draft requested by Nick. Not assigned to a publication slot.

1. Subject: Why does the half dollar resemble a Silver Eagle?
2. Hook: Same Liberty. Different coin.
3. Promise: Explain the shared image using exact owner photographs.
4. Explanation: Visible pose, Weinman design introduced in 1916, half dollar ends in 1947, Silver Eagle program starts in 1986.
5. Visual support: coin-0020 and coin-0013 cropped real evidence; one local studio illustration; licensed modern art footage labeled as supporting imagery; timeline.
6. Payoff: A revived design connects different coins. End by choosing which design chapter to collect.
7. Variety: design continuity, distinct from the prior mint history story. No mint mark identification, price or grade claims.

Target 110 to 130 seconds with existing Chatterbox Nano voice and approved music. Review actual measured duration. Generated and stock art scenes are illustrative, never footage of Weinman or mint production. Narrative and scene concept reviewed by Codex under existing editorial authority.
''')
print('Narration words:',sum(len(n.split()) for k,t,n in texts),'description:',len(meta['description']))
