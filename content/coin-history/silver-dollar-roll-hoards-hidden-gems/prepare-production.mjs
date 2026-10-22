import {createHash} from 'node:crypto';
import {copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root=path.resolve(import.meta.dirname,'../../..');
const slug='silver-dollar-roll-hoards-hidden-gems';
const work=path.join(root,'content/coin-history',slug);
const pub=path.join(root,'public/blog',slug);
const card=path.join(work,'artwork-source');
mkdirSync(path.join(pub,'images'),{recursive:true});mkdirSync(card,{recursive:true});
const items=[
 ['coin-0043','wrapped-silver-dollar-hoard-sample.jpg','Auction sample photo, marked as an unarrived hoard'],
 ['coin-0044','morgan-dollar-stack.jpg','Morgan dollar stack and loose coins'],
 ['coin-0045','1887-morgan-dollar-obverse.jpg','1887 Morgan dollar obverse; mint mark not shown'],
 ['coin-0046','morgan-dollar-reverse.jpg','Morgan dollar reverse; separate specimen, mint unknown'],
];
const catalog=JSON.parse(readFileSync(path.join(root,'content/coin-library/catalog.json'),'utf8'));
for(const [id,file] of items){
 const entry=catalog.items.find(x=>x.id===id);if(!entry)throw Error(`Missing ${id}`);
 copyFileSync(path.join(root,entry.source),path.join(pub,'images',file));
}
const sample=path.join(pub,'images',items[0][1]);
const morgan=path.join(pub,'images',items[1][1]);
const auction='https://auctions.coinssince1994.com/lotview/12243/1917768/0?page=1&scrollLocation=1063&perPage=25&lotSearch=&loc=0&sortby=1&mc_cid=993419266f&mc_eid=b51d7cdd03';
const svgText=(text)=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
async function makePoster(input,output,{width,height,headline,eyebrow,subhead,footer,cover=false}){
 const side=cover?width:1080;
 const photoHeight=cover?Math.round(height*.58):Math.round(height*.62);
 const top=cover?Math.round(height*.16):Math.round(height*.15);
 const photo=await sharp(input).rotate().resize(width-96,photoHeight,{fit:'contain',background:'#0b1c24'}).toBuffer();
 const {width:photoW,height:photoH}=await sharp(photo).metadata();
 const left=Math.round((width-photoW)/2);
 const font=cover?48:62;
 const banner=`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#071923"/><stop offset=".56" stop-color="#102d38"/><stop offset="1" stop-color="#051118"/></linearGradient><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#06131b" stop-opacity=".9"/><stop offset=".45" stop-color="#06131b" stop-opacity="0"/><stop offset="1" stop-color="#06131b" stop-opacity=".5"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/><rect x="0" y="0" width="100%" height="100%" fill="url(#shade)"/><text x="${width/2}" y="${cover?88:118}" fill="#58d6ff" text-anchor="middle" font-family="Arial" font-size="${cover?24:28}" font-weight="700" letter-spacing="5">${svgText(eyebrow)}</text><text x="${width/2}" y="${cover?160:212}" fill="#fff7e8" text-anchor="middle" font-family="Arial" font-size="${font}" font-weight="800">${svgText(headline)}</text><text x="${width/2}" y="${cover?218:282}" fill="#cfe0e3" text-anchor="middle" font-family="Arial" font-size="${cover?20:24}" letter-spacing="2">${svgText(subhead)}</text><rect x="72" y="${top-10}" width="${width-144}" height="${photoHeight+20}" rx="15" fill="none" stroke="#58d6ff" stroke-opacity=".5" stroke-width="3"/><text x="${width/2}" y="${height-(cover?220:260)}" fill="#e3d3b3" text-anchor="middle" font-family="Arial" font-size="${cover?22:26}" font-weight="700">${svgText(footer)}</text>${cover?'':`<text x="${width/2}" y="${height-174}" fill="#ffffff" text-anchor="middle" font-family="Arial" font-size="25" font-weight="700" letter-spacing="3">AVAILABLE AT AUCTION</text><text x="${width/2}" y="${height-123}" fill="#58d6ff" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700">COINS &amp; AUCTIONS SINCE 1994</text><text x="${width/2}" y="${height-76}" fill="#fff7e8" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" letter-spacing="2">FIND THE LINK IN COMMENTS</text>`}<image href="data:image/jpeg;base64,${photo.toString('base64')}" x="${left}" y="${top}" width="${photoW}" height="${photoH}" preserveAspectRatio="xMidYMid meet"/></svg>`;
 await sharp(Buffer.from(banner)).jpeg({quality:94,mozjpeg:true}).toFile(output);
}
await makePoster(morgan,path.join(pub,'hero.jpg'),{width:1080,height:1920,headline:'ONE BAG. A RARER DATE.',eyebrow:'HISTORIC MORGAN DOLLAR HOARDS',subhead:'A documented discovery, not a promise about this lot',footer:'OWNER PHOTO • SEPARATE SPECIMEN',cover:false});
await makePoster(sample,path.join(pub,'images/final-auction-card.jpg'),{width:1080,height:1920,headline:'SILVER DOLLAR ROLL HOARD',eyebrow:'AUCTION FEATURE',subhead:'Sample photo: hoard not yet arrived',footer:'Sample image only. Lot contents must be verified.',cover:false});
await makePoster(sample,path.join(pub,'photo-post.jpg'),{width:1080,height:1080,headline:'WHEN A BAG CHANGED RARITY',eyebrow:'COIN HISTORY',subhead:'A sample image from an unarrived hoard',footer:'HISTORICAL FINDS ARE NOT GUARANTEES',cover:true});
const body=(readFileSync(path.join(work,'blog-draft-v1.md'),'utf8').split('### Owner photo placement plan')[0]).trim();
const bodyWithPhotos=body
 .replace('## The 1893-S that appeared in an 1894-S bag','![Morgan dollars shown together](images/morgan-dollar-stack.jpg "Owner photo of Morgan dollars; not the 1893-S coins from the documented discovery")\n\n## The 1893-S that appeared in an 1894-S bag')
 .replace('## What this auction image can and cannot tell us','## What this auction image can and cannot tell us\n\n![Wrapped silver dollar sample image](images/wrapped-silver-dollar-hoard-sample.jpg "Auction sample photo; the watermark says the hoard had not arrived")')
 .replace('The other supplied photographs show Morgan dollar imagery, including a visibly dated 1887 obverse; the reverse photograph is treated as a separate specimen, and no mint mark, grade or pairing is inferred.','The other supplied photographs show Morgan dollar imagery, including a visibly dated 1887 obverse. The reverse view is a separate specimen, and no mint mark, grade or pairing is inferred.\n\n![1887 Morgan dollar obverse](images/1887-morgan-dollar-obverse.jpg "The 1887 date is visible; mint mark not shown")\n\n![Morgan dollar reverse](images/morgan-dollar-reverse.jpg "Separate reverse view; not paired to the 1887 obverse")');
writeFileSync(path.join(pub,'verified.md'),bodyWithPhotos+'\n');
writeFileSync(path.join(pub,'meta.json'),JSON.stringify({slug,title:'When a Silver Dollar Bag Changed Rarity: The Hidden-Gem Stories Behind Hoards',description:'Explore historic Morgan dollar hoards, including rare 1893-S discoveries, the Redfield cache, and why hidden rolls can change what collectors know.',alt:'Wrapped Morgan silver dollar hoard sample',brand:'silver',date:'2026-10-15',status:'local-draft-awaiting-release-review',tags:['Coin history','Morgan dollars','Silver dollar hoards'],ctaLine:'Check the auction listing for its current description and terms.',contentGraphic:{label:'Documented silver dollar hoards reshaped rarity',rows:[{condition:'1878',action:'Bland-Allison Act drives monthly Treasury silver purchases'},{condition:'Early 1960s',action:'An 1894-S bag includes 1893-S Morgan dollars'},{condition:'1974 / 1976',action:'Redfield cache discovered and auctioned as a single lot'},{condition:'1962 to 1964',action:'Treasury releases change 1903-O availability'}]}},null,2)+'\n');
const research=JSON.parse(readFileSync(path.join(work,'claim-map.json'),'utf8'));
writeFileSync(path.join(pub,'research.json'),JSON.stringify(research,null,2)+'\n');
const transcript=readFileSync(path.join(work,'narration-v1-approved.txt'),'utf8').trim().split(/\n\n+/);
const titles=['1878 / SILVER PURCHASE POLICY','1893-S IN AN 1894-S BAG','400 BAGS BEHIND A WALL','WHEN TREASURY RELEASES CHANGE RARITY','A HOARD IS A QUESTION, NOT A PROMISE'];
let reel=`# Reel Script: ${slug}\nformat: long-form\ncontent-kind: educate\nsegments: ${transcript.length}\ntarget-duration: 125s\n\n`;
for(let i=0;i<transcript.length;i++){
 const title=i===0?'A WRAPPED ROLL. A HIDDEN HISTORY.':titles[i-1]??'THE FIND MUST BE PROVEN';
 reel+=`---\n\n## ${i===0?'HOOK':`OVERLAY: ${title}`}\n\n**Visual:** ${title}\nText: ${title}\nNarration: ${transcript[i]}\n\n`;
}
writeFileSync(path.join(pub,'reel-script.md'),reel);
writeFileSync(path.join(pub,'reel-data.md'),`# Silver Dollar Roll Hoards\ntopic: silver\nhook: A WRAPPED ROLL. A HIDDEN HISTORY.\n\n## media_queries\n- segment: 0\n  query: "wrapped silver dollar hoard sample"\n  prefer: photo\n- segment: 1\n  query: "historical Treasury vault illustration"\n  prefer: photo\n- segment: 2\n  query: "Morgan dollar bag and coin dealer illustration"\n  prefer: photo\n- segment: 3\n  query: "coin collector basement hoard illustration"\n  prefer: photo\n- segment: 4\n  query: "Treasury silver dollar release illustration"\n  prefer: photo\n- segment: 5\n  query: "silver dollar auction sample image"\n  prefer: photo\n`);
writeFileSync(path.join(pub,'social-copy.json'),JSON.stringify({caption:'A bag labeled for one date once revealed dollars from another. The 1893-S Morgan discovery, Redfield cache and Treasury releases show why coin hoards can rewrite rarity. This auction sample is marked as an unarrived hoard, so no contents or rare finds are promised.',firstComment:`Auction listing: ${auction}`},null,2)+'\n');
writeFileSync(path.join(pub,'social-video.json'),JSON.stringify({status:'awaiting_verified_hosted_video',note:'Add the verified hosted URL after the rendered reel passes release review.'},null,2)+'\n');
const info={slug,transcriptApproval:{approved:true,approvalEvidence:'Nick: Yes, and on the last page of the generation add a storyboard graphic that shows the label and image of coin horde, and say available at auction at coinsandauctionsince1994 find link in comments',approvedOn:'2026-10-15',sha256:createHash('sha256').update(readFileSync(path.join(work,'narration-v1-approved.txt'))).digest('hex')},requestedClosingCard:{label:'SILVER DOLLAR ROLL HOARD',availableAtAuction:true,auctionBrand:'Coins & Auctions Since 1994',cta:'Find the link in comments',imageId:'coin-0043',disclosure:'Sample image from hoard not yet arrived; not proof of auction lot contents.'},musicRequested:'youtube-bag-man-from-yankton-national-sweetheart.mp3'};
writeFileSync(path.join(work,'production-approval.json'),JSON.stringify(info,null,2)+'\n');
console.log('Prepared blog package and supplied images; transcript exact hash:',info.transcriptApproval.sha256);
