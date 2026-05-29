import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';

const ORIGINS = ['center', 'top left', 'bottom right'] as const;

export const PhotoBg: React.FC<{
  photoPath?: string;
  overlayOpacity?: number;
  segmentIndex?: number;
}> = ({ photoPath, overlayOpacity = 0.62, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const transformOrigin = ORIGINS[segmentIndex % 3];

  if (!photoPath) return null;
  return (
    <>
      <Img
        src={staticFile(photoPath)}
        style={{
          position: 'absolute', inset: 0,
          width: BRAND.width, height: BRAND.height,
          objectFit: 'cover', objectPosition: 'center',
          transform: `scale(${scale})`,
          transformOrigin,
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, rgba(4,16,24,${overlayOpacity}) 0%, rgba(4,16,24,${overlayOpacity + 0.1}) 100%)`,
      }} />
    </>
  );
};
