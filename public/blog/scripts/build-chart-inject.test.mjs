import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  numericToken, valueInText, unitOf, evidenceInText, validateChart,
  renderChartHtml, renderBeforeAfterHtml, renderStatCardsHtml,
  injectIntoHtml, reelChartSection, injectIntoReelData,
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

test('schema v2 rejects a polished mixed-stat bar chart even when every value exists', () => {
  const src = 'Silver fell 6.2%. Gold fell 4.8%. DXY rose 2.1%. Mine supply was 70%. RSI was 38%.';
  const data = [
    { label: 'Silver decline', value: '6.2%', metric: 'price decline', unit: '%', period: 'July 2023', evidence: 'Silver fell 6.2%.' },
    { label: 'Gold decline', value: '4.8%', metric: 'price decline', unit: '%', period: 'July 2023', evidence: 'Gold fell 4.8%.' },
    { label: 'Dollar move', value: '2.1%', metric: 'index change', unit: '%', period: 'July 2023', evidence: 'DXY rose 2.1%.' },
    { label: 'Mine supply', value: '70%', metric: 'supply share', unit: '%', period: '2023', evidence: 'Mine supply was 70%.' },
    { label: 'RSI', value: '38%', metric: 'technical indicator', unit: '%', period: 'July 2023', evidence: 'RSI was 38%.' },
  ];
  const chart = { schema_version: 2, visual_type: 'bar', title: 'Bad Key Stats', source: 'Example', source_url: 'https://example.com/data', data };
  const errors = validateChart(chart, src);
  assert.ok(errors.some(error => error.includes('mixed metrics')));
  assert.ok(errors.some(error => error.includes('shared period')));
});

test('schema v2 requires a valid HTTPS source and verbatim evidence', () => {
  const src = 'The annual average forecast is $63.20.';
  const item = { label: 'LBBW', value: '$63.20', metric: 'annual average forecast', unit: 'USD/oz', period: '2026', evidence: 'The annual average forecast is $63.20.' };
  const chart = { schema_version: 2, visual_type: 'bar', title: 'Forecasts', source: 'LBMA', source_url: 'SOURCED STATS prompt text', data: [item, { ...item, label: 'B' }, { ...item, label: 'C' }] };
  assert.ok(evidenceInText(item.evidence, src));
  assert.ok(validateChart(chart, src).some(error => error.includes('valid HTTPS')));
  const fabricated = { ...chart, source_url: 'https://www.lbma.org.uk/', data: chart.data.map(value => ({ ...value, evidence: 'A different unsupported sentence with $63.20.' })) };
  assert.ok(validateChart(fabricated, src).some(error => error.includes('evidence not found')));
});

test('before_after accepts two observations of one metric and renders named periods', () => {
  const first = 'Silver began Q2 at $74.870 per ounce.';
  const last = 'Silver ended June at $58.795 per ounce.';
  const chart = {
    schema_version: 2, visual_type: 'before_after', title: 'Q2 Silver Price Change', takeaway: 'The two endpoints show the direction without comparing unrelated percentages.',
    source: 'LBMA Q2 2026 Market Report', source_url: 'https://www.lbma.org.uk/articles/lbma-precious-metals-market-report-q2-2026',
    data: [
      { label: 'Quarter start', value: '$74.870', metric: 'silver price', unit: 'USD/oz', period: 'April 1, 2026', evidence: first },
      { label: 'Quarter end', value: '$58.795', metric: 'silver price', unit: 'USD/oz', period: 'June 30, 2026', evidence: last },
    ], hero_stat: { value: '$58.795', label: 'Quarter-end silver price' },
  };
  assert.deepEqual(validateChart(chart, `${first} ${last}`), []);
  const html = renderBeforeAfterHtml(chart);
  assert.ok(html.includes('visual-type-before-after'));
  assert.ok(html.includes('April 1, 2026'));
  assert.ok(html.includes('lbma.org.uk'));
});

test('stat_cards permits distinct metrics because geometry does not compare magnitude', () => {
  const src = 'Industrial demand is 650 Moz. Physical investment is up 20%.';
  const chart = {
    schema_version: 2, visual_type: 'stat_cards', title: 'Market Context', takeaway: 'Each card is a separate fact.',
    source: 'Silver Institute', source_url: 'https://silverinstitute.org/report',
    data: [
      { label: 'Industrial demand', value: '650 Moz', metric: 'industrial demand', unit: 'Moz', period: '2026 forecast', evidence: 'Industrial demand is 650 Moz.' },
      { label: 'Physical investment', value: '20%', metric: 'investment growth', unit: '%', period: '2026 forecast', evidence: 'Physical investment is up 20%.' },
    ],
  };
  assert.deepEqual(validateChart(chart, src), []);
  assert.ok(renderStatCardsHtml(chart).includes('visual-type-stat-cards'));
  assert.equal(reelChartSection(chart), '');
});

test('renderChartHtml uses SOP bar math: width = round(pct/100*447)', () => {
  const html = renderChartHtml({ title: 'T', bars: [
    { label: 'A', value: '92%' }, { label: 'B', value: '46%' }, { label: 'C', value: '23%' },
  ]}, 'test-slug');
  assert.ok(html.includes('width="447"'));   // max value gets full width
  assert.ok(html.includes('width="224"'));   // 46/92*447 = 223.5 -> 224
  assert.ok(html.includes('class="chart-wrap visual-type-bar"'));
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

test('reelChartSection emits percent-bar SOP format and injectIntoReelData places before question', () => {
  const section = reelChartSection({ title: 'Response Rates', narration: 'Email leads the comparison.', bars: [
    { label: 'Email', value: '60%' }, { label: 'SMS', value: '40%' }, { label: 'Mail', value: '20%' },
  ]});
  assert.ok(section.startsWith('## chart\ntitle: Response Rates'));
  assert.ok(section.includes('  - Email: 60%'));
  const md = '# Reel Data\nhook: x\n\n## segments\n- type: overlay\n\n## question\ntext: q\n';
  const r = injectIntoReelData(md, section);
  assert.equal(r.where, 'before-question');
  assert.ok(r.md.indexOf('## chart') < r.md.indexOf('## question'));
  assert.equal(injectIntoReelData(r.md, section).where, 'already-present');
});
