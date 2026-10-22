import test from 'node:test';
import assert from 'node:assert/strict';
import {narrationDurationPreflight} from './narration-duration.mjs';

test('large declared windows cannot disguise narration below the minimum estimate',()=>{
  const result=narrationDurationPreflight({totalDuration:120,segments:[{duration:120,narration:Array(151).fill('word').join(' ')}]});
  assert.equal(result.pass,false);
  assert.equal(result.words,151);
});

test('measured Chatterbox pacing predicts a release-sized script without trusting card windows',()=>{
  const result=narrationDurationPreflight({totalDuration:1,segments:[{narration:Array(269).fill('word').join(' ')}]});
  assert.equal(result.pass,true);
  assert.equal(result.estimatedSeconds,127);
  assert.equal(narrationDurationPreflight({segments:[]}).pass,false);
});

test('estimated duration above the release maximum is stopped before expensive TTS',()=>{
  const result=narrationDurationPreflight({segments:[{narration:Array(315).fill('word').join(' ')}]});
  assert.equal(result.pass,false);
  assert.ok(result.estimatedSeconds > result.maximumEstimate);
});
