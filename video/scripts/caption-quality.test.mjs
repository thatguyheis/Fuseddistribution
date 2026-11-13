import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCaptionQuality, captionText} from './caption-quality.mjs';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captionCacheKey, assertWhisperRuntime, generateCaptions} from './generate-captions.mjs';

const VIDEO=dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/,'');
const REPO=resolve(VIDEO,'..');
const words = text => text.split(/\s+/).map((token, index) => ({text:token,startSec:index,endSec:index+0.5}));

test('caption quality tolerates punctuation, case and common number formatting', () => {
  const result=assessCaptionQuality('The API field was set to 68 words.',words('the api field was set to sixty eight words.'));
  assert.equal(result.suspicious,false);
});

test('caption quality flags broad transcript divergence', () => {
  const result=assessCaptionQuality('The mint changed the design after public debate and rising demand.',words('the mint changed the design after public debate and rising demand'));
  assert.equal(result.suspicious,false);
  const bad=assessCaptionQuality('The mint changed the design after public debate and rising demand.',words('the river turned softly across the mountain under a bright sky before sunset'));
  assert.ok(bad.reasons.includes('transcript-divergence'));
});

test('caption quality flags repeated recognition and ending question mismatch', () => {
  const repetitive=assessCaptionQuality('A careful explanation with several different words in the sentence.',words('same phrase repeats same phrase repeats same phrase repeats same phrase repeats'));
  assert.ok(repetitive.reasons.includes('repetitive-recognition'));
  const ending=assessCaptionQuality('Which caption detail do you check first?',words('Which caption detailed you check first?'),{question:true});
  assert.ok(ending.reasons.includes('ending-question-mismatch'));
});

test('caption quality allows repeated phrases present in approved narration', () => {
  const twice='The post ID appears in the intended channel before publishing, and the post ID remains visible in the record.';
  assert.equal(assessCaptionQuality(twice,words(twice)).suspicious,false);
  const fourTimes=Array(4).fill('the intended channel').join(' ');
  assert.equal(assessCaptionQuality(fourTimes,words(fourTimes)).suspicious,false);
});

test('caption text joins timestamp tokens cleanly', () => {
  assert.equal(captionText(words('A test.')),'A test.');
});

test('installed cached primary and small.en transcripts pass quality checks for all six segments', t => {
  const slug='checking-names-and-numbers-in-whisper-transcripts';
  const scriptPath=join(VIDEO,'out',slug,'script.json');
  const audioPaths=Array.from({length:6},(_,index)=>join(VIDEO,'public/audio',slug,`segment-${index}.m4a`));
  const runtimePaths=[join(VIDEO,'whisper-runtime.json'),join(VIDEO,'whisper-fallback-runtime.json')];
  if(![scriptPath,...audioPaths,...runtimePaths].every(existsSync)) { t.skip('Local approved script, audio, or Whisper runtime fixtures are unavailable'); return; }
  const script=JSON.parse(readFileSync(scriptPath,'utf8'));
  const resolveRuntime=configPath=>{const config=JSON.parse(readFileSync(configPath,'utf8'));return {...config,python:resolve(REPO,config.python),modelPath:resolve(REPO,config.modelPath)};};
  const [primary,fallback]=runtimePaths.map(resolveRuntime);
  const cachePaths=script.segments.map((segment,index)=>{
    const audio=readFileSync(audioPaths[index]);
    return {audio,primary:join(VIDEO,'local/whisper-captions',`${captionCacheKey(audio,segment.narration,primary)}.json`),fallback:join(VIDEO,'local/whisper-captions',`${captionCacheKey(audio,segment.narration,fallback)}.json`)};
  });
  if(!cachePaths.every(paths=>existsSync(paths.primary)&&existsSync(paths.fallback))) { t.skip('Local primary and small.en cached transcripts are unavailable'); return; }
  for(const [index,segment] of script.segments.entries()) {
    const question=segment.type==='question';
    const fallbackResult=JSON.parse(readFileSync(cachePaths[index].fallback,'utf8'));
    assert.equal(assessCaptionQuality(segment.narration,fallbackResult.words,{question}).suspicious,false,`small.en segment ${index}`);
    if(index===3) {
      const primaryResult=JSON.parse(readFileSync(cachePaths[index].primary,'utf8'));
      assert.equal(assessCaptionQuality(segment.narration,primaryResult.words,{question}).suspicious,true);
    }
  }
});

test('fallback runs only for suspicious segments, reuses cache, and records unresolved evidence', async () => {
  const temp=mkdtempSync(join(tmpdir(),'caption-fallback-test-'));
  try {
    const audioDir=join(temp,'audio'),cacheDir=join(temp,'cache'),outDir=join(temp,'output');
    mkdirSync(audioDir);mkdirSync(cacheDir);mkdirSync(outDir);
    const scriptPath=join(temp,'script.json');
    const runtimeConfig=createRuntimeFixture(temp,'primary','primary-model');
    const fallbackRuntimeConfig=createRuntimeFixture(temp,'fallback','fallback-model');
    const healthy='The intended channel contains the post ID twice in each record.';
    const suspicious='This approved narration contains enough words to show a broad and obvious recognition mismatch.';
    const script={slug:'caption-test',segments:[{type:'body',narration:healthy},{type:'question',narration:suspicious}]};
    writeFileSync(scriptPath,JSON.stringify(script));
    const primary=assertWhisperRuntime(runtimeConfig);
    for(let i=0;i<2;i++) {
      const audio=Buffer.from(`audio-${i}`);writeFileSync(join(audioDir,`segment-${i}.m4a`),audio);
      const narration=script.segments[i].narration;
      const key=captionCacheKey(audio,narration,primary);
      writeFileSync(join(cacheDir,`${key}.json`),JSON.stringify({words:words(i===0 ? healthy : 'river river under a mountain where birds fly across water')}));
    }
    const fallbackText='This approved narration contains enough words to show a broad and obvious recognition mismatch?';
    let calls=0;
    const options={scriptPath,audioDir,cacheDir,outputDir:outDir,runtimeConfig,fallbackRuntimeConfig,transcribeJobs(_runtime,jobs) {
      calls++;assert.deepEqual(jobs.map(job=>job.index),[1]);
      for(const job of jobs)writeFileSync(job.outputPath,JSON.stringify({words:words(fallbackText)}));
      return {status:0,stdout:'mock fallback complete',stderr:''};
    }};
    const first=await generateCaptions('caption-test',options);
    assert.equal(calls,1);
    assert.deepEqual(Object.keys(first.meta.fallbackEvidence),['1']);
    const second=await generateCaptions('caption-test',options);
    assert.equal(calls,1,'fallback cache avoids a second recognition run');
    assert.equal(second.meta.fallbackEvidence['1'].usedFallback,true);

    writeFileSync(join(cacheDir,`${captionCacheKey(readFileSync(join(audioDir,'segment-1.m4a')),suspicious,assertWhisperRuntime(fallbackRuntimeConfig))}.json`),JSON.stringify({words:words('still wrong words despite the small model result')}));
    await assert.rejects(generateCaptions('caption-test',options),/remains suspicious.*segment 1/);
    const diagnostics=JSON.parse(readFileSync(join(outDir,'whisper-diagnostics.json'),'utf8'));
    assert.equal(diagnostics.fallbackEvidence['1'].fallback.suspicious,true);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

function createRuntimeFixture(root,name,modelName) {
  const python=join(root,`${name}-python`),modelPath=join(root,modelName);
  writeFileSync(python,'mock executable');mkdirSync(modelPath);
  for(const filename of ['model.bin','config.json','tokenizer.json','vocabulary.txt'])writeFileSync(join(modelPath,filename),'fixture');
  const configPath=join(root,`${name}-runtime.json`);
  writeFileSync(configPath,JSON.stringify({engine:'faster-whisper',packageVersion:'test',python,modelPath,modelRepository:`fixture/${modelName}`,modelRevision:`${name}-revision`,device:'cpu',computeType:'int8',cpuThreads:1,beamSize:1,wordTimestamps:true,language:'en',vadFilter:true,narrationPrompt:false}));
  return configPath;
}

test('unexpected adjacent word repeats require independent recognition, never silent deletion',()=>{
 const result=assessCaptionQuality('Check what captions actually communicate without the voice.',words('Check what captions actually communicate communicate without the voice.'));
 assert.ok(result.reasons.includes('unexpected-adjacent-repeat'));
 assert.equal(assessCaptionQuality('That that example is fictional should be clear.',words('That that example is fictional should be clear.')).suspicious,false);
});

test('closing questions tolerate straight versus curly apostrophes without changing words',()=>{
 assert.equal(assessCaptionQuality('What action completes your reel’s opening promise?',words("What action completes your reel's opening promise?"),{question:true}).suspicious,false);
});
