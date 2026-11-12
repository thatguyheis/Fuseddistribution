import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {assertOwnerHook} from '../video/scripts/lib/owner-hook.mjs';
import {hookDurationLimit} from '../video/scripts/lib/hook-duration-limit.mjs';
test('approved owner wording is exact and its timing allowance cannot leak to other hooks',()=>{
 const root=mkdtempSync(join(tmpdir(),'owner-hook-'));mkdirSync(join(root,'ops'));
 const text='Once you notice this pattern in AI videos, you can’t unsee it.';
 writeFileSync(join(root,'ops/reel-hook-exceptions.json'),JSON.stringify({exceptions:{example:{approvedBy:'Nick',approvedAt:'2026-11-12T00:00:00Z',spokenText:text,maxSeconds:7,preserveExactText:true,reason:'Explicit owner request'}}}));
 assert.doesNotThrow(()=>assertOwnerHook(root,'example',text,text));
 assert.throws(()=>assertOwnerHook(root,'example','A rewritten question?',text),/exactly match/);
 assert.throws(()=>assertOwnerHook(root,'example',text,'Different visible words'),/exactly match/);
 assert.equal(hookDurationLimit(root,'example',text),7);
 assert.equal(hookDurationLimit(root,'example','A rewritten question?'),3.5);
 assert.equal(hookDurationLimit(root,'another',text),3.5);
});
test('TTS pause normalization preserves the timing allowance without allowing rewritten words',()=>{
 const root=mkdtempSync(join(tmpdir(),'owner-hook-'));mkdirSync(join(root,'ops'));
 const text='There’s a reason AI works well for video—and it’s not the visuals.';
 writeFileSync(join(root,'ops/reel-hook-exceptions.json'),JSON.stringify({exceptions:{example:{approvedBy:'Nick',approvedAt:'2026-11-12T00:00:00Z',spokenText:text,maxSeconds:8,preserveExactText:true,reason:'Preserve exact owner hook'}}}));
 assert.equal(hookDurationLimit(root,'example',text.replace('—',', ')),8);
 assert.equal(hookDurationLimit(root,'example',text.replace('visuals','pictures')),3.5);
 assert.throws(()=>assertOwnerHook(root,'example',text.replace('—',', '),text),/exactly match/);
});
