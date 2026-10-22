import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function editorialRegenerationBlocked(root, slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Invalid slug');
  for (const base of ['public/blog', '.workflow-state/deployment-baseline/public/blog']) {
    const path = join(root, base, slug, 'qa.json');
    if (!existsSync(path)) continue;
    let qa;
    try { qa = JSON.parse(readFileSync(path, 'utf8')); }
    catch { throw new Error(`Unreadable editorial record: ${path}`); }
    // A changed local package must not erase the reviewed baseline's protection.
    if (qa.slug === slug && qa.mode === 'codex-editorial' && qa.pass === true) return true;
  }
  return false;
}
