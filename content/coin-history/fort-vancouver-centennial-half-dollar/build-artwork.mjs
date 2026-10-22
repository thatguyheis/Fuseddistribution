import fs from 'node:fs';import sharp from 'sharp';import {createHash} from 'node:crypto';
const slug='fort-vancouver-centennial-half-dollar',dir=`public/blog/${slug}`,work=`content/coin-history/${slug}`;
const specs={inscription:{file:'IMG_5735.jpeg',box:[510,1450,1750,950]},reverse:{file:'IMG_5735.jpeg',box:[510,690,1750,1720]},obverse:{file:'IMG_5736.jpeg',box:[550,1470,1690,1580]},label:{file:'IMG_5736.jpeg',box:[350,100,2200,480]}};
const imgs={};const records=[];
for(const [name,s] of Object.entries(specs)){
 const image=await sharp(`Coin Raw/${s.file}`).rotate().extract({left:s.box[0],top:s.box[1],width:s.box[2],height:s.box[3]}).jpeg({quality:97,chromaSubsampling:'4:4:4'}).toBuffer();fs.writeFileSync(`${dir}/images/${name}.jpg`,image);imgs[name]='data:image/jpeg;base64,'+image.toString('base64');records.push({...s,name,sha256:createHash('sha256').update(fs.readFileSync(`Coin Raw/${s.file}`)).digest('hex')});
}
const start=(w,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="bg"><stop stop-color="#23404a"/><stop offset="1" stop-color="#07161d"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/>`;
const image=(name,x,y,w,h)=>`<image href="${imgs[name]}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
const text=(x,y,t,size=70,color='#fff4dd')=>`<text x="${x}" y="${y}" font-family="Arial" font-weight="700" font-size="${size}" fill="${color}">${t}</text>`;
async function save(name,svg){fs.mkdirSync(`${work}/artwork-source`,{recursive:true});fs.writeFileSync(`${work}/artwork-source/${name.replaceAll('/','-')}.svg`,svg+'</svg>');await sharp(Buffer.from(svg+'</svg>')).jpeg({quality:97,chromaSubsampling:'4:4:4'}).toFile(`${dir}/${name}.jpg`);}
for(const name of ['reverse','obverse'])await save(`images/${name}-plate`,start(1080,1920)+image(name,40,490,1000,1080));
await save('images/inscription-plate',start(1080,1920)+image('inscription',40,530,1000,660)+image('reverse',320,1170,440,460));
await save('images/timeline-plate',start(1080,1920)+image('obverse',90,430,900,950));
await save('images/label-plate',start(1080,1920)+image('label',55,520,970,280)+image('obverse',215,880,650,650));
await save('images/pair-plate',start(1080,1920)+image('reverse',45,470,990,640)+image('obverse',190,1100,700,570));
await save('hero',start(1080,1920)+text(70,130,'FUSED / COIN HISTORY',30,'#58d6ff')+text(70,295,'BRITISH COMPANY.',78)+text(70,397,'AMERICAN COIN.',78)+text(70,495,'WHY?',90,'#58d6ff')+image('reverse',40,595,1000,1060)+text(70,1780,'FORT VANCOUVER / 1925',39,'#ddc49c'));
await save('photo-post',start(1200,1200)+text(55,105,'A FORT. A COMPANY. A COIN.',52)+image('reverse',50,190,560,810)+image('obverse',620,190,530,810)+text(55,1110,'FORT VANCOUVER / 1825 TO 1925',35,'#58d6ff'));
fs.writeFileSync(`${work}/crop-plan.json`,JSON.stringify({coordinateSpace:'EXIF-oriented 3024 by 4032 pixels',method:'Deterministic source crops, no generated or repaired coin detail',sources:records},null,2));
