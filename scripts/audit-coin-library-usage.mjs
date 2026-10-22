import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const root = process.cwd();
const catalogPath = join(root, 'content/coin-library/catalog.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const posts = JSON.parse(readFileSync(join(root, 'public/blog/posts.json'), 'utf8'));
const postDates = new Map((Array.isArray(posts) ? posts : posts.posts || []).map(post => [post.slug, post.date || post.publishedAt || null]));
const discoveries = new Map(catalog.items.map(asset => [asset.id, []]));
const verified = [];

for (const asset of catalog.items) {
  for (const post of (Array.isArray(posts) ? posts : posts.posts || [])) {
    const slug = post.slug;
    const sourcePath = join(root, 'public/blog', slug, 'image-sources.json');
    if (!existsSync(sourcePath)) continue;
    const manifest = JSON.parse(readFileSync(sourcePath, 'utf8'));
    for (const evidence of manifest.assets || []) {
      if (evidence.assetId !== asset.id || evidence.role !== 'coin evidence') continue;
      const rawPath = join(root, asset.source || '');
      const actual = existsSync(rawPath) ? createHash('sha256').update(readFileSync(rawPath)).digest('hex') : null;
      if (evidence.source !== asset.source || actual !== asset.sha256 || evidence.sourceSha256 !== asset.sha256) {
        throw new Error(`Refusing to record ${asset.id} use in ${slug}: catalog source or hash mismatch`);
      }
      if (asset.coinIdentity && evidence.coinIdentity && asset.coinIdentity !== evidence.coinIdentity) {
        throw new Error(`Refusing to record ${asset.id} use in ${slug}: coin identity conflicts with the catalog`);
      }
      if (!asset.coinIdentity && evidence.coinIdentity) asset.coinIdentity = evidence.coinIdentity;
      discoveries.get(asset.id).push({slug, date: postDates.get(slug) || null, status: 'published-coin-evidence', role: 'coin evidence', imageSha256: evidence.sha256, articleUrl: `https://fuseddistribution.com/blog/${slug}/`});
    }
  }
}

for (const asset of catalog.items) {
  asset.uses ||= [];
  for (const found of discoveries.get(asset.id)) {
    if (!asset.uses.some(use => use.slug === found.slug && use.role === found.role)) asset.uses.push(found);
    else {
      asset.uses = asset.uses.map(use => use.slug === found.slug && use.role === found.role ? {...use, ...found} : use);
    }
    verified.push({assetId: asset.id, slug: found.slug});
  }
  if (discoveries.get(asset.id).length) {
    asset.lastUsed = discoveries.get(asset.id).map(use => use.date).filter(Boolean).sort().at(-1) || asset.lastUsed || null;
    if (['cataloged_requires_crop_review', 'cataloged_requires_clip_review'].includes(asset.status)) asset.status = 'used_verified_coin_evidence';
  }
}

const readyForNewEpisode = catalog.items.filter(asset => ['approved_coin_history_evidence', 'used_verified_coin_evidence'].includes(asset.status)
  && asset.identityReview?.matchesCoin === true && Number(asset.identityReview?.confidence) >= 0.85 && asset.identityReview?.sourceSha256 === asset.sha256).length;
const needsReview = catalog.items.length - readyForNewEpisode;
console.log(JSON.stringify({catalogAssets: catalog.items.length, verifiedPublishedUses: verified.length,
  usableForNewEpisodes: readyForNewEpisode, needsIdentityOrCropReview: needsReview, verifiedUses: verified}, null, 2));
if (process.argv.includes('--write')) writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
