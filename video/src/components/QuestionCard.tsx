import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS } from '../fonts';
import { MediaBg } from './MediaBg';
import type { QuestionSegment, MediaEntry } from '../types';

export const QuestionCard: React.FC<{
  segment: QuestionSegment;
  mediaEntry?: MediaEntry;
  photoPath?: string;
  segmentIndex?: number;
}> = ({ segment, mediaEntry, photoPath, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideProgress = spring({ frame, fps, config: { damping: 30, stiffness: 160 },
    durationInFrames: Math.round(fps * 0.6) });
  const translateY = interpolate(slideProgress, [0, 1], [60, 0]);
  const opacity = interpolate(frame, [0, Math.round(fps * 0.4)], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const pulseProgress = frame % Math.round(fps * 2);
  const questionMarkScale = interpolate(
    pulseProgress,
    [0, Math.round(fps), Math.round(fps * 2)],
    [1, 1.06, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div style={{
      position: 'relative', width: BRAND.width, height: BRAND.height,
      background: BRAND.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 60px', overflow: 'hidden', opacity,
    }}>
      <MediaBg media={mediaEntry} photoPath={photoPath} overlayOpacity={0.78} segmentIndex={segmentIndex} />
      <div style={{
        position: 'relative',
        transform: `translateY(${translateY}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: BEBAS,
          fontSize: 160,
          color: BRAND.cyan,
          margin: 0,
          lineHeight: 1,
          textShadow: `0 0 60px ${BRAND.cyan}99, 0 0 120px ${BRAND.cyan}44`,
          transform: `scale(${questionMarkScale})`,
          display: 'block',
        }}>
          ?
        </p>
        <p style={{
          fontFamily: BEBAS,
          fontSize: 82,
          color: BRAND.white,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          lineHeight: 1.15,
          textAlign: 'center',
          margin: 0,
          textShadow: '0 4px 24px rgba(0,0,0,0.9)',
          maxWidth: 900,
        }}>
          {segment.text}
        </p>
        {segment.subtext && (
          <p style={{
            fontFamily: BEBAS,
            fontSize: 52,
            color: BRAND.cyan,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textAlign: 'center',
            margin: 0,
            textShadow: `0 0 24px ${BRAND.cyan}88`,
            maxWidth: 860,
          }}>
            {segment.subtext}
          </p>
        )}
      </div>
    </div>
  );
};
