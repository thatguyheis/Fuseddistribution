import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'data', 'paper-collage-pilot.json'), 'utf8'));

test('paper collage pilot stays local and uses the approved five second format', () => {
  assert.equal(manifest.approvedLocalOnly, true);
  assert.equal(manifest.durationSeconds, 5);
  assert.equal(manifest.fps, 30);
  assert.deepEqual([manifest.width, manifest.height], [720, 1280]);
  assert.match(manifest.imagePath, /^video\/public\//);
  assert.doesNotMatch(JSON.stringify(manifest), /GEMINI|VEO|https?:\/\//i);
});

test('pilot composition and render script are present', () => {
  assert.equal(existsSync(join(root, 'src', 'compositions', 'PaperCollagePilot.tsx')), true);
  assert.equal(existsSync(join(root, 'scripts', 'paper-collage-pilot.mjs')), true);
  assert.equal(existsSync(join(root, 'scripts', 'paper-collage-qa.mjs')), true);
});
