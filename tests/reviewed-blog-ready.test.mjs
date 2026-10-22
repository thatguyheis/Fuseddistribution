import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';
import {reviewedBlogState} from '../scripts/reviewed-blog-ready.mjs';
function fixture(date='2026-10-05'){
 const root=mkdtempSync(join(tmpdir(),'prepared-blog-')),dir=join(root,'public/blog/example');mkdirSync(dir,{recursive:true});
 const qa={slug:'example',pass:true,score:90,blockers:[],mode:'codex-editorial',reviewed_at:'2026-10-04T10:00:00Z',review_notes:['Reviewed'],artifactSha256:{}};
 for(const f of ['verified.md','index.html','meta.json','research.json','hero.jpg','photo-post.jpg','reel-script.md','reel-data.md','social-copy.json']){let bytes=f==='meta.json'?JSON.stringify({date}):'approved';writeFileSync(join(dir,f),bytes);qa.artifactSha256[f]=createHash('sha256').update(bytes).digest('hex');}
 writeFileSync(join(dir,'qa.json'),JSON.stringify(qa));return {root,dir};
}
test('reviewed due package is reusable without a model',()=>{const {root}=fixture();assert.equal(reviewedBlogState(root,'example','2026-10-05','2026-10-05').code,0)});
test('future and missed publication dates require owner, never premature publication or silent backdating',()=>{for(const d of ['2026-10-04','2026-10-06']){const {root}=fixture(d);assert.equal(reviewedBlogState(root,'example',d,'2026-10-05').code,2)}});
test('hash drift and holds cannot turn approved inventory into a generation fallback',()=>{const {root,dir}=fixture();writeFileSync(join(dir,'reel-script.md'),'changed');assert.equal(reviewedBlogState(root,'example','2026-10-05','2026-10-05').code,2);const b=fixture();mkdirSync(join(b.root,'.workflow-state/editorial-holds'),{recursive:true});writeFileSync(join(b.root,'.workflow-state/editorial-holds/example.json'),'{}');assert.equal(reviewedBlogState(b.root,'example','2026-10-05','2026-10-05').code,2)});
test('idle watchdog exits before any runtime probe',()=>{const s=readFileSync('scripts/ollama-publisher-watchdog.sh','utf8');const block=s.slice(s.indexOf('# Idle ticks'),s.indexOf('if ! healthy &&'));assert.match(block,/exit 0/);assert.doesNotMatch(block,/probe_model|publishing-health|curl/)});

import {batchInventory} from '../scripts/batch-inventory.mjs';
test('inventory reports malformed queue entries without hiding the remaining dates',()=>{const {root}=fixture();const dir=join(root,'public/blog/research');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'2026-10-05-queue.json'),JSON.stringify({posts:[{slug:'../unsafe'}]}));writeFileSync(join(dir,'2026-10-06-queue.json'),JSON.stringify({posts:{bad:'shape'}}));const result=batchInventory(root,'2026-10-05');assert.equal(result.days.length,7);assert.equal(result.days[0].invalidEntries,1);assert.equal(result.days[1].error,'invalid posts list');assert.equal(result.reviewedForPlannedDates,0)});
