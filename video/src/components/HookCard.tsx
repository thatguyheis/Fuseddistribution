import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS } from '../fonts';
import { MediaBg } from './MediaBg';
import type { HookSegment, MediaEntry } from '../types';

export const HookCard: React.FC<{
  segment: HookSegment;
  mediaEntry?: MediaEntry;
  photoPath?: string;
  segmentIndex?: number;
}> = ({ segment, mediaEntry, photoPath, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideProgress = spring({
    frame, fps,
    config: { damping: 30, stiffness: 160 },
    durationInFrames: Math.round(fps * 0.6),
  });
  const translateY = interpolate(slideProgress, [0, 1], [80, 0]);
  const barWidth = interpolate(slideProgress, [0, 1], [0, 120]);

  return (
    <div style={{
      position: 'relative', width: BRAND.width, height: BRAND.height,
      background: BRAND.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px', overflow: 'hidden',
    }}>
      <MediaBg media={mediaEntry} photoPath={photoPath} overlayOpacity={0.7} segmentIndex={segmentIndex} />
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', transform: `translateY(${translateY}px)`,
      }}>
        <p style={{
          fontFamily: BEBAS,
          fontSize: 96, color: BRAND.white, textAlign: 'center',
          textTransform: 'uppercase', letterSpacing: '0.02em',
          lineHeight: 1.1, margin: '0 0 24px',
          textShadow: '0 4px 24px rgba(0,0,0,0.8)',
        }}>
          {segment.text}
        </p>
        <div style={{
          width: barWidth, height: 5, borderRadius: 999,
          background: BRAND.cyan, boxShadow: `0 0 16px ${BRAND.cyan}`,
        }} />
      </div>
    </div>
  );
};
