# Blog Reel Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully automated system that converts any blog post's `reel-script.md` into a finished 1080x1920 MP4 with animated visuals, Edge TTS narration, and ambient music — one command per post, zero manual editing.

**Architecture:** A `video/` workspace holds a Remotion + React renderer that is 100% data-driven from `script.json`. A Node.js parser converts `reel-script.md` → JSON; an audio generator creates per-segment MP3s via Edge TTS (free, no API key); Remotion sequences all visual components and mixes audio into the final MP4. A feedback CLI logs performance metrics and regenerates a report used to optimize future scripts.

**Tech Stack:** Node.js v24, Remotion v4, React 18, TypeScript 5, msedge-tts, Node built-in test runner

---

## File Map

**Create:**
- `video/package.json` — Remotion + React + msedge-tts deps, workspace scripts
- `video/tsconfig.json` — TypeScript config for React/JSX
- `video/remotion.config.ts` — Remotion renderer settings
- `video/src/types.ts` — ReelScript, Segment union, PerformanceRecord types
- `video/src/brand.ts` — color/font/dimension tokens + `secsToFrames` helper
- `video/src/Root.tsx` — Remotion composition registry
- `video/src/compositions/BlogReel.tsx` — main composition, maps segments → cards + audio
- `video/src/components/HookCard.tsx` — full-screen Impact stat, fade in/out
- `video/src/components/OverlayCard.tsx` — cyan stat text, slide-up spring
- `video/src/components/StatCard.tsx` — text-only Impact card, fade in/out
- `video/src/components/ChartCard.tsx` — animated horizontal bar chart
- `video/src/components/CTACard.tsx` — CTA with optional cyan sub-line
- `video/scripts/parse-script.mjs` — `reel-script.md` → `script.json` (exported fn + CLI)
- `video/scripts/parse-script.test.mjs` — unit tests for parser
- `video/scripts/generate-audio.mjs` — per-segment MP3s via Edge TTS
- `video/scripts/render.mjs` — full pipeline orchestrator (parse → audio → Remotion)
- `video/scripts/feedback.mjs` — performance logging CLI + report generator
- `video/data/performance.json` — append-only performance records
- `video/public/music/README.md` — instructions for adding ambient tracks
- `video/public/audio/.gitkeep` — placeholder dir for generated audio

**Modify:**
- `/Users/nick/Documents/New project/package.json` — add `video:*` npm scripts

---

## Task 1: Initialize video workspace

**Files:**
- Create: `video/package.json`
- Create: `video/tsconfig.json`
- Create: `video/remotion.config.ts`

- [ ] **Step 1: Create video/package.json**

```json
{
  "name": "blog-reel-renderer",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "studio": "npx remotion studio src/Root.tsx",
    "test": "node --test scripts/parse-script.test.mjs"
  },
  "dependencies": {
    "@remotion/cli": "4.0.290",
    "remotion": "4.0.290",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "msedge-tts": "^1.3.3"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create video/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create video/remotion.config.ts**

```ts
import { Config } from "@remotion/cli/config";
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

- [ ] **Step 4: Install dependencies**

```bash
cd "/Users/nick/Documents/New project/video" && npm install
```

Expected: installs cleanly, no peer-dependency errors.

- [ ] **Step 5: Verify Remotion CLI**

```bash
cd "/Users/nick/Documents/New project/video" && npx remotion --version
```

Expected: prints `4.0.x`.

- [ ] **Step 6: Create directory structure**

```bash
mkdir -p "/Users/nick/Documents/New project/video/src/compositions"
mkdir -p "/Users/nick/Documents/New project/video/src/components"
mkdir -p "/Users/nick/Documents/New project/video/scripts"
mkdir -p "/Users/nick/Documents/New project/video/public/audio"
mkdir -p "/Users/nick/Documents/New project/video/public/music"
mkdir -p "/Users/nick/Documents/New project/video/data"
mkdir -p "/Users/nick/Documents/New project/video/out"
touch "/Users/nick/Documents/New project/video/public/audio/.gitkeep"
touch "/Users/nick/Documents/New project/video/out/.gitkeep"
```

- [ ] **Step 7: Commit**

```bash
cd "/Users/nick/Documents/New project" && git add video/ && git commit -m "feat: initialize video workspace with Remotion + msedge-tts"
```

---

## Task 2: Types and brand tokens

**Files:**
- Create: `video/src/types.ts`
- Create: `video/src/brand.ts`

- [ ] **Step 1: Create video/src/types.ts**

```ts
export type SegmentType = 'hook' | 'overlay' | 'stat' | 'chart' | 'cta';

export interface ChartBar {
  label: string;
  value: number; // 0–100
}

interface BaseSegment {
  startSec: number;
  endSec: number;
  narration: string | null;
}

export interface HookSegment extends BaseSegment { type: 'hook'; text: string; }
export interface OverlaySegment extends BaseSegment { type: 'overlay'; text: string; }
export interface StatSegment extends BaseSegment { type: 'stat'; text: string; }
export interface CTASegment extends BaseSegment { type: 'cta'; text: string; }
export interface ChartSegment extends BaseSegment {
  type: 'chart';
  title: string;
  bars: ChartBar[];
}

export type Segment =
  | HookSegment | OverlaySegment | StatSegment | ChartSegment | CTASegment;

export interface ReelScript {
  slug: string;
  title: string;
  totalDuration: number;
  segments: Segment[];
}
```

- [ ] **Step 2: Create video/src/brand.ts**

```ts
export const BRAND = {
  bg: '#041018',
  cyan: '#58d6ff',
  white: '#ffffff',
  muted: '#afc6cf',
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

export const secsToFrames = (secs: number): number =>
  Math.round(secs * BRAND.fps);
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project" && git add video/src/ && git commit -m "feat: add types and brand tokens"
```

---

## Task 3: Script parser (TDD)

**Files:**
- Create: `video/scripts/parse-script.mjs`
- Create: `video/scripts/parse-script.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `video/scripts/parse-script.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReelScript } from './parse-script.mjs';

const MD = `# Reel Script: Test Post
Generated: 2026-05-25
Target length: 52 seconds

---

## HOOK (0–3s)
30% won't consider you.

---

## BODY

**Overlay 1** (3–13s)
Text: 97% search online first.
Narration: Before anyone calls you, they look you up.

**Chart** (13–30s)
Title: How customers research
Bars:
- Online search: 87%
- Online reviews: 76%
- Social media: 48%
Narration: This is how people decide.

---

## CTA (46–52s)
Text: Full guide — link in comments.
Narration: Full breakdown in the comments.

---

## VISUAL DIRECTION
Hook: Black screen.

## FACEBOOK CAPTION
Some caption.

## HASHTAGS
#test
`;

test('parses title, slug, and duration', () => {
  const r = parseReelScript(MD, 'test-post');
  assert.equal(r.title, 'Test Post');
  assert.equal(r.slug, 'test-post');
  assert.equal(r.totalDuration, 52);
});

test('parses hook segment', () => {
  const { segments } = parseReelScript(MD, 'test-post');
  assert.equal(segments[0].type, 'hook');
  assert.equal(segments[0].startSec, 0);
  assert.equal(segments[0].endSec, 3);
  assert.equal(segments[0].text, "30% won't consider you.");
  assert.equal(segments[0].narration, null);
});

test('parses overlay segment', () => {
  const { segments } = parseReelScript(MD, 'test-post');
  assert.equal(segments[1].type, 'overlay');
  assert.equal(segments[1].startSec, 3);
  assert.equal(segments[1].endSec, 13);
  assert.equal(segments[1].text, '97% search online first.');
  assert.equal(segments[1].narration, 'Before anyone calls you, they look you up.');
});

test('parses chart segment with bars', () => {
  const { segments } = parseReelScript(MD, 'test-post');
  assert.equal(segments[2].type, 'chart');
  assert.equal(segments[2].title, 'How customers research');
  assert.equal(segments[2].bars.length, 3);
  assert.deepEqual(segments[2].bars[0], { label: 'Online search', value: 87 });
  assert.deepEqual(segments[2].bars[2], { label: 'Social media', value: 48 });
});

test('parses CTA segment', () => {
  const { segments } = parseReelScript(MD, 'test-post');
  const cta = segments[segments.length - 1];
  assert.equal(cta.type, 'cta');
  assert.equal(cta.startSec, 46);
  assert.equal(cta.endSec, 52);
  assert.equal(cta.text, 'Full guide — link in comments.');
  assert.equal(cta.narration, 'Full breakdown in the comments.');
});

test('excludes VISUAL DIRECTION, FACEBOOK CAPTION, HASHTAGS from segments', () => {
  const { segments } = parseReelScript(MD, 'test-post');
  assert.equal(segments.length, 4); // hook + overlay + chart + cta
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/Users/nick/Documents/New project/video" && node --test scripts/parse-script.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` — `parse-script.mjs` doesn't exist yet.

- [ ] **Step 3: Implement parse-script.mjs**

Create `video/scripts/parse-script.mjs`:

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseBars(barsText) {
  return barsText
    .split('\n')
    .filter(l => l.trim().startsWith('-'))
    .map(line => {
      const m = line.match(/^-\s+(.+?):\s+(\d+)%/);
      return m ? { label: m[1].trim(), value: parseInt(m[2], 10) } : null;
    })
    .filter(Boolean);
}

export function parseReelScript(md, slug) {
  const lines = md.split('\n');

  const titleLine = lines.find(l => l.startsWith('# Reel Script:'));
  const title = titleLine ? titleLine.replace('# Reel Script:', '').trim() : '';

  const durLine = lines.find(l => l.startsWith('Target length:'));
  const durMatch = durLine?.match(/(\d+)/);
  const totalDuration = durMatch ? parseInt(durMatch[1], 10) : 0;

  const segments = [];

  // HOOK
  const hookM = md.match(/## HOOK \((\d+)[–\-](\d+)s\)\n([\s\S]*?)(?=\n---|\n## )/);
  if (hookM) {
    segments.push({
      type: 'hook',
      startSec: parseInt(hookM[1], 10),
      endSec: parseInt(hookM[2], 10),
      text: hookM[3].trim(),
      narration: null,
    });
  }

  // BODY segments
  const bodyM = md.match(/## BODY\n([\s\S]*?)(?=\n---\n## CTA|\n## CTA)/);
  if (bodyM) {
    const blockRe = /\*\*([^*]+)\*\*\s*\((\d+)[–\-](\d+)s\)([\s\S]*?)(?=\n\*\*[^*]+\*\*\s*\(\d|$)/g;
    let m;
    while ((m = blockRe.exec(bodyM[1])) !== null) {
      const label = m[1].toLowerCase().trim();
      const startSec = parseInt(m[2], 10);
      const endSec = parseInt(m[3], 10);
      const body = m[4];

      if (label.includes('chart')) {
        const titleM2 = body.match(/Title:\s*(.+)/);
        const barsM = body.match(/Bars:\n([\s\S]*?)(?=Narration:|$)/);
        const narrM = body.match(/Narration:\s*([\s\S]*?)$/);
        segments.push({
          type: 'chart',
          startSec, endSec,
          title: titleM2 ? titleM2[1].trim() : '',
          bars: barsM ? parseBars(barsM[1]) : [],
          narration: narrM ? narrM[1].trim() : null,
        });
      } else {
        const type = label.includes('stat') ? 'stat' : 'overlay';
        const textM = body.match(/Text:\s*(.+)/);
        const narrM = body.match(/Narration:\s*([\s\S]*?)$/);
        segments.push({
          type, startSec, endSec,
          text: textM ? textM[1].trim() : '',
          narration: narrM ? narrM[1].trim() : null,
        });
      }
    }
  }

  // CTA
  const ctaM = md.match(/## CTA \((\d+)[–\-](\d+)s\)\n([\s\S]*?)(?=\n---|\n## VISUAL|$)/);
  if (ctaM) {
    const body = ctaM[3];
    const textM = body.match(/Text:\s*(.+)/);
    const narrM = body.match(/Narration:\s*([\s\S]*?)$/);
    segments.push({
      type: 'cta',
      startSec: parseInt(ctaM[1], 10),
      endSec: parseInt(ctaM[2], 10),
      text: textM ? textM[1].trim() : body.trim(),
      narration: narrM ? narrM[1].trim() : null,
    });
  }

  return { slug, title, totalDuration, segments };
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const postArg = process.argv.find(a => a.startsWith('--post='));
  if (!postArg) { console.error('Usage: node parse-script.mjs --post=<slug>'); process.exit(1); }
  const slug = postArg.replace('--post=', '');
  const mdPath = join(__dirname, '../../blog', slug, 'reel-script.md');
  let md;
  try { md = readFileSync(mdPath, 'utf8'); }
  catch { console.error(`reel-script.md not found: ${mdPath}`); process.exit(1); }
  const script = parseReelScript(md, slug);
  const outDir = join(__dirname, '../out', slug);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'script.json');
  writeFileSync(outPath, JSON.stringify(script, null, 2));
  console.log(`Parsed ${script.segments.length} segments → ${outPath}`);
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
cd "/Users/nick/Documents/New project/video" && node --test scripts/parse-script.test.mjs
```

Expected:
```
✔ parses title, slug, and duration
✔ parses hook segment
✔ parses overlay segment
✔ parses chart segment with bars
✔ parses CTA segment
✔ excludes VISUAL DIRECTION, FACEBOOK CAPTION, HASHTAGS from segments
```

- [ ] **Step 5: Smoke test against real post**

```bash
cd "/Users/nick/Documents/New project/video" && node scripts/parse-script.mjs --post=what-a-website-does-for-your-business
```

Expected: `Parsed 5 segments → .../script.json`. Open the JSON and verify segment types: `hook, overlay, overlay, chart, overlay, cta`.

- [ ] **Step 6: Commit**

```bash
cd "/Users/nick/Documents/New project" && git add video/scripts/ && git commit -m "feat: reel-script.md parser with unit tests"
```

---

## Task 4: Visual components — HookCard, OverlayCard, StatCard

**Files:**
- Create: `video/src/components/HookCard.tsx`
- Create: `video/src/components/OverlayCard.tsx`
- Create: `video/src/components/StatCard.tsx`

- [ ] **Step 1: Create HookCard.tsx**

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';
import type { HookSegment } from '../types';

export const HookCard: React.FC<{ segment: HookSegment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const fi = Math.round(0.3 * fps);
  const opacity = interpolate(
    frame,
    [0, fi, durationInFrames - fi, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  return (
    <div style={{
      width: BRAND.width, height: BRAND.height, background: BRAND.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 60px', opacity,
    }}>
      <p style={{
        fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
        fontSize: 96, color: BRAND.white, textAlign: 'center',
        textTransform: 'uppercase', letterSpacing: '0.02em',
        lineHeight: 1.1, margin: 0,
      }}>
        {segment.text}
      </p>
    </div>
  );
};
```

- [ ] **Step 2: Create OverlayCard.tsx**

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import type { OverlaySegment } from '../types';

export const OverlayCard: React.FC<{ segment: OverlaySegment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const slideProgress = spring({ frame, fps, config: { damping: 14, stiffness: 120 },
    durationInFrames: Math.round(fps * 0.5) });
  const translateY = interpolate(slideProgress, [0, 1], [60, 0]);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - Math.round(fps * 0.3), durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  return (
    <div style={{
      width: BRAND.width, height: BRAND.height, background: BRAND.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 60px', opacity: fadeOut,
    }}>
      <p style={{
        transform: `translateY(${translateY}px)`,
        fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
        fontSize: 96, color: BRAND.cyan, textTransform: 'uppercase',
        letterSpacing: '0.02em', lineHeight: 1.15, textAlign: 'center', margin: 0,
      }}>
        {segment.text}
      </p>
    </div>
  );
};
```

- [ ] **Step 3: Create StatCard.tsx**

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';
import type { StatSegment } from '../types';

export const StatCard: React.FC<{ segment: StatSegment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fi = Math.round(fps * 0.3);
  const fadeIn = interpolate(frame, [0, fi], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - fi, durationInFrames], [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      width: BRAND.width, height: BRAND.height, background: BRAND.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 60px', opacity: Math.min(fadeIn, fadeOut),
    }}>
      <p style={{
        fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
        fontSize: 80, color: BRAND.white, textAlign: 'center',
        textTransform: 'uppercase', letterSpacing: '0.02em',
        lineHeight: 1.2, margin: 0,
      }}>
        {segment.text}
      </p>
    </div>
  );
};
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/nick/Documents/New project" && git add video/src/components/ && git commit -m "feat: HookCard, OverlayCard, StatCard components"
```

---

## Task 5: ChartCard component

**Files:**
- Create: `video/src/components/ChartCard.tsx`

- [ ] **Step 1: Create ChartCard.tsx**

Bars animate from width 0 → final with a staggered spring (100ms per bar).

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import type { ChartSegment } from '../types';

const MAX_BAR_PX = 700;

const Bar: React.FC<{ label: string; value: number; index: number; fps: number }> = ({
  label, value, index, fps,
}) => {
  const frame = useCurrentFrame();
  const delay = index * Math.round(fps * 0.1);
  const progress = spring({
    frame: Math.max(0, frame - delay), fps,
    config: { damping: 20, stiffness: 80 },
    durationInFrames: Math.round(fps * 1.5),
  });
  const barWidth = interpolate(progress, [0, 1], [0, (value / 100) * MAX_BAR_PX]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
      <span style={{ fontFamily: '"Trebuchet MS", sans-serif', fontSize: 36,
        color: BRAND.muted, width: 260, textAlign: 'right', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ width: MAX_BAR_PX, height: 16, borderRadius: 999,
        background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: barWidth, height: '100%', borderRadius: 999,
          background: `linear-gradient(90deg, ${BRAND.cyan}, #4dffb8)` }} />
      </div>
      <span style={{ fontFamily: 'Impact, sans-serif', fontSize: 40,
        color: BRAND.white, width: 80, flexShrink: 0 }}>
        {value}%
      </span>
    </div>
  );
};

export const ChartCard: React.FC<{ segment: ChartSegment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fi = Math.round(fps * 0.3);
  const fadeIn = interpolate(frame, [0, fi], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - fi, durationInFrames], [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      width: BRAND.width, height: BRAND.height, background: BRAND.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px',
      opacity: Math.min(fadeIn, fadeOut),
    }}>
      <p style={{ fontFamily: 'Impact, sans-serif', fontSize: 48, color: BRAND.cyan,
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 48, textAlign: 'center' }}>
        {segment.title}
      </p>
      <div style={{ width: '100%' }}>
        {segment.bars.map((bar, i) => (
          <Bar key={bar.label} label={bar.label} value={bar.value} index={i} fps={fps} />
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/nick/Documents/New project" && git add video/src/components/ChartCard.tsx && git commit -m "feat: animated ChartCard with staggered bar springs"
```

---

## Task 6: CTACard + BlogReel composition + Root

**Files:**
- Create: `video/src/components/CTACard.tsx`
- Create: `video/src/compositions/BlogReel.tsx`
- Create: `video/src/Root.tsx`

- [ ] **Step 1: Create CTACard.tsx**

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';
import type { CTASegment } from '../types';

export const CTACard: React.FC<{ segment: CTASegment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, Math.round(fps * 0.4)], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const [mainText, subText] = segment.text.split('—').map(s => s.trim());
  return (
    <div style={{
      width: BRAND.width, height: BRAND.height, background: BRAND.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px', opacity,
    }}>
      <p style={{ fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
        fontSize: 96, color: BRAND.white, textTransform: 'uppercase',
        letterSpacing: '0.02em', lineHeight: 1.1, textAlign: 'center',
        margin: subText ? '0 0 28px' : 0 }}>
        {mainText}
      </p>
      {subText && (
        <p style={{ fontFamily: 'Impact, "Arial Narrow Bold", sans-serif',
          fontSize: 60, color: BRAND.cyan, textTransform: 'uppercase',
          letterSpacing: '0.04em', textAlign: 'center', margin: 0 }}>
          {subText}
        </p>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create BlogReel.tsx**

```tsx
import React from 'react';
import { AbsoluteFill, Audio, Series, staticFile } from 'remotion';
import { BRAND, secsToFrames } from '../brand';
import { HookCard } from '../components/HookCard';
import { OverlayCard } from '../components/OverlayCard';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { CTACard } from '../components/CTACard';
import type { ReelScript, Segment } from '../types';

const SegmentCard: React.FC<{ segment: Segment }> = ({ segment }) => {
  switch (segment.type) {
    case 'hook':    return <HookCard segment={segment} />;
    case 'overlay': return <OverlayCard segment={segment} />;
    case 'stat':    return <StatCard segment={segment} />;
    case 'chart':   return <ChartCard segment={segment} />;
    case 'cta':     return <CTACard segment={segment} />;
  }
};

export const BlogReel: React.FC<{ script: ReelScript; musicTrack?: string }> = ({
  script,
  musicTrack = 'ambient-01.mp3',
}) => (
  <AbsoluteFill style={{ background: BRAND.bg }}>
    <Audio src={staticFile(`music/${musicTrack}`)} volume={0.15} loop />
    <Series>
      {script.segments.map((segment, i) => {
        const durationInFrames = secsToFrames(segment.endSec - segment.startSec);
        return (
          <Series.Sequence key={i} durationInFrames={durationInFrames}>
            <AbsoluteFill>
              {segment.narration && (
                <Audio src={staticFile(`audio/${script.slug}/segment-${i}.mp3`)} />
              )}
              <SegmentCard segment={segment} />
            </AbsoluteFill>
          </Series.Sequence>
        );
      })}
    </Series>
  </AbsoluteFill>
);
```

- [ ] **Step 3: Create Root.tsx**

`registerRoot` is required — Remotion's render CLI won't find compositions without it.

```tsx
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
```

- [ ] **Step 4: Open Remotion Studio to verify**

```bash
cd "/Users/nick/Documents/New project/video" && npm run studio
```

Expected: browser opens at `http://localhost:3000`, shows `BlogReel` composition with "PREVIEW MODE" text on dark background. Press Ctrl+C to stop.

- [ ] **Step 5: Commit**

```bash
cd "/Users/nick/Documents/New project" && git add video/src/ && git commit -m "feat: CTACard, BlogReel composition, Remotion Root"
```

---

## Task 7: Audio generator

**Files:**
- Create: `video/scripts/generate-audio.mjs`

- [ ] **Step 1: Create generate-audio.mjs**

```js
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { readFileSync, mkdirSync, existsSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateAudio(slug) {
  const scriptPath = join(__dirname, '../out', slug, 'script.json');
  if (!existsSync(scriptPath)) {
    console.error(`script.json not found: ${scriptPath}`);
    console.error(`Run: node scripts/parse-script.mjs --post=${slug} first`);
    process.exit(1);
  }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const audioDir = join(__dirname, '../public/audio', slug);
  mkdirSync(audioDir, { recursive: true });

  const tts = new MsEdgeTTS();
  await tts.setMetadata('en-US-GuyNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    if (!seg.narration) { skipped++; continue; }
    const outPath = join(audioDir, `segment-${i}.mp3`);
    try {
      const { audioStream } = await tts.toStream(seg.narration);
      await pipeline(audioStream, createWriteStream(outPath));
      console.log(`  ✓ segment-${i}.mp3 (${seg.type})`);
      generated++;
    } catch (err) {
      console.error(`  ✗ segment-${i} failed: ${err.message}`);
    }
  }
  console.log(`Done. Generated: ${generated}, skipped (no narration): ${skipped}`);
}

const postArg = process.argv.find(a => a.startsWith('--post='));
if (!postArg) { console.error('Usage: node generate-audio.mjs --post=<slug>'); process.exit(1); }
generateAudio(postArg.replace('--post=', ''));
```

**Note on API:** If `tts.toStream()` returns a stream directly rather than `{ audioStream }`, replace `const { audioStream } = await tts.toStream(...)` with `const audioStream = await tts.toStream(...)`. Check the msedge-tts package README at `video/node_modules/msedge-tts/README.md` if needed.

- [ ] **Step 2: Test against real post**

```bash
cd "/Users/nick/Documents/New project/video" && node scripts/generate-audio.mjs --post=what-a-website-does-for-your-business
```

Expected:
```
  ✓ segment-1.mp3 (overlay)
  ✓ segment-2.mp3 (overlay)
  ✓ segment-3.mp3 (chart)
  ✓ segment-4.mp3 (overlay)
  ✓ segment-5.mp3 (cta)
Done. Generated: 5, skipped (no narration): 1
```

Verify files exist:
```bash
ls "/Users/nick/Documents/New project/video/public/audio/what-a-website-does-for-your-business/"
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project" && git add video/scripts/generate-audio.mjs video/public/ && git commit -m "feat: Edge TTS audio generator"
```

---

## Task 8: Render orchestrator + music README

**Files:**
- Create: `video/scripts/render.mjs`
- Create: `video/public/music/README.md`

- [ ] **Step 1: Create public/music/README.md**

```markdown
# Ambient Music Tracks

Add royalty-free MP3 files here named `ambient-01.mp3` through `ambient-05.mp3`.

## Recommended free sources
- **freepd.com** — public domain, ambient category, direct MP3 download
- **Free Music Archive** (freemusicarchive.org) — filter: Ambient + CC0 license
- **YouTube Audio Library** — filter: Ambient + No attribution required

## Requirements
- Format: MP3, 60s minimum (looped automatically if shorter than video)
- No vocals or lyrics
- Volume is auto-ducked to 15% under narration

## Default track
Renderer defaults to `ambient-01.mp3`. Pass `--music=ambient-02.mp3` to use another.
```

- [ ] **Step 2: Create render.mjs**

```js
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = join(__dirname, '..');

function run(cmd) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: videoDir });
}

function detectHookType(text) {
  if (/\?/.test(text)) return 'question';
  if (/^\d|[\d,]+%/.test(text)) return 'stat';
  return 'statement';
}

async function renderPost(slug, musicTrack = 'ambient-01.mp3') {
  console.log(`\n=== Blog Reel Renderer: ${slug} ===\n`);

  // 1. Parse
  run(`node scripts/parse-script.mjs --post=${slug}`);
  const scriptPath = join(videoDir, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) {
    console.error('Parse failed — script.json not found.'); process.exit(1);
  }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));

  // 2. Audio
  run(`node scripts/generate-audio.mjs --post=${slug}`);

  // 3. Music check
  const musicPath = join(videoDir, 'public', 'music', musicTrack);
  if (!existsSync(musicPath)) {
    console.warn(`\n⚠  Music not found: public/music/${musicTrack}`);
    console.warn('   See public/music/README.md. Rendering without music.\n');
  }

  // 4. Write render-meta (for performance feedback)
  const hookText = script.segments.find(s => s.type === 'hook')?.text ?? '';
  const meta = {
    slug, renderedAt: new Date().toISOString(),
    hookType: detectHookType(hookText),
    segmentCount: script.segments.length,
    totalDuration: script.totalDuration,
    musicTrack,
  };
  writeFileSync(join(videoDir, 'out', slug, 'render-meta.json'), JSON.stringify(meta, null, 2));

  // 5. Render — write props to file to avoid shell escaping issues
  const outDir = join(videoDir, 'out', slug);
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${slug}.mp4`);
  const propsFile = join(outDir, 'render-props.json');
  writeFileSync(propsFile, JSON.stringify({ script, musicTrack }));
  run(`npx remotion render src/Root.tsx BlogReel --props="${propsFile}" "${outFile}"`);

  console.log(`\n✓ Render complete: ${outFile}\n`);
}

const postArg = process.argv.find(a => a.startsWith('--post='));
const musicArg = process.argv.find(a => a.startsWith('--music='));
if (!postArg) { console.error('Usage: node render.mjs --post=<slug> [--music=ambient-02.mp3]'); process.exit(1); }
renderPost(postArg.replace('--post=', ''), musicArg?.replace('--music=', ''));
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project" && git add video/scripts/render.mjs video/public/music/ && git commit -m "feat: render orchestrator with creative metadata logging"
```

---

## Task 9: Performance feedback CLI

**Files:**
- Create: `video/scripts/feedback.mjs`
- Create: `video/data/performance.json`

- [ ] **Step 1: Initialize performance.json**

Create `video/data/performance.json`:
```json
[]
```

- [ ] **Step 2: Create feedback.mjs**

```js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as rl from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/performance.json');
const reportPath = join(__dirname, '../data/performance-report.md');

const arg = name => {
  const a = process.argv.find(x => x.startsWith(`--${name}=`));
  return a ? a.replace(`--${name}=`, '') : null;
};

const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

function generateReport(records) {
  if (!records.length) return '# Performance Report\n\nNo data yet.\n';
  const byHook = {}, byDur = { '0-30s': [], '30-60s': [], '60s+': [] }, byMusic = {}, byPlatform = {};
  for (const r of records) {
    (byHook[r.hookType] ??= []).push(r.views);
    (r.totalDuration <= 30 ? byDur['0-30s'] : r.totalDuration <= 60 ? byDur['30-60s'] : byDur['60s+']).push(r.views);
    (byMusic[r.musicTrack] ??= []).push(r.views);
    (byPlatform[r.platform] ??= []).push(r.views);
  }
  const top5 = [...records].sort((a, b) => b.views - a.views).slice(0, 5);
  let out = `# Performance Report\nGenerated: ${new Date().toISOString()}\nTotal reels: ${records.length}\n\n`;
  out += `## Top 5 by Views\n`;
  top5.forEach(r => { out += `- **${r.slug}** (${r.platform}): ${r.views} views, ${r.likes} likes\n`; });
  out += `\n## Avg Views by Hook Type\n`;
  Object.entries(byHook).forEach(([k, v]) => { out += `- **${k}**: ${avg(v)} avg (${v.length} reels)\n`; });
  out += `\n## Avg Views by Duration\n`;
  Object.entries(byDur).filter(([, v]) => v.length).forEach(([k, v]) => { out += `- **${k}**: ${avg(v)} avg\n`; });
  out += `\n## Avg Views by Music Track\n`;
  Object.entries(byMusic).forEach(([k, v]) => { out += `- **${k}**: ${avg(v)} avg\n`; });
  out += `\n## Avg Views by Platform\n`;
  Object.entries(byPlatform).forEach(([k, v]) => { out += `- **${k}**: ${avg(v)} avg (${v.length} reels)\n`; });
  return out;
}

async function loadMeta(slug) {
  const p = join(__dirname, '../out', slug, 'render-meta.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8'))
    : { hookType: 'unknown', segmentCount: 0, totalDuration: 0, musicTrack: 'unknown' };
}

async function run() {
  let slug = arg('post'), platform = arg('platform'), views = arg('views');
  let likes = arg('likes'), shares = arg('shares'), comments = arg('comments'), watchtime = arg('watchtime');

  if (!slug || !platform || !views) {
    const iface = rl.createInterface({ input, output });
    console.log('\n=== Log Reel Performance ===\n');
    slug ??= await iface.question('Post slug: ');
    platform ??= await iface.question('Platform (facebook/instagram/tiktok/youtube): ');
    views ??= await iface.question('Views: ');
    likes ??= await iface.question('Likes: ');
    shares ??= await iface.question('Shares: ');
    comments ??= await iface.question('Comments: ');
    watchtime ??= await iface.question('Watch time % (blank if unknown): ');
    iface.close();
  }

  const meta = await loadMeta(slug);
  const entry = {
    slug, datePosted: new Date().toISOString().split('T')[0], platform,
    views: parseInt(views, 10), likes: parseInt(likes ?? '0', 10),
    shares: parseInt(shares ?? '0', 10), comments: parseInt(comments ?? '0', 10),
    watchTimePct: watchtime ? parseInt(watchtime, 10) : null,
    hookType: meta.hookType, segmentCount: meta.segmentCount,
    totalDuration: meta.totalDuration, musicTrack: meta.musicTrack,
  };

  const records = JSON.parse(readFileSync(dataPath, 'utf8'));
  records.push(entry);
  writeFileSync(dataPath, JSON.stringify(records, null, 2));
  writeFileSync(reportPath, generateReport(records));
  console.log(`\n✓ Logged: ${entry.slug} — ${entry.views} views on ${entry.platform}`);
  console.log(`  Report: video/data/performance-report.md\n`);
}

run();
```

- [ ] **Step 3: Test interactive mode**

```bash
cd "/Users/nick/Documents/New project/video" && node scripts/feedback.mjs
```

Enter: slug=`what-a-website-does-for-your-business`, platform=`facebook`, views=`500`, likes=`22`, shares=`8`, comments=`4`, watchtime=`55`.

Expected: `✓ Logged` message, `data/performance.json` has one record, `data/performance-report.md` exists.

- [ ] **Step 4: Test flag mode**

```bash
cd "/Users/nick/Documents/New project/video" && node scripts/feedback.mjs \
  --post=what-a-website-does-for-your-business \
  --platform=facebook --views=500 --likes=22 --shares=8
```

Expected: same `✓ Logged` output.

- [ ] **Step 5: Commit**

```bash
cd "/Users/nick/Documents/New project" && git add video/scripts/feedback.mjs video/data/ && git commit -m "feat: performance feedback CLI with auto-report"
```

---

## Task 10: Wire root npm scripts

**Files:**
- Modify: `/Users/nick/Documents/New project/package.json`

- [ ] **Step 1: Add video scripts to root package.json**

In the `"scripts"` object of `/Users/nick/Documents/New project/package.json`, add:

```json
"video:parse":    "node video/scripts/parse-script.mjs",
"video:audio":    "node video/scripts/generate-audio.mjs",
"video:render":   "node video/scripts/render.mjs",
"video:feedback": "node video/scripts/feedback.mjs",
"video:test":     "cd video && npm test",
"video":          "node video/scripts/render.mjs"
```

- [ ] **Step 2: Verify tests run from root**

```bash
cd "/Users/nick/Documents/New project" && npm run video:test
```

Expected: all 6 parser tests pass.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project" && git add package.json && git commit -m "feat: wire video pipeline into root npm scripts"
```

---

## Task 11: Full render test

- [ ] **Step 1: Add ambient music**

Download any royalty-free ambient MP3 (60s+, no vocals) from freepd.com → save as:
`/Users/nick/Documents/New project/video/public/music/ambient-01.mp3`

- [ ] **Step 2: Full render**

```bash
cd "/Users/nick/Documents/New project" && npm run video -- --post=what-a-website-does-for-your-business
```

Expected sequence in terminal:
```
=== Blog Reel Renderer: what-a-website-does-for-your-business ===
→ node scripts/parse-script.mjs ...
Parsed 6 segments → .../script.json
→ node scripts/generate-audio.mjs ...
  ✓ segment-1.mp3 (overlay)
  ...
Done. Generated: 5, skipped: 1
→ npx remotion render ...
[Remotion render progress]
✓ Render complete: .../what-a-website-does-for-your-business.mp4
```

- [ ] **Step 3: Verify output**

```bash
ls -lh "/Users/nick/Documents/New project/video/out/what-a-website-does-for-your-business/"
```

Expected: `what-a-website-does-for-your-business.mp4` (10–40MB), `script.json`, `render-meta.json`.

Open in QuickTime. Verify:
- Portrait 1080×1920
- Hook card → overlay cards → chart bars animate → CTA
- Narration voice audible per segment
- Quiet ambient music underneath

- [ ] **Step 4: Final commit**

```bash
cd "/Users/nick/Documents/New project" && git add video/ && git commit -m "feat: complete blog reel renderer — all systems verified"
```
