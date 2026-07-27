import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSocialCopyQuality, socialCopyQualityIssues } from '../public/blog/scripts/lib/social-copy-quality.mjs';

test('blocks caption-generation meta instructions', () => {
  const copy = { reel: { instagram: 'Here are two punchy captions, keeping to your specifications: 1. Buy silver.' } };
  assert.deepEqual(socialCopyQualityIssues(copy), [
    { path: 'social-copy.reel.instagram', reason: 'meta_instruction_leak' },
  ]);
  assert.throws(() => assertSocialCopyQuality(copy, 'test-slug'), /meta-instructions/);
});

test('accepts customer-facing social copy', () => {
  const copy = { reel: { instagram: 'Mexico supplies 24% of global silver. Learn why production concentration matters.' } };
  assert.doesNotThrow(() => assertSocialCopyQuality(copy, 'test-slug'));
});
