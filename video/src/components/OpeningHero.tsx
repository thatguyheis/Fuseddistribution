import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

/** A complete cover at frame zero, above animated storyboards and captions. */
export const OpeningHero: React.FC<{src: string; presentationProfile?: string}> = ({src, presentationProfile}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const businessProfile = presentationProfile === 'business-growth-v1';
  const motion = businessProfile ? interpolate(frame, [0, 2 * fps], [1, 1.035], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  const opacity = interpolate(frame, [fps, Math.round(fps * 1.2)], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  if (opacity === 0) return null;
  return <AbsoluteFill style={{opacity, background: businessProfile ? '#0A1A2A' : '#041018', overflow: 'hidden'}}>
    <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(24px) brightness(0.35)', transform: `scale(${1.1 * motion})`}} />
    <AbsoluteFill style={{justifyContent: 'center'}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${motion})`}} />
    </AbsoluteFill>
  </AbsoluteFill>;
};
