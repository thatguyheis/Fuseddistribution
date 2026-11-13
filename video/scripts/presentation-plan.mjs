import {readFileSync,writeFileSync,copyFileSync,mkdirSync,realpathSync,existsSync} from 'node:fs';
import {join,resolve,sep,extname} from 'node:path';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validatePresentation(root,slug,segmentCount){
 const dir=join(root,'public/blog',slug),bytes=readFileSync(join(dir,'presentation-plan.json'));
 const qa=JSON.parse(readFileSync(join(dir,'qa.json')));
 if(qa.artifactSha256?.['presentation-plan.json']!==hash(bytes))throw Error('Presentation plan needs current editorial approval');
 const plan=JSON.parse(bytes);
 if(plan.profile!==undefined&&!['business-growth-v1'].includes(plan.profile))throw Error(`Unsupported presentation profile: ${plan.profile}`);
 if(plan.profile==='business-growth-v1'){
  if(existsSync(join(root,'content/coin-history',slug)))throw Error('Business growth presentation profile cannot be used for coin history');
  const safeZones=plan.safeZones;
  if(safeZones?.width!==1080||safeZones?.height!==1920||safeZones?.captionBottomClearancePx!==250||safeZones?.socialUiRightClearancePx!==150)throw Error('Business growth presentation plan must declare 1080x1920 output with 250px caption and 150px social UI clearances');
 }
 const allowed=[realpathSync(dir)+sep,...(existsSync(join(root,'content/coin-history',slug))?[realpathSync(join(root,'content/coin-history',slug))+sep]:[])];
 if(!Array.isArray(plan.segments)||plan.segments.length!==segmentCount)throw Error('Presentation must cover every narration segment');
 for(const [index,shots]of plan.segments.entries()){
  if(!Array.isArray(shots)||!shots.length)throw Error('Missing presentation shots');
  for(const shot of shots){
   if(!['photo','video'].includes(shot.type)||!Number.isFinite(shot.weight)||shot.weight<=0||!shot.credit||!shot.title||!shot.eyebrow)throw Error(`Incomplete presentation shot in scene ${index}: require type, positive weight, title, eyebrow and credit`);
   const source=realpathSync(resolve(root,shot.path));
   if(!allowed.some(prefix=>source.startsWith(prefix))||hash(readFileSync(source))!==shot.sha256)throw Error('Presentation asset escaped workspace or changed');
  }
 }
 return {plan,planSha256:hash(bytes)};
}
export function stagePresentation(root,slug,segmentCount){
 const {plan,planSha256}=validatePresentation(root,slug,segmentCount);
 const media={},segments={},manifest={};
 const dest=join(root,'video/public/presentations',slug);mkdirSync(dest,{recursive:true});
 for(const [index,shots] of plan.segments.entries()){
  segments[index]=shots.map((shot,n)=>{
   const source=realpathSync(resolve(root,shot.path));
   const name=`scene-${index}-shot-${n}${extname(source)}`;copyFileSync(source,join(dest,name));
   return {...shot,src:`presentations/${slug}/${name}`};
  });
  const first=segments[index][0];media[index]={type:first.type,src:first.src,source:'reviewed-presentation'};manifest[index]={source:'reviewed-presentation',shots};
 }
 const out=join(root,'video/out',slug);mkdirSync(out,{recursive:true});writeFileSync(join(out,'media-manifest.json'),JSON.stringify({slug,source:'reviewed-presentation',segments:manifest},null,2));
 return {presentation:{segments},media,planSha256,profile:plan.profile??null};
}
