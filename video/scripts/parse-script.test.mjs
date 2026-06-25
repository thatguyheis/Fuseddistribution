import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReelScript } from './parse-script.mjs';

const MD = `# Reel Script: Test Post
Generated: 2026-05-25
Target length: 52 seconds

---

## HOOK (0–3s)
30% won't consider you.

---

## BODY

**Overlay 1** (3–13s)
Text: 97% search online first.
Narration: Before anyone calls you, they look you up.

**Chart** (13–30s)
Title: How customers research
Bars:
- Online search: 87%
- Online reviews: 76%
- Social media: 48%
Narration: This is how people decide.

---

## CTA (46–52s)
Text: Full guide — link in comments.
Narration: Full breakdown in the comments.

---

## VISUAL DIRECTION
Hook: Black screen.

## FACEBOOK CAPTION
Some caption.

## HASHTAGS
#test
`;

test('parses title, slug, and duration', () => {
  const r = parseReelScript(MD, 'test-post');
  assert.equal(r.title, 'Test Post');
  assert.equal(r.slug, 'test-post');
  assert.equal(r.totalDuration, 52);
});

test('parses hook segment', () => {
  const { segments } = parseReelScript(MD, 'test-post');
  assert.equal(segments[0].type, 'hook');
  assert.equal(segments[0].startSec, 0);
  assert.equal(segments[0].endSec, 3);
  assert.equal(segments[0].text, "30% won't consider you.");
  assert.equal(segments[0].narration, null);
});

test('parses overlay segment', () => {
  const { segments } = parseReelScript(MD, 'test-post');
  assert.equal(segments[1].type, 'overlay');
  assert.equal(segments[1].startSec, 3);
  assert.equal(segments[1].endSec, 13);
  assert.equal(segments[1].text, '97% search online first.');
  assert.equal(segments[1].narration, 'Before anyone calls you, they look you up.');
});

test('parses chart segment with bars', () => {
  const { segments } = parseReelScript(MD, 'test-post');
  assert.equal(segments[2].type, 'chart');
  assert.equal(segments[2].title, 'How customers research');
  assert.equal(segments[2].bars.length, 3);
  assert.deepEqual(segments[2].bars[0], { label: 'Online search', value: 87 });
  assert.deepEqual(segments[2].bars[2], { label: 'Social media', value: 48 });
});

test('parses CTA segment', () => {
  const { segments } = parseReelScript(MD, 'test-post');
  const cta = segments[segments.length - 1];
  assert.equal(cta.type, 'cta');
  assert.equal(cta.startSec, 46);
  assert.equal(cta.endSec, 52);
  assert.equal(cta.text, 'Full guide — link in comments.');
  assert.equal(cta.narration, 'Full breakdown in the comments.');
});

test('excludes VISUAL DIRECTION, FACEBOOK CAPTION, HASHTAGS from segments', () => {
  const { segments } = parseReelScript(MD, 'test-post');
  assert.equal(segments.length, 4); // hook + overlay + chart + cta
});


const LONG_FORM_MD = `# Reel Script: Compact
format: long-form
segments: 2

---

## HOOK

**Visual:** Topic intro shot
**Duration:** 5s minimum (7 words / 2.5 + 2)

Narration: Clean hook narration.

---

## QUESTION

**Visual:** Question card
**Duration:** 5s minimum (6 words / 2.5 + 2)

Text: WHAT WOULD YOU DO
Subtext: COMMENT BELOW
Narration: Follow for more silver news.
`;

test('parses compact long-form question text and subtext', () => {
  const { segments } = parseReelScript(LONG_FORM_MD, 'compact-post', 'hook: Clean hook text');
  const question = segments[segments.length - 1];
  assert.equal(question.type, 'question');
  assert.equal(question.text, 'WHAT WOULD YOU DO');
  assert.equal(question.subtext, 'COMMENT BELOW');
  assert.equal(question.narration, 'WHAT WOULD YOU DO? Follow for more silver news.');
});

test('strips delimiter leaks and parses explicit overlay segments', () => {
  const md = `# Reel Script: Clean\nformat: long-form\n\n---\n\n## OVERLAY: THREE PRACTICAL STEPS\n\n**Duration:** 8s minimum\n\nNarration: --- Start with the first step. ---\n\n---\n\n## QUESTION\n\n**Duration:** 6s minimum\n\nText: READY TO START?\nNarration: Follow for more tips to grow your business.`;
  const {segments} = parseReelScript(md, 'clean', 'hook: Start here');
  assert.equal(segments[0].type, 'overlay');
  assert.equal(segments[0].narration, 'Start with the first step.');
});
