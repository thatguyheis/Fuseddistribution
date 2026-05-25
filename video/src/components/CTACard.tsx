import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';
import type { CTASegment } from '../types';

export const CTACard: React.FC<{ segment: CTASegment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, Math.round(fps * 0.4)], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const [mainText, subText] = segment.text.split('—').map(s => s.trim());
  return (
    <div style={{
      width: BRAND.width, height: BRAND.height, background: BRAND.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px', opacity,
    }}>
      <p style={{ fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
        fontSize: 96, color: BRAND.white, textTransform: 'uppercase',
        letterSpacing: '0.02em', lineHeight: 1.1, textAlign: 'center',
        margin: subText ? '0 0 28px' : 0 }}>
        {mainText}
      </p>
      {subText && (
        <p style={{ fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
          fontSize: 60, color: BRAND.cyan, textTransform: 'uppercase',
          letterSpacing: '0.04em', textAlign: 'center', margin: 0 }}>
          {subText}
        </p>
      )}
    </div>
  );
};
