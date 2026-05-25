export const BRAND = {
  bg: '#041018',
  cyan: '#58d6ff',
  white: '#ffffff',
  muted: '#afc6cf',
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

export const secsToFrames = (secs: number): number =>
  Math.round(secs * BRAND.fps);
