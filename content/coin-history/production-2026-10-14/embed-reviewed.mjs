import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {assertVisualReview} from '../../../video/scripts/lib/visual-review.mjs';
const slug=process.argv[2];
if(!['pittman-act-silver-dollar-melting','peace-dollar-history-and-symbolism'].includes(slug))throw Error('Unexpected slug');
const hash=b=>createHash('sha256').update(b).digest('hex');
assertVisualReview(process.cwd(),slug);
const release=JSON.parse(fs.readFileSync(`video/out/${slug}/release-qa.json`));
if(!release.readyForPosting)throw Error('Release blocked');
const map=JSON.parse(fs.readFileSync('.buffer-media-urls.json')),record=map[slug];
if(!record)throw Error('Missing hosted inventory');
const url=`https://fuseddistribution.luxraycoco.workers.dev/reels/${slug}/${slug}.mp4`;
for(const [prefix,local]of [['reels',`public/reels/${slug}/${slug}.mp4`],['reels-x',`public/reels-x/${slug}/${slug}.mp4`]]){
 const hosted=`https://fuseddistribution.luxraycoco.workers.dev/${prefix}/${slug}/${slug}.mp4`;
 const response=await fetch(hosted,{signal:AbortSignal.timeout(60000)});
 if(!response.ok||!response.headers.get('content-type')?.includes('video/mp4'))throw Error(`Hosted ${prefix} unavailable ${response.status}`);
 if(hash(Buffer.from(await response.arrayBuffer()))!==hash(fs.readFileSync(local)))throw Error(`Hosted ${prefix} hash mismatch`);
}
const dir=`public/blog/${slug}`;
fs.writeFileSync(`${dir}/social-video.json`,JSON.stringify({version:1,updatedAt:new Date().toISOString(),primaryVideo:{url},platforms:{}},null,2)+'\n');
execFileSync(process.execPath,['public/blog/scripts/build-html.mjs',`--slug=${slug}`],{stdio:'inherit'});
const qa=JSON.parse(fs.readFileSync(`${dir}/qa.json`));qa.artifactSha256['index.html']=hash(fs.readFileSync(`${dir}/index.html`));qa.review_notes.push('Companion video: both hosted derivatives verified byte-for-byte against reviewed local delivery files. Square article cover preserves complete artwork.');qa.reviewed_at=new Date().toISOString();
fs.writeFileSync(`${dir}/qa.json`,JSON.stringify(qa,null,2)+'\n');
console.log('Exact hosted videos verified; article player prepared',slug);
