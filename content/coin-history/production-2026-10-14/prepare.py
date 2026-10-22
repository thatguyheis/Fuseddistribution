from pathlib import Path
import json, shutil
ROOT=Path(__file__).resolve().parents[3]
slugs=['pittman-act-silver-dollar-melting','peace-dollar-history-and-symbolism']
titles=['Why America Melted Silver Dollars and Made Them Again','Why the Peace Dollar Lost Its Broken Sword']
heads=[['MELTED. THEN MADE AGAIN.','A WARTIME SILVER PROBLEM','1918 / INDIA NEEDS SILVER','350 MILLION / THE LEGAL LIMIT','COINS BECOME BULLION','THE REPLACEMENT PROMISE','WEIGHT IS NOT FACE VALUE','1921 / THE MORGAN RETURNS','THE PEACE DOLLAR FOLLOWS','A WORLDWIDE CURRENCY STORY'],['WHY NAME A DOLLAR PEACE?','1921 / A POSTWAR MESSAGE','ANTHONY DE FRANCISCI','LIBERTY. EAGLE. OLIVE BRANCH.','THE EAGLE AT REST','THE SWORD THAT DISAPPEARED','PEACE OR DEFEAT?','MORGAN CHANGES THE HUB','A SYMBOL YOU CANNOT SEE','1921 TO 1935','A MESSAGE IN SILVER']]
intro=["A silver dollar can tell a story that reaches far beyond the place where it was made. The Pittman Act connected American Treasury reserves, British wartime needs, currency in India and purchases from American mines. That chain of decisions helps explain why the Morgan dollar returned in 1921 after a long gap in production.","The word PEACE on a silver dollar is a deliberate statement about the world after World War One. Its reverse also preserves the result of a design dispute: a broken sword was removed before the finished coins appeared. Following that change explains why the eagle and olive branch matter."]
sections=[[
('Why silver dollars mattered in 1918',[1,2],"The distinction is between money as a denomination and metal as a physical resource. A dollar in a vault could be held as a coin or melted so that its silver could serve a different currency system. The Indian redemption demand described in the Senate report supplies the practical reason for doing the latter."),
('What the Pittman Act authorized',[3,4],"An authorization limit is not a production total. Reading the 350 million figure as the number actually destroyed would turn the law's ceiling into a different historical claim. It also would not identify which individual surviving coins had once been eligible for melting."),
('Why the silver had to be replaced',[5,6],"There are two different dollar amounts in this story. A silver dollar carries a face value; a fine ounce measures its silver content by weight. Keeping those units separate makes the purchase provision easier to understand. Congress connected the sale of existing government metal to later purchases of domestic output."),
('The Morgan dollar returns in 1921',[7,8,9],"Our photograph shows an 1896 Morgan obverse as an example of the design. It does not show a 1921 issue or prove that this particular piece survived a Treasury melting program. The historical link is between the policy and renewed production, not an undocumented journey assigned to the photographed coin.")],
[
('Why a Peace dollar appeared in 1921',[1,2],"The coin's commemorative purpose should not be confused with a claim that the fighting continued until the coin appeared. Its message concerns peace between the United States and Germany. The official design history connects that purpose to the choice of imagery on a circulating denomination."),
('Reading the Peace dollar design',[3,4],"Read the reverse as a composition: bird, perch, branch, rays and inscription. The inscription gives the scene its subject, while the eagle's resting posture supports it. Our photographs show separate owner examples of the two sides; they are not presented as a matched pair of one specimen."),
('Why the broken sword was removed',[5,6],"A symbol can be interpreted differently by its designer and its audience. The objection recorded by the Smithsonian concerned what viewers believed the broken weapon communicated. The rejected sword is part of the design's development, not a detail to search for on a normal finished Peace dollar."),
('George Morgan changes the Peace dollar hub',[7,8],"The museum account describes work on a steel hub rather than a redesign of each individual coin. That matters to the sequence: the change happened to production tooling before the finished design was struck. We use archival photographs as context and label generated workshop scenes as illustrations, never as evidence of the exact alteration."),
('The Peace dollar series and its lasting message',[9,10],"The gap in the original minting years is worth keeping visible on a timeline. A range written simply as 1921 to 1935 can suggest uninterrupted annual production. The documented runs were 1921 through 1928 and then 1934 and 1935.")]]
for n,slug in enumerate(slugs):
 w=ROOT/'content/coin-history'/slug;p=ROOT/'public/blog'/slug;p.mkdir(exist_ok=True);(p/'images').mkdir(exist_ok=True)
 paras=(w/'narration-v1-approved.txt').read_text().strip().split('\n\n'); assert len(paras)==len(heads[n]),(slug,len(paras))
 script=f'# Reel Script: {slug}\nformat: long-form\ncontent-kind: educate\nsegments: {len(paras)}\ntarget-duration: 125s\n\n'
 for i,(text,head) in enumerate(zip(paras,heads[n])):script+='---\n\n## '+('HOOK' if i==0 else 'OVERLAY: '+head)+'\n\n**Visual:** '+head+'\nText: '+head+'\nNarration: '+text+'\n\n'
 (p/'reel-script.md').write_text(script)
 (p/'reel-data.md').write_text(f'# {titles[n]}\ntopic: silver\nhook: {heads[n][0]}\n')
 r=json.loads((w/'research.json').read_text());r['slug']=slug
 for s in r['sources']:s['source_url']=s['url'];s['title']=s['claims']
 r['stats']=[];(p/'research.json').write_text(json.dumps(r,indent=2)+'\n')
 body='# '+titles[n]+'\n\n'+intro[n]+'\n\n'+paras[0]+'\n\n'
 for ix,(h,inds,extra) in enumerate(sections[n]):
  body+='## '+h+'\n\n'+'\n\n'.join(paras[i] for i in inds)+'\n\n'+extra+'\n\n'
  if ix==0:body+=f'![Owner coin photograph](/blog/{slug}/images/coin.jpg "Original Fused Distribution photograph; specimen details are not inferred from other coins.")\n\n'
 body+='## Sources and photographs\n\n'
 for s in r['sources']:body+=f'- [{s["title"]}]({s["url"]})\n'
 body+='\nThe reel combines original coin photography, credited historical references and clearly labeled illustrative backgrounds. Archival mint photographs show historical working conditions, not a documented view of this specific coin or the exact event described.\n\n'
 body+='For another way to examine the object itself, try [reading a coin design from center to rim](/blog/reading-a-coin-design-from-center-to-rim/). Then [compare the lettering on collectible coins](/blog/comparing-lettering-styles-on-collectible-coins/) to see how inscriptions guide the story.\n\n## Related\n\n- [Reading a coin design from center to rim](/blog/reading-a-coin-design-from-center-to-rim/)\n- [Comparing lettering styles](/blog/comparing-lettering-styles-on-collectible-coins/)\n\nRead next: [Reading a coin design from center to rim](/blog/reading-a-coin-design-from-center-to-rim/).\n'
 (p/'verified.md').write_text(body)
 descriptions=['Why the Pittman Act melted American silver dollars, supplied silver for India and required replacement, bringing the Morgan dollar back to production in 1921.','Explore the Peace dollar history, its postwar symbolism and the broken sword removed before production, using real coin photographs and museum records.']
 meta={'slug':slug,'title':titles[n],'description':descriptions[n],'alt':'Historic silver dollar and explanatory timeline','brand':'silver','date':'2026-10-14','status':'approved-production','tags':['Coin history','Silver dollars'],'ctaLine':'Explore more coin history with Fused Distribution.'}
 meta['contentGraphic']={'label':'A silver dollar history timeline','rows':([{'condition':'1918','action':'Pittman Act authorizes melting and replacement'},{'condition':'1921','action':'Morgan dollar production returns; Peace follows'}] if n==0 else [{'condition':'1921','action':'Peace dollar design approved; broken sword removed'},{'condition':'1921-1928','action':'Original production run'},{'condition':'1934-1935','action':'Production resumes'}])}
 (p/'meta.json').write_text(json.dumps(meta,indent=2)+'\n')
 copy=titles[n]+'. '+paras[0]
 (p/'social-copy.json').write_text(json.dumps({'slug':slug,'topic':'silver','blog_url':f'https://fuseddistribution.com/blog/{slug}/','reel':{x:copy for x in ['facebook','instagram','linkedin','x']},'photo':{x:copy for x in ['facebook','instagram','linkedin']},'hashtags':'#CoinHistory #SilverDollars #Numismatics','discussion_question':paras[0],'cta_slot':'engagement'},indent=2)+'\n')
 shutil.copy2(ROOT/'content/coin-history/fort-vancouver-centennial-half-dollar/whisper-runtime.json',w/'whisper-runtime.json')
 print(slug,len(body.split()),len(descriptions[n]))
