import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS } from '../fonts';
import { MediaBg } from './MediaBg';
import { FittedText } from './FittedText';
import type { CTASegment, MediaEntry } from '../types';

export const CTACard: React.FC<{
  segment: CTASegment;
  mediaEntry?: MediaEntry;
  photoPath?: string;
  segmentIndex?: number;
}> = ({ segment, mediaEntry, photoPath, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideProgress = spring({ frame, fps, config: { damping: 30, stiffness: 160 },
    durationInFrames: Math.round(fps * 0.5) });
  const translateY = interpolate(slideProgress, [0, 1], [50, 0]);
  const opacity = interpolate(frame, [0, Math.round(fps * 0.3)], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

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
      <MediaBg media={mediaEntry} photoPath={photoPath} overlayOpacity={0.72} segmentIndex={segmentIndex} />
      <div style={{
        position: 'relative', padding: '60px 48px', borderRadius: 24,
        border: `3px solid rgba(88,214,255,${glowOpacity})`,
        boxShadow: `0 0 40px rgba(88,214,255,${glowOpacity * 0.5}), inset 0 0 60px rgba(4,16,24,0.6)`,
        background: 'rgba(4,16,24,0.55)',
        transform: `translateY(${translateY}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        backdropFilter: 'blur(2px)',
      }}>
        <FittedText
          text={mainText}
          fontFamily={BEBAS}
          maxFontSize={88}
          maxLines={4}
          maxWidth={820}
          letterSpacing="0.02em"
          lineHeight={1.1}
          color={BRAND.white}
          textTransform="uppercase"
          textShadow="0 4px 24px rgba(0,0,0,0.8)"
        />
        {subText && (
          <FittedText
            text={subText}
            fontFamily={BEBAS}
            maxFontSize={54}
            maxLines={2}
            maxWidth={780}
            letterSpacing="0.06em"
            color={BRAND.cyan}
            textTransform="uppercase"
            textShadow={`0 0 20px ${BRAND.cyan}88`}
          />
        )}
      </div>
    </div>
  );
};
