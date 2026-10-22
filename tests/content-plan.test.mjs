import assert from 'node:assert/strict';
import test from 'node:test';
import { assembleArticle, cleanSegment, segmentIsUsable } from '../public/blog/scripts/write-segmented-article.mjs';
import { validateContentPlan } from '../public/blog/scripts/lib/content-plan.mjs';
import { extractJson, scoreResponse } from '../scripts/benchmark-leaf-models.mjs';
import { extractObject, validateTaskOutput } from '../scripts/local-content-subagent.mjs';

function plan() {
  const sections = Array.from({ length: 8 }, (_, index) => ({
    id: `s0${index + 1}`,
    heading: `Practical topic ${index + 1}`,
    readerQuestion: `What should the reader do for topic ${index + 1}?`,
    purpose: `Give a distinct practical answer for topic ${index + 1}.`,
    keyPoints: [`Action ${index + 1}`, `Check ${index + 1}`],
    targetWords: 140,
  }));
  return {
    version: 1,
    slug: 'planned-post',
    title: 'A Planned Post',
    brand: 'tech',
    readerPromise: 'Show the reader how to complete one useful job.',
    reel: { topic: 'The first practical fix', promise: 'Complete the first fix', sectionIds: ['s01', 's02', 's03', 's04'] },
    sections,
  };
}

test('validates a complete master plan and rejects an undersized Reel cluster', () => {
  assert.deepEqual(validateContentPlan(plan(), 'planned-post'), []);
  const invalid = plan();
  invalid.reel.sectionIds = ['s01', 's02', 's03'];
  assert.match(validateContentPlan(invalid).join('\n'), /4-6 section IDs/);
});

test('allows compact coin-history plans without duplicate why-it-mattered sections', () => {
  const value = plan();
  value.editorialProfile = 'coin-history';
  value.sections = value.sections.slice(0, 4).map((section, index) => ({
    ...section,
    id: `s0${index + 1}`,
    targetWords: 180,
    evidenceClaims: [`claim-${index + 1}`, `claim-${index + 5}`],
  }));
  assert.deepEqual(validateContentPlan(value, 'planned-post'), []);
  value.sections[0].heading = value.sections[1].heading;
  assert.match(validateContentPlan(value).join('\n'), /heading must be unique/);
});

test('validates three distinct optional short topics without replacing the long form', () => {
  const complete = plan();
  complete.reel.shortTopics = [
    { id: 'short-01', topic: 'Topic one', promise: 'Answer one', sectionIds: ['s01'] },
    { id: 'short-02', topic: 'Topic two', promise: 'Answer two', sectionIds: ['s02', 's03'] },
    { id: 'short-03', topic: 'Topic three', promise: 'Answer three', sectionIds: ['s04'] },
  ];
  assert.deepEqual(validateContentPlan(complete, 'planned-post'), []);
  complete.reel.shortTopics.pop();
  assert.match(validateContentPlan(complete).join('\n'), /shortTopics must contain exactly 3 items/);
});

test('cleans model wrappers and assembles stable section headings', () => {
  const cleaned = cleanSegment('```markdown\n## Ignore me\n\nUseful body text without a wrapper.\n```');
  assert.equal(cleaned, 'Useful body text without a wrapper.');
  assert.equal(segmentIsUsable(`${'Useful words '.repeat(110)}`), true);
  const sourcePlan = plan();
  const bodies = new Map(sourcePlan.sections.map((section) => [section.id, 'Specific section body.']));
  const article = assembleArticle(sourcePlan, 'Opening body.', bodies);
  assert.equal((article.match(/^## /gm) || []).length, 8);
});

test('scores strict leaf-worker JSON independently from prose quality', () => {
  const raw = '{"category":"content_repair","action":"Add one internal link.","reel_hook":"Fix this page first","section_plan":["Find page","Add link","Verify target"]}';
  assert.equal(extractJson(raw).category, 'content_repair');
  assert.equal(scoreResponse(raw, 2).score, 100);
  assert.equal(scoreResponse(`\`\`\`json\n${raw}\n\`\`\``, 50).score, 80);
});

test('validates bounded advisory sub-agent output', () => {
  const raw = '```json\n{"summary":"Two repairs","repairs":[{"category":"content_repair","items":["missing link"],"action":"Add one verified internal link"}]}\n```';
  const value = extractObject(raw);
  assert.equal(validateTaskOutput('qa-triage', value), true);
  assert.equal(validateTaskOutput('fitness-mutation', value), false);
});
