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
  assert.equal(plan.segments[0].asset, 'photos/fixture/editorial-hero.jpg');
  assert.equal(plan.segments[0].message, 'Hook');
  assert.equal(plan.version, 3);
});

test('selected imagery gets a visible media feature while charts remain intact', () => {
  const script={segments:[{type:'hook',text:'Hook'},{type:'overlay',text:'Evidence'},{type:'chart',title:'Data'}]};
  const media={0:{type:'photo',source:'open-generative-ai-local'},1:{type:'video',source:'pexels'}};
  const plan=buildProductionStoryboard(script,'fixture',media);
  assert.equal(plan.segments[0].visual,'media-feature');
  assert.equal(plan.segments[1].visual,'media-feature');
  assert.equal(plan.segments[2].visual,'chart');
});
