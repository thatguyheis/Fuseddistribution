import fs from 'node:fs';import sharp from 'sharp';import{createHash}from'node:crypto';
const slug='morgan-dollar-o-mint-mark-new-orleans',dir='public/blog/'+slug;fs.mkdirSync(dir+'/images',{recursive:true});
const b64={};for(const [name,file]of Object.entries({reverse:'IMG_3431.jpeg',obverse:'IMG_3433.jpeg'})){const b=await sharp('Coin Raw/'+file).rotate().toBuffer();b64[name]='data:image/jpeg;base64,'+b.toString('base64');}
const txt=(x,y,s,n=34,c='#fff')=>`<text x="${x}" y="${y}" fill="${c}" font-size="${n}" font-family="Arial" font-weight="700">${s}</text>`;
const photo=(name,x,y,w,h,crop)=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${crop.join(' ')}" preserveAspectRatio="xMidYMid slice"><image width="3024" height="4032" href="${b64[name]}"/></svg>`;
const rev=[585,706,1923,2033],obv=[735,1390,1700,1780];
const start=(w,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#081d29"/>`;
const end='</svg>';
async function save(name,svg){const source='content/coin-history/'+slug+'/artwork-source/'+name+'.svg';fs.mkdirSync(source.slice(0,source.lastIndexOf('/')),{recursive:true});fs.writeFileSync(source,svg);await sharp(Buffer.from(svg)).jpeg({quality:90}).toFile(dir+'/'+name+'.jpg');}
await save('hero',start(1200,630)+photo('reverse',30,35,540,560,rev)+txt(615,130,'COIN HISTORY',24,'#58d6ff')+txt(615,225,'WHY THIS',58)+txt(615,298,'TINY O?',76)+txt(615,385,'A mint with a',34)+txt(615,430,'Civil War history',34)+txt(615,550,'Fused Distribution',24,'#a7c5d2')+end);
await save('photo-post',start(1200,1200)+txt(60,75,'FUSED / COIN HISTORY',27,'#58d6ff')+txt(60,160,'WHY THIS TINY O?',64)+photo('reverse',220,220,760,780,rev)+txt(85,1110,'Follow the letter to New Orleans.',44)+end);
await save('images/morgan-o-reverse',start(1000,1060)+photo('reverse',0,0,1000,1060,rev)+end);
await save('images/morgan-1900-obverse',start(1000,1060)+photo('obverse',0,0,1000,1060,obv)+end);
const scenes=[];
scenes.push(start(720,1280)+txt(50,140,'WHY THIS TINY O?',46,'#58d6ff')+photo('reverse',55,290,610,640,rev)+txt(60,1005,'NEW ORLEANS',38)+txt(60,1055,'Original Fused coin photograph',22,'#b9d2dc')+end);
scenes.push(start(720,1280)+txt(48,130,'TWO SIDES. TWO CLUES.',35,'#58d6ff')+photo('obverse',35,270,310,350,obv)+photo('reverse',375,270,310,350,rev)+txt(55,695,'1900',58)+txt(425,695,'O',58)+txt(55,760,'WHEN',32)+txt(425,760,'WHERE',32)+txt(45,950,'Separately photographed examples',24,'#b9d2dc')+end);
const timeline=(title,rows,footer)=>start(720,1280)+txt(45,120,title,34,'#58d6ff')+'<path d="M105 280 V850" stroke="#58d6ff" stroke-width="5"/>'+rows.map(([year,label],i)=>`<circle cx="105" cy="${300+i*240}" r="12" fill="#58d6ff"/>`+txt(150,310+i*240,year,52)+txt(150,365+i*240,label,30)).join('')+txt(45,1000,footer,22,'#b9d2dc')+end;
scenes.push(timeline('THE MINT CAME FIRST',[['1835','Congress authorizes branch'],['1838','New Orleans coins begin'],['1879','New Orleans Morgan era']],'Timeline illustration / U.S. Mint history'));
scenes.push(timeline('A WAR. A LONG PAUSE.',[['1861','Confederate control'],['1862','U.S. regains the facility'],['1879','Full operations resume']],'The photographed 1900 dollar came later.'));
scenes.push(timeline('THE BUILDING SURVIVED',[['1904','Last New Orleans Morgans'],['1909','Coin production ends'],['1981','Opens as state museum']],'U.S. Mint / Louisiana State Museum'));
scenes.push(start(720,1280)+txt(45,130,'A SMALL MARK.',48,'#58d6ff')+txt(45,200,'A BIGGER HISTORY.',43)+photo('reverse',110,300,500,530,rev)+txt(65,940,'DATE OR MINT MARK?',40)+end);
for(let i=0;i<scenes.length;i++)await save('images/scene-'+i,scenes[i]);
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync(dir+'/preferred-media.json',JSON.stringify({version:1,source:'fused-owned-coin-library',segments:scenes.map((_,i)=>({index:i,type:'photo',path:`public/blog/${slug}/images/scene-${i}.jpg`,sha256:sha(`${dir}/images/scene-${i}.jpg`),assetIds:i===1?['coin-0006','coin-0007']:i===0||i===5?['coin-0006']:[],role:i===2||i===3||i===4?'labeled historical timeline illustration':'direct evidence of visible coin features',reviewed:true}))},null,2));
fs.writeFileSync('content/coin-history/'+slug+'/crop-plan.json',JSON.stringify({coordinateSpace:'EXIF oriented 3024x4032 source pixels',method:'SVG viewport; no generative edits',crops:[{assetId:'coin-0006',box:rev,purpose:'Whole reverse, O and denomination preserved'},{assetId:'coin-0007',box:obv,purpose:'Obverse and date, exclude holder serial'}]},null,2));
const thumbs=[];for(let i=0;i<6;i++)thumbs.push({input:await sharp(`${dir}/images/scene-${i}.jpg`).resize(216,384).toBuffer(),left:i*216,top:0});await sharp({create:{width:1296,height:384,channels:3,background:'#000'}}).composite(thumbs).jpeg().toFile('.workflow-state/coin-history-2026-10-13/scenes.jpg');
