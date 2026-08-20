import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { BlogReel, compositionFrames } from './compositions/BlogReel';
import { BRAND } from './brand';
import './fonts';
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
    defaultProps={{ script: defaultScript, musicTrack: 'none', musicGain: 0 }}
    calculateMetadata={({ props }) => ({
      // Match the TransitionSeries timeline (sequences minus overlapped
      // transitions) so no frozen tail is rendered after the last segment.
      durationInFrames: compositionFrames(props.script),
    })}
  />
);

registerRoot(Root);
