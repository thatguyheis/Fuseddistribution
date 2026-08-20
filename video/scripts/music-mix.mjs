import { loadAudioRightsDatabase } from './audio-rights.mjs';

export const DEFAULT_NARRATION_REFERENCE_LUFS = -24;
export const DEFAULT_MUSIC_RELATIVE_GAIN = 0.2;

function decibelsToGain(decibels) {
  return 10 ** (decibels / 20);
}

export function musicMixForTrack(track, options = {}) {
  if (!track || ['none', 'off', 'silent'].includes(String(track).toLowerCase())) {
    return { enabled: false, gain: 0, targetLufs: null, measuredLufs: null };
  }

  const db = options.db ?? loadAudioRightsDatabase(options.rightsPath);
  const policy = db.policy?.musicMix ?? {};
  const narrationReferenceLufs = Number(
    policy.narrationReferenceLufs ?? DEFAULT_NARRATION_REFERENCE_LUFS,
  );
  const relativeGain = Number(policy.relativeGain ?? DEFAULT_MUSIC_RELATIVE_GAIN);
  const targetLufs = narrationReferenceLufs + 20 * Math.log10(relativeGain);
  const measuredLufs = Number(policy.measuredIntegratedLufs?.[track]);
  if (
    !Number.isFinite(narrationReferenceLufs)
    || !Number.isFinite(relativeGain)
    || relativeGain <= 0
    || relativeGain > 1
    || !Number.isFinite(targetLufs)
    || !Number.isFinite(measuredLufs)
  ) {
    throw new Error(`Music mix policy is missing valid narration-relative values for ${track}`);
  }

  return {
    enabled: true,
    targetLufs,
    measuredLufs,
    narrationReferenceLufs,
    relativeGain,
    gain: decibelsToGain(targetLufs - measuredLufs),
  };
}
