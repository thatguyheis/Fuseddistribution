import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateReelScript } from './validate-reel.mjs';

const validScript = {
  slug: 'valid-reel',
  title: 'Valid Reel',
  totalDuration: 16,
  segments: [
    { type: 'hook', startSec: 0, endSec: 6, text: 'A CLEAN HOOK', narration: 'This is a clean hook.' },
    { type: 'stat', startSec: 6, endSec: 11, text: '42 PERCENT RESPOND', narration: 'Forty two percent respond faster.' },
    { type: 'question', startSec: 11, endSec: 16, text: 'WHAT WOULD YOU DO', subtext: 'COMMENT BELOW', narration: 'Follow for more silver news.' },
  ],
};

test('accepts a valid render-ready reel script', () => {
  const result = validateReelScript(validScript);
  assert.deepEqual(result.errors, []);
});

test('rejects a question segment with no on-screen text', () => {
  const script = structuredClone(validScript);
  script.segments[2].text = '';
  const result = validateReelScript(script);
  assert(result.errors.some((error) => error.includes('missing on-screen text')));
});

test('rejects markdown citations and URLs in narration before TTS/render', () => {
  const script = structuredClone(validScript);
  script.segments[1].narration = 'Silver moved higher ([Source](https://example.com/report)).';
  const result = validateReelScript(script);
  assert(result.errors.some((error) => error.includes('Markdown link')));
  assert(result.errors.some((error) => error.includes('URL')));
});

test('rejects narration windows that are shorter than the timing rule', () => {
  const script = structuredClone(validScript);
  script.segments[1].endSec = 8;
  script.segments[2].startSec = 8;
  script.segments[1].narration = 'This narration is intentionally long enough to need more than two seconds.';
  const result = validateReelScript(script);
  assert(result.errors.some((error) => error.includes('shorter than narration minimum')));
});
