import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { BlogReel } from './compositions/BlogReel';
import { BRAND } from './brand';
import type { ReelScript } from './types';

const defaultScript: ReelScript = {
  slug: 'preview',
  title: 'Preview',
  totalDuration: 5,
  segments: [{ type: 'hook', startSec: 0, endSec: 5, text: 'Preview mode', narration: null }],
};

const Root: React.FC = () => (
  <Composition
    id="BlogReel"
    component={BlogReel}
    durationInFrames={150}
    fps={BRAND.fps}
    width={BRAND.width}
    height={BRAND.height}
    defaultProps={{ script: defaultScript, musicTrack: 'ambient-01.mp3' }}
    calculateMetadata={({ props }) => ({
      durationInFrames: props.script.totalDuration * BRAND.fps,
    })}
  />
);

registerRoot(Root);
