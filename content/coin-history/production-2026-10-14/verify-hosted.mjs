import fs from 'node:fs';import {createHash} from 'node:crypto';
const slugs=process.argv[2].split(',');
const allowed=['pittman-act-silver-dollar-melting','peace-dollar-history-and-symbolism','recording-accessibility-feedback-from-real-customers','creating-a-small-business-exception-handling-log','mapping-a-manual-business-process-before-automating-it'];
const hash=b=>createHash('sha256').update(b).digest('hex');const results=[];
for(const slug of slugs){if(!allowed.includes(slug))throw Error('Unreviewed slug');const release=JSON.parse(fs.readFileSync(`video/out/${slug}/release-qa.json`));if(!release.readyForPosting)throw Error('Release not ready');
 for(const prefix of ['reels','reels-x']){const url=`https://fuseddistribution.luxraycoco.workers.dev/${prefix}/${slug}/${slug}.mp4`;const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok||!r.headers.get('content-type')?.includes('video/mp4'))throw Error(`${slug}: HTTP ${r.status}`);const hosted=Buffer.from(await r.arrayBuffer()),local=fs.readFileSync(`public/${prefix}/${slug}/${slug}.mp4`);if(hash(hosted)!==hash(local))throw Error('Hosted bytes differ');results.push({slug,prefix,url,bytes:hosted.length,sha256:hash(hosted),verifiedAt:new Date().toISOString()});}
}
fs.writeFileSync(`content/coin-history/production-2026-10-14/hosted-proof-${slugs[0]}.json`,JSON.stringify(results,null,2)+'\n');console.log(`Verified ${results.length} hosted delivery files byte-for-byte`);
