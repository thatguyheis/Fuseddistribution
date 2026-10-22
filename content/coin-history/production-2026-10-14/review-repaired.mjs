import fs from 'node:fs';import sharp from 'sharp';import {execFileSync} from 'node:child_process';
const allowed=['recording-accessibility-feedback-from-real-customers','creating-a-small-business-exception-handling-log','mapping-a-manual-business-process-before-automating-it'];
const slugs=process.argv[2]?[process.argv[2]]:allowed;if(slugs.some(s=>!allowed.includes(s)))throw Error('Unknown repair');
for(const slug of slugs){
 const d=`video/out/${slug}`,p=JSON.parse(fs.readFileSync(`${d}/script.json`)),duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',`${d}/${slug}.mp4`]).toString());
 const times=[0,...p.segments.map(s=>Math.min(duration-.2,(s.startSec+s.endSec)/2)),duration-.2];const dir=`.workflow-state/coin-pair-backlog-review/${slug}`;fs.mkdirSync(dir,{recursive:true});const tiles=[];
 for(const [i,t] of times.entries()){const path=`${dir}/${i}.jpg`;execFileSync('ffmpeg',['-v','error','-ss',String(t),'-i',`${d}/${slug}.mp4`,'-frames:v','1','-y',path]);tiles.push({input:await sharp(path).resize(230,410).toBuffer(),left:(i%4)*230,top:Math.floor(i/4)*410});}
 await sharp({create:{width:920,height:Math.ceil(times.length/4)*410,channels:3,background:'#08121d'}}).composite(tiles).jpeg({quality:90}).toFile(`${dir}/contact.jpg`);fs.writeFileSync(`${dir}/frames.json`,JSON.stringify(times));console.log(slug);
}
