import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readPhoto, storePhoto, servePhoto } from './photos.js';

test('each photo is independently stored and retrieved across chunk boundaries', async () => {
  const db=new DatabaseSync(':memory:');
  const sql={exec(query,...args){
    const q=db.prepare(query);
    if(query.startsWith('SELECT'))return {one:()=>q.get(...args)};
    q.run(...args.map(arg=>arg instanceof ArrayBuffer ? new Uint8Array(arg) : arg));
  }};
  try {
    for(const size of [250,524301]){
      const id=crypto.randomUUID(), bytes=new Uint8Array(size);
      bytes.set([137,80,78,71,13,10,26,10]);bytes[size-1]=91;
      const req=new Request('https://desk.test/photo',{method:'POST',headers:{'Content-Length':String(size),'X-Photo-Name':'coin%20edge.png'},body:bytes});
      const photo=await readPhoto(req,id,25000000);
      assert.equal(photo.info.name,'coin edge.png');
      storePhoto(sql,'project-7',photo);
      const result=servePhoto(sql,'project-7',photo.info,true);
      assert.equal(result.headers.get('Content-Type'),'image/png');
      assert.deepEqual(new Uint8Array(await result.arrayBuffer()),bytes);
    }
    assert.equal(db.prepare('SELECT count(DISTINCT id) AS n FROM photo_blobs').get().n,2);
    assert.equal(servePhoto(sql,'project-7',null).status,404);
  }finally{db.close();}
});
