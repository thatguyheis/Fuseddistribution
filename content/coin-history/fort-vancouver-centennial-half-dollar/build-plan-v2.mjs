import fs from 'node:fs';import sharp from 'sharp';import {createHash} from 'node:crypto';
const slug='fort-vancouver-centennial-half-dollar',dir=`public/blog/${slug}`,work=`content/coin-history/${slug}`;
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const name of ['fort-bastion-modern','fort-historical-illustration','fort-aerial-modern']){
 const input=`${work}/owner-supplied-fort-images/${name}.jpg`;
 const photo=await sharp(input).rotate().resize({width:1000,height:1050,fit:'inside'}).toBuffer({resolveWithObject:true});
 const backdrop=await sharp(input).rotate().resize(1080,1920,{fit:'cover'}).blur(35).modulate({brightness:.19,saturation:.6}).toBuffer();
 await sharp(backdrop).composite([{input:photo.data,left:Math.round((1080-photo.info.width)/2),top:Math.round((1920-photo.info.height)/2)}]).jpeg({quality:95}).toFile(`${work}/owner-supplied-fort-images/${name}-plate.jpg`);
}
const coin=(n,title)=>({path:`${dir}/images/${n}-plate.jpg`,type:'photo',title,eyebrow:'THE COIN / OWNER PHOTOGRAPH',credit:'Original Fused coin photograph',weight:1});
const ai=(n,title)=>({path:`${work}/generated/presentation-${n}.jpg`,type:'photo',title,eyebrow:'FORT VANCOUVER / THE STORY',credit:'AI illustration / not an exact reconstruction',weight:1});
const real=(n,title)=>({path:`${work}/owner-supplied-fort-images/fort-${n}-plate.jpg`,type:'photo',title,eyebrow:'FORT VANCOUVER / THE STORY',credit:n==='historical-illustration'?'Historical illustration / supplied reference':'Modern view of the reconstructed fort',weight:1});
const segments=[
 [coin('reverse','FURS TO LONDON. LUMBER TO HAWAII.'),real('bastion-modern','WHAT MADE THIS FORT IMPORTANT?')],
 [ai('exterior','1825 / THE FORT BEGINS'),real('aerial-modern','A TRADING HEADQUARTERS')],
 [real('historical-illustration','FOOD AND TRADE GOODS OUT'),ai('courtyard','FURS BACK. SHIPS TO LONDON.')],
 [ai('courtyard','FARMS. GRAIN. LUMBER.'),real('historical-illustration','1828 / EXPORTS TO HONOLULU')],
 [real('historical-illustration','THE PEOPLE BEHIND THE TRADE'),real('aerial-modern','A COMMUNITY BEYOND THE WALLS')],
 [ai('exterior','FIRST ON A BLUFF'),real('bastion-modern','1829 / REBUILT ON THE PLAIN'),real('aerial-modern','TODAY / THE RECONSTRUCTED FORT')],
 [real('historical-illustration','1846 / THE BORDER CHANGES'),real('aerial-modern','1849 / VANCOUVER BARRACKS'),real('bastion-modern','1860 / THE COMPANY LEAVES')],
 [coin('obverse','1925 / THE CENTENNIAL COIN'),coin('reverse','A FORT REMEMBERED IN SILVER')],
 [coin('reverse','RIVER. OCEAN. CHANGING BORDERS.')]
];
for(const shots of segments)for(const shot of shots)shot.sha256=hash(shot.path);
fs.writeFileSync(`${dir}/presentation-plan.json`,JSON.stringify({version:2,segments},null,2));
const qa=JSON.parse(fs.readFileSync(`${dir}/qa.json`));qa.reviewedDate='2026-10-14';qa.scope='User approved v2 narration and requested supplied images; local final preview only. Supplied image attribution remains unverified for public distribution.';for(const n of Object.keys(qa.artifactSha256))qa.artifactSha256[n]=hash(`${dir}/${n}`);fs.writeFileSync(`${dir}/qa.json`,JSON.stringify(qa,null,2)+'\n');
console.log('19 shots prepared, including all three supplied references and both retained AI plates.');
