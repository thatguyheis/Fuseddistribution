import React from 'react';
import {PresentationScene, type PresentationPlan} from '../components/PresentationScene';
import { AbsoluteFill, Audio, Img, staticFile, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import type { TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { BRAND, OUTPUT, secsToFrames } from '../brand';
import { HookCard } from '../components/HookCard';
import { OverlayCard } from '../components/OverlayCard';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { CTACard } from '../components/CTACard';
import { QuestionCard } from '../components/QuestionCard';
import { Subtitle } from '../components/Subtitle';
import { OpeningHero } from '../components/OpeningHero';
import type { ReelScript, Segment, CaptionChunk, MediaEntry } from '../types';
import type { StoryboardPlan } from '../storyboard';
import { PaperCollagePilot } from './PaperCollagePilot';
import { OwnedMediaSequence } from '../components/OwnedMediaSequence';
import { MediaFeature } from '../components/MediaFeature';
import { EditorialDataBoard } from './EditorialDataBoard';
import {
  compositionFramesForSegments,
  totalTransitionFrames as sumTransitionFrames,
  transitionDurationFrames,
} from '../../scripts/transition-timing.mjs';

type MediaMap = Record<number, MediaEntry>;

const SegmentCard: React.FC<{
  segment: Segment;
  mediaEntry?: MediaEntry;
  segmentIndex: number;
  storyboard?: StoryboardPlan;
}> = ({ segment, mediaEntry, segmentIndex, storyboard }) => {
  // Reviewed owner layouts already contain the hook, evidence and visual design.
  // Preserve their exact crop and color instead of covering them with a second card.
  if (['fused-owned-coin-library', 'fused-verified-coin-evidence'].includes(mediaEntry?.source) && mediaEntry.type === 'photo') {
    return <OwnedMediaSequence media={mediaEntry} />;
  }
  const storyboardSegment = storyboard?.segments.find((item) => item.segmentIndex === segmentIndex);
  if (storyboardSegment?.visual === 'media-feature' && mediaEntry) {
    return <MediaFeature media={mediaEntry} text={'text' in segment ? segment.text : ''} segmentIndex={segmentIndex} />;
  }
  if (storyboardSegment?.visual === 'paper-collage') {
    return (
      <PaperCollagePilot
        embedded
        imagePath={storyboardSegment.asset ?? 'paper-collage-pilot/source-still.png'}
        backgroundColor={storyboardSegment.backgroundColor ?? '#315c62'}
        accentColor={storyboardSegment.accentColor ?? '#d8b84c'}
        label={storyboardSegment.label ?? storyboardSegment.chapter.toUpperCase()}
        message={storyboardSegment.message}
      />
    );
  }
  if (storyboardSegment?.visual === 'data-board' && storyboardSegment.dataBoard) {
    return <EditorialDataBoard board={storyboardSegment.dataBoard} imagePath={storyboardSegment.asset} backgroundColor={storyboardSegment.backgroundColor ?? '#315c62'} accentColor={storyboardSegment.accentColor ?? '#58d6ff'} />;
  }
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
  const durationInFrames = transitionDurationFrames(currentType, nextType, index);
  const lin = () => ({ timing: linearTiming({ durationInFrames }), durationInFrames });
  const spr = () => ({ timing: springTiming({ durationInFrames, config: { damping: 200 } }), durationInFrames });
  if (nextType === 'cta' || nextType === 'question') {
    return { presentation: fade(), ...lin() };
  }
  if (currentType === 'hook') {
    return { presentation: slide({ direction: 'from-bottom' }), ...spr() };
  }
  if (currentType === 'stat' && nextType === 'chart') {
    return { presentation: fade(), ...lin() };
  }
  if (currentType === 'chart') {
    return { presentation: wipe({ direction: 'from-left' }), ...spr() };
  }
  // stat -> stat (and any other body-to-body): rotate variants so repeated
  // segments don't all use the same move (fixes monotonous transitions).
  const variants = [
    { presentation: slide({ direction: 'from-bottom' }), ...spr() },
    { presentation: slide({ direction: 'from-right' }), ...spr() },
    { presentation: wipe({ direction: 'from-left' }), ...spr() },
    { presentation: fade(), ...lin() },
  ];
  return variants[index % variants.length];
}

// Sum of transition frames consumed by TransitionSeries overlap. The composition
// length must subtract these, otherwise Remotion renders a frozen tail after the
// last segment (sum of sequences > actual TransitionSeries timeline).
export function totalTransitionFrames(segments: Segment[]): number {
  return sumTransitionFrames(segments);
}

// Exact rendered length = sum of sequence frames minus overlapped transition frames.
export function compositionFrames(script: { segments: Segment[] }): number {
  return compositionFramesForSegments(script.segments, BRAND.fps);
}

type CaptionMap = Record<number, CaptionChunk[]>;

export const BlogReel: React.FC<{
  script: ReelScript;
  musicTrack?: string;
  musicGain?: number;
  media?: MediaMap;
  captions?: CaptionMap;
  storyboard?: StoryboardPlan;
  openingHero?: {src: string};
  presentation?: PresentationPlan;
}> = ({ script, musicTrack = 'none', musicGain = 0, media = {}, captions = {}, storyboard, openingHero, presentation }) => {
  const {fps, width, durationInFrames} = useVideoConfig();
  const hasMusic = musicTrack && !['none', 'off', 'silent'].includes(musicTrack.toLowerCase());
  return <AbsoluteFill style={{ background: BRAND.bg }}>
    {hasMusic && <Audio src={staticFile(`music/${musicTrack}`)} volume={frame => presentation ? musicGain * Math.min(1, frame / fps, (durationInFrames - frame) / (fps * 1.5)) : musicGain} loop />}
    <div style={{ position: 'relative', flexShrink: 0, width: BRAND.width, height: BRAND.height, transform: `scale(${width / BRAND.width})`, transformOrigin: 'top left' }}>
      <TransitionSeries>
      {script.segments.map((segment, i) => {
        const durationInFrames = secsToFrames(segment.endSec - segment.startSec);
        const nextSegment = script.segments[i + 1];
        const transition = nextSegment ? transitionSpec(segment.type, nextSegment.type, i) : null;
        return (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={durationInFrames} premountFor={fps}>
              <AbsoluteFill>
                {segment.narration && (
                  <Audio src={staticFile(`audio/${script.slug}/segment-${i}.${presentation ? 'wav' : 'm4a'}`)} />
                )}
                {presentation?.segments[i] ? <PresentationScene shots={presentation.segments[i]} finalScene={i===script.segments.length-1} /> : <SegmentCard segment={segment} mediaEntry={media[i]} segmentIndex={i} storyboard={storyboard} />}
                {segment.narration && <Subtitle narration={segment.narration} captions={captions[i]} maxFontSize={presentation ? 44 : 28} />}
              </AbsoluteFill>
            </TransitionSeries.Sequence>
            {transition && (
              <TransitionSeries.Transition
                presentation={presentation ? fade() : transition.presentation}
                timing={transition.timing}
              />
            )}
          </React.Fragment>
        );
      })}
      </TransitionSeries>
    </div>
    {openingHero && <OpeningHero src={openingHero.src} />}
  </AbsoluteFill>;
};
