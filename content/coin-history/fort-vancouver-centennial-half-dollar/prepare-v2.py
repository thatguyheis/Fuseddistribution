from pathlib import Path
import json,hashlib,shutil
slug='fort-vancouver-centennial-half-dollar';work=Path('content/coin-history')/slug;pub=Path('public/blog')/slug;out=Path('video/out')/slug
archive=work/'archive-v1'
if not archive.exists():
 archive.mkdir();shutil.copytree(pub,archive/'article');shutil.copytree(out,archive/'render');shutil.copytree(Path('video/public/audio')/slug,archive/'audio')
text=(work/'narration-v2-awaiting-approval.txt').read_text();paragraphs=text.strip().split('\n\n');assert len(paragraphs)==9
(work/'narration-v2-approved.txt').write_text(text)
titles=['FURS TO LONDON. LUMBER TO HAWAII.','1825 / A TRADING HEADQUARTERS','GOODS OUT. FURS BACK.','BEYOND THE FUR TRADE','THE PEOPLE BEHIND THE TRADE','1829 / THE FORT MOVES','A BORDER CHANGES THE BUSINESS','1925 / HISTORY IN SILVER','RIVER. OCEAN. CHANGING BORDERS.']
script=f'# Reel Script: {slug}\nformat: long-form\ncontent-kind: educate\nsegments: 9\ntarget-duration: 120s\n\n'
for i,(narr,title) in enumerate(zip(paragraphs,titles)):
 script+='---\n\n## '+('HOOK' if i==0 else 'OVERLAY: '+title)+'\n\n**Visual:** '+title+'\nText: '+title+'\nNarration: '+narr+'\n\n'
(pub/'reel-script.md').write_text(script)
media=(pub/'reel-data.md').read_text().replace('hook: BRITISH COMPANY. AMERICAN COIN.','hook: '+titles[0]);(pub/'reel-data.md').write_text(media)
r=json.loads((work/'revision-v2-status.json').read_text());r.update(status='approved-in-production',renderAuthorized=True,approvedOn='2026-10-14',approval='User: Looks great generate the final here',engagementException='Use the approved documentary closing verbatim; do not append an unapproved question or sales pitch.');(work/'revision-v2-status.json').write_text(json.dumps(r,indent=2)+'\n')
