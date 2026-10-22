import fs from 'node:fs';import sharp from 'sharp';import{execFileSync}from'node:child_process';
const slug='walking-liberty-half-dollar-silver-eagle',dir='.workflow-state/coin-comparison';
const times=[0,1,7,12,18.1,21,26,32,38,44,50,56,64,70,78,87,94,101,110,116.5];
const entries=[];
for(const [i,t]of times.entries()){
 const path=`${dir}/frame-${i}.jpg`;execFileSync('ffmpeg',['-y','-ss',String(t),'-i',`video/out/${slug}/${slug}.mp4`,'-frames:v','1','-q:v','2',path,'-loglevel','error']);
 const resized=await sharp(path).resize(216,384).toBuffer();
 const label=Buffer.from(`<svg width="216" height="24"><rect width="216" height="24" fill="#000"/><text x="8" y="17" fill="white" font-family="Arial" font-size="14">${t}s</text></svg>`);
 const cell=await sharp({create:{width:216,height:408,channels:3,background:'#000'}}).composite([{input:resized,left:0,top:0},{input:label,left:0,top:384}]).jpeg().toBuffer();
 entries.push({input:cell,left:(i%5)*216,top:Math.floor(i/5)*408});
}
await sharp({create:{width:1080,height:1632,channels:3,background:'#000'}}).composite(entries).jpeg({quality:92}).toFile(`${dir}/encoded-review.jpg`);
fs.writeFileSync(`${dir}/reviewed-times.json`,JSON.stringify(times));
