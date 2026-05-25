import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import type { OverlaySegment } from '../types';

export const OverlayCard: React.FC<{ segment: OverlaySegment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const slideProgress = spring({ frame, fps, config: { damping: 14, stiffness: 120 },
    durationInFrames: Math.round(fps * 0.5) });
  const translateY = interpolate(slideProgress, [0, 1], [60, 0]);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - Math.round(fps * 0.3), durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  return (
    <div style={{
      width: BRAND.width, height: BRAND.height, background: BRAND.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 60px', opacity: fadeOut,
    }}>
      <p style={{
        transform: `translateY(${translateY}px)`,
        fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
        fontSize: 96, color: BRAND.cyan, textTransform: 'uppercase',
        letterSpacing: '0.02em', lineHeight: 1.15, textAlign: 'center', margin: 0,
      }}>
        {segment.text}
      </p>
    </div>
  );
};
