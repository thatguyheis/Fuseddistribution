import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditCaptionSync, captionNearPoint } from '../video/scripts/auto-caption-review.mjs';

test('automated caption review checks coverage at three points of spoken audio', () => {
  const root = mkdtempSync(join(tmpdir(), 'caption-review-'));
  const dir = join(root, 'video', 'out', 'sample-reel');
  mkdirSync(dir, {recursive:true});
  writeFileSync(join(dir, 'captions-meta.json'), JSON.stringify({mode:'whisper'}));
  writeFileSync(join(dir, 'captions.json'), JSON.stringify([[
    {text:'opening phrase',startSec:0,endSec:1.1},
    {text:'middle phrase',startSec:1.4,endSec:2.2},
    {text:'ending phrase',startSec:2.3,endSec:3.1},
  ]]));
  writeFileSync(join(dir, 'script.json'), JSON.stringify({segments:[{narration:'spoken text'}]}));
  try {
    const result = auditCaptionSync('sample-reel', {root});
    assert.equal(result.pass, true);
    assert.equal(result.method, 'automated-three-point-caption-coverage');
    assert.equal(result.points.length, 3);
  } finally {
    rmSync(root, {recursive:true,force:true});
  }
});

test('caption review tolerates a short silent gap without accepting long uncovered spans', () => {
  const chunks = [
    {text: 'earlier words', startSec: 0, endSec: 3.34},
    {text: 'next words', startSec: 5, endSec: 6},
  ];
  assert.equal(captionNearPoint(chunks, 3.39)?.chunk.text, 'earlier words');
  assert.ok(Math.abs(captionNearPoint(chunks, 3.39).distance - 0.05) < 0.000001);
  assert.equal(captionNearPoint(chunks, 4.2), null);
});
