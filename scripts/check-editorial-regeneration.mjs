import { fileURLToPath } from 'node:url';
import { editorialRegenerationBlocked } from './lib/editorial-regeneration.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
if (editorialRegenerationBlocked(root, process.argv[2] ?? '')) {
  console.error('BLOCKED: owner-reviewed package requires scoped editorial revision, not model regeneration');
  process.exitCode = 1;
}
