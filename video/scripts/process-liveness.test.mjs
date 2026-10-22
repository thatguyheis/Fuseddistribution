import test from 'node:test';import assert from 'node:assert/strict';import {processIsAlive} from './process-liveness.mjs';
test('permission denial and unknown failures preserve active render locks',()=>{for(const code of ['EPERM','EACCES','UNKNOWN'])assert.equal(processIsAlive(123,()=>{throw Object.assign(new Error(),{code});}),true);});
test('only missing process proves stale; malformed owner blocks',()=>{assert.equal(processIsAlive(123,()=>{throw Object.assign(new Error(),{code:'ESRCH'});}),false);assert.equal(processIsAlive(123,()=>{}),true);assert.throws(()=>processIsAlive(null));});
