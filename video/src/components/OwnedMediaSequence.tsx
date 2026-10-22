import React from 'react';
import {AbsoluteFill, Img, Sequence, staticFile, useVideoConfig} from 'remotion';
import type {MediaEntry} from '../types';

/** Reviewed compositions cut between exact, unchanged evidence crops. */
export const OwnedMediaSequence: React.FC<{media: MediaEntry}> = ({media}) => {
  const {durationInFrames} = useVideoConfig();
  const shots = media.shots?.length ? media.shots : [media.src];
  return <AbsoluteFill>{shots.map((src,index) => {
    const from = Math.floor(index * durationInFrames / shots.length);
    const end = Math.floor((index + 1) * durationInFrames / shots.length);
    return <Sequence key={`${src}-${index}`} from={from} durationInFrames={end-from}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
    </Sequence>;
  })}</AbsoluteFill>;
};
