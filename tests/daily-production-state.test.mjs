import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyProductionState} from '../scripts/lib/daily-production-state.mjs';
test('individual live proof reconciles a missing queue without hiding unfinished articles',()=>{
 const plan={posts:[{slug:'published'},{slug:'pending'}]};
 const s=dailyProductionState(null,null,10,plan,['published']);
 assert.deepEqual(s.missingSlugs,['pending']);assert.deepEqual(s.publishedSlugs,['published']);assert.equal(s.actionable,true);
 assert.equal(dailyProductionState(null,null,10,plan,['published','pending']).state,'live_verified');
});
test('stale subset of proofs does not reopen completed historical queue',()=>{
 const plan={posts:[{slug:'a'},{slug:'b'}]};
 assert.equal(dailyProductionState(plan,{live:2},10,plan,['a']).actionable,false);
});
test('missing queue after deadline is actionable even with a stale completion',()=>{
 const result=dailyProductionState({unavailable:true},{live:4},9);
 assert.equal(result.actionable,true);assert.equal(result.state,'missing_daily_production');
});
test('empty or malformed queues do not count as completed work',()=>{
 for(const queue of [{posts:[]},{posts:'bad'},null]) assert.equal(dailyProductionState(queue,null,12).actionable,true);
});
test('before deadline absence is pending; present queue still needs live evidence',()=>{
 assert.equal(dailyProductionState(null,null,8).actionable,false);
 assert.equal(dailyProductionState({posts:[{slug:'x'}]},null,9).actionable,true);
 assert.equal(dailyProductionState({posts:[{slug:'x'}]},{live:1},10).state,'completion_evidence_requires_verification');
});

test('partial queue cannot hide remaining planned articles behind a completion', () => {
 const state = dailyProductionState({posts:[{slug:'one'}]}, {live:1}, 10, {posts:[{slug:'one'},{slug:'two'}]});
 assert.equal(state.actionable,true);
 assert.deepEqual(state.missingSlugs,['two']);
});

test('a partial completion file remains actionable for a complete queue',()=>{
 assert.equal(dailyProductionState({posts:[{slug:'one'},{slug:'two'}]},{live:1},12).actionable,true);
});
