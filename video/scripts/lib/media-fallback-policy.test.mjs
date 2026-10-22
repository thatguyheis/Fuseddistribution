import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,utimesSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {recoverFailedSegment} from './media-fallback-policy.mjs';
import {parseMediaQueries} from '../fetch-media.mjs';
function fixture() {
 const root=mkdtempSync(join(tmpdir(),'reel-fallback-'));const slug='sample-reel';
 for(const dir of ['video/out/','video/public/photos/','public/blog/'])mkdirSync(join(root,dir,slug),{recursive:true});
 const data=join(root,'public/blog',slug,'reel-data.md');const manifest=join(root,'video/out',slug,'media.json');
 writeFileSync(data,'# Reel\ntopic: tech\n\n## media_queries\n- segment: 3\n  query: "team"\n  prefer: video\n\n## question\nKeep this unchanged.\n');
 writeFileSync(manifest,JSON.stringify({1:{type:'video',src:`videos/${slug}/segment-1.mp4`,source:'pexels-video'}}));
 const bytes=Buffer.alloc(2000);bytes[0]=255;bytes[1]=216;writeFileSync(join(root,'video/public/photos',slug,'segment-1.jpg'),bytes);
 const logPath=join(root,'attempt.log');writeFileSync(logPath,`audio cache valid\n Error A delayRender() "Rendering <Html5Video /> with src="/public/videos/${slug}/segment-1.mp4" at time 0" was called but not cleared after 28000ms.\n`);
 return {root,slug,logPath,startedAt:Date.now()-1000,data,manifest};
}
test('real timeout becomes parser-recognized photo override and preserves provenance and other queries',()=>{
 const f=fixture();const original=readFileSync(f.manifest,'utf8');const r=recoverFailedSegment(f);assert.equal(r.recovered,true);
 const data=readFileSync(f.data,'utf8');const q=parseMediaQueries(data);assert.equal(q[1].prefer,'photo');assert.equal(q[3].prefer,'video');assert.ok(data.endsWith('## question\nKeep this unchanged.\n'));assert.equal(readFileSync(f.manifest,'utf8'),original);assert.equal(readFileSync(join(r.proofDir,'media.original.json'),'utf8'),original);assert.equal(recoverFailedSegment(f).reason,'retry-already-used');
});
test('reject stale, unrelated, audio-only, and manifest mismatches without changing reel data',()=>{
 for(const kind of ['stale','other','audio','manifest']){
 const f=fixture();const before=readFileSync(f.data,'utf8');
 if(kind==='stale')utimesSync(f.logPath,new Date(0),new Date(0));
 if(kind==='other')writeFileSync(f.logPath,readFileSync(f.logPath,'utf8').replaceAll(f.slug,'other-reel'));
 if(kind==='audio')writeFileSync(f.logPath,'audio generation timeout');
 if(kind==='manifest')writeFileSync(f.manifest,'{}');
 assert.equal(recoverFailedSegment(f).recovered,false,kind);assert.equal(readFileSync(f.data,'utf8'),before);
 }
});
