import { createHash } from 'node:crypto';

export function applyCaptionCorrections(captions, manifest) {
  if (!manifest || !Array.isArray(manifest.corrections)) throw new Error('Caption correction manifest is invalid');
  const result = structuredClone(captions);
  const applied = [];
  const seen = new Set();
  for (const correction of manifest.corrections) {
    const segment = String(correction.segment);
    const cueIndex = Number(correction.cue);
    const key = `${segment}:${cueIndex}`;
    if (seen.has(key)) throw new Error(`Duplicate caption correction ${key}`);
    seen.add(key);
    const cue = result[segment]?.[cueIndex];
    if (!cue) throw new Error(`Caption correction points to a missing cue: ${key}`);
    if (cue.text !== correction.expectedText) {
      throw new Error(`Caption correction source changed at ${key}: ${JSON.stringify(cue.text)}`);
    }
    if (typeof correction.text !== 'string' || !correction.text.trim()) {
      throw new Error(`Caption correction has empty replacement text at ${key}`);
    }
    const { startSec, endSec } = cue;
    cue.text = correction.text.trim();
    if (cue.startSec !== startSec || cue.endSec !== endSec) throw new Error(`Caption correction changed timing at ${key}`);
    applied.push({ segment: Number(segment), cue: cueIndex, startSec, endSec, from: correction.expectedText, to: cue.text });
  }
  return {
    captions: result,
    review: {
      version: manifest.version ?? 1,
      transcriptSha256: manifest.transcriptSha256,
      correctionsSha256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
      applied,
    },
  };
}
