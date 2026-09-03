import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductionStoryboard } from './production-storyboard.mjs';

test('production storyboards always include paper collage and retain existing beats', () => {
  const script = {segments: [
    {type: 'hook', text: 'Hook'}, {type: 'overlay', text: 'Evidence'},
    {type: 'stat', text: '42%'}, {type: 'chart', text: 'Chart'},
    {type: 'overlay', text: 'Implication'}, {type: 'question', text: 'What now?'},
  ]};
  const plan = buildProductionStoryboard(script, 'fixture');
  assert.equal(plan.route, 'storyboard-production');
  assert.ok(plan.segments.some((segment) => segment.visual === 'paper-collage'));
  assert.equal(plan.segments[3].visual, 'chart');
  assert.equal(plan.segments[5].visual, 'question');
  assert.ok(plan.segments.find((segment) => segment.visual === 'paper-collage').message);
});
