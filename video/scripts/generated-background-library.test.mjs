import test from 'node:test';
import assert from 'node:assert/strict';
import {
  backgroundTags,
  planGeneratedBackgrounds,
  rankLibraryBackgrounds,
} from './generated-background-library.mjs';

test('plans one new hook background and one reused narrative background', () => {
  assert.deepEqual(planGeneratedBackgrounds([
    {type: 'hook'},
    {type: 'chart'},
    {type: 'overlay'},
    {type: 'question'},
  ]), {newIndex: 0, reuseIndex: 2});
});

test('tags capture topic, scene, and controlled subject category', () => {
  assert.deepEqual(backgroundTags({
    topic: 'silver',
    sceneId: 'silver-vault',
    segment: {text: 'Store a bullion collection in a safe'},
  }), ['coins', 'silver', 'silver-vault']);
});

test('library ranking excludes the new asset and penalizes recent repetition', () => {
  const asset = (id, overrides = {}) => ({
    id,
    status: 'approved-background-only',
    topic: 'tech',
    sceneId: 'tech-data',
    tags: ['tech', 'tech-data', 'data'],
    useCount: 0,
    lastUsedAt: null,
    ...overrides,
  });
  const ranked = rankLibraryBackgrounds({
    assets: [asset('new'), asset('recent'), asset('fresh')],
    usageHistory: [{assetId: 'recent'}],
    topic: 'tech',
    sceneId: 'tech-data',
    tags: ['tech', 'tech-data', 'data'],
    excludeIds: ['new'],
  });
  assert.deepEqual(ranked.map((entry) => entry.id), ['fresh', 'recent']);
});

test('library ranking never crosses topic boundaries to fill a slot', () => {
  const ranked = rankLibraryBackgrounds({
    assets: [{
      id: 'silver-only',
      status: 'approved-background-only',
      topic: 'silver',
      sceneId: 'silver-vault',
      tags: ['silver', 'coins'],
    }],
    topic: 'tech',
    sceneId: 'tech-general',
    tags: ['tech', 'tech-general'],
  });
  assert.deepEqual(ranked, []);
});
test('same vertical alone does not make an unrelated background relevant', () => {
  const result=rankLibraryBackgrounds({assets:[{id:'unrelated',status:'approved-background-only',topic:'tech',sceneId:'tech-local-search',tags:['tech','search']}],topic:'tech',sceneId:'tech-audio',tags:['tech','audio']});
  assert.deepEqual(result,[]);
});

test('new generated assets retain source PNG but require matching staged review before reuse', async () => {
  const {mkdtempSync,writeFileSync,mkdirSync,copyFileSync,existsSync}=await import('node:fs');
  const {join}=await import('node:path');
  const {tmpdir}=await import('node:os');
  const {registerGeneratedBackground,approveGeneratedBackgroundsForReel,loadBackgroundCatalog}=await import('./generated-background-library.mjs');
  const root=mkdtempSync(join(tmpdir(),'generated-review-'));
  const env={GENERATIVE_MEDIA_LIBRARY_DIR:join(root,'library')};
  const photo=join(root,'source.jpg'),png=join(root,'source.png');
  writeFileSync(photo,Buffer.alloc(11000,1));writeFileSync(png,'raw generation');
  const asset=registerGeneratedBackground({filePath:photo,metadata:{topic:'tech',sceneId:'tech-audio',tags:['tech','tech-audio'],sourceImage:png},slug:'pilot',segmentIndex:0},env);
  assert.equal(asset.status,'pending-visual-review');
  assert.ok(existsSync(join(root,'library/assets',asset.sourceImage)));
  mkdirSync(join(root,'video/out/pilot'),{recursive:true});mkdirSync(join(root,'video/public/photos/pilot'),{recursive:true});
  writeFileSync(join(root,'video/out/pilot/media-manifest.json'),JSON.stringify({segments:{0:{libraryAssetId:asset.id}}}));
  approveGeneratedBackgroundsForReel(root,'pilot',env);
  assert.equal(loadBackgroundCatalog(env).assets[0].status,'pending-visual-review');
  copyFileSync(photo,join(root,'video/public/photos/pilot/segment-0.jpg'));
  approveGeneratedBackgroundsForReel(root,'pilot',env);
  assert.equal(loadBackgroundCatalog(env).assets[0].status,'approved-background-only');
});
