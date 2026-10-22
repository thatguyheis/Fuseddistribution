import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function validateImageReview(review, {slug, topic, coinIdentity, imageHash}) {
  if (review?.slug !== slug || review?.topic !== topic || review?.coinIdentity !== coinIdentity || review?.imageSha256 !== imageHash) {
    throw new Error('Coin image review is stale or belongs to a different episode');
  }
  if (review?.matchesCoin !== true || Number(review.confidence) < 0.85 || !review.visibleEvidence?.trim()) {
    throw new Error(`Coin image is not verified as directly relevant to ${coinIdentity}`);
  }
  return true;
}

export async function reviewCoinImage({imagePath, slug, topic, coinIdentity, model='gemma3:4b', baseUrl='http://127.0.0.1:11434'}) {
  const image = readFileSync(imagePath);
  const imageSha256 = sha256(image);
  const prompt = [
    'Inspect this actual image. Do not guess missing details.',
    `Episode topic: ${topic}`,
    `Coin under discussion: ${coinIdentity}`,
    'Decide whether the visible image directly depicts this coin or an explicitly relevant view/set of this coin.',
    'Return JSON only with keys matchesCoin (boolean), confidence (0 to 1), visibleEvidence (short visible details), and reason (short).',
    'Return matchesCoin false when the coin is absent, is a different coin, or identity cannot be supported by visible design/date/inscription. Do not use filenames or captions as evidence.',
  ].join('\n');
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({model, stream: false, format: 'json', options: {temperature: 0}, messages: [{role: 'user', content: prompt, images: [image.toString('base64')]}]}),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Local coin image review failed with HTTP ${response.status}`);
  const envelope = await response.json();
  let result;
  try { result = JSON.parse(envelope.message?.content ?? ''); }
  catch { throw new Error('Local coin image review returned invalid JSON'); }
  const review = {version: 1, slug, topic, coinIdentity, imageSha256, model, reviewedAt: new Date().toISOString(), ...result};
  validateImageReview(review, {slug, topic, coinIdentity, imageHash: imageSha256});
  return review;
}

export async function reviewEpisodeCoinImages(root, slug) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid coin-history slug');
  const article = join(root, 'public/blog', slug);
  const work = join(root, 'content/coin-history', slug);
  const inputs = JSON.parse(readFileSync(join(article, 'production-inputs.json'), 'utf8'));
  if (inputs.coinMediaGateVersion !== 1) return null;
  const meta = JSON.parse(readFileSync(join(article, 'meta.json'), 'utf8'));
  const sourceManifest = JSON.parse(readFileSync(join(article, 'image-sources.json'), 'utf8'));
  const assets = sourceManifest.assets?.filter(entry => entry.role === 'coin evidence') || [];
  if (!assets.length) throw new Error(`${slug}: no coin evidence is recorded for the production image check`);
  const reviewPath = join(work, 'coin-image-relevance.json');
  const baseline = JSON.parse(readFileSync(reviewPath, 'utf8'));
  if (baseline.checkpoint !== 'package-intake' || !Array.isArray(baseline.reviews)) throw new Error(`${slug}: package intake image review is missing`);
  const reviews = [];
  for (const asset of assets) {
    if (!asset.coinIdentity || !asset.path || asset.coinIdentity !== inputs.coinIdentity) {
      throw new Error(`${slug}: every coin evidence image must name the exact episode coin`);
    }
    const imagePath = resolve(article, asset.path);
    const actualHash = sha256(readFileSync(imagePath));
    if (actualHash !== asset.sha256) throw new Error(`${slug}: coin evidence changed after package review`);
    const prior = baseline.reviews.find(entry => entry.imageSha256 === actualHash && entry.coinIdentity === asset.coinIdentity);
    if (!prior) throw new Error(`${slug}: coin evidence image has no matching package intake review`);
    validateImageReview(prior, {slug, topic: meta.title, coinIdentity: asset.coinIdentity, imageHash: actualHash});
    const review = await reviewCoinImage({imagePath, slug, topic: meta.title, coinIdentity: asset.coinIdentity});
    review.source = asset.path;
    review.checkpoint = 'pre-render';
    reviews.push(review);
  }
  const review = {version: 1, slug, topic: meta.title, checkpoint: 'pre-render', reviews, reviewedAt: new Date().toISOString()};
  writeFileSync(reviewPath, JSON.stringify({version: 1, slug, topic: meta.title, checkpoint: 'package-intake-and-pre-render', reviews: [...baseline.reviews, ...reviews], reviewedAt: review.reviewedAt}, null, 2) + '\n');
  const qaPath = join(article, 'qa.json');
  try {
    const qa = JSON.parse(readFileSync(qaPath, 'utf8'));
    qa.coinImageReview = {path: `content/coin-history/${slug}/coin-image-relevance.json`, imagesChecked: reviews.length, reviewedAt: review.reviewedAt, matchesCoin: true, checkpoints: ['package-intake', 'pre-render']};
    writeFileSync(qaPath, JSON.stringify(qa, null, 2) + '\n');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return review;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const slugArg = process.argv.find(arg => arg.startsWith('--slug='));
  if (!slugArg) throw new Error('Usage: node video/scripts/coin-image-relevance.mjs --slug=<coin-history-slug>');
  reviewEpisodeCoinImages(process.cwd(), slugArg.slice('--slug='.length)).then(review => {
    if (review) console.log(`PASS: ${review.reviews.length} coin images match ${review.slug}`);
    else console.log(`SKIP: ${slugArg.slice('--slug='.length)} uses the legacy media gate`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
