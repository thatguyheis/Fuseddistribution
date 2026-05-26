import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import type { ChartSegment } from '../types';

// Available width = 1080 - 2×60px padding = 960px
// label(220) + gap(16) + bar(580) + gap(16) + value(68) = 900px — centered with room to breathe
const LABEL_W = 220;
const BAR_W   = 580;
const VALUE_W = 68;

const Bar: React.FC<{ label: string; value: number; index: number; fps: number }> = ({
  label, value, index, fps,
}) => {
  const frame = useCurrentFrame();
  const delay = index * Math.round(fps * 0.12);
  const progress = spring({
    frame: Math.max(0, frame - delay), fps,
    config: { damping: 20, stiffness: 80 },
    durationInFrames: Math.round(fps * 1.5),
  });
  const barWidth = interpolate(progress, [0, 1], [0, (value / 100) * BAR_W]);
  const displayValue = Math.round(interpolate(progress, [0, 1], [0, value]));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
      <span style={{
        fontFamily: '"Trebuchet MS", sans-serif', fontSize: 34,
        color: BRAND.muted, width: LABEL_W, textAlign: 'right', flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{
        width: BAR_W, height: 18, borderRadius: 999,
        background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          width: barWidth, height: '100%', borderRadius: 999,
          background: `linear-gradient(90deg, ${BRAND.cyan}, #4dffb8)`,
          boxShadow: `0 0 12px ${BRAND.cyan}66`,
        }} />
      </div>
      <span style={{
        fontFamily: 'Impact, sans-serif', fontSize: 38,
        color: BRAND.white, width: VALUE_W, flexShrink: 0,
      }}>
        {displayValue}%
      </span>
    </div>
  );
};

export const ChartCard: React.FC<{ segment: ChartSegment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fi = Math.round(fps * 0.3);
  const fadeIn = interpolate(frame, [0, fi], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - fi, durationInFrames], [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      width: BRAND.width, height: BRAND.height, background: BRAND.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px',
      opacity: Math.min(fadeIn, fadeOut),
    }}>
      <p style={{
        fontFamily: 'Impact, sans-serif', fontSize: 48, color: BRAND.cyan,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 52, textAlign: 'center',
      }}>
        {segment.title}
      </p>
      <div style={{ width: LABEL_W + 16 + BAR_W + 16 + VALUE_W }}>
        {segment.bars.map((bar, i) => (
          <Bar key={bar.label} label={bar.label} value={bar.value} index={i} fps={fps} />
        ))}
      </div>
    </div>
  );
};
