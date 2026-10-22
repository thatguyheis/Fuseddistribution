import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {assertApprovedSources} from '../../../video/scripts/approved-sources.mjs';
const slug=process.argv[2];const fixes={
 'recording-accessibility-feedback-from-real-customers':{2:4},
 'creating-a-small-business-exception-handling-log':{2:4},
 'mapping-a-manual-business-process-before-automating-it':{2:3,5:4}
};if(!fixes[slug])throw Error('Unreviewed repair slug');
const root=process.cwd(),d=path.join(root,'video/out',slug),lock='/tmp/fused-remotion-render.lock';
assertApprovedSources(root,slug);fs.mkdirSync(lock);fs.writeFileSync(path.join(lock,'pid'),String(process.pid));
process.on('exit',()=>{if(fs.existsSync(lock)&&fs.readFileSync(path.join(lock,'pid'),'utf8')===String(process.pid))fs.renameSync(lock,`${lock}.finished.${process.pid}.${Date.now()}`)});
const backup=path.join(root,'content/coin-history/production-2026-10-14/backlog-archives',slug);if(fs.existsSync(backup))throw Error('Archive exists: inspect before repeat');fs.mkdirSync(backup,{recursive:true});
for(const name of [slug+'.mp4','render-props.json','render-meta.json','media-manifest.json','visual-review.json','release-qa.json'])if(fs.existsSync(path.join(d,name)))fs.copyFileSync(path.join(d,name),path.join(backup,name));
const props=JSON.parse(fs.readFileSync(path.join(d,'render-props.json')));const changes=[];
for(const [target,source]of Object.entries(fixes[slug])){const selected=props.media[source];changes.push({target:Number(target),sourceSegment:source,old:props.media[target],replacement:selected,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,'video/public',selected.src))).digest('hex')});props.media[target]={...selected};}
fs.writeFileSync(path.join(d,'render-props.json'),JSON.stringify(props));
execFileSync('npx',['remotion','render','src/Root.tsx','BlogReel','--concurrency=1',`--props=${path.join(d,'render-props.json')}`,path.join(d,slug+'.mp4')],{cwd:path.join(root,'video'),stdio:'inherit'});
execFileSync('ffmpeg',['-v','error','-i',path.join(d,slug+'.mp4'),'-f','null','-']);
const meta=JSON.parse(fs.readFileSync(path.join(d,'render-meta.json')));meta.renderedAt=new Date().toISOString();meta.repair={changes,sourceArchive:backup,narration:'preserved unchanged',captions:'preserved unchanged'};fs.writeFileSync(path.join(d,'render-meta.json'),JSON.stringify(meta,null,2)+'\n');
const manifestPath=path.join(d,'media-manifest.json');
if(fs.existsSync(manifestPath)){const manifest=JSON.parse(fs.readFileSync(manifestPath));manifest.reviewedRepair=meta.repair;fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');}
fs.writeFileSync(path.join(d,'scene-repair.json'),JSON.stringify(meta.repair,null,2)+'\n');console.log('RENDERED; owner visual review required',slug);
