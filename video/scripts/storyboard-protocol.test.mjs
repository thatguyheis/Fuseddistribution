import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateStoryboardProtocol } from './storyboard-protocol.mjs';

const planPath = join(import.meta.dirname, '..', 'out', 'silver-price-history-and-long-term-trends', 'storyboard.json');

test('storyboard pilot plan satisfies visual variety and chart clarity rules', () => {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  assert.equal(validateStoryboardProtocol(plan), plan);
  assert.ok(plan.segments.filter((segment) => segment.visual === 'data-board').length >= 3);
});

test('storyboard protocol rejects an unlabeled chart', () => {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  const broken = structuredClone(plan);
  broken.segments.find((segment) => segment.visual === 'data-board').dataBoard.axisLabel = '';
  assert.throws(() => validateStoryboardProtocol(broken), /requires an axisLabel/);
});

test('storyboard protocol rejects a graph without both axis labels', () => {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  const broken = structuredClone(plan);
  const board = broken.segments.find((segment) => segment.dataBoard?.chartType === 'line').dataBoard;
  board.xAxisLabel = '';
  assert.throws(() => validateStoryboardProtocol(broken), /requires an xAxisLabel/);
  board.xAxisLabel = 'YEAR OR PERIOD';
  board.yAxisLabel = '';
  assert.throws(() => validateStoryboardProtocol(broken), /requires a yAxisLabel/);
});
