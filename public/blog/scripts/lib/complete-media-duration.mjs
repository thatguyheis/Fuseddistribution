export function assertCompleteMediaDuration(duration, maximum) {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(maximum) || maximum <= 0) throw new Error('Invalid media duration');
  if (duration > maximum) throw new Error(`Source is ${duration.toFixed(3)}s, above the ${maximum}s distribution limit. Rebuild a complete shorter reel; never truncate narration or the closing question.`);
}
