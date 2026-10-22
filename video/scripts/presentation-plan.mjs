import {readFileSync,writeFileSync,copyFileSync,mkdirSync,realpathSync} from 'node:fs';
import {join,resolve,sep,extname} from 'node:path';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function stagePresentation(root,slug,segmentCount){
 const dir=join(root,'public/blog',slug),bytes=readFileSync(join(dir,'presentation-plan.json'));
 const qa=JSON.parse(readFileSync(join(dir,'qa.json')));
 if(qa.artifactSha256?.['presentation-plan.json']!==hash(bytes))throw Error('Presentation plan needs current editorial approval');
 const plan=JSON.parse(bytes),media={},segments={},manifest={};
 const allowed=[realpathSync(dir)+sep,realpathSync(join(root,'content/coin-history',slug))+sep],dest=join(root,'video/public/presentations',slug);mkdirSync(dest,{recursive:true});
 if(plan.segments.length!==segmentCount)throw Error('Presentation must cover every narration segment');
 for(const [index,shots]of plan.segments.entries()){
  if(!Array.isArray(shots)||!shots.length)throw Error('Missing presentation shots');
  segments[index]=shots.map((shot,n)=>{
   if(!['photo','video'].includes(shot.type)||!Number.isFinite(shot.weight)||shot.weight<=0||!shot.credit||!shot.title||!shot.eyebrow)throw Error('Incomplete presentation shot');
   const source=realpathSync(resolve(root,shot.path));
   if(!allowed.some(prefix=>source.startsWith(prefix))||hash(readFileSync(source))!==shot.sha256)throw Error('Presentation asset escaped workspace or changed');
   const name=`scene-${index}-shot-${n}${extname(source)}`;copyFileSync(source,join(dest,name));
   return {...shot,src:`presentations/${slug}/${name}`};
  });
  const first=segments[index][0];media[index]={type:first.type,src:first.src,source:'reviewed-presentation'};manifest[index]={source:'reviewed-presentation',shots};
 }
 const out=join(root,'video/out',slug);mkdirSync(out,{recursive:true});writeFileSync(join(out,'media-manifest.json'),JSON.stringify({slug,source:'reviewed-presentation',segments:manifest},null,2));
 return {presentation:{segments},media,planSha256:hash(bytes)};
}
