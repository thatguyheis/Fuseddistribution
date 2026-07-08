import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  numericToken, valueInText, unitOf, validateChart,
  renderChartHtml, injectIntoHtml, reelChartSection, injectIntoReelData,
} from './build-chart-inject.mjs';

test('numericToken extracts number from formatted values', () => {
  assert.equal(numericToken('~$6.00'), '6.00');
  assert.equal(numericToken('92%'), '92');
  assert.equal(numericToken('1,200'), '1200');
  assert.equal(numericToken('no number'), null);
});

test('valueInText requires the exact token with boundaries', () => {
  assert.equal(valueInText('92%', 'trust sits at 92% among consumers'), true);
  assert.equal(valueInText('9%', 'a 92% majority'), false);
  assert.equal(valueInText('6', 'costs 60 dollars'), false);
  assert.equal(valueInText('$1,200', 'premium of $1,200 per year'), true);
});

test('unitOf classifies value units', () => {
  assert.equal(unitOf('92%'), '%');
  assert.equal(unitOf('~$6.00'), '$');
  assert.equal(unitOf('150'), 'plain');
});

test('validateChart rejects fabricated values and mixed units', () => {
  const src = 'Eagles cost ~$6.00 while bars cost $1.50 and rounds $2.00.';
  const good = { title: 'Premiums', bars: [
    { label: 'Eagle', value: '$6.00' }, { label: 'Round', value: '$2.00' }, { label: 'Bar', value: '$1.50' },
  ]};
  assert.deepEqual(validateChart(good, src), []);
  const fabricated = { ...good, bars: [...good.bars.slice(0, 2), { label: 'Bar', value: '$9.99' }] };
  assert.ok(validateChart(fabricated, src).some(e => e.includes('not found')));
  const mixed = { ...good, bars: [...good.bars.slice(0, 2), { label: 'Bar', value: '50%' }] };
  assert.ok(validateChart(mixed, src).some(e => e.includes('mixed units')));
});

test('validateChart enforces 3-6 bars', () => {
  const src = 'a 10% b 20%';
  const errs = validateChart({ title: 'T', bars: [{ label: 'a', value: '10%' }, { label: 'b', value: '20%' }] }, src);
  assert.ok(errs.some(e => e.includes('3-6 bars')));
});

test('renderChartHtml uses SOP bar math: width = round(pct/100*447)', () => {
  const html = renderChartHtml({ title: 'T', bars: [
    { label: 'A', value: '92%' }, { label: 'B', value: '46%' }, { label: 'C', value: '23%' },
  ]}, 'test-slug');
  assert.ok(html.includes('width="447"'));   // max value gets full width
  assert.ok(html.includes('width="224"'));   // 46/92*447 = 223.5 -> 224
  assert.ok(html.includes('class="chart-wrap"'));
  assert.ok(html.includes('role="img"'));
});

test('renderChartHtml sorts bars descending and escapes XML', () => {
  const html = renderChartHtml({ title: 'A & B', bars: [
    { label: 'Low <tag>', value: '10%' }, { label: 'High', value: '90%' }, { label: 'Mid', value: '50%' },
  ]}, 's');
  assert.ok(html.indexOf('HIGH') < html.indexOf('MID'));
  assert.ok(html.includes('A &amp; B'));
  assert.ok(html.includes('&lt;TAG&gt;'));
});

test('injectIntoHtml places chart before 3rd h2 and is idempotent', () => {
  const doc = '<h2>a</h2><p>1</p><h2>b</h2><p>2</p><h2>c</h2><p>3</p>';
  const r1 = injectIntoHtml(doc, '<div class="chart-wrap">X</div>');
  assert.equal(r1.where, 'before-h2-3');
  assert.ok(r1.html.indexOf('chart-wrap') < r1.html.indexOf('<h2>c</h2>'));
  const r2 = injectIntoHtml(r1.html, '<div class="chart-wrap">Y</div>');
  assert.equal(r2.where, 'already-present');
});

test('injectIntoHtml falls back to sources block', () => {
  const doc = '<h2>a</h2><p>1</p><div class="sources-block">s</div>';
  const r = injectIntoHtml(doc, '<div class="chart-wrap">X</div>');
  assert.equal(r.where, 'before-sources');
});

test('reelChartSection emits SOP format and injectIntoReelData places before question', () => {
  const section = reelChartSection({ title: 'Premiums Over Spot', narration: 'Eagles cost the most.', bars: [
    { label: 'Eagle', value: '$6.00' }, { label: 'Round', value: '$2.00' }, { label: 'Bar', value: '$1.50' },
  ]});
  assert.ok(section.startsWith('## chart\ntitle: Premiums Over Spot'));
  assert.ok(section.includes('  - Eagle: $6.00'));
  const md = '# Reel Data\nhook: x\n\n## segments\n- type: overlay\n\n## question\ntext: q\n';
  const r = injectIntoReelData(md, section);
  assert.equal(r.where, 'before-question');
  assert.ok(r.md.indexOf('## chart') < r.md.indexOf('## question'));
  assert.equal(injectIntoReelData(r.md, section).where, 'already-present');
});
