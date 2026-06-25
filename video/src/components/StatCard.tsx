import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS, POPPINS } from '../fonts';
import { MediaBg } from './MediaBg';
import { InlineGraphic } from './InlineGraphic';
import { FittedText } from './FittedText';
import type { StatSegment, MediaEntry } from '../types';

const CountUp: React.FC<{ target: number; suffix: string; countFrames: number }> = ({
  target, suffix, countFrames,
}) => {
  const frame = useCurrentFrame();
  const progress = spring({ frame, fps: 30, config: { damping: 30, stiffness: 160 },
    durationInFrames: countFrames });
  const value = Math.round(interpolate(progress, [0, 1], [0, target]));
  return <>{value}{suffix}</>;
};

function parseStatFromText(text: string): { number: number; suffix: string; rest: string } | null {
  const m = text.match(/^(\d+)(%|\+?)\s*(.*)/s);
  if (!m || parseInt(m[1], 10) < 2) return null;
  return { number: parseInt(m[1], 10), suffix: m[2], rest: m[3].trim() };
}

export const StatCard: React.FC<{
  segment: StatSegment;
  mediaEntry?: MediaEntry;
  photoPath?: string;
  segmentIndex?: number;
}> = ({ segment, mediaEntry, photoPath, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fi = Math.round(fps * 0.3);
  const countFrames = Math.round(fps * 0.9);
  const fadeIn = interpolate(frame, [0, fi], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const parsed = parseStatFromText(segment.text);
  const hasGraphic = segment.graphic_type && segment.graphic_type !== 'none' && segment.graphic;

  return (
    <div style={{
      position: 'relative', width: BRAND.width, height: BRAND.height,
      background: BRAND.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px',
      overflow: 'hidden', opacity: fadeIn,
    }}>
      <MediaBg media={mediaEntry} photoPath={photoPath} segmentIndex={segmentIndex} />
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 12, width: '100%',
      }}>
        {parsed ? (
          <>
            <p style={{
              fontFamily: BEBAS,
              fontSize: hasGraphic ? 108 : 128,
              color: BRAND.cyan, textTransform: 'uppercase',
              letterSpacing: '0.02em', lineHeight: 1, margin: 0,
              textShadow: `0 0 40px ${BRAND.cyan}66`,
            }}>
              <CountUp target={parsed.number} suffix={parsed.suffix} countFrames={countFrames} />
            </p>
            {parsed.rest && (
              <FittedText
                text={parsed.rest}
                fontFamily={BEBAS}
                maxFontSize={hasGraphic ? 46 : 56}
                maxLines={3}
                maxWidth={900}
                letterSpacing="0.04em"
                lineHeight={1.2}
                color={BRAND.white}
                textTransform="uppercase"
                textShadow="0 2px 16px rgba(0,0,0,0.8)"
              />
            )}
          </>
        ) : (
          <FittedText
            text={segment.text}
            fontFamily={BEBAS}
            maxFontSize={hasGraphic ? 64 : 80}
            maxLines={4}
            maxWidth={900}
            letterSpacing="0.02em"
            lineHeight={1.2}
            color={BRAND.white}
            textTransform="uppercase"
          />
        )}

        {segment.explanation && (
          <p style={{
            fontFamily: POPPINS,
            fontSize: 18, fontWeight: 400,
            color: `${BRAND.cyan}cc`,
            textAlign: 'center', margin: 0, lineHeight: 1.4,
            maxWidth: 800,
          }}>
            {segment.explanation}
          </p>
        )}

        {hasGraphic && (
          <div style={{ width: '100%', maxWidth: 860 }}>
            <InlineGraphic type={segment.graphic_type!} data={segment.graphic!} />
          </div>
        )}
      </div>
    </div>
  );
};
