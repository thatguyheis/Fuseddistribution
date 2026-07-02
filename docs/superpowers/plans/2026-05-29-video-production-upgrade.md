# Video Production Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Remotion reel output with between-segment transitions, modern typography (Bebas Neue + Poppins), Ken Burns photo motion, and tighter spring animations.

**Architecture:** Install `@remotion/transitions` and `@remotion/google-fonts`. Create `src/fonts.ts` for font loading. Replace `Series` → `TransitionSeries` in `BlogReel.tsx`. Add Ken Burns to `PhotoBg.tsx` using `useVideoConfig()`. Remove manual exit fades from all card components (transitions handle exits now). Tighten spring params uniformly across all cards.

**Tech Stack:** Remotion 4.0.290, React 18, TypeScript, `@remotion/transitions`, `@remotion/google-fonts`

---

## File Map

| File | Change |
|------|--------|
| `video/package.json` | Add two packages |
| `video/src/fonts.ts` | NEW — loadFont calls, export `BEBAS` and `POPPINS` family strings |
| `video/src/Root.tsx` | Import fonts.ts to trigger font loading before render |
| `video/src/components/PhotoBg.tsx` | Add Ken Burns zoom, add `segmentIndex` prop |
| `video/src/compositions/BlogReel.tsx` | Series → TransitionSeries, thread `segmentIndex` prop |
| `video/src/components/HookCard.tsx` | Remove exit fade, spring → damping:30/stiffness:160, Impact → BEBAS |
| `video/src/components/StatCard.tsx` | Remove exit fade, tighten springs + CountUp, Impact → BEBAS |
| `video/src/components/OverlayCard.tsx` | Remove exit fade, tighten springs + CountUp, Impact → BEBAS |
| `video/src/components/ChartCard.tsx` | Remove exit fade, tighten springs + stagger 0.08s, Impact → BEBAS, Trebuchet → POPPINS |
| `video/src/components/CTACard.tsx` | Tighten spring, Impact → BEBAS (no exit fade to remove) |
| `video/src/components/Subtitle.tsx` | Trebuchet MS → POPPINS 400 |

---

## Task 1: Install packages

**Files:**
- Modify: `video/package.json` (via npm install)

- [ ] **Step 1: Install**

```bash
cd "/Users/nick/Documents/New project/video"
npm install @remotion/transitions @remotion/google-fonts
```

Expected: both packages appear in `package.json` dependencies, no peer dep errors.

- [ ] **Step 2: Verify TypeScript sees them**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors about missing modules (existing errors OK, new import errors not OK).

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add package.json package-lock.json
git commit -m "feat(video): install @remotion/transitions and @remotion/google-fonts"
```

---

## Task 2: Create fonts.ts

**Files:**
- Create: `video/src/fonts.ts`

- [ ] **Step 1: Create the file**

```typescript
// video/src/fonts.ts
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

export const { fontFamily: BEBAS } = loadBebasNeue();
export const { fontFamily: POPPINS } = loadPoppins({ weights: ["400", "600"] });
```

- [ ] **Step 2: Verify compiles**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit 2>&1 | grep fonts
```

Expected: no errors mentioning fonts.ts.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/fonts.ts
git commit -m "feat(video): add fonts.ts — Bebas Neue + Poppins via google-fonts"
```

---

## Task 3: Update Root.tsx — import fonts

**Files:**
- Modify: `video/src/Root.tsx`

- [ ] **Step 1: Add import**

In `video/src/Root.tsx`, add this import after the existing imports (the import itself triggers `loadFont()` at module load time — no other changes needed):

```typescript
import './fonts';
```

Full file after edit:

```typescript
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { BlogReel } from './compositions/BlogReel';
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
    defaultProps={{ script: defaultScript, musicTrack: 'ambient-01.mp3' }}
    calculateMetadata={({ props }) => ({
      durationInFrames: props.script.totalDuration * BRAND.fps,
    })}
  />
);

registerRoot(Root);
```

- [ ] **Step 2: Verify compiles**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit 2>&1 | grep -E "Root|fonts"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/Root.tsx
git commit -m "feat(video): load Bebas Neue + Poppins fonts in Root"
```

---

## Task 4: Update PhotoBg.tsx — Ken Burns

**Files:**
- Modify: `video/src/components/PhotoBg.tsx`

- [ ] **Step 1: Rewrite PhotoBg**

```typescript
// video/src/components/PhotoBg.tsx
import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';

const ORIGINS = ['center', 'top left', 'bottom right'] as const;

export const PhotoBg: React.FC<{
  photoPath?: string;
  overlayOpacity?: number;
  segmentIndex?: number;
}> = ({ photoPath, overlayOpacity = 0.62, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const transformOrigin = ORIGINS[segmentIndex % 3];

  if (!photoPath) return null;
  return (
    <>
      <Img
        src={staticFile(photoPath)}
        style={{
          position: 'absolute', inset: 0,
          width: BRAND.width, height: BRAND.height,
          objectFit: 'cover', objectPosition: 'center',
          transform: `scale(${scale})`,
          transformOrigin,
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, rgba(4,16,24,${overlayOpacity}) 0%, rgba(4,16,24,${overlayOpacity + 0.1}) 100%)`,
      }} />
    </>
  );
};
```

- [ ] **Step 2: Verify compiles**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit 2>&1 | grep PhotoBg
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/components/PhotoBg.tsx
git commit -m "feat(video): Ken Burns slow zoom on background photos"
```

---

## Task 5: Update BlogReel.tsx — TransitionSeries

**Files:**
- Modify: `video/src/compositions/BlogReel.tsx`

- [ ] **Step 1: Rewrite BlogReel**

```typescript
// video/src/compositions/BlogReel.tsx
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
import { Subtitle } from '../components/Subtitle';
import type { ReelScript, Segment } from '../types';

type PhotoMap = Record<number, string>;

const SegmentCard: React.FC<{
  segment: Segment;
  photoPath?: string;
  segmentIndex: number;
}> = ({ segment, photoPath, segmentIndex }) => {
  switch (segment.type) {
    case 'hook':    return <HookCard segment={segment} photoPath={photoPath} segmentIndex={segmentIndex} />;
    case 'overlay': return <OverlayCard segment={segment} photoPath={photoPath} segmentIndex={segmentIndex} />;
    case 'stat':    return <StatCard segment={segment} photoPath={photoPath} segmentIndex={segmentIndex} />;
    case 'chart':   return <ChartCard segment={segment} segmentIndex={segmentIndex} />;
    case 'cta':     return <CTACard segment={segment} photoPath={photoPath} segmentIndex={segmentIndex} />;
  }
};

function getTransition(currentType: string, nextType: string) {
  if (nextType === 'cta') {
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

export const BlogReel: React.FC<{
  script: ReelScript;
  musicTrack?: string;
  photos?: PhotoMap;
}> = ({ script, musicTrack = 'ambient-01.mp3', photos = {} }) => (
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
                <SegmentCard segment={segment} photoPath={photos[i]} segmentIndex={i} />
                {segment.narration && <Subtitle narration={segment.narration} />}
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
```

- [ ] **Step 2: Verify compiles**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit 2>&1 | grep -E "BlogReel|Transition"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/compositions/BlogReel.tsx
git commit -m "feat(video): Series → TransitionSeries with slide/fade/wipe between segments"
```

---

## Task 6: Update HookCard.tsx

**Files:**
- Modify: `video/src/components/HookCard.tsx`

- [ ] **Step 1: Rewrite HookCard**

Changes: remove exit fade opacity, damping 18→30, stiffness 100→160, Impact→BEBAS, add `segmentIndex` prop passed to PhotoBg.

```typescript
// video/src/components/HookCard.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS } from '../fonts';
import { PhotoBg } from './PhotoBg';
import type { HookSegment } from '../types';

export const HookCard: React.FC<{
  segment: HookSegment;
  photoPath?: string;
  segmentIndex?: number;
}> = ({ segment, photoPath, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideProgress = spring({
    frame, fps,
    config: { damping: 30, stiffness: 160 },
    durationInFrames: Math.round(fps * 0.6),
  });
  const translateY = interpolate(slideProgress, [0, 1], [80, 0]);
  const barWidth = interpolate(slideProgress, [0, 1], [0, 120]);

  return (
    <div style={{
      position: 'relative', width: BRAND.width, height: BRAND.height,
      background: BRAND.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px', overflow: 'hidden',
    }}>
      <PhotoBg photoPath={photoPath} overlayOpacity={0.7} segmentIndex={segmentIndex} />
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', transform: `translateY(${translateY}px)`,
      }}>
        <p style={{
          fontFamily: BEBAS,
          fontSize: 96, color: BRAND.white, textAlign: 'center',
          textTransform: 'uppercase', letterSpacing: '0.02em',
          lineHeight: 1.1, margin: '0 0 24px',
          textShadow: '0 4px 24px rgba(0,0,0,0.8)',
        }}>
          {segment.text}
        </p>
        <div style={{
          width: barWidth, height: 5, borderRadius: 999,
          background: BRAND.cyan, boxShadow: `0 0 16px ${BRAND.cyan}`,
        }} />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify compiles**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit 2>&1 | grep HookCard
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/components/HookCard.tsx
git commit -m "feat(video): HookCard — Bebas Neue, tighter spring, remove exit fade"
```

---

## Task 7: Update StatCard.tsx

**Files:**
- Modify: `video/src/components/StatCard.tsx`

- [ ] **Step 1: Rewrite StatCard**

Changes: remove fadeOut opacity (keep fadeIn for entrance), damping 22→30, stiffness 60→160, CountUp duration 1.2s→0.9s, Impact→BEBAS, add `segmentIndex` prop.

```typescript
// video/src/components/StatCard.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS } from '../fonts';
import { PhotoBg } from './PhotoBg';
import type { StatSegment } from '../types';

const CountUp: React.FC<{ target: number; suffix: string; countFrames: number }> = ({
  target, suffix, countFrames,
}) => {
  const frame = useCurrentFrame();
  const progress = spring({ frame, fps: 30, config: { damping: 30, stiffness: 160 },
    durationInFrames: countFrames });
  const value = Math.round(interpolate(progress, [0, 1], [0, target]));
  return <>{value}{suffix}</>;
};

function parseStatFromText(text: string): { number: number; suffix: string; rest: string } | null {
  const m = text.match(/^(\d+)(%|\+?)\s*(.*)/s);
  if (!m || parseInt(m[1], 10) < 2) return null;
  return { number: parseInt(m[1], 10), suffix: m[2], rest: m[3].trim() };
}

export const StatCard: React.FC<{
  segment: StatSegment;
  photoPath?: string;
  segmentIndex?: number;
}> = ({ segment, photoPath, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fi = Math.round(fps * 0.3);
  const countFrames = Math.round(fps * 0.9);
  const fadeIn = interpolate(frame, [0, fi], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const parsed = parseStatFromText(segment.text);

  return (
    <div style={{
      position: 'relative', width: BRAND.width, height: BRAND.height,
      background: BRAND.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px',
      overflow: 'hidden', opacity: fadeIn,
    }}>
      <PhotoBg photoPath={photoPath} segmentIndex={segmentIndex} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 16 }}>
        {parsed ? (
          <>
            <p style={{
              fontFamily: BEBAS,
              fontSize: 128, color: BRAND.cyan, textTransform: 'uppercase',
              letterSpacing: '0.02em', lineHeight: 1, margin: 0,
              textShadow: `0 0 40px ${BRAND.cyan}66`,
            }}>
              <CountUp target={parsed.number} suffix={parsed.suffix} countFrames={countFrames} />
            </p>
            {parsed.rest && (
              <p style={{
                fontFamily: BEBAS,
                fontSize: 56, color: BRAND.white, textTransform: 'uppercase',
                letterSpacing: '0.04em', lineHeight: 1.2, margin: 0, textAlign: 'center',
                textShadow: '0 2px 16px rgba(0,0,0,0.8)',
              }}>
                {parsed.rest}
              </p>
            )}
          </>
        ) : (
          <p style={{
            fontFamily: BEBAS,
            fontSize: 80, color: BRAND.white, textAlign: 'center',
            textTransform: 'uppercase', letterSpacing: '0.02em',
            lineHeight: 1.2, margin: 0,
          }}>
            {segment.text}
          </p>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify compiles**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit 2>&1 | grep StatCard
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/components/StatCard.tsx
git commit -m "feat(video): StatCard — Bebas Neue, tighter spring, faster CountUp, remove exit fade"
```

---

## Task 8: Update OverlayCard.tsx

**Files:**
- Modify: `video/src/components/OverlayCard.tsx`

- [ ] **Step 1: Rewrite OverlayCard**

Changes: remove fadeOut, damping 14→30, stiffness 120→160, CountUp 1.2s→0.9s, Impact→BEBAS, add `segmentIndex` prop.

```typescript
// video/src/components/OverlayCard.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS } from '../fonts';
import { PhotoBg } from './PhotoBg';
import type { OverlaySegment } from '../types';

const CountUp: React.FC<{ target: number; suffix: string; countFrames: number }> = ({
  target, suffix, countFrames,
}) => {
  const frame = useCurrentFrame();
  const progress = spring({ frame, fps: 30, config: { damping: 30, stiffness: 160 },
    durationInFrames: countFrames });
  const value = Math.round(interpolate(progress, [0, 1], [0, target]));
  return <>{value}{suffix}</>;
};

function parseStatFromText(text: string): { prefix: string; number: number; suffix: string; rest: string } | null {
  const m = text.match(/^(\D*)(\d+)(%|\+?)\s*(.*)/s);
  if (!m || parseInt(m[2], 10) < 2) return null;
  return { prefix: m[1].trim(), number: parseInt(m[2], 10), suffix: m[3], rest: m[4].trim() };
}

export const OverlayCard: React.FC<{
  segment: OverlaySegment;
  photoPath?: string;
  segmentIndex?: number;
}> = ({ segment, photoPath, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const countFrames = Math.round(fps * 0.9);

  const slideProgress = spring({ frame, fps, config: { damping: 30, stiffness: 160 },
    durationInFrames: Math.round(fps * 0.5) });
  const translateY = interpolate(slideProgress, [0, 1], [60, 0]);

  const parsed = parseStatFromText(segment.text);

  return (
    <div style={{
      position: 'relative', width: BRAND.width, height: BRAND.height,
      background: BRAND.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px', overflow: 'hidden',
    }}>
      <PhotoBg photoPath={photoPath} overlayOpacity={0.65} segmentIndex={segmentIndex} />
      <div style={{
        position: 'relative', transform: `translateY(${translateY}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        {parsed ? (
          <>
            <p style={{
              fontFamily: BEBAS,
              fontSize: 128, color: BRAND.cyan, textTransform: 'uppercase',
              letterSpacing: '0.02em', lineHeight: 1, margin: 0,
              textShadow: `0 0 40px ${BRAND.cyan}66`,
            }}>
              <CountUp target={parsed.number} suffix={parsed.suffix} countFrames={countFrames} />
            </p>
            <p style={{
              fontFamily: BEBAS,
              fontSize: 56, color: BRAND.white, textTransform: 'uppercase',
              letterSpacing: '0.04em', lineHeight: 1.2, margin: 0, textAlign: 'center',
              textShadow: '0 2px 16px rgba(0,0,0,0.8)',
            }}>
              {parsed.rest || parsed.prefix}
            </p>
          </>
        ) : (
          <p style={{
            fontFamily: BEBAS,
            fontSize: 96, color: BRAND.cyan, textTransform: 'uppercase',
            letterSpacing: '0.02em', lineHeight: 1.15, textAlign: 'center', margin: 0,
            textShadow: `0 0 40px ${BRAND.cyan}66`,
          }}>
            {segment.text}
          </p>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify compiles**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit 2>&1 | grep OverlayCard
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/components/OverlayCard.tsx
git commit -m "feat(video): OverlayCard — Bebas Neue, tighter spring, remove exit fade"
```

---

## Task 9: Update ChartCard.tsx

**Files:**
- Modify: `video/src/components/ChartCard.tsx`

- [ ] **Step 1: Rewrite ChartCard**

Changes: remove fadeOut (keep fadeIn), damping 20→30, stiffness 80→160, bar stagger 0.12s→0.08s, CountUp 1.5s→0.9s, Impact→BEBAS, Trebuchet→POPPINS, add `segmentIndex` prop.

```typescript
// video/src/components/ChartCard.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS, POPPINS } from '../fonts';
import type { ChartSegment } from '../types';

const LABEL_W = 220;
const BAR_W   = 580;
const VALUE_W = 68;

const Bar: React.FC<{ label: string; value: number; index: number; fps: number }> = ({
  label, value, index, fps,
}) => {
  const frame = useCurrentFrame();
  const delay = index * Math.round(fps * 0.08);
  const progress = spring({
    frame: Math.max(0, frame - delay), fps,
    config: { damping: 30, stiffness: 160 },
    durationInFrames: Math.round(fps * 0.9),
  });
  const barWidth = interpolate(progress, [0, 1], [0, (value / 100) * BAR_W]);
  const displayValue = Math.round(interpolate(progress, [0, 1], [0, value]));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
      <span style={{
        fontFamily: POPPINS,
        fontWeight: 600,
        fontSize: 34,
        color: BRAND.muted, width: LABEL_W, textAlign: 'right', flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{
        width: BAR_W, height: 18, borderRadius: 999,
        background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          width: barWidth, height: '100%', borderRadius: 999,
          background: `linear-gradient(90deg, ${BRAND.cyan}, #4dffb8)`,
          boxShadow: `0 0 12px ${BRAND.cyan}66`,
        }} />
      </div>
      <span style={{
        fontFamily: BEBAS,
        fontSize: 38,
        color: BRAND.white, width: VALUE_W, flexShrink: 0,
      }}>
        {displayValue}%
      </span>
    </div>
  );
};

export const ChartCard: React.FC<{
  segment: ChartSegment;
  segmentIndex?: number;
}> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fi = Math.round(fps * 0.3);
  const fadeIn = interpolate(frame, [0, fi], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      width: BRAND.width, height: BRAND.height, background: BRAND.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px',
      opacity: fadeIn,
    }}>
      <p style={{
        fontFamily: BEBAS,
        fontSize: 48, color: BRAND.cyan,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 52, textAlign: 'center',
      }}>
        {segment.title}
      </p>
      <div style={{ width: LABEL_W + 16 + BAR_W + 16 + VALUE_W }}>
        {segment.bars.map((bar, i) => (
          <Bar key={bar.label} label={bar.label} value={bar.value} index={i} fps={fps} />
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify compiles**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit 2>&1 | grep ChartCard
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/components/ChartCard.tsx
git commit -m "feat(video): ChartCard — Bebas Neue + Poppins, tighter spring + stagger, remove exit fade"
```

---

## Task 10: Update CTACard.tsx

**Files:**
- Modify: `video/src/components/CTACard.tsx`

- [ ] **Step 1: Rewrite CTACard**

Changes: damping 18→30, stiffness 90→160, Impact→BEBAS, add `segmentIndex` prop. No exit fade to remove (CTACard has fade-in only).

```typescript
// video/src/components/CTACard.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS } from '../fonts';
import { PhotoBg } from './PhotoBg';
import type { CTASegment } from '../types';

export const CTACard: React.FC<{
  segment: CTASegment;
  photoPath?: string;
  segmentIndex?: number;
}> = ({ segment, photoPath, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideProgress = spring({ frame, fps, config: { damping: 30, stiffness: 160 },
    durationInFrames: Math.round(fps * 0.5) });
  const translateY = interpolate(slideProgress, [0, 1], [50, 0]);
  const opacity = interpolate(frame, [0, Math.round(fps * 0.3)], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const glowOpacity = interpolate(
    frame % Math.round(fps * 1.5),
    [0, Math.round(fps * 0.75), Math.round(fps * 1.5)],
    [0.4, 1, 0.4],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const [mainText, subText] = segment.text.split('—').map(s => s.trim());

  return (
    <div style={{
      position: 'relative', width: BRAND.width, height: BRAND.height,
      background: BRAND.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 60px', overflow: 'hidden', opacity,
    }}>
      <PhotoBg photoPath={photoPath} overlayOpacity={0.72} segmentIndex={segmentIndex} />
      <div style={{
        position: 'relative', padding: '60px 48px', borderRadius: 24,
        border: `3px solid rgba(88,214,255,${glowOpacity})`,
        boxShadow: `0 0 40px rgba(88,214,255,${glowOpacity * 0.5}), inset 0 0 60px rgba(4,16,24,0.6)`,
        background: 'rgba(4,16,24,0.55)',
        transform: `translateY(${translateY}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        backdropFilter: 'blur(2px)',
      }}>
        <p style={{
          fontFamily: BEBAS,
          fontSize: 88, color: BRAND.white, textTransform: 'uppercase',
          letterSpacing: '0.02em', lineHeight: 1.1, textAlign: 'center',
          margin: 0, textShadow: '0 4px 24px rgba(0,0,0,0.8)',
        }}>
          {mainText}
        </p>
        {subText && (
          <p style={{
            fontFamily: BEBAS,
            fontSize: 54, color: BRAND.cyan, textTransform: 'uppercase',
            letterSpacing: '0.06em', textAlign: 'center', margin: 0,
            textShadow: `0 0 20px ${BRAND.cyan}88`,
          }}>
            {subText}
          </p>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify compiles**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit 2>&1 | grep CTACard
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/components/CTACard.tsx
git commit -m "feat(video): CTACard — Bebas Neue, tighter spring"
```

---

## Task 11: Update Subtitle.tsx

**Files:**
- Modify: `video/src/components/Subtitle.tsx`

- [ ] **Step 1: Replace font family**

Only change: `fontFamily: '"Trebuchet MS", Arial, sans-serif'` → `fontFamily: POPPINS`. Add import for POPPINS.

Add after existing imports:
```typescript
import { POPPINS } from '../fonts';
```

Replace the `fontFamily` line in the style object:
```typescript
// Before:
fontFamily: '"Trebuchet MS", Arial, sans-serif',
fontWeight: 600,

// After:
fontFamily: POPPINS,
fontWeight: 600,
```

- [ ] **Step 2: Verify compiles**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit 2>&1 | grep Subtitle
```

Expected: no errors.

- [ ] **Step 3: Full TypeScript check — all files clean**

```bash
cd "/Users/nick/Documents/New project/video"
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/components/Subtitle.tsx
git commit -m "feat(video): Subtitle — Trebuchet MS → Poppins"
```

---

## Task 12: Test render both reels

**Files:** None — verification only.

- [ ] **Step 1: Render local-business-repeat-customers**

```bash
cd "/Users/nick/Documents/New project/video"
export $(cat .env | xargs) && node scripts/render.mjs --post=local-business-repeat-customers --music=ambient-10.mp3 2>&1 | tail -5
```

Expected output ends with:
```
✓ Render complete: .../local-business-repeat-customers.mp4
```

- [ ] **Step 2: Render silver-storage-options**

```bash
cd "/Users/nick/Documents/New project/video"
export $(cat .env | xargs) && node scripts/render.mjs --post=silver-storage-options --music=ambient-10.mp3 2>&1 | tail -5
```

Expected output ends with:
```
✓ Render complete: .../silver-storage-options.mp4
```

- [ ] **Step 3: Visual check — open both**

```bash
open "/Users/nick/Documents/New project/video/out/local-business-repeat-customers/local-business-repeat-customers.mp4"
open "/Users/nick/Documents/New project/video/out/silver-storage-options/silver-storage-options.mp4"
```

Verify:
- Transitions visible between each segment (not hard cuts)
- Bebas Neue font rendering on stat/hook/overlay text
- Poppins rendering on subtitles and chart labels
- Background photos slowly zooming (Ken Burns)
- No narration clipping
- No black frames

- [ ] **Step 4: Final commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add -A
git commit -m "feat(video): production upgrade — transitions, Bebas Neue/Poppins, Ken Burns, tighter springs"
```

---

## Risk Notes

- If render fails with font errors: check `loadFont()` is called at module level in `fonts.ts`, not inside a component.
- If transitions cause narration to clip: transition frames (10–18) eat into segment duration. Add that many frames (÷30 = seconds) to affected segment windows in `reel-script.md`.
- If Ken Burns makes text unreadable: reduce scale range from `[1, 1.08]` to `[1, 1.04]` in `PhotoBg.tsx`.
- Rollback: `git revert HEAD~N` where N = number of commits since Task 1.
