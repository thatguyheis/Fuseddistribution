import test from 'node:test';
import assert from 'node:assert/strict';
import {wakeEligible} from '../scripts/publisher-wake-eligible.mjs';
const rows=[{queuedSlug:'alias'}];
test('watchdog does not restart exhausted canonical review',()=>assert.equal(wakeEligible({remaining:['alias'],attempts:{alias:65}},rows,new Map()),false));
test('watchdog allows fresh attempts and independent work',()=>{
 assert.equal(wakeEligible({remaining:['alias'],attempts:{alias:2}},rows,new Map()),true);
 assert.equal(wakeEligible({remaining:['alias','fresh'],attempts:{alias:65}},rows,new Map()),true);
});
test('repaired canonical evidence reopens eligible work',()=>assert.equal(wakeEligible({remaining:['alias'],attempts:{alias:65}},rows,new Map([['alias','canonical']])),true));
