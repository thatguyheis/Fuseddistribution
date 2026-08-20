export function expectedCutdownMinimumDuration(sourceDuration, maximumDuration, toleranceSeconds = 1) {
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) throw new Error('sourceDuration must be positive.');
  if (!Number.isFinite(maximumDuration) || maximumDuration <= 0) throw new Error('maximumDuration must be positive.');
  if (!Number.isFinite(toleranceSeconds) || toleranceSeconds < 0) throw new Error('toleranceSeconds must be non-negative.');
  return Math.max(0.1, Math.min(sourceDuration, maximumDuration) - toleranceSeconds);
}

export function validateCutdownDuration({
  sourceDuration,
  outputDuration,
  maximumDuration,
  targetDuration = maximumDuration,
  toleranceSeconds = 1,
}) {
  if (!Number.isFinite(outputDuration) || outputDuration <= 0) {
    return { ok: false, reason: 'output_duration_invalid', minimumDuration: null };
  }
  const minimumDuration = expectedCutdownMinimumDuration(sourceDuration, targetDuration, toleranceSeconds);
  if (outputDuration < minimumDuration) {
    return { ok: false, reason: 'output_truncated', minimumDuration };
  }
  if (outputDuration > maximumDuration + 0.25) {
    return { ok: false, reason: 'output_too_long', minimumDuration };
  }
  return { ok: true, reason: null, minimumDuration };
}
