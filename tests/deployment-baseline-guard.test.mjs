import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertDeploymentBaselineMatchesMain } from '../scripts/lib/deployment-baseline-guard.mjs';

const root = mkdtempSync(join(tmpdir(), 'fused-baseline-guard-'));
const baseline = join(root, 'baseline');
after(() => rmSync(root, { recursive: true, force: true }));

function git(...args) {
  execFileSync('git', args, { cwd: root, env: {
    ...process.env,
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com',
  } });
}

test('blog deployment blocks stale site code and pages while allowing an explicit asset hold', () => {
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'public/faq'), { recursive: true });
  mkdirSync(join(root, 'public/blog'), { recursive: true });
  writeFileSync(join(root, 'src/worker.js'), 'export default {};\n');
  writeFileSync(join(root, 'wrangler.jsonc'), '{}\n');
  writeFileSync(join(root, 'public/faq/index.html'), '<h1>Current price</h1>\n');
  writeFileSync(join(root, 'public/.assetsignore'), 'blog/scripts\n');
  writeFileSync(join(root, 'public/blog/posts.json'), '[]\n');
  git('init', '-q', '-b', 'main');
  git('add', 'src', 'public', 'wrangler.jsonc');
  git('commit', '-q', '-m', 'fixture');

  for (const path of ['src/worker.js', 'wrangler.jsonc', 'public/faq/index.html', 'public/blog/posts.json', 'public/.assetsignore']) {
    mkdirSync(join(baseline, path, '..'), { recursive: true });
    copyFileSync(join(root, path), join(baseline, path));
  }
  writeFileSync(join(baseline, 'public/.assetsignore'), 'blog/scripts\n/blog/held-post/\n');
  assert.doesNotThrow(() => assertDeploymentBaselineMatchesMain(root, baseline));

  writeFileSync(join(baseline, 'public/faq/index.html'), '<h1>Old price</h1>\n');
  assert.throws(() => assertDeploymentBaselineMatchesMain(root, baseline), /public\/faq\/index\.html/);
  copyFileSync(join(root, 'public/faq/index.html'), join(baseline, 'public/faq/index.html'));

  writeFileSync(join(baseline, 'public/blog/posts.json'), '[{"slug":"retired"}]\n');
  assert.throws(() => assertDeploymentBaselineMatchesMain(root, baseline), /public\/blog\/posts\.json/);
  copyFileSync(join(root, 'public/blog/posts.json'), join(baseline, 'public/blog/posts.json'));

  writeFileSync(join(baseline, 'src/retired.js'), 'export default {};\n');
  assert.throws(() => assertDeploymentBaselineMatchesMain(root, baseline), /src\/retired\.js/);
});
