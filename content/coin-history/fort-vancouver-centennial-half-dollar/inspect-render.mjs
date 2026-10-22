import fs from 'node:fs';import {execFileSync} from 'node:child_process';import sharp from 'sharp';
import {transitionDurationFrames} from '../../../video/scripts/transition-timing.mjs';
const slug='fort-vancouver-centennial-half-dollar',dir=`video/out/${slug}`,p=JSON.parse(fs.readFileSync(`${dir}/render-props.json`));
const frames=[{frame:0,label:'HERO / 0.00s'}];let cursor=0;
for(const [i,s]of p.script.segments.entries()){
 const duration=Math.round((s.endSec-s.startSec)*30),shots=p.presentation.segments[i],sum=shots.reduce((n,x)=>n+x.weight,0);let weight=0;
 for(const [n,shot]of shots.entries()){
  const start=Math.round(weight/sum*duration);weight+=shot.weight;const end=Math.round(weight/sum*duration);
  const frame=cursor+Math.round((start+end)/2);frames.push({frame,label:`${i+1}.${n+1} / ${(frame/30).toFixed(2)}s`,src:shot.src,title:shot.title});
  if(n>0)frames.push({frame:cursor+start+7,label:`DISSOLVE ${i+1}.${n+1}`,transition:true});
 }
 const next=p.script.segments[i+1];const overlap=next?transitionDurationFrames(s.type,next.type,i):0;
 if(next)frames.push({frame:cursor+duration-Math.ceil(overlap/2),label:`SCENE ${i+1} > ${i+2}`,transition:true});
 cursor+=duration-overlap;
}
frames.push({frame:cursor-1,label:'FINAL FRAME'});fs.mkdirSync(`${dir}/review`,{recursive:true});
for(const [i,f]of frames.entries()){
 const path=`${dir}/review/frame-${String(i).padStart(2,'0')}.jpg`;execFileSync('ffmpeg',['-v','error','-ss',String(f.frame/30),'-i',`${dir}/${slug}.mp4`,'-frames:v','1','-q:v','2','-y',path]);f.path=path;
}
for(const [name,selected]of [['shots',frames.filter(f=>!f.transition)],['transitions',frames.filter(f=>f.transition)]]){
 const width=300,height=560,cols=4,rows=Math.ceil(selected.length/cols),composite=[];
 for(const [i,f]of selected.entries()){
  const pic=await sharp(f.path).resize(width,534).toBuffer();composite.push({input:pic,left:(i%cols)*width,top:Math.floor(i/cols)*height});
  const label=Buffer.from(`<svg width="300" height="26"><rect width="300" height="26" fill="#07151d"/><text x="8" y="18" fill="white" font-size="15">${f.label.replaceAll('>','&gt;')}</text></svg>`);composite.push({input:label,left:(i%cols)*width,top:Math.floor(i/cols)*height+534});
 }
 await sharp({create:{width:cols*width,height:rows*height,channels:3,background:'#07151d'}}).composite(composite).jpeg({quality:93}).toFile(`${dir}/review/${name}-contact-sheet.jpg`);
}
fs.writeFileSync(`${dir}/review/frame-plan.json`,JSON.stringify(frames,null,2));console.log(`Extracted ${frames.length} frames covering every shot and boundary.`);
