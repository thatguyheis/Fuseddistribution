#!/usr/bin/env node
// No model or Buffer calls. Plan from saved sent evidence; --deploy verifies and publishes panel-only deltas.
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { selectPublishedVideos, videoPanel, patchVideoPanel, hasPlayer, sha256, validSlug } from './lib/blog-video-reconciliation.mjs';
import { checkRenderedReelAudioRights } from '../video/scripts/audio-rights.mjs';
import { assertEditorialDeployment } from './lib/editorial-deployment-gate.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const baseline = join(root,'.workflow-state/deployment-baseline/public/blog');
const state = join(root,'.workflow-state/blog-video-reconciliation');
mkdirSync(state,{recursive:true});
const read = (path, fallback) => { try { return JSON.parse(readFileSync(path,'utf8')); } catch(e) { if(e.code==='ENOENT')return fallback; throw e; } };
const pointer=read(join(root,'ops/profit-system/buffer-metrics/latest.json'),{});
const snapshot=pointer.path ? read(join(root,pointer.path),{}) : {};
const videos=selectPublishedVideos(snapshot,read(join(root,'.buffer-youtube-scheduled.json'),{}));
const media=read(join(root,'.buffer-media-urls.json'),{});
const posts=read(join(baseline,'posts.json'),[]);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date());
const deploy=process.argv.includes('--deploy');
const checkExisting=deploy && process.argv.includes('--check-existing');
const result={checkedAt:new Date().toISOString(),articles:posts.length,existingPlayers:0,eligible:[],blocked:[],withoutPublishedVideo:[],deployed:[],verification:[]};
for(const post of posts) {
  const slug=post.slug;
  if(!validSlug(slug))continue;
  const html=readFileSync(join(baseline,slug,'index.html'),'utf8');
  let brokenUrl;
  if(hasPlayer(html)) {
    result.existingPlayers++;
    const source=html.match(/<!-- SOCIAL_VIDEO_START -->[\s\S]*?<source src="([^"]+)"/)?.[1];
    if(checkExisting && source) {
      const url=new URL(source,'https://fuseddistribution.com');
      if(url.origin==='https://fuseddistribution.com' && /^\/reels(?:-x)?\//.test(url.pathname)) {
        try { const response=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(15000)});if([404,410].includes(response.status))brokenUrl=url.href; }
        catch(error){result.blocked.push({slug,reason:`availability_unknown: ${error.message}`});}
      }
    }
    if(!brokenUrl)continue;
  }
  if(post.date>today || existsSync(join(root,'.workflow-state/editorial-holds',`${slug}.json`))) {result.blocked.push({slug,reason:'future_or_held_article'});continue;}
  let video=videos.get(slug);
  if(!video) {
    // Only a current, fully reviewed local encode can be used as a hosted fallback.
    const record=media[slug], dir=join(root,'video/out',slug);
    const release=read(join(dir,'release-qa.json'),{}), visual=read(join(dir,'visual-review.json'),{});
    const source=join(dir,`${slug}.mp4`), output=join(root,'public/reels',slug,`${slug}.mp4`);
    if(record && ['approved','no_music'].includes(record.sourceMusicRightsStatus) && release.pass===true && visual.pass===true && existsSync(source) && existsSync(output)
      && checkRenderedReelAudioRights(slug).ok && visual.videoSha256===sha256(readFileSync(source)) && record.outputBytes===readFileSync(output).length) {
      video={kind:'hosted',url:`https://fuseddistribution.com/reels/${slug}/${slug}.mp4`,provenance:'reviewed_hosted_encode',sha256:sha256(readFileSync(output))};
    }
  }
  if(!video && brokenUrl)video={kind:'unavailable',url:brokenUrl,provenance:'confirmed_missing_hosted_file'};
  if(!video){result.withoutPublishedVideo.push(slug);continue;}
  result.eligible.push({slug,title:post.title,video,beforeSha256:sha256(html)});
}
let locked=false;
let runDir;
const lock='/tmp/fused-blog-publisher.lock';
const writeReport=()=>{writeFileSync(join(state,'latest.json'),JSON.stringify(result,null,2)+'\n');};
try {
  if(deploy) {
    // Preserve a busy/unknown owner; the next daily pass resumes automatically.
    mkdirSync(lock);locked=true;writeFileSync(join(lock,'pid'),String(process.pid));
    runDir=join(state,new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(runDir,{recursive:true});
    // Recover a successful upload interrupted before live readback, or retry a failed deployment.
    const pending=read(join(state,'pending-deployment.json'),{slugs:[]});
    const changed=new Set(pending.slugs);
    for(const item of result.eligible) {
      try {
        const {slug,video}=item;
        if(video.kind==='youtube') {
          const response=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(video.url)}&format=json`,{signal:AbortSignal.timeout(15000)});
          if(!response.ok)throw new Error(`YouTube availability check HTTP ${response.status}`);
          const data=await response.json();if(data.provider_name!=='YouTube'||!String(data.html).includes(video.id))throw new Error('YouTube embed identity unverified');
        } else if(video.kind==='unavailable') {
          const response=await fetch(video.url,{method:'HEAD',signal:AbortSignal.timeout(15000)});
          if(![404,410].includes(response.status))throw new Error('Missing media status changed; preserve player for review');
        } else {
          const response=await fetch(video.url,{signal:AbortSignal.timeout(30000)});
          if(!response.ok||!response.headers.get('content-type')?.includes('video/mp4')||sha256(Buffer.from(await response.arrayBuffer()))!==video.sha256)throw new Error('Hosted bytes unverified');
        }
        const path=join(baseline,slug,'index.html'), old=readFileSync(path,'utf8');
        if(sha256(old)!==item.beforeSha256)throw new Error('Baseline changed during review');
        const panel=videoPanel(slug,item.title,video), next=patchVideoPanel(old,panel);
        copyFileSync(path,join(runDir,`${slug}.before.html`));
        let baselineApproved=false;
        try{assertEditorialDeployment(join(baseline,slug),slug);baselineApproved=true;}catch{}
        // Persist retry intent BEFORE modifying the deployment baseline.
        changed.add(slug);writeFileSync(join(state,'pending-deployment.json'),JSON.stringify({slugs:[...changed]},null,2)+'\n');
        writeFileSync(path,next);
        if(baselineApproved) {
          const qaPath=join(baseline,slug,'qa.json');const qa=read(qaPath);
          copyFileSync(qaPath,join(runDir,`${slug}.baseline.qa.before.json`));
          qa.artifactSha256['index.html']=sha256(next);
          qa.review_notes=[...(Array.isArray(qa.review_notes)?qa.review_notes:[qa.review_notes]),`Scoped companion panel only verified ${today}; article prose preserved. Evidence ${runDir}.`];
          writeFileSync(qaPath,JSON.stringify(qa,null,2)+'\n');
        }
        const local=join(root,'public/blog',slug);let approved=false;
        try{assertEditorialDeployment(local,slug);approved=true;}catch{}
        const localHtml=readFileSync(join(local,'index.html'),'utf8');
        copyFileSync(join(local,'index.html'),join(runDir,`${slug}.local.before.html`));
        const localNext=patchVideoPanel(localHtml,panel);writeFileSync(join(local,'index.html'),localNext);
        const social={version:1,updatedAt:new Date().toISOString(),primaryVideo:video.kind==='hosted'?{url:video.url}:null,platforms:video.kind==='youtube'?{youtube:{url:video.url,sentAt:video.sentAt}}:{}};
        writeFileSync(join(local,'social-video.json'),JSON.stringify(social,null,2)+'\n');
        copyFileSync(join(local,'social-video.json'),join(baseline,slug,'social-video.json'));
        if(approved) {
          const qa=read(join(local,'qa.json'));copyFileSync(join(local,'qa.json'),join(runDir,`${slug}.qa.before.json`));
          qa.artifactSha256['index.html']=sha256(localNext);
          qa.review_notes = [
            ...(Array.isArray(qa.review_notes) ? qa.review_notes : qa.review_notes ? [qa.review_notes] : []),
            `Video panel only reviewed ${today}: verified exact companion identity and preserved article content. Evidence ${runDir}.`,
          ];
          writeFileSync(join(local,'qa.json'),JSON.stringify(qa,null,2)+'\n');
        }
        item.afterSha256=sha256(next);item.status='panel_delta_reviewed';
      }catch(error){item.status='blocked';result.blocked.push({slug:item.slug,reason:error.message});}
    }
    writeReport();
    if(changed.size) {
      if(!pending.uploaded || result.eligible.some(item=>item.status==='panel_delta_reviewed')) {
        const deployed=spawnSync(process.execPath,['scripts/deploy-approved-blog.mjs'],{cwd:root,stdio:'inherit'});
        if(deployed.status!==0)throw new Error('Scoped baseline deployment failed; pending intent retained');
      }
      writeFileSync(join(state,'pending-deployment.json'),JSON.stringify({slugs:[...changed],uploaded:true},null,2)+'\n');
      for(const slug of changed) {
        const response=await fetch(`https://fuseddistribution.com/blog/${slug}/`,{signal:AbortSignal.timeout(20000)});
        const html=await response.text();const expected=readFileSync(join(baseline,slug,'index.html'),'utf8');
        const main=s=>s.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
        const pass=response.ok&&!!main(expected)&&main(html)===main(expected);
        result.verification.push({slug,pass,httpStatus:response.status});if(pass)result.deployed.push(slug);
      }
      const failed=[...changed].filter(s=>!result.deployed.includes(s));
      writeFileSync(join(state,'pending-deployment.json'),JSON.stringify({slugs:failed,uploaded:true},null,2)+'\n');
      if(failed.length)throw new Error(`${failed.length} live pages failed exact main-content verification`);
    }
  }
}catch(error){result.error=error.message;process.exitCode=1;}
finally{
  if(locked)renameSync(lock,`${lock}.finished.video-panels.${Date.now()}`);
  writeReport();
  if(runDir)writeFileSync(join(runDir,'report.json'),JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify({articles:result.articles,existingPlayers:result.existingPlayers,eligible:result.eligible.length,blocked:result.blocked.length,withoutPublishedVideo:result.withoutPublishedVideo.length,deployed:result.deployed.length,error:result.error,report:join(state,'latest.json')}));
