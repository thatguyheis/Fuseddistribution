import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertApprovedSources } from './approved-sources.mjs';

const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'coin-history-approved-'));
  const slug = 'sample-coin-history';
  const post = join(root, 'public/blog', slug);
  const work = join(root, 'content/coin-history', slug);
  mkdirSync(post, { recursive: true });
  mkdirSync(work, { recursive: true });
  for (const name of ['verified.md', 'index.html', 'meta.json', 'research.json', 'hero.jpg', 'photo-post.jpg',
    'reel-script.md', 'reel-script-approved.md', 'reel-data.md', 'social-copy.json', 'image-sources.json',
    'content-plan.json', 'pipeline-marker.json']) writeFileSync(join(post, name), `fixture:${name}`);
  const transcript = 'approved narration\n';
  writeFileSync(join(work, 'narration-v1-approved.txt'), transcript);
  const transcriptHash = createHash('sha256').update(transcript).digest('hex');
  writeFileSync(join(work, 'script-approval.json'), JSON.stringify({ transcriptApproved: true, approvedTranscriptSha256: transcriptHash }));
  writeFileSync(join(work, 'claim-map.json'), '{"claims":[]}');
  writeFileSync(join(post, 'production-inputs.json'), JSON.stringify({ transcriptSha256: transcriptHash }));
  const names = ['verified.md', 'index.html', 'meta.json', 'research.json', 'hero.jpg', 'photo-post.jpg',
    'reel-script.md', 'reel-script-approved.md', 'reel-data.md', 'social-copy.json', 'production-inputs.json',
    'image-sources.json', 'content-plan.json', 'pipeline-marker.json'];
  const artifactSha256 = Object.fromEntries(names.map((name) => [name, digest(join(post, name))]));
  for (const name of ['narration-v1-approved.txt', 'script-approval.json', 'claim-map.json']) {
    artifactSha256[`content/coin-history/${slug}/${name}`] = digest(join(work, name));
  }
  writeFileSync(join(post, 'qa.json'), JSON.stringify({
    slug, pass: true, score: 90, blockers: [], mode: 'coin-history-automated',
    automaticApproval: { policy: 'coin-history-auto-v1', transcriptHashVerified: true }, artifactSha256,
  }));
  return { root, post, work, slug };
}

test('accepts automatic coin-history QA only while narration and all sources match approved hashes', () => {
  const value = fixture();
  try {
    assert.doesNotThrow(() => assertApprovedSources(value.root, value.slug));
    writeFileSync(join(value.work, 'narration-v1-approved.txt'), 'changed narration\n');
    assert.throws(() => assertApprovedSources(value.root, value.slug), /Approved transcript changed/);
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});

test('rejects an automatic coin-history QA score below the release threshold', () => {
  const value = fixture();
  try {
    const path = join(value.post, 'qa.json');
    const qa = JSON.parse(readFileSync(path, 'utf8'));
    qa.score = 84;
    writeFileSync(path, JSON.stringify(qa));
    assert.throws(() => assertApprovedSources(value.root, value.slug), /Editorial approval required/);
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});

function addCoinMediaGate(value) {
  const identity = '1909 Lincoln cent';
  const topic = 'Why Abraham Lincoln Appeared on the Cent in 1909';
  const imagePath = join(value.post, 'images/coin-evidence.jpg');
  mkdirSync(join(value.post, 'images'), {recursive:true});
  writeFileSync(imagePath, 'verified 1909 cent crop');
  const imageSha = digest(imagePath);
  writeFileSync(join(value.post, 'meta.json'), JSON.stringify({title:topic}));
  writeFileSync(join(value.post, 'image-sources.json'), JSON.stringify({assets:[{
    path:'images/coin-evidence.jpg', sha256:imageSha, coinIdentity:identity, role:'coin evidence', sourceType:'Wikimedia Commons',
    page:'https://commons.wikimedia.org/wiki/File:1909_US_Penny.jpg', license:'Public domain',
  }]}));
  writeFileSync(join(value.work, 'claim-map.json'), JSON.stringify({claims:[{id:'LC1',claim:'Centennial issue',source:'https://www.usmint.gov/'}]}));
  writeFileSync(join(value.post, 'production-inputs.json'), JSON.stringify({transcriptSha256:createHash('sha256').update('approved narration\n').digest('hex'),coinMediaGateVersion:1,coinIdentity:identity}));
  const preferred = {source:'fused-verified-coin-evidence',mode:'mixed',segments:[{
    index:0,type:'photo',reviewed:true,path:`public/blog/${value.slug}/images/coin-evidence.jpg`,sha256:imageSha,
    assetIds:['commons-cent'],role:`Direct visual evidence of ${identity}; obverse date`,coinIdentity:identity,relatedClaimIds:['LC1'],
  }]};
  writeFileSync(join(value.post, 'preferred-media.json'), JSON.stringify(preferred));
  writeFileSync(join(value.work, 'coin-image-relevance.json'), JSON.stringify({
    checkpoint:'package-intake-and-pre-render',reviews:['package-intake','pre-render'].map(checkpoint=>({checkpoint,slug:value.slug,topic,coinIdentity:identity,imageSha256:imageSha,matchesCoin:true,confidence:0.98,visibleEvidence:'Lincoln portrait and 1909 date'})),
  }));
  const qaPath=join(value.post,'qa.json');
  const qa=JSON.parse(readFileSync(qaPath,'utf8'));
  qa.artifactSha256['meta.json']=digest(join(value.post,'meta.json'));
  qa.artifactSha256['image-sources.json']=digest(join(value.post,'image-sources.json'));
  qa.artifactSha256['production-inputs.json']=digest(join(value.post,'production-inputs.json'));
  qa.artifactSha256['content/coin-history/'+value.slug+'/claim-map.json']=digest(join(value.work,'claim-map.json'));
  qa.artifactSha256['preferred-media.json']=digest(join(value.post,'preferred-media.json'));
  qa.coinImageReview={matchesCoin:true,imagesChecked:1};
  writeFileSync(qaPath,JSON.stringify(qa));
}

test('coin media gate requires two matching checks and a beat mapped to the episode coin', () => {
  const value=fixture();
  try {
    addCoinMediaGate(value);
    assert.doesNotThrow(()=>assertApprovedSources(value.root,value.slug));
    const preferredPath=join(value.post,'preferred-media.json');
    const preferred=JSON.parse(readFileSync(preferredPath,'utf8'));
    preferred.segments[0].coinIdentity='Morgan dollar';
    writeFileSync(preferredPath,JSON.stringify(preferred));
    const qaPath=join(value.post,'qa.json');
    const qa=JSON.parse(readFileSync(qaPath,'utf8'));
    qa.artifactSha256['preferred-media.json']=digest(preferredPath);
    writeFileSync(qaPath,JSON.stringify(qa));
    assert.throws(()=>assertApprovedSources(value.root,value.slug),/scene is not tied to the episode identity/);
  } finally { rmSync(value.root,{recursive:true,force:true}); }
});
