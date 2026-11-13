const tokens = text => String(text ?? '').replace(/[‘’]/g,"'").toLowerCase().match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? [];

export function captionText(words) {
  return words.map(word => word.text).join(' ').replace(/\s+([,.!?;:])/g, '$1').trim();
}

function editDistance(a, b) {
  let row = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

export function assessCaptionQuality(narration, words, {question = false} = {}) {
  const expected = tokens(narration);
  const actual = tokens(captionText(words));
  const reasons = [];
  if (!actual.length) reasons.push('no-recognized-words');
  const expectedPairs = new Set(expected.slice(1).map((word,index)=>`${expected[index]} ${word}`));
  if (actual.some((word,index)=>index>0 && word===actual[index-1] && !expectedPairs.has(`${word} ${word}`))) {
    reasons.push('unexpected-adjacent-repeat');
  }
  const counts = new Map();
  const expectedCounts = new Map();
  for (let i = 0; i + 2 < actual.length; i++) {
    const phrase = actual.slice(i, i + 3).join(' ');
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  for (let i = 0; i + 2 < expected.length; i++) {
    const phrase = expected.slice(i, i + 3).join(' ');
    expectedCounts.set(phrase, (expectedCounts.get(phrase) ?? 0) + 1);
  }
  const anomalousRepetition = [...counts].some(([phrase, count]) => count >= 4 && count - (expectedCounts.get(phrase) ?? 0) >= 3);
  if (actual.length >= 12 && anomalousRepetition) reasons.push('repetitive-recognition');

  const errorRate = expected.length ? editDistance(expected, actual) / expected.length : 1;
  // Narration may contain numbers, abbreviations and proper names that Whisper renders differently.
  // Trigger only for broad divergence; word timings and release QA remain authoritative.
  if (expected.length >= 8 && errorRate > 0.32) reasons.push('transcript-divergence');
  if (question && (expected.join(' ') !== actual.join(' ') || !/[?]$/.test(captionText(words)))) reasons.push('ending-question-mismatch');
  return {suspicious: reasons.length > 0, reasons, errorRate, expectedWords: expected.length, recognizedWords: actual.length};
}
