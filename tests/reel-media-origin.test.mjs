import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/reel-media-worker.js';
const data = Uint8Array.from([0,1,2,3,4,5,6,7]).buffer;
const env = {REELS_KV:{get:async key => key === 'reels/example/example.mp4' ? data : null}};
const url='https://media.example/reels/example/example.mp4';
test('serves complete media and browser CORS',async()=>{const r=await worker.fetch(new Request(url),env);assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'*');assert.deepEqual(await r.arrayBuffer(),data);});
test('supports HEAD and bounded, suffix and invalid ranges',async()=>{
 for(const [range,status,bytes] of [['bytes=2-4',206,[2,3,4]],['bytes=-2',206,[6,7]],['bytes=20-',416,[]],['bytes=-0',416,[]],['bytes=0-1,3-4',416,[]]]){
 const r=await worker.fetch(new Request(url,{headers:{Range:range}}),env);assert.equal(r.status,status);assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],bytes);}
 const r=await worker.fetch(new Request(url,{method:'HEAD'}),env);assert.equal(r.headers.get('Content-Length'),'8');assert.equal((await r.arrayBuffer()).byteLength,0);
});
test('exposes only matching approved media keys and read methods',async()=>{
 for(const path of ['/','/reels/example/other.mp4','/reels/../secret','/reels/missing/missing.mp4'])assert.equal((await worker.fetch(new Request('https://media.example'+path),env)).status,404);
 assert.equal((await worker.fetch(new Request(url,{method:'POST'}),env)).status,405);
 assert.equal((await worker.fetch(new Request(url,{method:'OPTIONS'}),env)).status,204);
});
