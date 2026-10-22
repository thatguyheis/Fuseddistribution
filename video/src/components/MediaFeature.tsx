import React from 'react';
import {AbsoluteFill, Sequence, Img, staticFile, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {MediaBg} from './MediaBg';
import {FittedText} from './FittedText';
import {BEBAS, POPPINS} from '../fonts';
import type {MediaEntry} from '../types';

/** Let the image teach; keep the headline compact and captions unobstructed. */
const MediaFeatureScene: React.FC<{media: MediaEntry; text: string; segmentIndex: number}> = ({media, text, segmentIndex}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = interpolate(frame, [0, fps * 0.4], [36, 0], {extrapolateRight: 'clamp'});
  const generated = ['open-generative-ai-local', 'fused-generated-background-library'].includes(media.source || '');
  return <AbsoluteFill>
    <MediaBg media={media} overlayOpacity={0.18} segmentIndex={segmentIndex} />
    <div style={{position: 'absolute', top: 150, left: 65, right: 65, transform: `translateY(${reveal}px) rotate(-1deg)`, background: '#f5edda', borderLeft: '12px solid #58d6ff', padding: '28px 34px', boxShadow: '0 12px 32px #0006'}}>
      <FittedText text={text} fontFamily={BEBAS} maxFontSize={64} maxLines={3} maxWidth={860} lineHeight={1.1} color="#10232d" />
    </div>
    <div style={{position: 'absolute', bottom: 285, left: 65, fontFamily: POPPINS, fontSize: 21, color: '#fff', background: '#07141bcc', padding: '8px 14px'}}>
      {generated ? 'AI-generated illustration' : 'Supporting imagery'}
    </div>
  </AbsoluteFill>;
};


export const MediaFeature: React.FC<{media: MediaEntry; text: string; segmentIndex: number}> = (props) => {
  const {fps, durationInFrames} = useVideoConfig();
  const shots = props.media.evidenceCutaways || [];
  if (!shots.length) return <MediaFeatureScene {...props} />;
  const introFrames = Math.min(Math.round(6 * fps), Math.floor(durationInFrames / 2));
  return <AbsoluteFill>
    <Sequence durationInFrames={introFrames}><MediaFeatureScene {...props} /></Sequence>
    {shots.map((src,index) => {
      const from = introFrames + Math.floor(index * (durationInFrames - introFrames) / shots.length);
      const end = introFrames + Math.floor((index + 1) * (durationInFrames - introFrames) / shots.length);
      return <Sequence key={`${src}-${index}`} from={from} durationInFrames={end-from}>
        <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
      </Sequence>;
    })}
  </AbsoluteFill>;
};
