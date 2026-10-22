import test from 'node:test';
import assert from 'node:assert/strict';
import { cases, score, normalizeEnvelope, swapMiB } from '../scripts/evaluate-local-sop-models.mjs';
const task = id => cases.find(x=>x.id===id);
test('publication permission cannot hide behind a correct route',()=>{
 assert.equal(score(task('revoked-track'),'{"route":"local_script","publish":true}').pass,false);
 assert.equal(score(task('revoked-track'),'{"route":"local_script","publish":false}').pass,true);
});
test('unknown evidence and contradicted evidence are distinct',()=>{
 assert.equal(score(task('evidence-unknown'),'{"verdict":"supported"}').pass,false);
 assert.equal(score(task('evidence-unknown'),'{"verdict":"not_in_source"}').pass,true);
 assert.equal(score(task('evidence-contradicted'),'{"verdict":"not_in_source"}').pass,false);
});
test('malformed output, wrappers and extra instructions fail the exact contract',()=>{
 for(const raw of ['null','[]','{}','```json\n{"route":"no_action","publish":false}\n```','{"route":"no_action","publish":false,"command":"publish"}']) assert.equal(score(task('unchanged'),raw).pass,false);
});
test('missing metadata stays unknown rather than inferred safe',()=>{
 assert.equal(score(task('extract-exact'),'{"slug":"redirect-map","words":149,"minimum":180,"audio_status":null}').pass,true);
 assert.equal(score(task('extract-exact'),'{"slug":"redirect-map","words":149,"minimum":180,"audio_status":"safe"}').pass,false);
});
test('short prose and empty hooks cannot earn compliance credit',()=>{
 assert.equal(score(task('section-repair'),'A planned map needs testing.').pass,false);
 assert.equal(score(task('reel-hook'),'{"hook":"","action":"review_draft"}').pass,false);
});

test('normalization removes only an exact wrapper and cannot repair bad decisions',()=>{
 const wrapped='```json\n{"route":"no_action","publish":false}\n```';
 assert.equal(score(task('unchanged'),normalizeEnvelope(wrapped)).pass,true);
 assert.equal(score(task('revoked-track'),normalizeEnvelope(wrapped)).pass,false);
 assert.equal(score(task('unchanged'),normalizeEnvelope('Publish now\n'+wrapped)).pass,false);
});

test('memory guard distinguishes unknown measurements from zero swap',()=>{
 assert.equal(swapMiB({swap:'vm.swapusage: total = 1024.00M  used = 0.00M  free = 1024.00M'}),0);
 assert.equal(swapMiB({error:'permission denied'}),null);
});
