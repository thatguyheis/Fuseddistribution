// A reviewed package is immutable input, even when its release is blocked.
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {assertEditorialDeployment} from './lib/editorial-deployment-gate.mjs';
export function reviewedBlogState(root,slug,day,today) {
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw Error('Invalid slug');
  const dir=join(root,'public/blog',slug),file=join(dir,'qa.json');
  if(!existsSync(file)) return {code:1,reason:'unreviewed'};
  let qa;try{qa=JSON.parse(readFileSync(file,'utf8'));}catch{return {code:2,reason:'invalid approval; owner review required'};}
  const automaticCoin=qa.mode==='coin-history-automated'&&qa.automaticApproval?.policy==='coin-history-auto-v1';
  if(qa.mode!=='codex-editorial'&&!automaticCoin)return {code:1,reason:'unreviewed'};
  try {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>today)throw Error('Future release is not due');
    if(existsSync(join(root,'.workflow-state/editorial-holds',slug+'.json')))throw Error('Editorial hold');
    assertEditorialDeployment(dir,slug);
    const meta=JSON.parse(readFileSync(join(dir,'meta.json'),'utf8'));
    if(meta.date!==today)throw Error('New publication date must match today; owner must reapprove missed release dates');
    return {code:0,reason:'reviewed and due'};
  }catch(error){return {code:2,reason:error.message};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date());
 if(args.queue){
   const pending=JSON.parse(readFileSync(args.queue,'utf8'));
   if(!Array.isArray(pending.remaining)||!pending.remaining.length)throw Error('Pending queue required');
   const needsModel=pending.remaining.some(slug=>reviewedBlogState(process.cwd(),slug,today,today).code===1);
   process.exit(needsModel?1:0);
 }
 const result=reviewedBlogState(process.cwd(),args.slug,args.day,today);console.log(JSON.stringify(result));process.exitCode=result.code;
}
