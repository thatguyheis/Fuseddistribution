import {readFileSync} from 'node:fs';
import {narrationDurationPreflight} from './lib/narration-duration.mjs';
const path=process.argv.find(x=>x.startsWith('--script='))?.slice(9);
if(!path)throw new Error('--script is required');
const result=narrationDurationPreflight(JSON.parse(readFileSync(path,'utf8')));
console.log(JSON.stringify(result));
if(!result.pass){
  const action=result.estimatedSeconds<result.minimumEstimate?'expand with source-supported narration':'shorten redundant narration';
  console.error(`BLOCKED before TTS: ${action}, then revalidate. The release target is ${result.minimumEstimate}-${result.maximumEstimate} seconds; measured audio remains authoritative.`);
  process.exitCode=1;
}
