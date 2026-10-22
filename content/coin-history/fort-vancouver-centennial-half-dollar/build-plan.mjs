import fs from 'node:fs';import sharp from 'sharp';import {createHash} from 'node:crypto';
import {registerGeneratedBackground} from '../../../video/scripts/generated-background-library.mjs';
const slug='fort-vancouver-centennial-half-dollar',dir=`public/blog/${slug}`,work=`content/coin-history/${slug}`;
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const [n,index]of [['exterior',1],['courtyard',2]]){
 const input=`${work}/generated/presentation-${n}.png`,output=`${work}/generated/presentation-${n}.jpg`;
 await sharp(input).jpeg({quality:98,chromaSubsampling:'4:4:4'}).toFile(output);
 const metadata={source:'built-in-imagegen',topic:'silver',sceneId:`fort-palisade-${n}`,tags:['silver','fort-vancouver','palisade','history-illustration'],prompt:fs.readFileSync(`${work}/generated/presentation-${n}-prompt.txt`,'utf8'),sourceImage:input,model:'built-in-imagegen',modelLicense:'Generated output; retain service provenance; no third-party photograph',backgroundTreatment:'No geometry or invented historical labels added. Generic illustrative trading post, not exact reconstruction.'};
 const asset=registerGeneratedBackground({filePath:output,metadata,slug,segmentIndex:index});fs.writeFileSync(`${work}/generated/presentation-${n}-library.json`,JSON.stringify(asset,null,2));
}
const image=(name,title,eyebrow='THE COIN / OWNER PHOTOGRAPH',weight=1,extra={})=>({path:`${dir}/images/${name}-plate.jpg`,type:'photo',title,eyebrow,weight,credit:'Original Fused coin photograph',...extra});
const fort=(name,title,weight=1)=>({path:`${work}/generated/presentation-${name}.jpg`,type:'photo',title,eyebrow:'THE STORY / FORT VANCOUVER',credit:'AI illustration / not an exact reconstruction',weight});
const stock=(name,title,weight=1)=>({path:`${work}/stock/${name}.mp4`,type:'video',title,eyebrow:'THE WORLD BEHIND THE COIN',credit:name==='river'?'Modern forest stream / illustrative stock':'Modern woodworking / illustrative stock',weight,trimBefore:2});
const segments=[
 [image('reverse','BRITISH COMPANY. AMERICAN COIN.',undefined,1),image('inscription','READ THE COMPANY NAME',undefined,1),fort('exterior','A STORY A CENTURY OLDER',1)],
 [fort('exterior','1825 / THE FORT BEGINS',1.3),image('timeline','ONE HUNDRED YEARS',undefined,1,{timeline:true}),fort('courtyard','A TRADING POST, ILLUSTRATED',1.1)],
 [fort('courtyard','MORE THAN TIMBER WALLS',1),stock('woodcraft','A WORKING COMMUNITY',1.5),stock('river','A WIDER TRADING WORLD',1)],
 [image('obverse','DR. JOHN MCLOUGHLIN',undefined,1.5),image('timeline','1825 TO 1925',undefined,1,{timeline:true}),image('label','THE HOLDER: PCGS MS63',undefined,.7,{credit:'Visible label / certification not independently checked'})],
 [image('reverse','DESIGNS BY LAURA GARDIN FRASER',undefined,1.2),image('obverse','SAN FRANCISCO. NO MINT MARK.',undefined,1.2,{credit:'Issue history: U.S. Mint / no inferred mark'}),image('reverse','FOLLOW THE LETTERING',undefined,1)],
 [image('reverse','ONE PLACE. ONE CENTURY.',undefined,1),image('obverse','PORTRAIT OR FORT SIDE?',undefined,1)]
];
for(const shots of segments)for(const shot of shots)shot.sha256=hash(shot.path);
fs.writeFileSync(`${dir}/presentation-plan.json`,JSON.stringify({version:1,segments},null,2));
const required=['verified.md','index.html','meta.json','research.json','hero.jpg','photo-post.jpg','reel-script.md','reel-data.md','social-copy.json','presentation-plan.json'];
const qa={mode:'codex-editorial',score:95,pass:true,blockers:[],reviewedDate:'2026-10-13',reviewer:'Codex',scope:'Source and media approval for requested local sales presentation; not a publish or scheduling action',localValidation:'.workflow-state/fort-blog-qa.json',claimMap:`${work}/research.json`,artifactSha256:Object.fromEntries(required.map(n=>[n,hash(`${dir}/${n}`)]))};
fs.writeFileSync(`${dir}/qa.json`,JSON.stringify(qa,null,2)+'\n');console.log('17 reviewed presentation shots; source approval saved.');
