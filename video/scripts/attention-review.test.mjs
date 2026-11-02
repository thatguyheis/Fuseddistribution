import test from 'node:test';
import assert from 'node:assert/strict';
import { attentionReviewErrors } from './attention-review.mjs';

const script = `# Reel Script: Example
format: long-form

---
## HOOK
**Duration:** 4s
Narration: Stop asking friends for leads. Try this specific ask instead.

---
## OVERLAY: Give people the words
Narration: Start with who you help and the problem you solve.

---
## OVERLAY: Make one useful introduction
Narration: Offer a short, low-pressure way to connect the right people.

---
## QUESTION
Text: Reconnect or try a local group?
Narration: Choose one in the comments: Reconnect or try a local group?
`;

const review = {
  version: 1,
  pass: true,
  hook: {
    spokenText: 'Stop asking friends for leads. Try this specific ask instead.',
    spokenSeconds: 3,
    startsAtSeconds: 0,
    specificViewerProblemOrBenefit: true,
    visibleWithoutSound: true,
  },
  payoffBeats: [
    {scriptHeading: '## OVERLAY: Give people the words', paysOffHook: true},
    {scriptHeading: '## OVERLAY: Make one useful introduction', paysOffHook: true},
  ],
  cta: {
    onScreenText: 'Reconnect or try a local group?',
    spokenText: 'Choose one in the comments: Reconnect or try a local group?',
    primaryAction: 'comment',
    primaryActionCount: 1,
    fitsViewerValue: true,
  },
  hypothesis: 'A concrete ask script will hold more viewers through the first payoff beat.',
  metrics: {platformMetrics: ['average-watch-time', 'viewed-vs-swiped-away']},
};

test('accepts a concise hook, mapped payoffs, one CTA, and measurable hypothesis', () => {
  assert.deepEqual(attentionReviewErrors(review, script), []);
});

test('rejects vague/long hook, excessive CTA actions, and unmapped payoffs', () => {
  const changed = structuredClone(review);
  changed.hook.spokenText = 'Welcome to our video, today we are talking about networking and how you can use it.';
  changed.cta.primaryActionCount = 3;
  changed.payoffBeats[1].scriptHeading = '## OVERLAY: Missing scene';
  const errors = attentionReviewErrors(changed, script);
  assert.equal(errors.length, 3);
});
