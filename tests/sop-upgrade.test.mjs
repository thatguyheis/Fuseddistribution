import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {assertApprovedSources} from '../video/scripts/approved-sources.mjs';
import {channelPriority,boundedSentHistory} from '../public/blog/scripts/lib/buffer-scheduling-policy.mjs';
import {remainingBufferRequests} from '../public/blog/scripts/lib/buffer-request-budget.mjs';

test('input changes release publisher blocks; unchanged quality failures do not retry',()=>{
const r=spawnSync('python3',['-c',`import importlib.util
s=importlib.util.spec_from_file_location('policy','scripts/publisher-retry-policy.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
ok,state=m.decide({},'a','block','quality_failed');assert not ok
for _ in range(5):
 ok,state=m.decide(state,'a','transient');assert not ok
ok,state=m.decide(state,'b','check');assert ok
for expected in [True,True,False,False]:
 ok,state=m.decide(state,'b','transient');assert ok==expected
`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
test('TTS circuit persists two failures and opens only after runtime change or measured success',()=>{
const r=spawnSync('python3',['-c',`import importlib.util
s=importlib.util.spec_from_file_location('circuit','scripts/tts-circuit.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
a=m.transition({},'runtime','failure');assert not a['blocked']
a=m.transition(a,'runtime','failure');assert a['blocked']
assert m.transition(a,'runtime','check')['blocked']
assert not m.transition(a,'new-runtime','check')['blocked']
assert not m.transition(a,'runtime','success')['blocked']
`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
test('topic selector excludes published and reserved work and varies categories',()=>{
const r=spawnSync('python3',['-c',`import importlib.util
s=importlib.util.spec_from_file_location('topics','scripts/topic-inventory.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
pool={'topics':[{'brand':'silver','keyword':k,'category':c,'status':'editorial-seed-reviewed'} for k,c in [('one','a'),('two','a'),('three','b'),('four','c'),('four','c')]]}
a=m.inventory(pool,[{'slug':'one'}],[{'posts':[{'slug':'two'}]}]);assert len(a['silver'])==2
chosen=m.select_topics(a['silver']);assert [t['slug'] for t in chosen]==['three','four']
`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
test('render repairs touch staged JSON only; drifted approved source is rejected',()=>{
const root=mkdtempSync(join(tmpdir(),'sop-source-'));const slug='source-test';const dir=join(root,'public/blog',slug),out=join(root,'video/out',slug);mkdirSync(dir,{recursive:true});mkdirSync(out,{recursive:true});
const names=['verified.md','index.html','meta.json','research.json','hero.jpg','photo-post.jpg','reel-script.md','reel-data.md','social-copy.json'];const hashes={};for(const n of names){const value=`source — ${n}\n`;writeFileSync(join(dir,n),value);hashes[n]=createHash('sha256').update(value).digest('hex');}
writeFileSync(join(dir,'qa.json'),JSON.stringify({pass:true,mode:'codex-editorial',score:90,artifactSha256:hashes}));writeFileSync(join(out,'script.json'),JSON.stringify({segments:[{type:'stat',text:'No figure',narration:'US customers need details',startSec:0,endSec:1}]}));
const before=readFileSync(join(dir,'reel-script.md'),'utf8');const r=spawnSync(process.execPath,['video/scripts/repair-reel-scripts.mjs',`--root=${root}`,`--slug=${slug}`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(readFileSync(join(out,'script.json'))).segments[0].type,'overlay');assert.equal(readFileSync(join(dir,'reel-script.md'),'utf8'),before);assert.doesNotThrow(()=>assertApprovedSources(root,slug));writeFileSync(join(dir,'reel-data.md'),'changed');assert.throws(()=>assertApprovedSources(root,slug),/Approved source changed/);
});
test('largest channel deficit goes first and equal channels do not always favor YouTube',()=>{
const channels={youtube:{deficit:0,scheduledToday:4},x:{deficit:1,scheduledToday:2},instagram:{deficit:3,scheduledToday:0}};assert.deepEqual(channelPriority({channels},29),['instagram','x','youtube']);assert.equal(channelPriority({channels:{}},29)[0],'instagram');
});
test('history stops before consuming the twelve-request scheduling reserve',async()=>{
let remaining=14,calls=0;const r=await boundedSentHistory(async()=>{remaining--;calls++;return {posts:[{id:String(calls)}],pageInfo:{hasNextPage:true,endCursor:String(calls)}}},()=>remaining,{maxPages:8});assert.equal(calls,2);assert.equal(r.complete,false);assert.equal(r.posts.length,2);assert.equal(remaining,12);
});
test('bounded history never treats unobserved records as delivered',async()=>{
let calls=0;const r=await boundedSentHistory(async()=>{calls++;return{}},()=>12);assert.equal(calls,0);assert.deepEqual(r.posts,[]);assert.equal(r.complete,false);
});
test('remaining request capacity honors the tightest rolling window',()=>{
const path=join(mkdtempSync(join(tmpdir(),'sop-budget-')),'budget.json');writeFileSync(path,JSON.stringify({requests:[901,950,999]}));assert.equal(remainingBufferRequests(path,1000,[{milliseconds:100,limit:4},{milliseconds:1000,limit:3}]),0);
});

test('publisher missing-queue path records a block without requesting a retry',()=>{
const source=readFileSync('scripts/daily-blog-reel.sh','utf8');const start=source.indexOf('if ! $QUEUE_MODE &&');const block=source.slice(start,source.indexOf('\nfi',start)+3);const dir=mkdtempSync(join(tmpdir(),'sop-no-queue-'));
const harness=`PROJECT_DIR="$1"; LOG_FILE="$1/log"; TODAY=2026-09-29; QUEUE_MODE=false; HERMES_TAKEOVER=1; CLAUDE_ENABLED=0\nnotify(){ :; }\npython3(){ print "$*" >> "$1-unused"; return 1; }\nschedule_retry(){ exit 88; }\n${block}`;
// Replace the harmless policy stand-in so it records only in the fixture.
const run=harness.replace('print "$*" >> "$1-unused"','print "$*" >> "$PROJECT_DIR/policy"');const result=spawnSync('/bin/zsh',['-c',run,'test',dir],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(readFileSync(join(dir,'policy'),'utf8'),/block 2026-09-29 --reason missing_approved_queue/);
});
test('exhaustion saves a dated blocked plan and replenishment preserves it in history',()=>{
const root=mkdtempSync(join(tmpdir(),'sop-topic-pool-'));mkdirSync(join(root,'public/blog/data'),{recursive:true});mkdirSync(join(root,'public/blog/research'),{recursive:true});writeFileSync(join(root,'public/blog/posts.json'),'[]');const pool=join(root,'public/blog/data/topic-pool.json');writeFileSync(pool,JSON.stringify({minimumUnusedPerBrand:14,topics:[]}));
const run=args=>spawnSync('python3',['scripts/topic-inventory.py','--root',root,'--date','2026-09-29',...args],{encoding:'utf8'});assert.equal(run(['--select','silver']).status,1);const path=join(root,'public/blog/research/2026-09-29-plan.json');assert.equal(JSON.parse(readFileSync(path)).status,'topic_inventory_blocked');
writeFileSync(pool,JSON.stringify({minimumUnusedPerBrand:14,topics:['silver','tech'].flatMap(brand=>[1,2].map(n=>({brand,keyword:`${brand} ${n}`,category:`c${n}`})))}));assert.equal(run(['--unblock']).status,0);assert.equal(run(['--plan']).status,0);assert.equal(JSON.parse(readFileSync(path)).posts.length,4);
});

test('a measured TTS hold survives cosmetic runtime changes until supervised success',()=>{
const r=spawnSync('python3',['-c',`import importlib.util
s=importlib.util.spec_from_file_location('circuit','scripts/tts-circuit.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
a=m.transition({},'old','hold');assert a['blocked']
a=m.transition(a,'new','check');assert a['blocked']
assert not m.transition(a,'new','success')['blocked']
`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
test('narration timeouts cannot be disabled by a zero or invalid setting',async()=>{
const {boundedTtsTimeout}=await import('../video/scripts/generate-audio.mjs');assert.equal(boundedTtsTimeout(1800000,true),300000);assert.equal(boundedTtsTimeout(1800000,false),600000);assert.throws(()=>boundedTtsTimeout(0),/Invalid/);assert.throws(()=>boundedTtsTimeout(NaN),/Invalid/);
});
test('posting preflight leaves capacity for both creation and readback',async()=>{
const {requireBufferRequestCapacity}=await import('../public/blog/scripts/lib/buffer-request-budget.mjs');const path=join(mkdtempSync(join(tmpdir(),'sop-two-requests-')),'budget.json');const now=1000000;
writeFileSync(path,JSON.stringify({requests:Array(79).fill(now-1)}));assert.throws(()=>requireBufferRequestCapacity(path,2,now),/retryAt=/);writeFileSync(path,JSON.stringify({requests:Array(78).fill(now-1)}));assert.doesNotThrow(()=>requireBufferRequestCapacity(path,2,now));assert.equal(JSON.parse(readFileSync(path)).requests.length,78);
});

test('analytics cannot consume the protected posting request reserve',async()=>{
const {reserveBufferRequest}=await import('../public/blog/scripts/lib/buffer-request-budget.mjs');const path=join(mkdtempSync(join(tmpdir(),'sop-reserve-')),'budget.json');const options={now:1000,windows:[{milliseconds:10000,limit:3}],reserve:2};reserveBufferRequest(path,options);assert.throws(()=>reserveBufferRequest(path,options),/budget exhausted/);assert.equal(JSON.parse(readFileSync(path)).requests.length,1);assert.doesNotThrow(()=>reserveBufferRequest(path,{...options,reserve:0}));
});
