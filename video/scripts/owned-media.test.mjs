import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {stageOwnedMedia} from './owned-media.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'coin-media-test-'));
  const slug = 'coin-history';
  const dir = join(root, 'public/blog', slug);
  mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, 'scene.jpg'), 'reviewed scene');
  const plan = {source: 'fused-owned-coin-library', segments: [{index: 0, type: 'photo', reviewed: true, path: `public/blog/${slug}/scene.jpg`, sha256: sha('reviewed scene'), assetIds: ['coin-0006']}]};
  const approve = () => {
    const bytes = JSON.stringify(plan);
    writeFileSync(join(dir, 'preferred-media.json'), bytes);
    writeFileSync(join(dir, 'qa.json'), JSON.stringify({artifactSha256: {'preferred-media.json': sha(bytes)}}));
  };
  approve();
  return {root, slug, dir, plan, approve};
}
test('ordinary packages retain the existing fallback', () => {
  assert.equal(stageOwnedMedia(mkdtempSync(join(tmpdir(), 'coin-fallback-')), 'ordinary-post', 6), null);
});
test('approved scenes are staged exactly with provenance', () => {
  const f = fixture();
  assert.equal(stageOwnedMedia(f.root, f.slug, 1)[0].source, 'fused-owned-coin-library');
  assert.equal(readFileSync(join(f.root, 'video/public/photos', f.slug, 'segment-0.jpg'), 'utf8'), 'reviewed scene');
});
test('approved source-mapped public-domain coin evidence is staged as evidence', () => {
  const f = fixture();
  f.plan.source = 'fused-verified-coin-evidence';
  f.approve();
  assert.equal(stageOwnedMedia(f.root, f.slug, 1)[0].source, 'fused-verified-coin-evidence');
});
test('changed layout or unapproved manifest fails closed', () => {
  const f = fixture();
  writeFileSync(join(f.dir, 'scene.jpg'), 'changed');
  assert.throws(() => stageOwnedMedia(f.root, f.slug, 1), /changed after review/);
  assert.equal(existsSync(join(f.root, 'video/public/photos')), false);
  writeFileSync(join(f.dir, 'preferred-media.json'), JSON.stringify({...f.plan, version: 2}));
  assert.throws(() => stageOwnedMedia(f.root, f.slug, 1), /current editorial approval/);
});
test('partial plans and paths escaping the article are rejected', () => {
  const f = fixture();
  assert.throws(() => stageOwnedMedia(f.root, f.slug, 2), /every scene/);
  writeFileSync(join(f.root, 'outside.jpg'), 'reviewed scene');
  f.plan.segments[0].path = 'outside.jpg';
  f.approve();
  assert.throws(() => stageOwnedMedia(f.root, f.slug, 1), /stay inside/);
});
test('explicit mixed plans preserve evidence and leave other indices for enrichment', () => {
  const f=fixture();f.plan.mode='mixed';f.plan.segments[0].index=2;f.approve();
  const media=stageOwnedMedia(f.root,f.slug,6);
  assert.deepEqual(Object.keys(media),['2']);
  f.plan.segments.push({...f.plan.segments[0]});f.approve();
  assert.throws(()=>stageOwnedMedia(f.root,f.slug,6),/Unreviewed or unsupported/);
});
test('cutaways must match reviewed hashes and stay inside the article', () => {
  const f=fixture();
  writeFileSync(join(f.dir,'detail.jpg'),'reviewed detail');
  f.plan.segments[0].cutaways=[{path:`public/blog/${f.slug}/detail.jpg`,sha256:sha('reviewed detail')}];f.approve();
  const media=stageOwnedMedia(f.root,f.slug,1);
  assert.equal(media[0].shots.length,2);
  assert.equal(readFileSync(join(f.root,'video/public',media[0].shots[1]),'utf8'),'reviewed detail');
  writeFileSync(join(f.dir,'detail.jpg'),'changed');
  assert.throws(()=>stageOwnedMedia(f.root,f.slug,1),/cutaway.*changed/);
  writeFileSync(join(f.root,'outside.jpg'),'reviewed detail');
  f.plan.segments[0].cutaways[0].path='outside.jpg';f.approve();
  assert.throws(()=>stageOwnedMedia(f.root,f.slug,1),/cutaway escaped/);
});
test('staging owned scenes preserves cached supporting media for rerenders', () => {
 const f=fixture();const out=join(f.root,'video/out',f.slug);mkdirSync(out,{recursive:true});
 writeFileSync(join(out,'media-manifest.json'),JSON.stringify({segments:{1:{key:'generated-cache',source:'open-generative-ai-local'}}}));
 stageOwnedMedia(f.root,f.slug,1);
 assert.equal(JSON.parse(readFileSync(join(out,'media-manifest.json'))).segments[1].key,'generated-cache');
});
test('supporting scenes accept only approved cutaways with current bytes', async () => {
 const {stageSupportingCutaways}=await import('./owned-media.mjs');const f=fixture();
 f.plan.supportingCutaways=[{index:1,shots:[{path:`public/blog/${f.slug}/scene.jpg`,sha256:sha('reviewed scene')}]}];f.approve();
 const media=stageSupportingCutaways(f.root,f.slug,{1:{type:'video',src:'existing.mp4'}});
 assert.equal(media[1].src,'existing.mp4');assert.equal(media[1].evidenceCutaways.length,1);
 writeFileSync(join(f.dir,'scene.jpg'),'changed');
 assert.throws(()=>stageSupportingCutaways(f.root,f.slug,media),/changed after review/);
});
