import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const excludedPublicPrefixes = ['public/blog/', 'public/photos/', 'public/reels/', 'public/reels-x/', 'public/data/'];
const excludedPublicFiles = new Set(['public/.assetsignore', 'public/sitemap.xml']);

function isCorePath(path) {
  return path === 'wrangler.jsonc' || path === 'public/blog/posts.json' || path === 'public/blog/index.html' || path.startsWith('src/') ||
    (path.startsWith('public/') && !excludedPublicFiles.has(path) &&
      !excludedPublicPrefixes.some(prefix => path.startsWith(prefix)));
}

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, maxBuffer: 16 * 1024 * 1024 });
}

function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => join(entry.parentPath, entry.name));
}

export function assertDeploymentBaselineMatchesMain(root, baseline) {
  const branch = git(root, 'branch', '--show-current').toString().trim();
  if (branch !== 'main') throw new Error(`Blog deployment requires main; current branch is ${branch || 'detached HEAD'}`);

  const committedPaths = git(root, 'ls-tree', '-r', '--name-only', 'HEAD', '--', 'src', 'public', 'wrangler.jsonc')
    .toString().trim().split('\n').filter(isCorePath);
  const drift = [];
  for (const path of committedPaths) {
    const snapshot = join(baseline, path);
    const committed = git(root, 'show', `HEAD:${path}`);
    if (!existsSync(snapshot) || !readFileSync(snapshot).equals(committed)) drift.push(path);
  }

  const committedSourcePaths = new Set(committedPaths.filter(path => path.startsWith('src/')));
  for (const file of filesUnder(join(baseline, 'src'))) {
    const path = relative(baseline, file);
    if (!committedSourcePaths.has(path)) drift.push(path);
  }

  const committedCorePaths = new Set(committedPaths);
  for (const file of filesUnder(join(baseline, 'public'))) {
    const path = relative(baseline, file);
    if (isCorePath(path) && !committedCorePaths.has(path)) drift.push(path);
  }

  const sourceIgnore = git(root, 'show', 'HEAD:public/.assetsignore').toString().split('\n');
  const snapshotIgnorePath = join(baseline, 'public/.assetsignore');
  const snapshotIgnore = existsSync(snapshotIgnorePath) ? readFileSync(snapshotIgnorePath, 'utf8').split('\n') : [];
  if (sourceIgnore.some(line => line && !snapshotIgnore.includes(line))) drift.push('public/.assetsignore');

  if (drift.length) {
    throw new Error(`Deployment baseline differs from committed main: ${drift.slice(0, 12).join(', ')}` +
      (drift.length > 12 ? `, and ${drift.length - 12} more` : '') +
      '. Refresh the baseline from main before deploying a blog post.');
  }
}
