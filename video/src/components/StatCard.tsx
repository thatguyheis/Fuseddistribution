import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';
import type { StatSegment } from '../types';

export const StatCard: React.FC<{ segment: StatSegment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fi = Math.round(fps * 0.3);
  const fadeIn = interpolate(frame, [0, fi], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - fi, durationInFrames], [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      width: BRAND.width, height: BRAND.height, background: BRAND.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 60px', opacity: Math.min(fadeIn, fadeOut),
    }}>
      <p style={{
        fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
        fontSize: 80, color: BRAND.white, textAlign: 'center',
        textTransform: 'uppercase', letterSpacing: '0.02em',
        lineHeight: 1.2, margin: 0,
      }}>
        {segment.text}
      </p>
    </div>
  );
};
