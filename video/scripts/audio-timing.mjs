import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { transitionDurationFrames } from './transition-timing.mjs';

export const NATURAL_DIALOGUE_GAP_SECONDS = 0.2;
export const FINAL_CARD_PAD_SECONDS = 0.5;

export function audioDurationSeconds(path) {
  const output = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path],
    { encoding: 'utf8' },
  ).trim();
  const duration = Number(output);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid audio duration for ${path}`);
  return duration;
}

export function collectAudioDurations(videoDir, slug, segmentCount) {
  const audioDir = join(videoDir, 'public', 'audio', slug);
  const durations = {};
  for (let index = 0; index < segmentCount; index += 1) {
    const path = join(audioDir, `segment-${index}.m4a`);
    if (!existsSync(path)) continue;
    durations[index] = audioDurationSeconds(path);
  }
  return durations;
}

export function retimeScriptToAudio(script, durations, options = {}) {
  const fps = options.fps ?? 30;
  const dialogueGapSeconds = options.dialogueGapSeconds ?? NATURAL_DIALOGUE_GAP_SECONDS;
  const finalCardPadSeconds = options.finalCardPadSeconds ?? FINAL_CARD_PAD_SECONDS;
  let cursor = 0;
  const segments = script.segments.map((source, index) => {
    const segment = { ...source };
    const audioDuration = durations[index];
    if (segment.narration && (!Number.isFinite(audioDuration) || audioDuration <= 0)) {
      throw new Error(`Missing measured narration duration for segment ${index}`);
    }
    const spokenDuration = segment.narration ? audioDuration : segment.endSec - segment.startSec;
    const next = script.segments[index + 1];
    const transitionSeconds = next
      ? transitionDurationFrames(segment.type, next.type, index) / fps
      : 0;
    const windowDuration = next
      ? spokenDuration + transitionSeconds + dialogueGapSeconds
      : spokenDuration + finalCardPadSeconds;
    segment.startSec = Number(cursor.toFixed(3));
    segment.endSec = Number((cursor + windowDuration).toFixed(3));
    cursor = segment.endSec;
    return segment;
  });
  return {
    script: { ...script, totalDuration: Number(cursor.toFixed(3)), segments },
    timing: {
      version: 1,
      dialogueGapSeconds,
      finalCardPadSeconds,
      audioDurations: durations,
      totalNarrationSeconds: Number(Object.values(durations).reduce((sum, value) => sum + value, 0).toFixed(3)),
    },
  };
}

export function writeAudioTiming(path, timing) {
  writeFileSync(path, `${JSON.stringify(timing, null, 2)}\n`);
}
