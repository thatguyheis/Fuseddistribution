import test from 'node:test';
import assert from 'node:assert/strict';
import {wordsToCaptions, captionCacheKey, assertWhisperRuntime} from '../video/scripts/generate-captions.mjs';
test('captions retain observed timing and break at speech pauses',()=>{
  assert.deepEqual(wordsToCaptions([{text:'Hello',startSec:0.2,endSec:0.5},{text:'there.',startSec:0.5,endSec:0.9},{text:'Again',startSec:2,endSec:2.4}]),[{text:'Hello there.',startSec:0.2,endSec:0.9},{text:'Again',startSec:2,endSec:2.4}]);
});
test('invalid and overlapping timestamps stop caption creation',()=>{
  for(const word of [{text:'bad',startSec:1,endSec:0},{text:'bad',startSec:NaN,endSec:2}])assert.throws(()=>wordsToCaptions([word]));
  assert.throws(()=>wordsToCaptions([{text:'one',startSec:0,endSec:1},{text:'two',startSec:0.2,endSec:2}]));
});
test('cache invalidates changed audio, narration or model',()=>{
  const key=captionCacheKey(Buffer.from('a'),'hello',{revision:'1'});
  assert.equal(key,captionCacheKey(Buffer.from('a'),'hello',{revision:'1'}));
  assert.notEqual(key,captionCacheKey(Buffer.from('b'),'hello',{revision:'1'}));
  assert.notEqual(key,captionCacheKey(Buffer.from('a'),'other',{revision:'1'}));
  assert.notEqual(key,captionCacheKey(Buffer.from('a'),'hello',{revision:'2'}));
});
test('punctuation hallucinations do not become standalone captions',()=>{
 assert.deepEqual(wordsToCaptions([{text:'Done.',startSec:0,endSec:1},{text:'.',startSec:1.2,endSec:1.3}]),[{text:'Done.',startSec:0,endSec:1}]);
});
test('quantized zero-length tokens merge into actual neighboring speech without invented duration',()=>{
 assert.deepEqual(wordsToCaptions([{text:'John',startSec:1,endSec:1},{text:'McLoughlin.',startSec:1,endSec:1.6}]),[{text:'John McLoughlin.',startSec:1,endSec:1.6}]);
 assert.throws(()=>wordsToCaptions([{text:'Only',startSec:1,endSec:1}]));
});
