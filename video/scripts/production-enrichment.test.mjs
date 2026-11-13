import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateEnrichmentPlan, prepareEnrichment, endingCaptionErrors, probeSoundCue} from './production-enrichment.mjs';

const plan = () => ({version:1, graphics:[{segmentIndex:1,kind:'flow',title:'Check the output',source:'Illustrative workflow',takeaway:'Review before publishing',rows:[{label:'Render',detail:'Inspect the MP4'},{label:'Publish',detail:'Read back the post ID'}]}], soundEffects:[1,2].map(segmentIndex=>({segmentIndex,file:'approved.mp3',purpose:'Mark a verified step',sourceStartSeconds:0,durationSeconds:0.4}))});
test('actual decoder rejects silent excerpts and measures audible excerpts', () => {
  const root=mkdtempSync(join(tmpdir(),'sound-cue-'));
  const file=join(root,'cue.wav');
  const wav=Buffer.alloc(44+16000);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
  const cue={file:'cue.wav',sourceStartSeconds:0,durationSeconds:0.4};
  try {
    writeFileSync(file,wav);
    assert.throws(()=>probeSoundCue(file,cue),/silent, inaudible or undecodable/);
    for(let i=0;i<8000;i++)wav.writeInt16LE(Math.round(10000*Math.sin(i*2*Math.PI*440/16000)),44+i*2);
    writeFileSync(file,wav);
    assert.ok(probeSoundCue(file,cue).mean>-20);
  } finally {rmSync(root,{recursive:true,force:true});}
});
test('missing enrichment and invented chart structure block before rendering', () => {
  assert.throws(()=>validateEnrichmentPlan({},4),/Enrichment requires/);
  const data=plan(); data.graphics[0].kind='bar';
  assert.throws(()=>validateEnrichmentPlan(data,4),/Invalid graphic row/);
  data.graphics[0].rows.forEach(row=>row.value=1);
  assert.throws(()=>validateEnrichmentPlan(data,4),/unit, period/);
  assert.equal(validateEnrichmentPlan(plan(),4).graphics.length,1);
});
test('ending coverage cannot approve hallucinated words after the CTA', () => {
  const script={segments:[{narration:'Comment hook, checklist or demo.'}]};
  assert.deepEqual(endingCaptionErrors(script,{0:[{text:'Comment hook, checklist or demo.'}]}),[]);
  assert.match(endingCaptionErrors(script,{0:[{text:'Comment hook, checklist or demo. Oh my God.'}]}).join(),/oh, my, god/);
});
test('sound staging and release reject changed files and stale editorial approvals', () => {
  const root=mkdtempSync(join(tmpdir(),'enrichment-'));
  const put=(path,bytes)=>{mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),bytes);};
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  try {
    const bytes=JSON.stringify(plan());
    put('public/blog/example/enrichment-plan.json',bytes);
    put('public/blog/example/qa.json',JSON.stringify({artifactSha256:{'enrichment-plan.json':hash(bytes)}}));
    put('video/private-audio/approved.mp3','approved audio');
    put('video/data/evidence.json','{}');
    put('video/data/sound-effects-rights.json',JSON.stringify({effects:{'approved.mp3':{status:'approved',integratedLufs:-14,durationSeconds:2,allowedPlatforms:['youtube','instagram','x','facebook','website'],sha256:hash('approved audio'),privatePath:'video/private-audio/approved.mp3',licenseEvidence:'video/data/evidence.json'}}}));
    const prepared=prepareEnrichment(root,'example',4,{probe:()=>({mean:-14,peak:-5})});
    assert.ok(prepared.soundEffects[0].gain<0.15);
    assert.deepEqual(prepareEnrichment(root,'example',4,{stage:false,probe:()=>({mean:-14,peak:-5})}),prepared);
    put('video/public/sfx/approved.mp3','changed');
    assert.throws(()=>prepareEnrichment(root,'example',4,{stage:false,probe:()=>({mean:-14,peak:-5})}),/Staged sound changed/);
    put('public/blog/example/enrichment-plan.json',bytes+' ');
    assert.throws(()=>prepareEnrichment(root,'example',4,{probe:()=>({mean:-14,peak:-5})}),/editorial approval/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('visual v2 requires varied explanatory graphics and truthful pie structure',()=>{
 const data=plan();data.visualQualityVersion=2;
 assert.throws(()=>validateEnrichmentPlan(data,5),/two explanatory graphics/);
 data.graphics.push({...structuredClone(data.graphics[0]),segmentIndex:2,kind:'pie',unit:'checks',unitSingular:'check',period:'Example checklist',rows:[{label:'Message',detail:'Two checks',value:2},{label:'Action',detail:'One check',value:1}]});
 assert.equal(validateEnrichmentPlan(data,5).graphics.length,2);
 data.graphics[1].unit='%';assert.throws(()=>validateEnrichmentPlan(data,5),/total 100/);
 data.graphics[1].rows[0].value=60;data.graphics[1].rows[1].value=40;
 assert.doesNotThrow(()=>validateEnrichmentPlan(data,5));
});

test('new counted charts cannot export grammatically incorrect singular unit labels',()=>{
 const data=plan();data.visualQualityVersion=2;
 data.graphics.push({segmentIndex:2,kind:'bar',title:'Example prompt fields',unit:'fields',period:'Two examples',source:'Counted illustrative examples',takeaway:'Counts inputs, not outcomes',rows:[{label:'Topic only',detail:'One input',value:1},{label:'Brief',detail:'Four inputs',value:4}]});
 assert.throws(()=>validateEnrichmentPlan(data,5),/unitSingular/);
 data.graphics[1].unitSingular='field';assert.doesNotThrow(()=>validateEnrichmentPlan(data,5));
});
