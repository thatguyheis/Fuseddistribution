import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// The Fused Buffer publisher owns personal channels, never the client account.
export function assertPersonalContentRoute(root, slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) {
    throw new Error('Personal content routing requires a valid slug');
  }
  const route = JSON.parse(readFileSync(join(root, 'ops/editorial-brand-routing.json'), 'utf8'));
  const personal = route.personal;
  if (!Array.isArray(personal?.allowedMetadataBrands) || !personal.allowedMetadataBrands.length ||
      !Array.isArray(personal.blockedWorkupDirectories) ||
      personal.blockedWorkupDirectories.some(path => path !== 'content/coin-history')) {
    throw new Error('Invalid personal content routing policy');
  }
  const meta = JSON.parse(readFileSync(join(root, 'public/blog', slug, 'meta.json'), 'utf8'));
  if (!personal.allowedMetadataBrands.includes(meta.brand) ||
      personal.blockedWorkupDirectories.some(path => existsSync(join(root, path, slug)))) {
    throw new Error(`${slug}: personal channels are tech only; route coin content through the Coins and Auctions Since 1994 client SOP and account`);
  }
  return { brand: meta.brand, destination: personal.brand };
}
