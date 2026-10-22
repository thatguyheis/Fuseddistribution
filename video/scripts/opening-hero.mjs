import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export function stageOpeningHero(root, slug, approvedHash) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid reel slug');
  const articleDir = join(root, 'public/blog', slug);
  const source = join(articleDir, 'hero.jpg');
  const destinationName = `${slug}.jpg`;
  const sourceManifestPath = join(articleDir, 'image-sources.json');
  if (existsSync(sourceManifestPath)) {
    const manifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
    const coinEvidence = manifest.assets?.find(asset => asset.role === 'coin evidence');
    if (coinEvidence) {
      const evidencePath = join(articleDir, coinEvidence.path);
      const evidenceHash = createHash('sha256').update(readFileSync(evidencePath)).digest('hex');
      const trustedSource = coinEvidence.sourceType === 'owner-supplied'
        || (coinEvidence.sourceType === 'Wikimedia Commons'
          && coinEvidence.page?.startsWith('https://commons.wikimedia.org/wiki/File:')
          && /public domain/i.test(coinEvidence.license || ''));
      if (!trustedSource || evidenceHash !== coinEvidence.sha256 || !coinEvidence.label?.trim()) {
        throw new Error('Owner coin evidence failed source manifest verification');
      }
      const role = coinEvidence.sourceType === 'owner-supplied' ? 'owner-coin-evidence' : 'verified-coin-evidence';
      return stage(root, slug, evidencePath, evidenceHash, `${slug}-coin-evidence.jpg`, role);
    }
  }
  const sha256 = createHash('sha256').update(readFileSync(source)).digest('hex');
  if (sha256 !== approvedHash) throw new Error('Opening hero does not match editorial approval');
  return stage(root, slug, source, sha256, destinationName, 'editorial-hero');
}

function stage(root, slug, source, sha256, destinationName, role) {
  const directory = join(root, 'video/public/heroes');
  mkdirSync(directory, {recursive: true});
  copyFileSync(source, join(directory, destinationName));
  return {src: `heroes/${destinationName}`, sha256, role, holdSeconds: 1, fadeSeconds: 0.2};
}
