import {approvedOwnerHook} from './lib/owner-hook.mjs';
import {hookDurationLimit} from './lib/hook-duration-limit.mjs';
import {fileURLToPath} from 'node:url';
function wordCount(value) {
  return String(value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function section(source, headings) {
  return source.split(/\n---\n/).find(block => new RegExp(`^## (?:${headings})\\b`, 'm').test(block)) ?? '';
}

function field(block, name) {
  return block.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
}

export function attentionReviewErrors(review, scriptText) {
  const errors = [];
  const hookBlock = section(scriptText, 'HOOK');
  const hookText = field(hookBlock, 'Narration');
  const hookDuration = Number(hookBlock.match(/^\*\*Duration:\*\*\s*(\d+)s/m)?.[1]);
  const endingBlock = section(scriptText, 'QUESTION|CTA');
  const endingText = field(endingBlock, 'Text(?:\\s+on\\s+screen)?');
  const endingNarration = field(endingBlock, 'Narration');
  const slug = scriptText.match(/^# Reel Script:\s*([a-z0-9-]+)/m)?.[1];
  const ownerHook = approvedOwnerHook(fileURLToPath(new URL('../../', import.meta.url)),slug);
  const maxWords = ownerHook ? wordCount(ownerHook.spokenText) : 12;
  const limit = hookDurationLimit(fileURLToPath(new URL('../../', import.meta.url)), slug, hookText);
  const questionHookRequired = review?.hook?.questionHookRequired === true;

  if (review?.version !== 1 || review?.pass !== true) errors.push('attention review must be version 1 and pass');
  if (!hookText || hookText !== review?.hook?.spokenText || !Number.isFinite(hookDuration)
    || wordCount(hookText) > maxWords || hookDuration > Math.max(4, limit) || review?.hook?.spokenSeconds > limit
    || review?.hook?.startsAtSeconds !== 0 || review?.hook?.specificViewerProblemOrBenefit !== true
    || review?.hook?.visibleWithoutSound !== true) {
    errors.push('hook must match the script and state a concise, visible problem or benefit in the first seconds');
  }
  if (questionHookRequired && (!hookText.trim().endsWith('?')
    || !String(review?.hook?.visibleText ?? '').trim().endsWith('?')
    || review?.hook?.visibleText !== hookText)) {
    errors.push('this reel requires the same concise question in spoken narration and visible opening text');
  }
  const beats = review?.payoffBeats;
  if (!Array.isArray(beats) || beats.length < 2 || beats.length > 4
    || beats.some(beat => !beat?.scriptHeading || !beat?.paysOffHook || !scriptText.includes(beat.scriptHeading))) {
    errors.push('attention review must map 2–4 actual script headings to hook payoff beats');
  }
  if (!endingText || endingText !== review?.cta?.onScreenText || endingNarration !== review?.cta?.spokenText
    || wordCount(endingText) > 10 || review?.cta?.primaryActionCount !== 1
    || !['comment', 'save', 'share', 'click', 'follow'].includes(review?.cta?.primaryAction)
    || review?.cta?.fitsViewerValue !== true) {
    errors.push('CTA must match the script and use one concise, value-aligned action');
  }
  if (!review?.hypothesis?.trim() || !Array.isArray(review?.metrics?.platformMetrics)
    || review.metrics.platformMetrics.length < 2) {
    errors.push('attention review needs a test hypothesis and at least two platform metrics');
  }
  return errors;
}
