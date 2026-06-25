import React from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import type { TransitionPresentation } from '@remotion/transitions';
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

type TransitionChoice = {
  presentation: TransitionPresentation<any>;
  timing: ReturnType<typeof linearTiming>;
  durationInFrames: number;
};

function transitionSpec(currentType: string, nextType: string, index: number): TransitionChoice {
  const lin = (f: number) => ({ timing: linearTiming({ durationInFrames: f }), durationInFrames: f });
  const spr = (f: number) => ({ timing: springTiming({ durationInFrames: f, config: { damping: 200 } }), durationInFrames: f });
  if (nextType === 'cta' || nextType === 'question') {
    return { presentation: fade(), ...lin(16) };
  }
  if (currentType === 'hook') {
    return { presentation: slide({ direction: 'from-bottom' }), ...spr(18) };
  }
  if (currentType === 'stat' && nextType === 'chart') {
    return { presentation: fade(), ...lin(14) };
  }
  if (currentType === 'chart') {
    return { presentation: wipe({ direction: 'from-left' }), ...spr(16) };
  }
  // stat -> stat (and any other body-to-body): rotate variants so repeated
  // segments don't all use the same move (fixes monotonous transitions).
  const variants = [
    { presentation: slide({ direction: 'from-bottom' }), ...spr(16) },
    { presentation: slide({ direction: 'from-right' }), ...spr(16) },
    { presentation: wipe({ direction: 'from-left' }), ...spr(18) },
    { presentation: fade(), ...lin(15) },
  ];
  return variants[index % variants.length];
}

// Sum of transition frames consumed by TransitionSeries overlap. The composition
// length must subtract these, otherwise Remotion renders a frozen tail after the
// last segment (sum of sequences > actual TransitionSeries timeline).
export function totalTransitionFrames(segments: Segment[]): number {
  let total = 0;
  for (let i = 0; i < segments.length - 1; i++) {
    total += transitionSpec(segments[i].type, segments[i + 1].type, i).durationInFrames;
  }
  return total;
}

// Exact rendered length = sum of sequence frames minus overlapped transition frames.
export function compositionFrames(script: { segments: Segment[] }): number {
  const seqFrames = script.segments.reduce(
    (sum, s) => sum + secsToFrames(s.endSec - s.startSec), 0);
  return Math.max(1, seqFrames - totalTransitionFrames(script.segments));
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
        const transition = nextSegment ? transitionSpec(segment.type, nextSegment.type, i) : null;
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
