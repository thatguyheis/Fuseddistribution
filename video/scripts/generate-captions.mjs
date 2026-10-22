/** Local Whisper word timestamps, cached by audio, narration and runtime configuration. */
import {existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(ROOT, '..');
const digest = value => createHash('sha256').update(value).digest('hex');
const json = path => JSON.parse(readFileSync(path,'utf8'));
const save = (path,value) => writeFileSync(path,JSON.stringify(value,null,2)+'\n');

export function captionCacheKey(audio, narration, runtime) {
  return digest(JSON.stringify({version:3,audio:digest(audio),narration,runtime}));
}
export function normalizeWordTimestamps(words) {
  const result=[];let pending=[];let previousEnd=0;
  for(const word of words) {
    if(typeof word.text==='string' && !/[\p{L}\p{N}]/u.test(word.text))continue;
    if(!word.text?.trim() || !Number.isFinite(word.startSec) || !Number.isFinite(word.endSec) || word.startSec<0 || word.endSec<word.startSec || word.startSec<previousEnd-0.02)throw new Error('Invalid Whisper word timestamps');
    previousEnd=word.endSec;
    if(word.endSec===word.startSec){pending.push(word.text.trim());continue;}
    result.push({...word,text:[...pending,word.text.trim()].join(' ')});pending=[];
  }
  if(pending.length){if(!result.length)throw new Error('No positive-duration speech timestamps');result.at(-1).text+=' '+pending.join(' ');}
  return result;
}
export function wordsToCaptions(inputWords) {
  const words=normalizeWordTimestamps(inputWords);
  const result=[];let group=[];
  const flush=()=>{if(group.length)result.push({text:group.map(w=>w.text.trim()).join(' '),startSec:group[0].startSec,endSec:group.at(-1).endSec});group=[];};
  let previousEnd=0;
  for(const word of words) {
    if(typeof word.text==='string' && !/[\p{L}\p{N}]/u.test(word.text))continue;
    if(!word.text?.trim() || !Number.isFinite(word.startSec) || !Number.isFinite(word.endSec) || word.startSec<0 || word.endSec<=word.startSec || word.startSec<previousEnd-0.02) throw new Error('Invalid Whisper word timestamps');
    if(group.length && (group.length>=6 || group.map(w=>w.text).join(' ').length+word.text.length>48 || word.startSec-group.at(-1).endSec>0.6))flush();
    group.push(word);previousEnd=word.endSec;
    if(/[.!?]$/.test(word.text))flush();
  }
  flush();return result;
}
export function assertWhisperRuntime(runtimeConfig) {
  const path=runtimeConfig ? resolve(runtimeConfig) : join(ROOT,'whisper-runtime.json');
  if(!existsSync(path))throw new Error('Local Whisper configuration missing; see docs/WHISPER-CAPTIONS-SOP.md');
  const config=json(path);
  const python=resolve(REPO,config.python),modelPath=resolve(REPO,config.modelPath);
  if(!existsSync(python)||!['model.bin','config.json','tokenizer.json','vocabulary.txt'].every(name=>existsSync(join(modelPath,name))))throw new Error('Local Whisper executable or model missing; run the documented setup');
  return {...config,python,modelPath};
}
export async function generateCaptions(slug, options={}) {
  if(!/^[a-z0-9-]+$/.test(slug))throw new Error('Invalid caption slug');
  const scriptPath=join(ROOT,'out',slug,'script.json');
  if(!existsSync(scriptPath))throw new Error(`Missing caption script for ${slug}`);
  const runtime=assertWhisperRuntime(options.runtimeConfig);
  const script=json(scriptPath),audioDir=join(ROOT,'public/audio',slug);
  const outDir=options.outputDir ? resolve(options.outputDir) : join(ROOT,'out',slug);
  const cacheDir=join(ROOT,'local/whisper-captions');mkdirSync(cacheDir,{recursive:true});mkdirSync(outDir,{recursive:true});
  const jobs=[],records=[];
  for(const [index,segment] of script.segments.entries()) {
    if(!segment.narration)continue;
    const audioPath=join(audioDir,`segment-${index}.m4a`);
    if(!existsSync(audioPath))throw new Error(`Caption audio missing for segment ${index}`);
    const key=captionCacheKey(readFileSync(audioPath),segment.narration,runtime);
    const outputPath=join(cacheDir,`${key}.json`);
    records.push({index,key,outputPath});
    let valid=false;
    if(existsSync(outputPath)){try{valid=wordsToCaptions(json(outputPath).words).length>0;}catch{valid=false;}}
    if(!valid)jobs.push({index,audioPath,outputPath,narration:segment.narration});
  }
  if(!records.length)throw new Error('No narrated segments available for captions');
  const diagnosticsPath=join(outDir,'whisper-diagnostics.json');
  if(jobs.length) {
    const manifestPath=join(outDir,'whisper-jobs.json');save(manifestPath,{runtime,jobs});
    const run=spawnSync(runtime.python,[join(ROOT,'scripts/transcribe-local.py'),'--manifest',manifestPath],{encoding:'utf8',timeout:600000,maxBuffer:4*1024*1024,env:{...process.env,HF_HUB_OFFLINE:'1',TOKENIZERS_PARALLELISM:'false'}});
    const diagnostics={ok:run.status===0,engine:runtime.engine,modelRevision:runtime.modelRevision,generatedSegments:jobs.length,stdout:run.stdout?.slice(-10000),stderr:run.stderr?.slice(-10000),error:run.error?.message ?? null};save(diagnosticsPath,diagnostics);
    if(run.error || run.status!==0)throw new Error(`Local Whisper failed; see ${diagnosticsPath}. ${run.error?.message || run.stderr?.slice(-500) || 'worker failed'}`);
    console.log(run.stdout.trim());
  } else save(diagnosticsPath,{ok:true,cachedSegments:records.length,engine:runtime.engine});
  const captions={};
  for(const record of records)captions[record.index]=wordsToCaptions(json(record.outputPath).words);
  const meta={mode:'whisper',engine:runtime.engine,modelRevision:runtime.modelRevision,whisperAvailable:true,whisperSegments:records.length,proportionalSegments:0,missingAudioSegments:0,cachedSegments:records.length-jobs.length,generatedSegments:jobs.length,timing:'recognized-word-timestamps',textReviewRequired:true,audioCacheKeys:Object.fromEntries(records.map(r=>[r.index,r.key]))};
  // Preserve prior metadata if an existing output is being explicitly regenerated.
  for(const name of ['captions.json','captions-meta.json'])if(existsSync(join(outDir,name)))copyFileSync(join(outDir,name),join(outDir,`${name}.before-whisper-${Date.now()}`));
  save(join(outDir,'captions.json'),captions);save(join(outDir,'captions-meta.json'),meta);
  return {captions,meta};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const slug=process.argv.find(x=>x.startsWith('--post='))?.slice(7);
  const outputDir=process.argv.find(x=>x.startsWith('--output-dir='))?.slice(13);
  if(!slug)throw new Error('Usage: generate-captions.mjs --post=<slug> [--output-dir=<directory>]');
  generateCaptions(slug,{outputDir,runtimeConfig:process.argv.find(x=>x.startsWith('--runtime-config='))?.slice(17)}).then(({meta})=>console.log(JSON.stringify(meta))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
