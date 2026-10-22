import fs from 'node:fs';import sharp from 'sharp';import {createHash} from 'node:crypto';
const root='content/coin-history',slugs=['pittman-act-silver-dollar-melting','peace-dollar-history-and-symbolism'];
const specs=[{file:'IMG_6643.jpeg',box:[710,1740,1870,1830],angle:0},{file:'IMG_4696.jpeg',box:[2460,3380,1280,1320],angle:90}];
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const start=(w,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="b"><stop stop-color="#284250"/><stop offset="1" stop-color="#06131d"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#b)"/>`;
const text=(x,y,t,size=64,c='#fff3db')=>`<text x="${x}" y="${y}" fill="${c}" font-family="Arial" font-weight="700" font-size="${size}">${esc(t)}</text>`;
for(const [i,slug]of slugs.entries()){
 const dir=`public/blog/${slug}`,work=`${root}/${slug}`,s=specs[i];fs.mkdirSync(`${work}/artwork-source`,{recursive:true});
 await sharp(`Coin Raw/${s.file}`).rotate().extract({left:s.box[0],top:s.box[1],width:s.box[2],height:s.box[3]}).rotate(s.angle).jpeg({quality:96}).toFile(`${dir}/images/coin.jpg`);
 if(i===1)await sharp('Coin Raw/IMG_3488.jpeg').extract({left:295,top:820,width:525,height:550}).rotate(180).jpeg({quality:96}).toFile(`${dir}/images/reverse.jpg`);
 const im=(name,x,y,w,h)=>`<image href="data:image/jpeg;base64,${fs.readFileSync(`${dir}/images/${name}.jpg`).toString('base64')}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
 const save=async(name,svg)=>{fs.writeFileSync(`${work}/artwork-source/${name.replaceAll('/','-')}.svg`,svg+'</svg>');await sharp(Buffer.from(svg+'</svg>')).jpeg({quality:95}).toFile(`${dir}/${name}.jpg`)};
 await save('images/coin-plate',start(1080,1920)+im('coin',65,480,950,1050));
 if(i===1)await save('images/reverse-plate',start(1080,1920)+im('reverse',100,510,880,980));
 await save('hero',start(1080,1920)+text(65,140,'FUSED / COIN HISTORY',32,'#58d6ff')+text(65,295,i===0?'MELTED. THEN':'WHY NAME A')+text(65,382,i===0?'MADE AGAIN.':'DOLLAR PEACE?')+im('coin',65,500,950,1050)+text(65,1760,i===0?'1918 / THE PITTMAN ACT':'1921 / A SYMBOL CHANGES',35,'#58d6ff'));
 await save('photo-post',start(1200,1200)+text(65,120,i===0?'THE SILVER DOLLARS AMERICA MELTED':'WHY A DOLLAR WAS NAMED PEACE',44)+im('coin',230,230,740,740)+text(65,1110,'HISTORY THROUGH REAL COINS',35,'#58d6ff'));
 const lines=i===0?[['1918','MELT AND SELL'],['REPLACE','BUY AMERICAN SILVER'],['1921','MORGAN RETURNS']]:[['1921','DESIGN SELECTED'],['REVISED','SWORD REMOVED'],['PEACE','OLIVE BRANCH REMAINS']];
 let svg=start(1080,1920)+`<path d="M160 520 V1440" stroke="#58d6ff" stroke-width="6"/>`;
 for(const [j,[date,label]]of lines.entries()){const y=600+j*360;svg+=`<circle cx="160" cy="${y}" r="18" fill="#58d6ff"/>`+text(220,y,date,70)+text(220,y+85,label,35);}
 await save('images/timeline-plate',svg);
 fs.writeFileSync(`${work}/crop-plan.json`,JSON.stringify({coordinateSpace:'EXIF-oriented source pixels',sources:[{...s,source:`Coin Raw/${s.file}`,sha256:hash(`Coin Raw/${s.file}`)},...(i===1?[{source:'Coin Raw/IMG_3488.jpeg',box:[295,820,525,550],angle:180,sha256:hash('Coin Raw/IMG_3488.jpeg')}]:[])],note:'Separate specimens; no mint, grade or paired-side claims. Deterministic crops only.'},null,2));
}
