#!/usr/bin/env node
// Read-only production requests. This command cannot deploy or change site files.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validSlug } from './lib/blog-video-reconciliation.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const directory=join(root,'.workflow-state/blog-video-reconciliation');
const pending=JSON.parse(readFileSync(join(directory,'pending-deployment.json'),'utf8'));
if(pending.uploaded!==true)throw new Error('No confirmed uploaded repair is pending verification');
const report=JSON.parse(readFileSync(join(directory,'latest.json'),'utf8'));
const main=html=>html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
const checks=[];
for(const slug of pending.slugs){
  if(!validSlug(slug))throw new Error('Invalid pending article slug');
  try{
    const response=await fetch(`https://fuseddistribution.com/blog/${slug}/`,{signal:AbortSignal.timeout(20000)});
    const html=await response.text();
    const expected=readFileSync(join(root,'.workflow-state/deployment-baseline/public/blog',slug,'index.html'),'utf8');
    checks.push({slug,pass:response.ok&&!!main(expected)&&main(html)===main(expected),httpStatus:response.status});
  }catch(error){checks.push({slug,pass:false,error:error.message});}
}
const failed=checks.filter(row=>!row.pass).map(row=>row.slug);
report.checkedAt=new Date().toISOString();
report.verification=[...(report.verification||[]).filter(row=>!pending.slugs.includes(row.slug)),...checks];
report.deployed=[...new Set([...(report.deployed||[]),...checks.filter(row=>row.pass).map(row=>row.slug)])];
report.error=failed.length?`${failed.length} pages remain unverified`:null;
writeFileSync(join(directory,'latest.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(directory,'pending-deployment.json'),JSON.stringify({slugs:failed,uploaded:true},null,2)+'\n');
console.log(JSON.stringify({checked:checks.length,passed:checks.length-failed.length,failed,productionWrites:0}));
process.exitCode=failed.length?1:0;
