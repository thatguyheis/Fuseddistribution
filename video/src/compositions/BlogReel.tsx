import React from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { BRAND, secsToFrames } from '../brand';
import { HookCard } from '../components/HookCard';
import { OverlayCard } from '../components/OverlayCard';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { CTACard } from '../components/CTACard';
import { QuestionCard } from '../components/QuestionCard';
import { Subtitle } from '../components/Subtitle';
import type { ReelScript, Segment, CaptionChunk, MediaEntry } from '../types';

type MediaMap = Record<number, MediaEntry>;

const SegmentCard: React.FC<{
  segment: Segment;
  mediaEntry?: MediaEntry;
  segmentIndex: number;
}> = ({ segment, mediaEntry, segmentIndex }) => {
  switch (segment.type) {
    case 'hook':    return <HookCard segment={segment} mediaEntry={mediaEntry} segmentIndex={segmentIndex} />;
    case 'overlay': return <OverlayCard segment={segment} mediaEntry={mediaEntry} segmentIndex={segmentIndex} />;
    case 'stat':    return <StatCard segment={segment} mediaEntry={mediaEntry} segmentIndex={segmentIndex} />;
    case 'chart':   return <ChartCard segment={segment} segmentIndex={segmentIndex} />;
    case 'cta':      return <CTACard segment={segment} mediaEntry={mediaEntry} segmentIndex={segmentIndex} />;
    case 'question': return <QuestionCard segment={segment} mediaEntry={mediaEntry} segmentIndex={segmentIndex} />;
  }
};

function getTransition(currentType: string, nextType: string) {
  if (nextType === 'cta' || nextType === 'question') {
    return { presentation: fade(), timing: linearTiming({ durationInFrames: 10 }) };
  }
  if (currentType === 'hook') {
    return { presentation: slide({ direction: 'from-bottom' }), timing: springTiming({ durationInFrames: 18, config: { damping: 200 } }) };
  }
  if (currentType === 'stat' && nextType === 'chart') {
    return { presentation: fade(), timing: linearTiming({ durationInFrames: 12 }) };
  }
  if (currentType === 'chart') {
    return { presentation: wipe({ direction: 'from-left' }), timing: springTiming({ durationInFrames: 15, config: { damping: 200 } }) };
  }
  return { presentation: slide({ direction: 'from-bottom' }), timing: springTiming({ durationInFrames: 15, config: { damping: 200 } }) };
}

type CaptionMap = Record<number, CaptionChunk[]>;

export const BlogReel: React.FC<{
  script: ReelScript;
  musicTrack?: string;
  media?: MediaMap;
  captions?: CaptionMap;
}> = ({ script, musicTrack = 'ambient-01.mp3', media = {}, captions = {} }) => (
  <AbsoluteFill style={{ background: BRAND.bg }}>
    <Audio src={staticFile(`music/${musicTrack}`)} volume={0.15} loop />
    <TransitionSeries>
      {script.segments.map((segment, i) => {
        const durationInFrames = secsToFrames(segment.endSec - segment.startSec);
        const nextSegment = script.segments[i + 1];
        const transition = nextSegment ? getTransition(segment.type, nextSegment.type) : null;
        return (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={durationInFrames}>
              <AbsoluteFill>
                {segment.narration && (
                  <Audio src={staticFile(`audio/${script.slug}/segment-${i}.m4a`)} />
                )}
                <SegmentCard segment={segment} mediaEntry={media[i]} segmentIndex={i} />
                {segment.narration && <Subtitle narration={segment.narration} captions={captions[i]} />}
              </AbsoluteFill>
            </TransitionSeries.Sequence>
            {transition && (
              <TransitionSeries.Transition
                presentation={transition.presentation}
                timing={transition.timing}
              />
            )}
          </React.Fragment>
        );
      })}
    </TransitionSeries>
  </AbsoluteFill>
);
