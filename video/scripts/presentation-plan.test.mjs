import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';import {stagePresentation} from './presentation-plan.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
function fixture(coin=true){
 const root=mkdtempSync(join(tmpdir(),'fused-presentation-')),slug='test',dir=join(root,'public/blog',slug);mkdirSync(dir,{recursive:true});if(coin)mkdirSync(join(root,'content/coin-history',slug),{recursive:true});
 const asset='public/blog/test/asset.jpg';writeFileSync(join(root,asset),'image-test');
 const plan={segments:[[{path:asset,sha256:digest('image-test'),type:'photo',weight:1,title:'Test',credit:'Owner photo',eyebrow:'Coin'}]]};
 const approve=()=>{const bytes=JSON.stringify(plan);writeFileSync(join(dir,'presentation-plan.json'),bytes);writeFileSync(join(dir,'qa.json'),JSON.stringify({artifactSha256:{'presentation-plan.json':digest(bytes)}}));};approve();return{root,slug,dir,plan,approve,asset};
}
test('stages approved shots without changing source bytes',()=>{const f=fixture(),p=stagePresentation(f.root,f.slug,1);assert.equal(p.presentation.segments[0][0].src,'presentations/test/scene-0-shot-0.jpg');assert.equal(readFileSync(join(f.root,'video/public',p.media[0].src),'utf8'),'image-test');});
test('preserves a full-frame composed closing card without duplicate titles',()=>{const f=fixture();f.plan.segments[0][0].fullFrame=true;f.approve();const p=stagePresentation(f.root,f.slug,1);assert.equal(p.presentation.segments[0][0].fullFrame,true);});
test('changed plan or source and missing scene fail closed',()=>{const f=fixture();assert.throws(()=>stagePresentation(f.root,f.slug,2));writeFileSync(join(f.root,f.asset),'changed');assert.throws(()=>stagePresentation(f.root,f.slug,1));f.plan.segments[0][0].weight=2;writeFileSync(join(f.dir,'presentation-plan.json'),JSON.stringify(f.plan));assert.throws(()=>stagePresentation(f.root,f.slug,1));});
test('even an approved plan cannot stage unrelated workspace files',()=>{const f=fixture();writeFileSync(join(f.root,'private.jpg'),'image-test');f.plan.segments[0][0].path='private.jpg';f.approve();assert.throws(()=>stagePresentation(f.root,f.slug,1));});

test('business presentation does not require an unrelated coin folder',()=>{const f=fixture(false);assert.equal(stagePresentation(f.root,f.slug,1).media[0].source,'reviewed-presentation');});

test('approved business profile carries 1080p safe-zone metadata into rendering',()=>{const f=fixture(false);f.plan.profile='business-growth-v1';f.plan.safeZones={width:1080,height:1920,captionBottomClearancePx:250,socialUiRightClearancePx:150};f.approve();const p=stagePresentation(f.root,f.slug,1);assert.equal(p.profile,'business-growth-v1');});

test('business profile cannot be used for coin history or missing safe-zone approval',()=>{const coin=fixture(true);coin.plan.profile='business-growth-v1';coin.plan.safeZones={width:1080,height:1920,captionBottomClearancePx:250,socialUiRightClearancePx:150};coin.approve();assert.throws(()=>stagePresentation(coin.root,coin.slug,1),/cannot be used for coin history/);const missing=fixture(false);missing.plan.profile='business-growth-v1';missing.plan.safeZones={width:1080,height:1920,captionBottomClearancePx:250,socialUiRightClearancePx:100};missing.approve();assert.throws(()=>stagePresentation(missing.root,missing.slug,1),/clearances/);});

test('read-only handoff validation rejects missing shot weights before staging',async()=>{
 const {validatePresentation}=await import('./presentation-plan.mjs');
 const f=fixture(false);delete f.plan.segments[0][0].weight;f.approve();
 assert.throws(()=>validatePresentation(f.root,f.slug,1),/positive weight/);
});
