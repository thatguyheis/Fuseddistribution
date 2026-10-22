import {recoverFailedSegment} from './lib/media-fallback-policy.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>{const i=x.indexOf('=');return [x.slice(2,i),x.slice(i+1)];}));
try {
  const result=recoverFailedSegment({root:process.cwd(),slug:args.slug,logPath:args.log,startedAt:Number(args.started)});
  console.log(JSON.stringify(result));
  process.exitCode=result.recovered?0:2;
} catch(error) { console.error(error.message);process.exitCode=1; }
