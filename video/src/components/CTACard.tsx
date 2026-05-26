import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { PhotoBg } from './PhotoBg';
import type { CTASegment } from '../types';

export const CTACard: React.FC<{ segment: CTASegment; photoPath?: string }> = ({ segment, photoPath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideProgress = spring({ frame, fps, config: { damping: 18, stiffness: 90 },
    durationInFrames: Math.round(fps * 0.5) });
  const translateY = interpolate(slideProgress, [0, 1], [50, 0]);
  const opacity = interpolate(frame, [0, Math.round(fps * 0.3)], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Glow pulse — subtle breathing effect on the border
  const glowOpacity = interpolate(
    frame % Math.round(fps * 1.5),
    [0, Math.round(fps * 0.75), Math.round(fps * 1.5)],
    [0.4, 1, 0.4],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const [mainText, subText] = segment.text.split('—').map(s => s.trim());

  return (
    <div style={{
      position: 'relative', width: BRAND.width, height: BRAND.height,
      background: BRAND.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 60px', overflow: 'hidden', opacity,
    }}>
      <PhotoBg photoPath={photoPath} overlayOpacity={0.72} />

      {/* Glowing cyan border card */}
      <div style={{
        position: 'relative', padding: '60px 48px', borderRadius: 24,
        border: `3px solid rgba(88,214,255,${glowOpacity})`,
        boxShadow: `0 0 40px rgba(88,214,255,${glowOpacity * 0.5}), inset 0 0 60px rgba(4,16,24,0.6)`,
        background: 'rgba(4,16,24,0.55)',
        transform: `translateY(${translateY}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        backdropFilter: 'blur(2px)',
      }}>
        <p style={{
          fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
          fontSize: 88, color: BRAND.white, textTransform: 'uppercase',
          letterSpacing: '0.02em', lineHeight: 1.1, textAlign: 'center',
          margin: 0, textShadow: '0 4px 24px rgba(0,0,0,0.8)',
        }}>
          {mainText}
        </p>
        {subText && (
          <p style={{
            fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
            fontSize: 54, color: BRAND.cyan, textTransform: 'uppercase',
            letterSpacing: '0.06em', textAlign: 'center', margin: 0,
            textShadow: `0 0 20px ${BRAND.cyan}88`,
          }}>
            {subText}
          </p>
        )}
      </div>
    </div>
  );
};
