// Compact, local source readiness only. This is not social delivery evidence.
import {readFileSync} from 'node:fs';import {join} from 'node:path';import {reviewedBlogState} from './reviewed-blog-ready.mjs';
export function batchInventory(root,today){
 const rows=[];let prepared=0;
 for(let offset=0;offset<7;offset++){
  const day=new Date(Date.parse(today+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10),path=join(root,'public/blog/research',day+'-queue.json');
  let posts=[];try{posts=JSON.parse(readFileSync(path,'utf8')).posts||[];}catch(error){if(error.code!=='ENOENT'){rows.push({day,error:'invalid queue'});continue;}}
  if(!Array.isArray(posts)){rows.push({day,error:'invalid posts list'});continue;}
  let invalid=0;
  const reviewed=posts.filter(p=>{try{return reviewedBlogState(root,p.slug,day,day).code===0;}catch{invalid++;return false;}}).length;
  prepared+=reviewed;rows.push({day,drafts:posts.length,reviewedForPlannedDate:reviewed,invalidEntries:invalid});
 }
 return {targetDays:7,targetArticles:28,reviewedForPlannedDates:prepared,missingToTarget:Math.max(0,28-prepared),days:rows,note:'Source hash checks only. Actual day/date, editorial holds, live publication and encoded release gates still apply.'};
}
