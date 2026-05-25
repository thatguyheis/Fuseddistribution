import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';
import type { HookSegment } from '../types';

export const HookCard: React.FC<{ segment: HookSegment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const fi = Math.round(0.3 * fps);
  const opacity = interpolate(
    frame,
    [0, fi, durationInFrames - fi, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  return (
    <div style={{
      width: BRAND.width, height: BRAND.height, background: BRAND.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 60px', opacity,
    }}>
      <p style={{
        fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
        fontSize: 96, color: BRAND.white, textAlign: 'center',
        textTransform: 'uppercase', letterSpacing: '0.02em',
        lineHeight: 1.1, margin: 0,
      }}>
        {segment.text}
      </p>
    </div>
  );
};
