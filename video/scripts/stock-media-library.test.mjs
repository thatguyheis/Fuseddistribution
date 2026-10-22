import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {registerStockMedia,reuseStockMedia,approveStockMediaForReel} from './stock-media-library.mjs';

test('stock reuse requires reviewed matching staged bytes and preserves provenance',()=>{
 const root=mkdtempSync(join(tmpdir(),'stock-library-'));
 const source=join(root,'source.jpg');writeFileSync(source,'reviewed asset bytes');
 const id=registerStockMedia({root,path:source,provenance:{provider:'pexels',providerId:123,sourceUrl:'https://www.pexels.com/photo/123/',licenseUrl:'https://www.pexels.com/license/'},query:'recording microphone',topic:'tech',slug:'pilot',segmentIndex:0,type:'photo'});
 const args={root,query:'recording microphone',topic:'tech',type:'photo',destination:join(root,'reused.jpg')};
 assert.equal(reuseStockMedia(args),null);
 mkdirSync(join(root,'video/out/pilot'),{recursive:true});mkdirSync(join(root,'video/public/photos/pilot'),{recursive:true});
 writeFileSync(join(root,'video/out/pilot/media-manifest.json'),JSON.stringify({segments:{0:{libraryAssetId:id}}}));
 const staged=join(root,'video/public/photos/pilot/segment-0.jpg');writeFileSync(staged,'wrong asset');
 approveStockMediaForReel(root,'pilot');assert.equal(reuseStockMedia(args),null);
 copyFileSync(source,staged);approveStockMediaForReel(root,'pilot');
 const reused=reuseStockMedia(args);assert.equal(reused.providerId,123);assert.equal(readFileSync(args.destination,'utf8'),'reviewed asset bytes');
 assert.equal(reuseStockMedia({...args,topic:'silver'}),null);
 assert.equal(reuseStockMedia({...args,excludeIds:[id]}),null);
 writeFileSync(join(root,'video/local/stock-media/assets',reused.filename),'corrupt');
 assert.throws(()=>reuseStockMedia(args),/hash mismatch/);
});
