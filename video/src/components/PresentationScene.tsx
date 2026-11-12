import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {FittedText} from './FittedText';
import {POPPINS, BEBAS} from '../fonts';

export type PresentationShot = {
  src: string;
  type: 'photo' | 'video';
  title: string;
  eyebrow: string;
  credit: string;
  weight: number;
  fit?: 'cover' | 'contain';
  focus?: string;
  timeline?: boolean;
  trimBefore?: number;
  fullFrame?: boolean;
  brandName?: string;
  reservedGraphic?: boolean;
};

export type PresentationPlan = {segments: Record<number, PresentationShot[]>};

const BUSINESS_PROFILE = 'business-growth-v1';

const Shot: React.FC<{
  shot: PresentationShot;
  index: number;
  fadeIn: boolean;
  preserveEnding: boolean;
  presentationProfile?: string;
  openingScene: boolean;
}> = ({shot, index, fadeIn, preserveEnding, presentationProfile, openingScene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const businessProfile = presentationProfile === BUSINESS_PROFILE;
  const progress = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  const openingMotion = businessProfile && openingScene && index === 0
    ? interpolate(frame, [0, 2 * fps], [1, 1.035], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 1;
  const scale = shot.fullFrame
    ? openingMotion
    : interpolate(progress, [0, 1], index % 2 ? [1.07, 1.01] : [1.01, 1.07]);
  const opacity = fadeIn ? interpolate(frame, [0, 15], [0, 1], {extrapolateRight: 'clamp'}) : 1;
  const textOpacity = Math.min(
    interpolate(frame, [20, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
    preserveEnding ? 1 : interpolate(frame, [durationInFrames - 36, durationInFrames - 20], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );
  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: shot.fit || 'cover',
    objectPosition: shot.focus || 'center',
    transform: `scale(${scale})`,
    filter: shot.type === 'video' ? 'saturate(0.75) contrast(1.03)' : undefined,
  };
  const headingBlock = businessProfile
    ? {position: 'absolute' as const, top: 620, left: 150, right: 150, color: '#FFFFFF', textAlign: 'center' as const}
    : {position: 'absolute' as const, top: 110, left: 72, right: 72, color: '#e8dfcd'};
  const headingMaxWidth = businessProfile ? 780 : 920;
  const headingMaxSize = businessProfile ? 80 : 88;

  return <AbsoluteFill style={{opacity, background: businessProfile ? '#0A1A2A' : '#081a20', overflow: 'hidden'}}>
    {shot.type === 'video'
      ? <OffthreadVideo src={staticFile(shot.src)} muted startFrom={Math.round((shot.trimBefore || 0) * fps)} style={imageStyle} />
      : <Img src={staticFile(shot.src)} style={imageStyle} />}
    {!shot.fullFrame && <AbsoluteFill style={{background: businessProfile ? 'linear-gradient(180deg,rgba(2,12,17,.87) 0%,rgba(2,12,17,.62) 31%,rgba(2,12,17,.62) 72%,rgba(2,12,17,.95) 100%)' : 'linear-gradient(180deg,rgba(2,12,17,.87) 0%,rgba(2,12,17,.16) 31%,transparent 47%,rgba(2,12,17,.3) 72%,rgba(2,12,17,.95) 100%)'}} />}
    {!shot.fullFrame && <AbsoluteFill style={{opacity: textOpacity}}>
      <div style={headingBlock}>
        <div style={{fontFamily: POPPINS, fontSize: businessProfile ? 25 : 23, fontWeight: 600, letterSpacing: businessProfile ? 2 : 5, color: '#58d6ff', marginBottom: businessProfile ? 18 : 22}}>{shot.eyebrow}</div>
        <FittedText
          text={shot.title}
          fontFamily={businessProfile ? POPPINS : BEBAS}
          fontWeight={businessProfile ? 600 : undefined}
          maxFontSize={headingMaxSize}
          maxLines={3}
          maxWidth={headingMaxWidth}
          lineHeight={1.05}
          color={businessProfile ? '#FFFFFF' : '#fff7e8'}
        />
        <div style={{height: 4, width: 112, background: '#58d6ff', margin: '22px auto 0'}} />
      </div>
      {!businessProfile && shot.timeline && <div style={{position: 'absolute', left: 110, right: 110, top: 1400, color: '#fff7e8'}}>
        <div style={{height: 3, background: '#ffffff55', position: 'relative'}}><div style={{height: 3, width: `${interpolate(progress, [0, .5], [0, 100], {extrapolateRight: 'clamp'})}%`, background: '#58d6ff'}} /></div>
        <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: BEBAS, fontSize: 68, marginTop: 20}}><span>1825</span><span>1925</span></div>
        <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: POPPINS, fontSize: 22}}><span>THE FORT</span><span>THE COIN</span></div>
      </div>}
      {!businessProfile && <div style={{position: 'absolute', left: 72, right: 72, bottom: 280, color: '#d2dddc', fontFamily: POPPINS, fontSize: 20, letterSpacing: 1}}>{shot.credit}</div>}
    </AbsoluteFill>}
    {!shot.fullFrame && !businessProfile && <div style={{position: 'absolute', left: 72, bottom: 68, fontFamily: POPPINS, fontSize: 19, letterSpacing: 4, color: '#a5bdbf'}}>{shot.brandName ?? <>FUSED <span style={{color: '#d9c6a5'}}>DISTRIBUTION</span></>}</div>}
  </AbsoluteFill>;
};

/** Short overlapping shots preserve the parent scene's measured narration window. */
export const PresentationScene: React.FC<{
  shots: PresentationShot[];
  finalScene?: boolean;
  presentationProfile?: string;
  openingScene?: boolean;
}> = ({shots, finalScene = false, presentationProfile, openingScene = false}) => {
  const {durationInFrames, fps} = useVideoConfig();
  const total = shots.reduce((sum, shot) => sum + shot.weight, 0);
  let cursor = 0;
  return <AbsoluteFill>{shots.map((shot, index) => {
    const start = Math.round(cursor / total * durationInFrames);
    cursor += shot.weight;
    const end = index === shots.length - 1 ? durationInFrames : Math.round(cursor / total * durationInFrames);
    return <Sequence key={`${shot.src}-${index}`} from={start} durationInFrames={Math.min(durationInFrames - start, end - start + 15)} premountFor={fps}>
      <Shot
        shot={shot}
        index={index}
        fadeIn={index > 0}
        preserveEnding={finalScene && index === shots.length - 1}
        presentationProfile={presentationProfile}
        openingScene={openingScene}
      />
    </Sequence>;
  })}</AbsoluteFill>;
};
