import {createHash} from 'node:crypto';
import {readFileSync, realpathSync, renameSync, writeFileSync} from 'node:fs';
import {join, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCoinImage} from '../video/scripts/coin-image-relevance.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export async function approveCoinLibraryAsset({root, assetId, coinIdentity, identitySourceUrl, visibleMarkers, model='gemma3:4b'}) {
  if (!/^coin-\d{4,}$/.test(assetId || '')) throw new Error('A stable coin library asset ID is required');
  if (!coinIdentity?.trim() || !identitySourceUrl?.startsWith('https://') || !visibleMarkers?.trim()) {
    throw new Error('Coin identity, HTTPS identity source, and visible markers are required');
  }
  const catalogPath = join(root, 'content/coin-library/catalog.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const asset = catalog.items.find(item => item.id === assetId);
  if (!asset) throw new Error(`Unknown coin library asset: ${assetId}`);
  const rawRoot = realpathSync(join(root, 'Coin Raw')) + sep;
  const sourcePath = realpathSync(join(root, asset.source));
  if (!sourcePath.startsWith(rawRoot)) throw new Error('Coin evidence must be an original inside Coin Raw');
  const sourceBytes = readFileSync(sourcePath);
  const sourceHash = hash(sourceBytes);
  if (sourceHash !== asset.sha256) throw new Error(`Original photo hash changed for ${assetId}`);
  const review = await reviewCoinImage({imagePath: sourcePath, slug: `catalog-${assetId}`, topic: `Coin identity check: ${coinIdentity}`, coinIdentity, model});
  if (asset.identityReview?.matchesCoin && asset.identityReview?.sourceSha256 === sourceHash && asset.coinIdentity === coinIdentity
      && asset.identitySourceUrl === identitySourceUrl && asset.visibleMarkers === visibleMarkers.trim()) {
    return asset;
  }
  asset.coinIdentity = coinIdentity;
  asset.identitySourceUrl = identitySourceUrl;
  asset.visibleMarkers = visibleMarkers.trim();
  asset.identityReview = {model, checkedAt: review.reviewedAt, sourceSha256: sourceHash,
    matchesCoin: review.matchesCoin, confidence: review.confidence, visibleEvidence: review.visibleEvidence, reason: review.reason};
  asset.status = 'approved_coin_history_evidence';
  const temporary = `${catalogPath}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(catalog, null, 2) + '\n');
  renameSync(temporary, catalogPath);
  return asset;
}

function readArg(name) {
  const argument = process.argv.find(value => value.startsWith(`--${name}=`));
  return argument?.slice(name.length + 3);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  approveCoinLibraryAsset({root:process.cwd(),assetId:readArg('asset-id'),coinIdentity:readArg('coin-identity'),
    identitySourceUrl:readArg('identity-source'),visibleMarkers:readArg('visible-markers')})
    .then(asset => console.log(`PASS: ${asset.id} approved as ${asset.coinIdentity}; source hash ${asset.sha256}`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
