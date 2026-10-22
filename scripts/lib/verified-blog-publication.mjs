import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {assertEditorialDeployment} from './editorial-deployment-gate.mjs';

// A queue is only a plan. Reconcile individual slugs against retained exact
// live proof and the currently approved artifact, without another web request.
export function verifiedPublicationSlugs(root,posts) {
 const state=join(root,'.workflow-state');
 let folders=[];try{folders=readdirSync(state).filter(n=>n.startsWith('recovery-'));}catch{return [];}
 return posts.filter(({slug})=>{
  if(!/^[a-z0-9-]+$/.test(slug))return false;
  try{
   const dir=join(root,'public/blog',slug),meta=JSON.parse(readFileSync(join(dir,'meta.json')));
   assertEditorialDeployment(dir,slug);
   const hero=createHash('sha256').update(readFileSync(join(dir,'hero.jpg'))).digest('hex');
   return folders.some(folder=>{
    try{
     const p=JSON.parse(readFileSync(join(state,folder,slug+'-live-proof.json')));
     return p.slug===slug&&p.pass===true&&p.mainExact===true&&p.heroExact===true&&p.heroSha256===hero&&p.catalogDate===meta.date&&p.catalogTitle===meta.title&&Date.parse(p.checkedAt)>=statSync(join(dir,'index.html')).mtimeMs;
    }catch{return false;}
   });
  }catch{return false;}
 }).map(p=>p.slug);
}
