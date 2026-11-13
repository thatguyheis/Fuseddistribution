import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {BUSINESS_SCENE_ART, generateBusinessSceneArt, renderBusinessSceneSvg, validateBusinessSceneSpec} from './create-business-scene-art.mjs';

const fixture = () => ({
  slug: 'sample-business-reel',
  scenes: [
    {id: 'hook', kind: 'hook', eyebrow: 'WEEKLY CHECK', headline: 'Can one number guide your next move?', panel: {title: 'COMPARE THE SAME PERIOD', items: [{label: 'Leads', value: '30'}, {label: 'Customers', value: '6'}]}},
    {id: 'chart-beat', kind: 'body', eyebrow: 'SAMPLE COMPARISON', headline: 'Use the right denominator', reservedGraphic: true},
    {id: 'next-step', kind: 'cta', eyebrow: 'ONE ACTION', headline: 'Which number do you check first?'}
  ],
});

function luminance(hex) {
  const channels = hex.match(/[\da-f]{2}/gi).map((value) => parseInt(value, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('business scene colors meet the requested text contrast on the navy canvas', () => {
  assert.ok(contrastRatio(BUSINESS_SCENE_ART.white, BUSINESS_SCENE_ART.background) >= 4.5);
  assert.ok(contrastRatio(BUSINESS_SCENE_ART.cyan, BUSINESS_SCENE_ART.background) >= 4.5);
});

test('scene art fills 9:16, keeps headings in the middle band, and leaves reserved graphics unobstructed', () => {
  const spec = fixture();
  const hook = renderBusinessSceneSvg(spec.scenes[0]);
  const reserved = renderBusinessSceneSvg(spec.scenes[1]);
  assert.match(hook, /width="1080" height="1920" viewBox="0 0 1080 1920"/);
  assert.match(hook, /fill="#0A1A2A"/);
  assert.match(hook, /font-size="(?:6[4-9]|7[0-9]|80)"/);
  assert.match(hook, /Can one number guide/);
  assert.doesNotMatch(hook, /VISUAL FOCUS|KEY IDEA/);
  const textCoordinates = [...hook.matchAll(/<text[^>]*\bx="(\d+)"[^>]*\by="(\d+)"/g)].map((match) => ({x: Number(match[1]), y: Number(match[2])}));
  assert.ok(textCoordinates.length > 0);
  assert.ok(textCoordinates.every(({x, y}) => x <= BUSINESS_SCENE_ART.socialSafeRight && y < BUSINESS_SCENE_ART.captionSafeTop));
  assert.match(reserved, /y="620"/);
  assert.doesNotMatch(reserved, /VISUAL FOCUS|KEY IDEA|COMPARE THE SAME PERIOD/);
  assert.equal(spec.scenes[1].reservedGraphic, true);
});

test('panel copy uses readable sans text, two-line column wrapping, and rejects overflow', () => {
  const scene = fixture().scenes[0];
  scene.panel = {title: 'A short comparison', items: [{label: 'New paying customers', value: 'Six in this example'}, {label: 'Marketing cost', value: '$600 for the period'}]};
  const svg = renderBusinessSceneSvg(scene);
  assert.match(svg, /font-family="Arial, Helvetica, sans-serif"/);
  assert.match(svg, /font-size="32"/);
  assert.match(svg, /font-size="40"/);
  assert.match(svg, /Six in this/);
  const tooWide = fixture().scenes[0];
  tooWide.panel = {title: 'Comparison', items: [{label: 'Supercalifragilisticexpialidocious', value: 'An example'}]};
  assert.throws(() => renderBusinessSceneSvg(tooWide), /too wide to fit/);
});

test('a dense three-row panel ends above the 1400px chart bound', () => {
  const scene = fixture().scenes[0];
  scene.panel = {
    title: 'Comparison across a review period',
    items: [
      {label: 'Marketing investment', value: '$600 approved budget'},
      {label: 'New paying customers', value: '6 customers after 30 leads'},
      {label: 'Conversion from leads', value: 'Compare the same period'},
    ],
  };
  const svg = renderBusinessSceneSvg(scene);
  const panel = svg.match(/<rect x="150" y="885" width="780" height="(\d+)"/);
  assert.ok(panel);
  assert.ok(885 + Number(panel[1]) <= BUSINESS_SCENE_ART.graphicBottomLimit);
  assert.ok(885 + Number(panel[1]) <= 1400);
});

test('spec validation rejects unsafe ids, copy overflow, duplicate ids and invalid scene order', () => {
  const invalidId = fixture();
  invalidId.scenes[0].id = '../hook';
  assert.throws(() => validateBusinessSceneSpec(invalidId), /kebab-case id/);

  const longHeadline = fixture();
  longHeadline.scenes[0].headline = 'M'.repeat(91);
  assert.throws(() => validateBusinessSceneSpec(longHeadline), /exceeds 90 characters/);

  const duplicate = fixture();
  duplicate.scenes[2].id = duplicate.scenes[0].id;
  assert.throws(() => validateBusinessSceneSpec(duplicate), /unique/);

  const badOrder = fixture();
  badOrder.scenes[0].kind = 'body';
  assert.throws(() => validateBusinessSceneSpec(badOrder), /first scene must be a hook/);
});

test('generator emits vector, full-size JPEGs and a source-hashed profile plan under the requested output directory', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fused-business-art-'));
  const output = join(root, 'outputs', 'sample-business-reel');
  mkdirSync(output, {recursive: true});
  const generated = await generateBusinessSceneArt(fixture(), output, root);
  assert.equal(generated.plan.profile, 'business-growth-v1');
  assert.deepEqual(generated.plan.safeZones, {width: 1080, height: 1920, captionBottomClearancePx: 250, socialUiRightClearancePx: 150});
  assert.equal(generated.plan.segments[1][0].fullFrame, true);
  assert.equal(generated.plan.segments[1][0].reservedGraphic, true);
  for (const scene of generated.scenes) {
    const metadata = await sharp(scene.jpg).metadata();
    assert.deepEqual([metadata.width, metadata.height], [1080, 1920]);
    assert.match(readFileSync(scene.svg, 'utf8'), /<svg/);
  }
  const planBytes = readFileSync(generated.planPath);
  const expected = createHash('sha256').update(readFileSync(generated.scenes[0].jpg)).digest('hex');
  assert.equal(generated.plan.segments[0][0].sha256, expected);
  assert.ok(planBytes.includes(Buffer.from('business-growth-v1')));
});

test('unadorned scenes never receive a decorative target-circle fallback',()=>{
 const scene={id:'plain',kind:'body',eyebrow:'ONE LESSON',headline:'Show a meaningful comparison'};
 const svg=renderBusinessSceneSvg(scene);
 assert.doesNotMatch(svg, /r="105"|r="56"|cy="1290"|cy="1180"/);
});
