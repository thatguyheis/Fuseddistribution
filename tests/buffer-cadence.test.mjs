import test from 'node:test';
import assert from 'node:assert/strict';
import {nextFreeSlots,repairCadence,assertFreeSlot,localDay} from '../public/blog/scripts/lib/buffer-cadence.mjs';
const now=new Date('2026-10-09T16:00:00Z');
const post=(id,dueAt,channelId='a')=>({id,dueAt,channelId,status:'scheduled'});
test('uses occupied slots and rolls at three posts per Pacific day',()=>{
 const slots=nextFreeSlots([post('a','2026-10-09T20:00:00Z')],'a',3,now);
 assert.deepEqual(slots,['2026-10-09T20:20:00.000Z','2026-10-09T20:40:00.000Z','2026-10-10T20:00:00.000Z']);
});
test('same timestamp on a different channel is available',()=>{
 assert.equal(nextFreeSlots([post('a','2026-10-09T20:00:00Z','b')],'a',1,now)[0],'2026-10-09T20:00:00.000Z');
});
test('repairs collisions while preserving existing unique posts',()=>{
 const posts=[post('1','2026-10-09T20:00:00Z'),post('2','2026-10-09T20:00:00Z'),post('3','2026-10-09T20:20:00Z'),post('4','2026-10-09T20:40:00Z')];
 const changes=repairCadence(posts,now);assert.equal(changes.length,1);assert.equal(changes[0].id,'2');assert.equal(localDay(changes[0].dueAt),'2026-10-10');
 assert.equal(repairCadence(posts.map(p=>({...p,dueAt:changes.find(c=>c.id===p.id)?.dueAt||p.dueAt})),now).length,0);
});
test('DST transition retains 13:00 Pacific',()=>{
 assert.equal(nextFreeSlots([],'a',1,new Date('2026-11-01T17:00:00Z'))[0],'2026-11-01T21:00:00.000Z');
});
test('direct publisher rejects collisions and counts already sent posts',()=>{
 assert.throws(()=>assertFreeSlot([post('1','2026-10-09T20:00:00Z')],post('2','2026-10-09T20:00:00Z')));
 const sent=[0,1,2].map(i=>({...post(String(i),`2026-10-09T17:0${i}:00Z`),status:'sent'}));
 assert.throws(()=>assertFreeSlot(sent,post('4','2026-10-09T20:00:00Z')));
});
