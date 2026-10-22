#!/usr/bin/env node
import {readFileSync,writeFileSync,readdirSync,existsSync,statSync,mkdirSync,renameSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertVisualReview} from '../video/scripts/lib/visual-review.mjs';
import {assertApprovedSources} from '../video/scripts/approved-sources.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=(path,fallback={})=>{try{return JSON.parse(readFileSync(path));}catch{return fallback;}};
export function classifyReel({sourceApproved,rendered,reviewCurrent,review,release,repair}) {
  if(!sourceApproved)return 'source_repair';
  if(!rendered)return 'render_required';
  // A repaired candidate must be inspected; old repair requests cannot override
  // a current hash-bound approval of the replacement video.
  if(reviewCurrent)return release?.readyForPosting===true?'distribution_handoff':'release_checks';
  if(repair?.stage==='opening_hero_repair_required')return 'opening_hero_repair';
  if(review?.pass===false||repair?.stage==='media_repair_required')return 'media_repair';
  return 'visual_review';
}
const actions={
  waiting_repost_window:'Already scheduled or within the seven day repost window on every channel; advance other items.',
  source_repair:'Repair named source/hash failure and renew editorial approval before rendering.',
  render_required:'Use the existing sequential renderer when its locks are free; reuse narration.',
  opening_hero_repair:'Restore the approved hero at frame zero, preserve audio/timing, inspect repaired candidate before promotion.',
  media_repair:'Replace the specific unrelated scene with a topic-specific graphic; preserve narration, then inspect the new encoded file.',
  visual_review:'Inspect encoded first frame, every scene and ending; decode fully and record exact MP4 hash. Never auto-approve.',
  release_checks:'Run release and caption checks against the current visually approved output.',
  distribution_handoff:'Check per-channel duplicate/cooldown eligibility; prepare only changed derivatives, verify hosted bytes, then use the shared Buffer runner toward nine/channel.'
};
export function buildBacklog(base=root) {
  const state=join(base,'.workflow-state'),out=join(base,'video/out');
  const prior=read(join(state,'reel-backlog/current.json'),{items:[]});
  const repairs=new Map();
  for(const file of ['social-refill-2026-10-12/opening-repair-queue.json','sop-fixes-2026-10-09/visual-review-queue.json']) {
    for(const item of read(join(state,file),{items:[]}).items||[])repairs.set(item.slug,{...item,source:file});
  }
  const known=new Set([...repairs.keys(),...prior.items.map(i=>i.slug)]);
  const catalog=read(join(base,'public/blog/posts.json'),[]);
  // New blog companions automatically enter the same queue; keep known repairs
  // even as the rolling recent-publication window advances.
  for(const post of [...catalog].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,32))known.add(post.slug);
  if(existsSync(out))for(const folder of readdirSync(out)) {
    const review=read(join(out,folder,'visual-review.json'));
    if(review.pass===false)known.add(folder);
  }
  const previous=new Map(prior.items.map(i=>[i.slug,i]));
  const history=Object.fromEntries(['youtube','x','instagram'].map(name=>[name,read(join(base,`.buffer-${name}-scheduled.json`),{scheduled:[]}).scheduled||[]]));
  const items=[];
  for(const slug of known) {
    if(!/^[a-z0-9-]+$/.test(slug))continue;
    const dir=join(out,slug),video=join(dir,slug+'.mp4');
    let sourceApproved=true,sourceError=null,reviewCurrent=false;
    try{assertApprovedSources(base,slug);}catch(error){sourceApproved=false;sourceError=error.message;}
    try{assertVisualReview(base,slug);reviewCurrent=true;}catch{}
    const review=read(join(dir,'visual-review.json')),release=read(join(dir,'release-qa.json')),repair=repairs.get(slug);
    let stage=classifyReel({sourceApproved,rendered:existsSync(video),reviewCurrent,review,release,repair});
    const eligibleChannels=Object.entries(history).filter(([,rows])=>!rows.some(row=>row.slug===slug&&(['scheduled','sending'].includes(row.status)||(row.status==='sent'&&Date.parse(row.sentAt||row.dueAt)>Date.now()-7*86400000)))).map(([name])=>name);
    if(stage==='distribution_handoff'&&!eligibleChannels.length)stage='waiting_repost_window';
    const old=previous.get(slug),now=new Date().toISOString();
    items.push({slug,stage,eligibleChannels,firstSeenAt:old?.firstSeenAt||now,stageChangedAt:old?.stage===stage?old.stageChangedAt:now,
      reason:sourceError||(!reviewCurrent&&(repair?.reason||repair?.nextAction))||null,
      nextAction:actions[stage],repairSource:repair?.source||null,
      evidence:{sourceApproved,reviewCurrent,releaseReady:release.readyForPosting===true,videoModifiedAt:existsSync(video)?statSync(video).mtime.toISOString():null}});
  }
  const rank={distribution_handoff:0,release_checks:1,visual_review:2,opening_hero_repair:3,media_repair:4,render_required:5,source_repair:6,waiting_repost_window:7};
  const priority=item=>item.stage==='waiting_repost_window'?99:item.repairSource?0:rank[item.stage]+1;
  items.sort((a,b)=>priority(a)-priority(b)||a.firstSeenAt.localeCompare(b.firstSeenAt)||a.slug.localeCompare(b.slug));
  const buffer=read(join(state,'buffer-latest-status.json'));
  const channels={youtube:'6a3e63375ab6d2f1067461b2',x:'6a3e73fb5ab6d2f10674b516',instagram:'6a67c5d64b2d03035f4f0228'};
  const counts=Object.fromEntries(Object.entries(channels).map(([name,id])=>[name,(buffer.posts||[]).filter(p=>p.channelId===id&&['scheduled','sending'].includes(p.status)).length]));
  return {checkedAt:new Date().toISOString(),targetPerChannel:9,countsAsOf:buffer.checkedAt||null,countsAreSavedEvidence:true,channelCounts:counts,
    channelDeficits:Object.fromEntries(Object.entries(counts).map(([name,count])=>[name,Math.max(0,9-count)])),
    stageCounts:items.reduce((acc,item)=>(acc[item.stage]=(acc[item.stage]||0)+1,acc),{}),items,
    rule:'Advance at least two named reel items per owner pass while any channel is below nine. Continue after success; active locks defer only conflicting work. Distribution handoff is not hosted, scheduled or sent proof.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=buildBacklog();
  if(process.argv.includes('--write')) {
    const dir=join(root,'.workflow-state/reel-backlog');mkdirSync(dir,{recursive:true});
    const temp=join(dir,`current.${process.pid}.json`);writeFileSync(temp,JSON.stringify(result,null,2)+'\n');renameSync(temp,join(dir,'current.json'));
  }
  console.log(JSON.stringify(process.argv.includes('--summary')?{...result,items:result.items.slice(0,12)}:result,null,2));
}
