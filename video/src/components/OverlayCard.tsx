import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS } from '../fonts';
import { PhotoBg } from './PhotoBg';
import type { OverlaySegment } from '../types';

const CountUp: React.FC<{ target: number; suffix: string; countFrames: number }> = ({
  target, suffix, countFrames,
}) => {
  const frame = useCurrentFrame();
  const progress = spring({ frame, fps: 30, config: { damping: 30, stiffness: 160 },
    durationInFrames: countFrames });
  const value = Math.round(interpolate(progress, [0, 1], [0, target]));
  return <>{value}{suffix}</>;
};

function parseStatFromText(text: string): { prefix: string; number: number; suffix: string; rest: string } | null {
  const m = text.match(/^(\D*)(\d+)(%|\+?)\s*(.*)/s);
  if (!m || parseInt(m[2], 10) < 2) return null;
  return { prefix: m[1].trim(), number: parseInt(m[2], 10), suffix: m[3], rest: m[4].trim() };
}

export const OverlayCard: React.FC<{
  segment: OverlaySegment;
  photoPath?: string;
  segmentIndex?: number;
}> = ({ segment, photoPath, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const countFrames = Math.round(fps * 0.9);

  const slideProgress = spring({ frame, fps, config: { damping: 30, stiffness: 160 },
    durationInFrames: Math.round(fps * 0.5) });
  const translateY = interpolate(slideProgress, [0, 1], [60, 0]);

  const parsed = parseStatFromText(segment.text);

  return (
    <div style={{
      position: 'relative', width: BRAND.width, height: BRAND.height,
      background: BRAND.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px', overflow: 'hidden',
    }}>
      <PhotoBg photoPath={photoPath} overlayOpacity={0.65} segmentIndex={segmentIndex} />
      <div style={{
        position: 'relative', transform: `translateY(${translateY}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        {parsed ? (
          <>
            <p style={{
              fontFamily: BEBAS,
              fontSize: 128, color: BRAND.cyan, textTransform: 'uppercase',
              letterSpacing: '0.02em', lineHeight: 1, margin: 0,
              textShadow: `0 0 40px ${BRAND.cyan}66`,
            }}>
              <CountUp target={parsed.number} suffix={parsed.suffix} countFrames={countFrames} />
            </p>
            <p style={{
              fontFamily: BEBAS,
              fontSize: 56, color: BRAND.white, textTransform: 'uppercase',
              letterSpacing: '0.04em', lineHeight: 1.2, margin: 0, textAlign: 'center',
              textShadow: '0 2px 16px rgba(0,0,0,0.8)',
            }}>
              {parsed.rest || parsed.prefix}
            </p>
          </>
        ) : (
          <p style={{
            fontFamily: BEBAS,
            fontSize: 96, color: BRAND.cyan, textTransform: 'uppercase',
            letterSpacing: '0.02em', lineHeight: 1.15, textAlign: 'center', margin: 0,
            textShadow: `0 0 40px ${BRAND.cyan}66`,
          }}>
            {segment.text}
          </p>
        )}
      </div>
    </div>
  );
};
