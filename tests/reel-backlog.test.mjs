import test from 'node:test';import assert from 'node:assert/strict';
import {classifyReel} from '../scripts/reel-backlog.mjs';
const base={sourceApproved:true,rendered:true,reviewCurrent:false,review:{},release:{}};
test('render success alone always requires owner visual review',()=>assert.equal(classifyReel({...base,release:{pass:true,readyForPosting:true}}),'visual_review'));
test('opening and unrelated-media repairs remain actionable',()=>{
 assert.equal(classifyReel({...base,repair:{stage:'opening_hero_repair_required'}}),'opening_hero_repair');
 assert.equal(classifyReel({...base,review:{pass:false}}),'media_repair');
});
test('current approved replacement clears historical repair, but needs release checks',()=>{
 const item={...base,reviewCurrent:true,repair:{stage:'media_repair_required'}};
 assert.equal(classifyReel(item),'release_checks');
 assert.equal(classifyReel({...item,release:{readyForPosting:true}}),'distribution_handoff');
});
test('changed sources and missing render cannot become distributable',()=>{
 assert.equal(classifyReel({...base,sourceApproved:false,reviewCurrent:true}),'source_repair');
 assert.equal(classifyReel({...base,rendered:false}),'render_required');
});
