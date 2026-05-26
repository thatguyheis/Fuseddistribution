import React from 'react';
import { AbsoluteFill, Audio, Series, staticFile } from 'remotion';
import { BRAND, secsToFrames } from '../brand';
import { HookCard } from '../components/HookCard';
import { OverlayCard } from '../components/OverlayCard';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { CTACard } from '../components/CTACard';
import { Subtitle } from '../components/Subtitle';
import type { ReelScript, Segment } from '../types';

type PhotoMap = Record<number, string>;

const SegmentCard: React.FC<{ segment: Segment; photoPath?: string }> = ({ segment, photoPath }) => {
  switch (segment.type) {
    case 'hook':    return <HookCard segment={segment} photoPath={photoPath} />;
    case 'overlay': return <OverlayCard segment={segment} photoPath={photoPath} />;
    case 'stat':    return <StatCard segment={segment} photoPath={photoPath} />;
    case 'chart':   return <ChartCard segment={segment} />;
    case 'cta':     return <CTACard segment={segment} photoPath={photoPath} />;
  }
};

export const BlogReel: React.FC<{
  script: ReelScript;
  musicTrack?: string;
  photos?: PhotoMap;
}> = ({
  script,
  musicTrack = 'ambient-01.mp3',
  photos = {},
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
                <Audio src={staticFile(`audio/${script.slug}/segment-${i}.m4a`)} />
              )}
              <SegmentCard segment={segment} photoPath={photos[i]} />
              {segment.narration && <Subtitle narration={segment.narration} />}
            </AbsoluteFill>
          </Series.Sequence>
        );
      })}
    </Series>
  </AbsoluteFill>
);
