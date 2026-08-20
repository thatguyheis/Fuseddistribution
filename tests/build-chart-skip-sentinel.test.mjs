import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = resolve('.');
const blogRoot = join(repoRoot, 'public/blog');

test('build-chart rewrites rejected chart output to a skipped sentinel and preserves the rejected payload', () => {
  const slug = 'tmp-chart-skip-sentinel';
  const dir = join(blogRoot, slug);
  mkdirSync(dir, { recursive: true });

  try {
    writeFileSync(join(dir, 'verified.md'), '# Test\n\n## Section\n\nBody with $31.25 and $2,338.\n');
    writeFileSync(join(dir, 'index.html'), '<div class="article-body"><p>Lead paragraph.</p><h2>Section</h2><p>Body.</p></div>\n');
    writeFileSync(join(dir, 'reel-data.md'), '# Reel data\n');
    writeFileSync(join(dir, 'hooks.json'), `${JSON.stringify({
      key_stat: { value: '31.25', label: 'Silver spot price' },
    }, null, 2)}\n`);
    writeFileSync(join(dir, 'chart.json'), `${JSON.stringify({
      schema_version: 2,
      visual_type: 'bar',
      title: 'UNDER 90 CHARS',
      takeaway: 'ONE PLAIN-LANGUAGE SENTENCE',
      source: 'Fused Distribution',
      source_url: 'https://www.fuseddistribution.com/',
      data: [
        {
          label: 'Silver Price vs. Gold Price (July 27, 2024)',
          value: 'Silver: $31.25 per ounce, Gold: $2,338 per ounce',
          metric: 'Price per ounce',
          unit: 'USD/oz',
          period: 'July 27, 2024',
          evidence: 'As of July 27, 2024, the spot price of gold is approximately $2,338 per ounce, while the spot price of silver is around $31.25 per ounce.',
        },
      ],
      hero_stat: {
        value: '31.25',
        label: 'Silver Spot Price (July 27, 2024)',
      },
      narration: 'Narration.',
    }, null, 2)}\n`);

    execFileSync('bash', ['public/blog/scripts/build-chart.sh', slug], { cwd: repoRoot });

    const chart = JSON.parse(readFileSync(join(dir, 'chart.json'), 'utf8'));
    const rejected = JSON.parse(readFileSync(join(dir, 'chart-rejected.json'), 'utf8'));
    assert.equal(chart.skipped, true);
    assert.equal(chart.skip_reason, 'validator_rejected_numeric_visual');
    assert.equal(rejected.visual_type, 'bar');
    assert.equal(rejected.data.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
