import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('reel blog audit reports reconciliation fields and unresolved blockers', () => {
  const script = join(process.cwd(), 'scripts', 'reel-blog-audit.mjs');
  assert.equal(existsSync(script), true);
  const result = spawnSync(process.execPath, [script, '--json'], { encoding: 'utf8' });
  const report = JSON.parse(result.stdout);
  assert.equal(typeof report.renderedReels, 'number');
  assert.equal(typeof report.pendingPanels, 'number');
  assert.equal(Array.isArray(report.releaseBlocked), true);
  assert.equal(Array.isArray(report.missingPanels), true);
});
