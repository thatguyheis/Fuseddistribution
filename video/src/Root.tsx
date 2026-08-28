import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { BlogReel, compositionFrames } from './compositions/BlogReel';
import { PaperCollagePilot } from './compositions/PaperCollagePilot';
import { BRAND, OUTPUT } from './brand';
import './fonts';
import type { ReelScript } from './types';

const defaultScript: ReelScript = {
  slug: 'preview',
  title: 'Preview',
  totalDuration: 5,
  segments: [{ type: 'hook', startSec: 0, endSec: 5, text: 'Preview mode', narration: null }],
};

const Root: React.FC = () => (
  <>
    <Composition
      id="BlogReel"
      component={BlogReel}
      durationInFrames={150}
      fps={BRAND.fps}
      width={OUTPUT.width}
      height={OUTPUT.height}
      defaultProps={{ script: defaultScript, musicTrack: 'none', musicGain: 0 }}
      calculateMetadata={({ props }) => ({
        durationInFrames: compositionFrames(props.script),
      })}
    />
    <Composition
      id="PaperCollagePilot"
      component={PaperCollagePilot}
      durationInFrames={150}
      fps={BRAND.fps}
      width={OUTPUT.width}
      height={OUTPUT.height}
      defaultProps={{
        imagePath: 'paper-collage-pilot/source-still.png',
        backgroundColor: '#315c62',
        accentColor: '#d8b84c',
        label: 'SILVER PRICE HISTORY',
        audioPath: 'audio/silver-price-history-and-long-term-trends/segment-0.m4a',
      }}
    />
  </>
);

registerRoot(Root);
