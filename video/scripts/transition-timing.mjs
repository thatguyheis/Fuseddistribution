export function transitionName(currentType, nextType, index) {
  if (nextType === 'cta' || nextType === 'question') return 'fade';
  if (currentType === 'hook') return 'slide-bottom';
  if (currentType === 'stat' && nextType === 'chart') return 'fade';
  if (currentType === 'chart') return 'wipe-left';
  return ['slide-bottom','slide-right','wipe-left','fade'][index % 4];
}

export function transitionDurationFrames(currentType, nextType, index) {
  if (nextType === 'cta' || nextType === 'question') return 16;
  if (currentType === 'hook') return 18;
  if (currentType === 'stat' && nextType === 'chart') return 14;
  if (currentType === 'chart') return 16;
  return [16, 16, 18, 15][index % 4];
}

export function totalTransitionFrames(segments) {
  let total = 0;
  for (let i = 0; i < segments.length - 1; i++) {
    total += transitionDurationFrames(segments[i].type, segments[i + 1].type, i);
  }
  return total;
}

export function compositionFramesForSegments(segments, fps) {
  const sequenceFrames = segments.reduce(
    (sum, segment) => sum + Math.round((segment.endSec - segment.startSec) * fps),
    0,
  );
  return Math.max(1, sequenceFrames - totalTransitionFrames(segments));
}
