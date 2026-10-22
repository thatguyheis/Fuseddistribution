// Only migrated/new sources opt into v1; historical approved renders stay valid.
export function engagementErrors(script) {
  if (script.engagementPolicy !== 1) return [];
  const errors = [];
  if (!['educate', 'opinion'].includes(script.contentKind)) errors.push('engagement: content-kind must be educate or opinion');
  const last = script.segments?.at(-1);
  if (!last?.engagementBeat || last.type !== 'question') errors.push('engagement: final question must be tagged engagement-beat');
  const question = String(last?.text || '').trim();
  if (!question.endsWith('?') || !String(last?.narration || '').trim().endsWith(question)) errors.push('engagement: question must be spoken verbatim at the end, before any caption pitch');
  if (/what (?:did|do) you think|which page will you check/i.test(question)) errors.push('engagement: generic question requires editorial repair');
  if (question.split(/\s+/).length > 25) errors.push('engagement: shorten the closing question');
  if (last && last.endSec - last.startSec > 15) errors.push('engagement: final question block must fit the final 15 seconds');
  return errors;
}
