import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {approvedDurationException} from '../video/scripts/lib/duration-exception.mjs';
test('owner exception applies only to the approved slug, exact export and duration',()=>{
 const root=mkdtempSync(join(tmpdir(),'reel-duration-'));mkdirSync(join(root,'ops'));
 const video=join(root,'reel.mp4');writeFileSync(video,'approved export');
 const videoSha256=createHash('sha256').update('approved export').digest('hex');
 const entry={approvedBy:'Nick',approvedAt:'2026-11-11T00:00:00Z',reason:'Owner approved shorter reel',videoSha256,durationSeconds:97.75};
 writeFileSync(join(root,'ops/reel-duration-exceptions.json'),JSON.stringify({exceptions:{'prompt-topic':entry}}));
 assert.deepEqual(approvedDurationException(root,'prompt-topic',video,97.75),entry);
 assert.equal(approvedDurationException(root,'another-topic',video,97.75),null);
 assert.equal(approvedDurationException(root,'prompt-topic',video,90),null);
 assert.equal(approvedDurationException(root,'prompt-topic',video,140),null);
 writeFileSync(video,'different export');assert.equal(approvedDurationException(root,'prompt-topic',video,97.75),null);
});
