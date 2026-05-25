import React from 'react';
import { AbsoluteFill, Audio, Series, staticFile } from 'remotion';
import { BRAND, secsToFrames } from '../brand';
import { HookCard } from '../components/HookCard';
import { OverlayCard } from '../components/OverlayCard';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { CTACard } from '../components/CTACard';
import type { ReelScript, Segment } from '../types';

const SegmentCard: React.FC<{ segment: Segment }> = ({ segment }) => {
  switch (segment.type) {
    case 'hook':    return <HookCard segment={segment} />;
    case 'overlay': return <OverlayCard segment={segment} />;
    case 'stat':    return <StatCard segment={segment} />;
    case 'chart':   return <ChartCard segment={segment} />;
    case 'cta':     return <CTACard segment={segment} />;
  }
};

export const BlogReel: React.FC<{ script: ReelScript; musicTrack?: string }> = ({
  script,
  musicTrack = 'ambient-01.mp3',
}) => (
  <AbsoluteFill style={{ background: BRAND.bg }}>
    <Audio src={staticFile(`music/${musicTrack}`)} volume={0.15} loop />
    <Series>
      {script.segments.map((segment, i) => {
        const durationInFrames = secsToFrames(segment.endSec - segment.startSec);
        return (
          <Series.Sequence key={i} durationInFrames={durationInFrames}>
            <AbsoluteFill>
              {segment.narration && (
                <Audio src={staticFile(`audio/${script.slug}/segment-${i}.mp3`)} />
              )}
              <SegmentCard segment={segment} />
            </AbsoluteFill>
          </Series.Sequence>
        );
      })}
    </Series>
  </AbsoluteFill>
);
