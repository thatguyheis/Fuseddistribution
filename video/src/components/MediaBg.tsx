import React from 'react';
import { Img, Video, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';
import type { MediaEntry } from '../types';

const ORIGINS = ['center', 'top left', 'bottom right'] as const;

export const MediaBg: React.FC<{
  media?: MediaEntry;
  photoPath?: string;
  overlayOpacity?: number;
  segmentIndex?: number;
}> = ({ media, photoPath, overlayOpacity = 0.62, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const transformOrigin = ORIGINS[segmentIndex % 3];

  const overlayStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    background: `linear-gradient(180deg, rgba(4,16,24,${overlayOpacity}) 0%, rgba(4,16,24,${overlayOpacity + 0.1}) 100%)`,
  };

  const baseStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    width: BRAND.width, height: BRAND.height,
    objectFit: 'cover', objectPosition: 'center',
  };

  if (media?.type === 'video') {
    return (
      <>
        <Video
          src={staticFile(media.src)}
          style={baseStyle}
          muted
          loop
          playbackRate={0.75}
        />
        <div style={overlayStyle} />
      </>
    );
  }

  const imgSrc = media?.src ?? photoPath;
  if (!imgSrc) return null;

  return (
    <>
      <Img
        src={staticFile(imgSrc)}
        style={{
          ...baseStyle,
          transform: `scale(${scale})`,
          transformOrigin,
        }}
      />
      <div style={overlayStyle} />
    </>
  );
};
