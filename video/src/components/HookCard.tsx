import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { PhotoBg } from './PhotoBg';
import type { HookSegment } from '../types';

export const HookCard: React.FC<{ segment: HookSegment; photoPath?: string }> = ({ segment, photoPath }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const fi = Math.round(0.3 * fps);

  const slideProgress = spring({ frame, fps, config: { damping: 18, stiffness: 100 },
    durationInFrames: Math.round(fps * 0.6) });
  const translateY = interpolate(slideProgress, [0, 1], [80, 0]);

  // Start at full opacity so frame 0 is thumbnail-ready. Fade out only at end.
  const opacity = interpolate(
    frame,
    [durationInFrames - fi, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Cyan accent bar grows in under the text
  const barWidth = interpolate(slideProgress, [0, 1], [0, 120]);

  return (
    <div style={{
      position: 'relative', width: BRAND.width, height: BRAND.height,
      background: BRAND.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px', overflow: 'hidden', opacity,
    }}>
      <PhotoBg photoPath={photoPath} overlayOpacity={0.7} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', transform: `translateY(${translateY}px)` }}>
        <p style={{
          fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
          fontSize: 96, color: BRAND.white, textAlign: 'center',
          textTransform: 'uppercase', letterSpacing: '0.02em',
          lineHeight: 1.1, margin: '0 0 24px',
          textShadow: '0 4px 24px rgba(0,0,0,0.8)',
        }}>
          {segment.text}
        </p>
        <div style={{ width: barWidth, height: 5, borderRadius: 999,
          background: BRAND.cyan, boxShadow: `0 0 16px ${BRAND.cyan}` }} />
      </div>
    </div>
  );
};
