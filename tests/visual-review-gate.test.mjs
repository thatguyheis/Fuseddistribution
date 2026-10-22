import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';
import {assertVisualReview} from '../video/scripts/lib/visual-review.mjs';
test('visual gate rejects missing, blocked and stale review; accepts exact reviewed bytes',()=>{
 const root=mkdtempSync(join(tmpdir(),'visual-gate-')),dir=join(root,'video/out/test');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'test.mp4'),'reviewed-bytes');
 assert.throws(()=>assertVisualReview(root,'test'));
 const review={slug:'test',pass:false,reviewedAt:new Date().toISOString(),frames:['opening','middle','ending'],videoSha256:createHash('sha256').update('reviewed-bytes').digest('hex')};
 const save=()=>writeFileSync(join(dir,'visual-review.json'),JSON.stringify(review));save();assert.throws(()=>assertVisualReview(root,'test'));
 review.pass=true;save();assert.equal(assertVisualReview(root,'test').pass,true);
 writeFileSync(join(dir,'test.mp4'),'rerendered-bytes');assert.throws(()=>assertVisualReview(root,'test'));
});
