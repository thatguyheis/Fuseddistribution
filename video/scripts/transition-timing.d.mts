export function transitionDurationFrames(currentType: string, nextType: string, index: number): number;
export function totalTransitionFrames(segments: Array<{type: string}>): number;
export function compositionFramesForSegments(
  segments: Array<{type: string; startSec: number; endSec: number}>,
  fps: number,
): number;
