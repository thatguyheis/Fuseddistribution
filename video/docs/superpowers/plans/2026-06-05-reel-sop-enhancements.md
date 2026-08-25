# Reel SOP Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update REEL-SOP.md and supporting code so every future reel has inline stat graphics, real video clip backgrounds, and subtitle timing that matches actual audio duration.

**Architecture:** Three independent tracks — Track A adds explanation text + 8 graphic types to StatCard; Track B replaces the photo-only media pipeline with a dual-source (Pixabay + Pexels) video-first pipeline; Track C fixes subtitle drift by replacing character-count estimation with ffprobe-measured audio durations. All tracks end with SOP doc updates.

**Tech Stack:** Remotion 4.0.469, TypeScript, Node.js ESM scripts, ffprobe, Pexels API, Pixabay API.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types.ts` | Modify | Add `GraphicType`, `GraphicData`, `MediaEntry`; update `StatSegment` |
| `src/components/InlineGraphic.tsx` | Create | Renders all 8 graphic types using Remotion spring animation |
| `src/components/StatCard.tsx` | Modify | Add explanation line + InlineGraphic below the number |
| `src/components/MediaBg.tsx` | Create | Renders `<Video>` or `<Img>` background based on MediaEntry type |
| `src/components/HookCard.tsx` | Modify | Accept `mediaEntry` prop, use MediaBg |
| `src/components/OverlayCard.tsx` | Modify | Accept `mediaEntry` prop, use MediaBg |
| `src/components/CTACard.tsx` | Modify | Accept `mediaEntry` prop, use MediaBg |
| `src/components/QuestionCard.tsx` | Modify | Accept `mediaEntry` prop, use MediaBg |
| `src/compositions/BlogReel.tsx` | Modify | Pass `MediaEntry` to cards, load `media.json` |
| `scripts/parse-script.mjs` | Modify | Parse `Explanation:` and `Graphic_*` fields from stat blocks |
| `scripts/fetch-media.mjs` | Create | Dual-source media fetch: Pixabay video → Pexels video → Pixabay photo → Pexels photo |
| `scripts/generate-captions.mjs` | Modify | Replace whisper-node with ffprobe-based timing |
| `scripts/render.mjs` | Modify | Call `fetch-media.mjs`, pass `media` map to Remotion |
| `video/REEL-SOP.md` | Modify | All three tracks: graphic types, media strategy, subtitle sync |
| `blog/BLOG-SOP.md` | Modify | §11 reel-data.md format update |

---

## Track A — Visual Enrichment

### Task 1: Update types.ts

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add graphic and media types**

Replace the contents of `src/types.ts` with:

```typescript
export type GraphicType =
  | 'gap' | 'percent_fill' | 'percent_pie'
  | 'growth' | 'timeline' | 'streak' | 'drain' | 'gauge' | 'none';

export interface GraphicData {
  // gap: supply vs demand
  a_label?: string; a_value?: number;
  b_label?: string; b_value?: number;
  // percent_fill / percent_pie
  value?: number; label?: string; remainder_label?: string;
  // growth: before/after
  from_value?: number; from_label?: string;
  to_value?: number; to_label?: string;
  // timeline: duration range
  min?: number; max?: number;
  // streak: consecutive count (count = total dots, current = active dot index 1-based)
  count?: number; current?: number;
  // drain: depleting inventory
  peak_value?: number; peak_label?: string;
  current_value?: number; current_label?: string;
  // gauge: value on a scale
  low_label?: string; high_label?: string;
  // shared
  unit?: string;
}

export interface MediaEntry {
  type: 'video' | 'photo';
  src: string;       // relative to public/ (e.g. "videos/slug/segment-0.mp4")
  thumb?: string;    // jpg path for video thumbnails (e.g. "photos/slug/segment-0.jpg")
  source?: string;   // "pixabay" | "pexels"
}

export type SegmentType = 'hook' | 'overlay' | 'stat' | 'chart' | 'cta' | 'question';

export interface ChartBar {
  label: string;
  value: number;
}

interface BaseSegment {
  startSec: number;
  endSec: number;
  narration: string | null;
}

export interface HookSegment extends BaseSegment { type: 'hook'; text: string; }
export interface OverlaySegment extends BaseSegment { type: 'overlay'; text: string; }
export interface StatSegment extends BaseSegment {
  type: 'stat';
  text: string;
  explanation?: string;
  graphic_type?: GraphicType;
  graphic?: GraphicData;
}
export interface CTASegment extends BaseSegment { type: 'cta'; text: string; }
export interface QuestionSegment extends BaseSegment { type: 'question'; text: string; subtext?: string; }
export interface ChartSegment extends BaseSegment {
  type: 'chart';
  title: string;
  bars: ChartBar[];
}

export type Segment =
  | HookSegment | OverlaySegment | StatSegment | ChartSegment | CTASegment | QuestionSegment;

export interface CaptionChunk {
  text: string;
  startSec: number;
  endSec: number;
}

export interface ReelScript {
  slug: string;
  title: string;
  totalDuration: number;
  segments: Segment[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/nick/Documents/New project/video" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to types.ts).

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/types.ts
git commit -m "feat(types): add GraphicType, GraphicData, MediaEntry; update StatSegment"
```

---

### Task 2: Create InlineGraphic.tsx

**Files:**
- Create: `src/components/InlineGraphic.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/InlineGraphic.tsx`:

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { POPPINS } from '../fonts';
import type { GraphicType, GraphicData } from '../types';

function useEntryProgress(durationSecs = 0.6): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame, fps, config: { damping: 30, stiffness: 160 },
    durationInFrames: Math.round(fps * durationSecs) });
}

const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  fontFamily: POPPINS, fontSize: 13, color: BRAND.muted,
};

function GapGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const max = Math.max(data.a_value ?? 1, data.b_value ?? 1);
  const aW = interpolate(p, [0, 1], [0, ((data.a_value ?? 0) / max) * 340]);
  const bW = interpolate(p, [0, 1], [0, ((data.b_value ?? 0) / max) * 340]);
  const unit = data.unit ? ` ${data.unit}` : '';
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={row}>
          <span style={{ color: '#4dffb8', minWidth: 80 }}>{data.a_label}</span>
          <span style={{ color: BRAND.muted, fontSize: 11 }}>{data.a_value}{unit}</span>
        </div>
        <div style={{ height: 12, background: '#4dffb8', width: aW, borderRadius: 3 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={row}>
          <span style={{ color: '#ff6b6b', minWidth: 80 }}>{data.b_label}</span>
          <span style={{ color: BRAND.muted, fontSize: 11 }}>{data.b_value}{unit}</span>
        </div>
        <div style={{ height: 12, borderRadius: 3, display: 'flex', width: bW }}>
          <div style={{ flex: data.a_value ?? 1, background: BRAND.cyan, borderRadius: '3px 0 0 3px' }} />
          <div style={{ flex: Math.max((data.b_value ?? 0) - (data.a_value ?? 0), 0), background: '#ff6b6b', borderRadius: '0 3px 3px 0' }} />
        </div>
      </div>
      <div style={{ ...row, fontSize: 11, color: '#ff6b6b', justifyContent: 'flex-end' }}>
        ▲ {(data.b_value ?? 0) - (data.a_value ?? 0)}{unit} gap
      </div>
    </div>
  );
}

function PercentFillGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const fillPct = interpolate(p, [0, 1], [0, data.value ?? 0]);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${fillPct}%`, background: BRAND.cyan, borderRadius: 3 }} />
      </div>
      <div style={{ ...row, justifyContent: 'space-between', marginTop: 5, fontSize: 12 }}>
        <span style={{ color: BRAND.cyan }}>{data.value}% {data.label}</span>
        <span>{100 - (data.value ?? 0)}% {data.remainder_label}</span>
      </div>
    </div>
  );
}

function PercentPieGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const R = 52;
  const C = 2 * Math.PI * R;
  const arc = interpolate(p, [0, 1], [0, ((data.value ?? 0) / 100) * C]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={14} />
        <circle cx={60} cy={60} r={R} fill="none" stroke={BRAND.cyan} strokeWidth={14}
          strokeDasharray={`${arc} ${C}`} strokeLinecap="round"
          transform="rotate(-90 60 60)" />
        <text x={60} y={65} textAnchor="middle" fontSize={22} fill={BRAND.white}
          fontFamily="sans-serif" fontWeight="bold">{data.value}%</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: POPPINS, fontSize: 13 }}>
        <div><span style={{ color: BRAND.cyan }}>■</span> {data.label} {data.value}%</div>
        <div><span style={{ color: 'rgba(255,255,255,0.2)' }}>■</span> {data.remainder_label} {100 - (data.value ?? 0)}%</div>
      </div>
    </div>
  );
}

function GrowthGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const max = Math.max(data.from_value ?? 1, data.to_value ?? 1);
  const fromH = interpolate(p, [0, 1], [0, ((data.from_value ?? 0) / max) * 100]);
  const toH = interpolate(p, [0, 1], [0, ((data.to_value ?? 0) / max) * 100]);
  const unit = data.unit ? ` ${data.unit}` : '';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, justifyContent: 'center', height: 130 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 60, height: fromH, background: 'rgba(88,214,255,0.35)', borderRadius: '4px 4px 0 0' }} />
        <div style={{ ...row, flexDirection: 'column', fontSize: 12, gap: 2 }}>
          <span style={{ color: BRAND.muted }}>{data.from_label}</span>
          <span style={{ color: BRAND.muted }}>{data.from_value}{unit}</span>
        </div>
      </div>
      <div style={{ fontSize: 22, color: '#4dffb8', marginBottom: 40 }}>→</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 60, height: toH, background: BRAND.cyan, borderRadius: '4px 4px 0 0' }} />
        <div style={{ ...row, flexDirection: 'column', fontSize: 12, gap: 2 }}>
          <span style={{ color: BRAND.cyan }}>{data.to_label}</span>
          <span style={{ color: BRAND.cyan }}>{data.to_value}{unit}</span>
        </div>
      </div>
    </div>
  );
}

function TimelineGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const fillW = interpolate(p, [0, 1], [0, 100]);
  const unit = data.unit ?? '';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ ...row, marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: BRAND.muted }}>{data.label}</span>
      </div>
      <div style={{ height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${fillW}%`,
          background: `linear-gradient(90deg, ${BRAND.cyan}, #4dffb8)`, borderRadius: 3,
        }} />
      </div>
      <div style={{ ...row, justifyContent: 'space-between', marginTop: 5, fontSize: 11 }}>
        <span>Start</span>
        <span style={{ color: BRAND.cyan }}>{data.min}–{data.max} {unit}</span>
        <span style={{ color: '#4dffb8' }}>Complete</span>
      </div>
    </div>
  );
}

function StreakGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const count = data.count ?? 3;
  const current = data.current ?? count;
  const unit = data.unit ?? '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {Array.from({ length: count }, (_, i) => {
        const dotP = interpolate(p, [i / count, Math.min((i + 0.6) / count, 1)], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const isActive = i + 1 === current;
        const isFilled = i + 1 <= current;
        return (
          <div key={i} style={{
            width: 40, height: 40, borderRadius: '50%',
            background: isFilled
              ? (isActive ? '#4dffb8' : BRAND.cyan)
              : 'rgba(255,255,255,0.08)',
            border: `2px solid ${isFilled ? 'transparent' : 'rgba(255,255,255,0.15)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: dotP,
            fontFamily: POPPINS, fontSize: 14, fontWeight: 600,
            color: isFilled ? '#041018' : BRAND.muted,
          }}>
            {i + 1}
          </div>
        );
      })}
      <div style={{ ...row, fontSize: 12, marginLeft: 4 }}>
        <span style={{ color: '#4dffb8' }}>← {current}{count > 1 ? `/${count}` : ''} {unit}</span>
      </div>
    </div>
  );
}

function DrainGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const pct = ((data.current_value ?? 0) / (data.peak_value ?? 1)) * 100;
  const fillW = interpolate(p, [0, 1], [0, pct]);
  const unit = data.unit ? ` ${data.unit}` : '';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ ...row, justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
        <span style={{ color: BRAND.muted }}>Peak: {data.peak_value}{unit}</span>
        <span style={{ color: '#ff6b6b' }}>Now: {data.current_value}{unit}</span>
      </div>
      <div style={{ height: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        <div style={{ height: '100%', width: `${fillW}%`, background: 'linear-gradient(90deg,#ff6b6b,#ff9f43)', borderRadius: 3 }} />
      </div>
      <div style={{ ...row, fontSize: 11, color: '#ff6b6b', justifyContent: 'flex-end', marginTop: 4 }}>
        ▼ {Math.round(100 - pct)}% drawn down
      </div>
    </div>
  );
}

function GaugeGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const R = 65;
  const C = Math.PI * R;
  const range = (data.max ?? 100) - (data.min ?? 0);
  const valuePct = ((data.value ?? 0) - (data.min ?? 0)) / (range || 1);
  const arc = interpolate(p, [0, 1], [0, valuePct * C]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={160} height={90} viewBox="0 0 160 90">
        <defs>
          <linearGradient id="gauge-g" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4dffb8" />
            <stop offset="100%" stopColor="#ff6b6b" />
          </linearGradient>
        </defs>
        <path d={`M 15 80 A ${R} ${R} 0 0 1 145 80`}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={12} strokeLinecap="round" />
        <path d={`M 15 80 A ${R} ${R} 0 0 1 145 80`}
          fill="none" stroke="url(#gauge-g)" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={`${arc} ${C}`} />
        <text x={80} y={72} textAnchor="middle" fontSize={18} fill={BRAND.white}
          fontFamily="sans-serif" fontWeight="bold">{data.value}</text>
      </svg>
      <div style={{ ...row, justifyContent: 'space-between', width: 160, fontSize: 11 }}>
        <span style={{ color: '#4dffb8' }}>{data.low_label}</span>
        <span style={{ color: '#ff6b6b' }}>{data.high_label}</span>
      </div>
    </div>
  );
}

export const InlineGraphic: React.FC<{
  type: GraphicType;
  data: GraphicData;
}> = ({ type, data }) => {
  if (type === 'none' || !data) return null;
  const wrap: React.CSSProperties = {
    width: '100%', marginTop: 16, padding: '12px 0',
  };
  switch (type) {
    case 'gap':          return <div style={wrap}><GapGraphic data={data} /></div>;
    case 'percent_fill': return <div style={wrap}><PercentFillGraphic data={data} /></div>;
    case 'percent_pie':  return <div style={wrap}><PercentPieGraphic data={data} /></div>;
    case 'growth':       return <div style={wrap}><GrowthGraphic data={data} /></div>;
    case 'timeline':     return <div style={wrap}><TimelineGraphic data={data} /></div>;
    case 'streak':       return <div style={wrap}><StreakGraphic data={data} /></div>;
    case 'drain':        return <div style={wrap}><DrainGraphic data={data} /></div>;
    case 'gauge':        return <div style={wrap}><GaugeGraphic data={data} /></div>;
    default:             return null;
  }
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/nick/Documents/New project/video" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/components/InlineGraphic.tsx
git commit -m "feat(components): add InlineGraphic with 8 animated graphic types"
```

---

### Task 3: Update parse-script.mjs — parse Explanation and Graphic fields

**Files:**
- Modify: `scripts/parse-script.mjs`

- [ ] **Step 1: Add Explanation + Graphic parsing to the stat/overlay block parser**

In `scripts/parse-script.mjs`, find the `else` block inside the `while ((m = blockRe.exec(bodyM[1])) !== null)` loop that handles `stat` and `overlay` types. It currently ends with:

```javascript
        segments.push({
          type, startSec, endSec,
          text: textM ? stripQuotes(textM[1].trim()) : '',
          narration: narrM ? cleanNarr(narrM[1]) : null,
        });
```

Replace that `push` with:

```javascript
        const explanationM = body.match(/Explanation:\s*(.+)/);
        const graphicTypeM = body.match(/Graphic_type:\s*(\S+)/i);

        // Collect all Graphic_* fields into a data object
        let graphicData = undefined;
        const graphicFieldRe = /Graphic_([a-z_]+):\s*(.+)/gi;
        let gm;
        while ((gm = graphicFieldRe.exec(body)) !== null) {
          const key = gm[1].toLowerCase();
          const raw = gm[2].trim();
          if (!graphicData) graphicData = {};
          // numeric if parseable, else string
          graphicData[key] = isNaN(Number(raw)) ? raw : Number(raw);
        }

        const seg = {
          type, startSec, endSec,
          text: textM ? stripQuotes(textM[1].trim()) : '',
          narration: narrM ? cleanNarr(narrM[1]) : null,
        };
        if (explanationM) seg.explanation = explanationM[1].trim();
        if (graphicTypeM) seg.graphic_type = graphicTypeM[1].trim().toLowerCase();
        if (graphicData) seg.graphic = graphicData;
        segments.push(seg);
```

- [ ] **Step 2: Verify parse produces correct output**

First create a minimal test script file at `/tmp/test-stat-parse.md`:

```markdown
# Reel Script: Test
Target length: 30 seconds
Format: Long Form
Hook type: contrarian_stat

---

## HOOK (0–5s)
Text: TEST HOOK
Narration: One sentence hook.

---

## BODY

**Stat 1** (5–20s)
Text: 72% BYPRODUCT MINING
Explanation: Silver output tied to copper, gold, zinc decisions
Graphic_type: percent_fill
Graphic_value: 72
Graphic_label: Byproduct
Graphic_remainder_label: Primary
Narration: Roughly 72 percent of mine supply comes as a byproduct.

---

## QUESTION (20–30s)
Text: WILL SILVER HIT 50 THIS YEAR
Subtext: YES OR NO BELOW
Narration: Follow for more silver news.
```

Then run:

```bash
cd "/Users/nick/Documents/New project/video"
node --input-type=module -e "
import {readFileSync} from 'fs';
import {parseReelScript} from './scripts/parse-script.mjs';
const md = readFileSync('/tmp/test-stat-parse.md','utf8');
const r = parseReelScript(md,'test');
const stat = r.segments.find(s=>s.type==='stat');
console.log(JSON.stringify(stat,null,2));
"
```

Expected output includes:
```json
{
  "type": "stat",
  "explanation": "Silver output tied to copper, gold, zinc decisions",
  "graphic_type": "percent_fill",
  "graphic": { "value": 72, "label": "Byproduct", "remainder_label": "Primary" }
}
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add scripts/parse-script.mjs
git commit -m "feat(parse): parse Explanation and Graphic_* fields from stat segments"
```

---

### Task 4: Update StatCard.tsx — add explanation + InlineGraphic

**Files:**
- Modify: `src/components/StatCard.tsx`

- [ ] **Step 1: Import InlineGraphic and render explanation + graphic**

Replace the `import` block and `StatCard` component in `src/components/StatCard.tsx`:

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS, POPPINS } from '../fonts';
import { PhotoBg } from './PhotoBg';
import { InlineGraphic } from './InlineGraphic';
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
  const hasGraphic = segment.graphic_type && segment.graphic_type !== 'none' && segment.graphic;

  return (
    <div style={{
      position: 'relative', width: BRAND.width, height: BRAND.height,
      background: BRAND.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '80px 60px',
      overflow: 'hidden', opacity: fadeIn,
    }}>
      <PhotoBg photoPath={photoPath} segmentIndex={segmentIndex} />
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 12, width: '100%',
      }}>
        {parsed ? (
          <>
            <p style={{
              fontFamily: BEBAS,
              fontSize: hasGraphic ? 108 : 128,
              color: BRAND.cyan, textTransform: 'uppercase',
              letterSpacing: '0.02em', lineHeight: 1, margin: 0,
              textShadow: `0 0 40px ${BRAND.cyan}66`,
            }}>
              <CountUp target={parsed.number} suffix={parsed.suffix} countFrames={countFrames} />
            </p>
            {parsed.rest && (
              <p style={{
                fontFamily: BEBAS,
                fontSize: hasGraphic ? 46 : 56,
                color: BRAND.white, textTransform: 'uppercase',
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
            fontSize: hasGraphic ? 64 : 80,
            color: BRAND.white, textAlign: 'center',
            textTransform: 'uppercase', letterSpacing: '0.02em',
            lineHeight: 1.2, margin: 0,
          }}>
            {segment.text}
          </p>
        )}

        {segment.explanation && (
          <p style={{
            fontFamily: POPPINS,
            fontSize: 18, fontWeight: 400,
            color: `${BRAND.cyan}cc`,
            textAlign: 'center', margin: 0, lineHeight: 1.4,
            maxWidth: 800,
          }}>
            {segment.explanation}
          </p>
        )}

        {hasGraphic && (
          <div style={{ width: '100%', maxWidth: 860 }}>
            <InlineGraphic type={segment.graphic_type!} data={segment.graphic!} />
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/nick/Documents/New project/video" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/components/StatCard.tsx
git commit -m "feat(StatCard): add explanation line and InlineGraphic below stat number"
```

---

## Track B — Media Pipeline

### Task 5: Create fetch-media.mjs

**Files:**
- Create: `scripts/fetch-media.mjs`

- [ ] **Step 1: Create the script**

Create `scripts/fetch-media.mjs`:

```javascript
/**
 * Fetches media for each segment: Pixabay video → Pexels video → Pixabay photo → Pexels photo.
 * Saves MP4 to public/videos/<slug>/segment-N.mp4 for video entries.
 * Saves JPG to public/photos/<slug>/segment-N.jpg for all entries (thumb for videos).
 * Writes out/<slug>/media.json: Record<segmentIndex, MediaEntry>
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get as httpsGet } from 'node:https';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = join(__dirname, '..');

function loadMediaQueries(slug) {
  const reelDataPath = join(videoDir, '..', 'blog', slug, 'reel-data.md');
  if (!existsSync(reelDataPath)) return {};
  const md = readFileSync(reelDataPath, 'utf8');
  const queries = {};
  // Support both old pexels_queries and new media_queries section names
  const sectionMatch = md.match(/## (?:media_queries|pexels_queries)\n([\s\S]*?)(?=\n##|$)/);
  if (!sectionMatch) return queries;
  const lines = sectionMatch[1].split('\n');
  let seg = null;
  let prefer = 'video';
  for (const line of lines) {
    const segM = line.match(/^-\s+segment:\s*(\d+)/);
    const queryM = line.match(/^\s+query:\s*"(.+?)"/);
    const preferM = line.match(/^\s+prefer:\s*(\S+)/);
    if (segM) { seg = parseInt(segM[1], 10); prefer = 'video'; }
    if (preferM && seg !== null) prefer = preferM[1].toLowerCase();
    if (queryM && seg !== null) {
      queries[seg] = { query: queryM[1], prefer };
      seg = null;
    }
  }
  return queries;
}

function segmentKeywords(seg) {
  const text = seg.text ?? seg.title ?? '';
  return text.replace(/\d+%?/g, '').replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(' ') + ' silver';
}

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = httpsGet(url, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error(`Bad JSON: ${url}`)); } });
    });
    req.on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const follow = (u) => {
      httpsGet(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close(); return follow(res.headers.location);
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}

async function fetchPixabayVideo(query, dest, usedIds, apiKey) {
  const q = encodeURIComponent(query);
  const url = `https://pixabay.com/api/videos/?key=${apiKey}&q=${q}&per_page=10&safesearch=true`;
  try {
    const data = await fetchJson(url, {});
    if (!data.hits?.length) return false;
    const hit = data.hits.find(v => !usedIds.has(v.id));
    if (!hit) return false;
    const small = hit.videos.small ?? hit.videos.medium ?? hit.videos.large;
    if (!small?.url) return false;
    await downloadFile(small.url, dest);
    if (!existsSync(dest) || statSync(dest).size < 10240) { try { unlinkSync(dest); } catch {} return false; }
    usedIds.add(hit.id);
    return { thumb: hit.videos.small?.thumbnail ?? null };
  } catch { return false; }
}

async function fetchPexelsVideo(query, dest, usedIds, apiKey) {
  const q = encodeURIComponent(query);
  const url = `https://api.pexels.com/videos/search?query=${q}&orientation=portrait&per_page=10&size=small`;
  try {
    const data = await fetchJson(url, { Authorization: apiKey });
    if (!data.videos?.length) return false;
    const video = data.videos.find(v => !usedIds.has(v.id));
    if (!video) return false;
    const files = video.video_files.filter(f => f.file_type === 'video/mp4');
    const file = files.sort((a, b) => (a.width ?? 999) - (b.width ?? 999))[0];
    if (!file) return false;
    await downloadFile(file.link, dest);
    if (!existsSync(dest) || statSync(dest).size < 10240) { try { unlinkSync(dest); } catch {} return false; }
    usedIds.add(video.id);
    return { thumb: video.image ?? null };
  } catch { return false; }
}

async function fetchPixabayPhoto(query, dest, usedIds, apiKey) {
  const q = encodeURIComponent(query);
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${q}&image_type=photo&orientation=vertical&per_page=15&safesearch=true`;
  try {
    const data = await fetchJson(url, {});
    if (!data.hits?.length) return false;
    const hit = data.hits.find(p => !usedIds.has(p.id));
    if (!hit) return false;
    await downloadFile(hit.largeImageURL, dest);
    if (!existsSync(dest) || statSync(dest).size < 1024) { try { unlinkSync(dest); } catch {} return false; }
    usedIds.add(hit.id);
    return true;
  } catch { return false; }
}

async function fetchPexelsPhoto(query, dest, usedIds, apiKey) {
  const q = encodeURIComponent(query);
  const url = `https://api.pexels.com/v1/search?query=${q}&orientation=portrait&per_page=15&size=large`;
  try {
    const data = await fetchJson(url, { Authorization: apiKey });
    if (!data.photos?.length) return false;
    const photo = data.photos.find(p => !usedIds.has(p.id));
    if (!photo) return false;
    await downloadFile(photo.src.large2x ?? photo.src.large, dest);
    if (!existsSync(dest) || statSync(dest).size < 1024) { try { unlinkSync(dest); } catch {} return false; }
    usedIds.add(photo.id);
    return true;
  } catch { return false; }
}

export async function fetchMedia(slug) {
  const pexelsKey = process.env.PEXELS_API_KEY;
  const pixabayKey = process.env.PIXABAY_API_KEY;

  const scriptPath = join(videoDir, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) { console.error(`script.json not found: ${scriptPath}`); return {}; }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));

  const photoDir = join(videoDir, 'public', 'photos', slug);
  const videoDir2 = join(videoDir, 'public', 'videos', slug);
  mkdirSync(photoDir, { recursive: true });
  mkdirSync(videoDir2, { recursive: true });

  const media = {};
  const usedVideoIds = new Set();
  const usedPhotoIds = new Set();
  const mediaQueries = loadMediaQueries(slug);

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    const jpgDest = join(photoDir, `segment-${i}.jpg`);
    const mp4Dest = join(videoDir2, `segment-${i}.mp4`);

    // Reuse valid existing files
    const hasVideo = existsSync(mp4Dest) && statSync(mp4Dest).size > 10240;
    const hasPhoto = existsSync(jpgDest) && statSync(jpgDest).size > 1024;
    if (hasVideo) {
      media[i] = { type: 'video', src: `videos/${slug}/segment-${i}.mp4`, thumb: hasPhoto ? `photos/${slug}/segment-${i}.jpg` : undefined, source: 'cached' };
      console.log(`  ↷  segment-${i} video exists — skipping`);
      continue;
    }
    if (hasPhoto) {
      media[i] = { type: 'photo', src: `photos/${slug}/segment-${i}.jpg`, source: 'cached' };
      console.log(`  ↷  segment-${i} photo exists — skipping`);
      continue;
    }

    if (!pexelsKey && !pixabayKey) continue;

    const qEntry = mediaQueries[i];
    const rawQuery = qEntry?.query ?? segmentKeywords(seg);
    const prefer = qEntry?.prefer ?? 'video';
    const skipVideo = ['chart', 'cta', 'question'].includes(seg.type) || prefer === 'photo';

    let fetched = false;

    // Video priority: Pixabay → Pexels
    if (!skipVideo && pixabayKey) {
      const result = await fetchPixabayVideo(rawQuery, mp4Dest, usedVideoIds, pixabayKey);
      if (result) {
        // Extract thumbnail frame
        try {
          execSync(`ffmpeg -y -ss 1.5 -i "${mp4Dest}" -vframes 1 -q:v 2 "${jpgDest}" 2>/dev/null`);
        } catch {}
        media[i] = { type: 'video', src: `videos/${slug}/segment-${i}.mp4`, thumb: existsSync(jpgDest) ? `photos/${slug}/segment-${i}.jpg` : undefined, source: 'pixabay' };
        console.log(`  ✓ segment-${i} video (pixabay): "${rawQuery}"`);
        fetched = true;
      }
    }

    if (!fetched && !skipVideo && pexelsKey) {
      const result = await fetchPexelsVideo(rawQuery, mp4Dest, usedVideoIds, pexelsKey);
      if (result) {
        try {
          execSync(`ffmpeg -y -ss 1.5 -i "${mp4Dest}" -vframes 1 -q:v 2 "${jpgDest}" 2>/dev/null`);
        } catch {}
        media[i] = { type: 'video', src: `videos/${slug}/segment-${i}.mp4`, thumb: existsSync(jpgDest) ? `photos/${slug}/segment-${i}.jpg` : undefined, source: 'pexels' };
        console.log(`  ✓ segment-${i} video (pexels): "${rawQuery}"`);
        fetched = true;
      }
    }

    // Photo fallback: Pixabay → Pexels
    if (!fetched && pixabayKey) {
      const ok = await fetchPixabayPhoto(rawQuery, jpgDest, usedPhotoIds, pixabayKey);
      if (ok) {
        media[i] = { type: 'photo', src: `photos/${slug}/segment-${i}.jpg`, source: 'pixabay' };
        console.log(`  ✓ segment-${i} photo (pixabay): "${rawQuery}"`);
        fetched = true;
      }
    }

    if (!fetched && pexelsKey) {
      const ok = await fetchPexelsPhoto(rawQuery, jpgDest, usedPhotoIds, pexelsKey);
      if (ok) {
        media[i] = { type: 'photo', src: `photos/${slug}/segment-${i}.jpg`, source: 'pexels' };
        console.log(`  ✓ segment-${i} photo (pexels): "${rawQuery}"`);
      }
    }
  }

  writeFileSync(join(videoDir, 'out', slug, 'media.json'), JSON.stringify(media, null, 2));
  // Backward-compat alias: write photos.json with photo paths only
  const photosCompat = {};
  for (const [k, v] of Object.entries(media)) {
    photosCompat[k] = v.thumb ?? v.src;
  }
  writeFileSync(join(videoDir, 'out', slug, 'photos.json'), JSON.stringify(photosCompat, null, 2));
  return media;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const postArg = process.argv.find(a => a.startsWith('--post='));
  if (!postArg) { console.error('Usage: node fetch-media.mjs --post=<slug>'); process.exit(1); }
  const slug = postArg.replace('--post=', '');
  console.log(`\nFetching media for: ${slug}\n`);
  fetchMedia(slug).then(m => console.log(`\nDone. ${Object.keys(m).length} segment(s).`));
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add scripts/fetch-media.mjs
git commit -m "feat(scripts): add fetch-media.mjs — dual-source video+photo pipeline"
```

---

### Task 6: Create MediaBg.tsx

**Files:**
- Create: `src/components/MediaBg.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/MediaBg.tsx`:

```tsx
import React from 'react';
import { Img, Video, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';
import type { MediaEntry } from '../types';

const ORIGINS = ['center', 'top left', 'bottom right'] as const;

export const MediaBg: React.FC<{
  media?: MediaEntry;
  photoPath?: string;
  overlayOpacity?: number;
  segmentIndex?: number;
}> = ({ media, photoPath, overlayOpacity = 0.62, segmentIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const transformOrigin = ORIGINS[segmentIndex % 3];

  const overlayStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    background: `linear-gradient(180deg, rgba(4,16,24,${overlayOpacity}) 0%, rgba(4,16,24,${overlayOpacity + 0.1}) 100%)`,
  };

  const baseStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    width: BRAND.width, height: BRAND.height,
    objectFit: 'cover', objectPosition: 'center',
  };

  // Video entry
  if (media?.type === 'video') {
    return (
      <>
        <Video
          src={staticFile(media.src)}
          style={baseStyle}
          muted
          loop
          playbackRate={0.75}
        />
        <div style={overlayStyle} />
      </>
    );
  }

  // Photo entry (from media.json) or legacy photoPath string
  const imgSrc = media?.src ?? photoPath;
  if (!imgSrc) return null;

  return (
    <>
      <Img
        src={staticFile(imgSrc)}
        style={{
          ...baseStyle,
          transform: `scale(${scale})`,
          transformOrigin,
        }}
      />
      <div style={overlayStyle} />
    </>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/nick/Documents/New project/video" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/components/MediaBg.tsx
git commit -m "feat(components): add MediaBg — renders video clips or photos as segment background"
```

---

### Task 7: Wire MediaBg into cards and BlogReel

**Files:**
- Modify: `src/components/HookCard.tsx`
- Modify: `src/components/OverlayCard.tsx`
- Modify: `src/components/StatCard.tsx`
- Modify: `src/components/CTACard.tsx`
- Modify: `src/components/QuestionCard.tsx`
- Modify: `src/compositions/BlogReel.tsx`
- Modify: `scripts/render.mjs`

- [ ] **Step 1: Update all five cards — pattern applies to each**

For each card file (`HookCard.tsx`, `OverlayCard.tsx`, `CTACard.tsx`, `QuestionCard.tsx`, and the already-modified `StatCard.tsx`):

1. Replace `import { PhotoBg } from './PhotoBg';` with `import { MediaBg } from './MediaBg';`
2. Add `mediaEntry?: MediaEntry` to the props interface (import `MediaEntry` from `'../types'`)
3. Replace `<PhotoBg photoPath={photoPath} segmentIndex={segmentIndex} />` with `<MediaBg media={mediaEntry} photoPath={photoPath} segmentIndex={segmentIndex} />`

Example for `HookCard.tsx` — read the file first, then apply these three changes. The same pattern applies to each card.

For `StatCard.tsx`, it was modified in Task 4. Apply just steps 1-3 there too (replace PhotoBg import, add mediaEntry prop, replace PhotoBg render).

- [ ] **Step 2: Update BlogReel.tsx — pass MediaEntry to SegmentCard**

In `src/compositions/BlogReel.tsx`:

Replace:
```typescript
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
    case 'cta':      return <CTACard segment={segment} photoPath={photoPath} segmentIndex={segmentIndex} />;
    case 'question': return <QuestionCard segment={segment} photoPath={photoPath} segmentIndex={segmentIndex} />;
  }
};
```

With:
```typescript
import type { ReelScript, Segment, CaptionChunk, MediaEntry } from '../types';

type MediaMap = Record<number, MediaEntry>;

const SegmentCard: React.FC<{
  segment: Segment;
  mediaEntry?: MediaEntry;
  segmentIndex: number;
}> = ({ segment, mediaEntry, segmentIndex }) => {
  switch (segment.type) {
    case 'hook':    return <HookCard segment={segment} mediaEntry={mediaEntry} segmentIndex={segmentIndex} />;
    case 'overlay': return <OverlayCard segment={segment} mediaEntry={mediaEntry} segmentIndex={segmentIndex} />;
    case 'stat':    return <StatCard segment={segment} mediaEntry={mediaEntry} segmentIndex={segmentIndex} />;
    case 'chart':   return <ChartCard segment={segment} segmentIndex={segmentIndex} />;
    case 'cta':     return <CTACard segment={segment} mediaEntry={mediaEntry} segmentIndex={segmentIndex} />;
    case 'question': return <QuestionCard segment={segment} mediaEntry={mediaEntry} segmentIndex={segmentIndex} />;
  }
};
```

Also update the `BlogReel` component props and usage:

Replace `photos?: PhotoMap;` with `media?: MediaMap;` in the props type.

Replace `photos = {}` with `media = {}` in the destructure.

Replace `photoPath={photos[i]}` with `mediaEntry={media[i]}` in the `<SegmentCard>` usage.

Replace `photosUsed: Object.keys(photos).length` (if present) in the file with `mediaUsed: Object.keys(media).length`.

- [ ] **Step 3: Update render.mjs — call fetch-media, pass media map**

In `scripts/render.mjs`:

Replace:
```javascript
import { fetchPhotos } from './fetch-photos.mjs';
```
With:
```javascript
import { fetchMedia } from './fetch-media.mjs';
```

Replace:
```javascript
  // 3. Photos (requires PEXELS_API_KEY env var; skips silently if not set)
  console.log('\n→ fetch-photos.mjs');
  const photos = await fetchPhotos(slug);
```
With:
```javascript
  // 3. Media — video clips + photos (Pixabay + Pexels)
  console.log('\n→ fetch-media.mjs');
  const media = await fetchMedia(slug);
```

Replace:
```javascript
  writeFileSync(propsFile, JSON.stringify({ script, musicTrack, photos, captions }));
```
With:
```javascript
  writeFileSync(propsFile, JSON.stringify({ script, musicTrack, media, captions }));
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "/Users/nick/Documents/New project/video" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add src/components/HookCard.tsx src/components/OverlayCard.tsx src/components/CTACard.tsx src/components/QuestionCard.tsx src/components/StatCard.tsx src/compositions/BlogReel.tsx scripts/render.mjs
git commit -m "feat: wire MediaBg into all cards and render pipeline — video clips now render"
```

---

## Track C — Subtitle Sync

### Task 8: Fix generate-captions.mjs — ffprobe-based timing

**Files:**
- Modify: `scripts/generate-captions.mjs`

- [ ] **Step 1: Replace whisper-node approach with ffprobe timing**

The current file tries to `require('whisper-node')` which is not installed, silently fails for every segment, and produces an empty `captions.json`. `Subtitle.tsx` then falls back to distributing captions over the full segment window instead of actual audio duration — this is what causes drift.

Replace the entire contents of `scripts/generate-captions.mjs` with:

```javascript
/**
 * Generates caption timestamps for each segment using ffprobe to measure
 * actual audio duration. Splits narration into sentence chunks and distributes
 * them proportionally across actual audio time (not segment window time).
 * This eliminates subtitle drift caused by estimated vs. real speech rate.
 *
 * Output: out/<slug>/captions.json — Record<segmentIdx, CaptionChunk[]>
 * Each chunk: { text, startSec, endSec } relative to segment audio start (0-based).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function getAudioDuration(m4aPath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${m4aPath}"`,
      { encoding: 'utf8' }
    ).trim();
    const d = parseFloat(out);
    return isNaN(d) ? null : d;
  } catch {
    return null;
  }
}

function splitIntoChunks(text, maxChars = 100) {
  // Split on sentence boundaries first
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const chunks = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) {
      chunks.push(trimmed);
    } else {
      // Split long sentences on comma boundaries
      const parts = trimmed.split(/,\s*/);
      let buf = '';
      for (const p of parts) {
        if (buf && (buf + ', ' + p).length > maxChars) {
          if (buf) chunks.push(buf.trim());
          buf = p;
        } else {
          buf = buf ? buf + ', ' + p : p;
        }
      }
      if (buf.trim()) chunks.push(buf.trim());
    }
  }
  return chunks.filter(Boolean);
}

export async function generateCaptions(slug) {
  const scriptPath = join(ROOT, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) return {};

  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const audioDir = join(ROOT, 'public/audio', slug);
  const outDir = join(ROOT, 'out', slug);
  mkdirSync(outDir, { recursive: true });

  const captions = {};

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    if (!seg.narration) continue;

    const m4aPath = join(audioDir, `segment-${i}.m4a`);
    if (!existsSync(m4aPath)) continue;

    const actualDuration = getAudioDuration(m4aPath);
    if (!actualDuration || actualDuration < 0.5) continue;

    const chunks = splitIntoChunks(seg.narration);
    if (!chunks.length) continue;

    const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
    // Distribute proportionally by character count across actual audio duration
    // Add 150ms lead so subtitle appears slightly before the word
    const LEAD_SEC = 0.15;
    let cursor = -LEAD_SEC;

    captions[i] = chunks.map((text, ci) => {
      const fraction = text.length / totalChars;
      const duration = fraction * actualDuration;
      const startSec = Math.max(0, cursor);
      const endSec = startSec + duration;
      cursor += duration;
      return { text, startSec, endSec };
    });

    // Clamp last chunk to actual duration
    if (captions[i].length) {
      captions[i][captions[i].length - 1].endSec = actualDuration;
    }

    console.log(`  ✓ captions segment-${i}: ${captions[i].length} chunk(s), audio ${actualDuration.toFixed(1)}s`);
  }

  writeFileSync(join(outDir, 'captions.json'), JSON.stringify(captions, null, 2));
  return captions;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const postArg = process.argv.find(a => a.startsWith('--post='));
  if (!postArg) { console.error('Usage: node generate-captions.mjs --post=<slug>'); process.exit(1); }
  const slug = postArg.replace('--post=', '');
  console.log(`\nGenerating captions for: ${slug}\n`);
  generateCaptions(slug).then(c => {
    console.log(`\nDone. ${Object.keys(c).length} segment(s) with captions.`);
  });
}
```

- [ ] **Step 2: Test caption generation on an existing reel**

```bash
cd "/Users/nick/Documents/New project/video" && export $(cat .env | xargs) && node scripts/generate-captions.mjs --post=silver-supply-deficit
```

Expected output: each segment logs a line like `✓ captions segment-0: 2 chunk(s), audio 4.3s`. Check `out/silver-supply-deficit/captions.json` has entries with `startSec` and `endSec` values smaller than the segment window duration.

```bash
cat "/Users/nick/Documents/New project/video/out/silver-supply-deficit/captions.json" | python3 -m json.tool | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project/video"
git add scripts/generate-captions.mjs
git commit -m "fix(captions): replace whisper-node with ffprobe-based timing — fixes subtitle drift"
```

---

## Track D — SOP Documentation

### Task 9: Update REEL-SOP.md

**Files:**
- Modify: `video/REEL-SOP.md`

- [ ] **Step 1: Add Pixabay setup to §Setup**

In `video/REEL-SOP.md`, find the `### 3. Pexels API key` section. Add immediately after it:

```markdown
### 4. Pixabay API key (second video + photo source)
Key is stored in `video/.env` alongside the Pexels key. Already configured.

To verify:
```bash
grep PIXABAY_API_KEY video/.env
```

Both keys are loaded automatically when you run: `cd video && export $(cat .env | xargs)`
```

- [ ] **Step 2: Add Graphic Types section**

Add a new section after `## 11. reel-data.md` (before `## 12. topic-history.md`):

````markdown
## 11b. Inline Graphic Types (required for all stat segments)

Every stat entry in `reel-data.md` must include an `explanation:` line and a `graphic_type:`. These render as an explanation line and an animated graphic below the stat number on screen, making stats readable without audio.

### explanation: field

One plain sentence (no em dashes) explaining what the number means or why it matters. Appears in muted cyan below the stat label.

```markdown
- text: 72% BYPRODUCT MINING
  explanation: Silver output tied to copper, gold, zinc production decisions
```

### graphic_type: field + graphic: block

Pick the type that best fits the stat shape. Use `none` if no type fits — the explanation line still renders.

| Type | Use when | Required graphic: fields |
|------|----------|--------------------------|
| `gap` | Two values with a meaningful difference (supply vs demand, revenue vs cost) | `a_label`, `a_value`, `b_label`, `b_value`, `unit` |
| `percent_fill` | Single percentage, split with complement | `value`, `label`, `remainder_label` |
| `percent_pie` | Single percentage shown as donut chart | `value`, `label`, `remainder_label` |
| `growth` | Before/after comparison (year-over-year, then vs now) | `from_value`, `from_label`, `to_value`, `to_label`, `unit` |
| `timeline` | Duration range (e.g. 8–12 years to build a mine) | `min`, `max`, `unit`, `label` |
| `streak` | Consecutive count ("3rd straight year") — `count` = total dots shown, `current` = which is active (1-based) | `count`, `current`, `unit` |
| `drain` | Depleting inventory or reserve | `peak_value`, `peak_label`, `current_value`, `current_label`, `unit` |
| `gauge` | Position on a low→high scale | `value`, `min`, `max`, `low_label`, `high_label` |
| `none` | No graphic fits — renders explanation only | — |

### Full stat block example

```markdown
- text: 211M OZ ANNUAL DEFICIT
  explanation: More consumed than mined. Third straight year.
  graphic_type: gap
  graphic:
    a_label: Supply
    a_value: 998
    b_label: Demand
    b_value: 1209
    unit: M oz
  narration: Silver's global market ran a 211 million ounce deficit in 2023...

- text: 72% BYPRODUCT MINING
  explanation: Silver output tied to copper, gold, zinc production decisions
  graphic_type: percent_fill
  graphic:
    value: 72
    label: Byproduct
    remainder_label: Primary
  narration: Roughly 72 percent of mine supply comes as a byproduct...

- text: 3RD STRAIGHT YEAR IN DEFICIT
  explanation: Consecutive annual deficits signal a structural imbalance
  graphic_type: streak
  graphic:
    count: 3
    current: 3
    unit: years
  narration: The deficits in 2021 and 2022 were smaller...
```

### reel-script.md format for stat segments

When writing `reel-script.md`, include the same fields using `Graphic_type:` and individual `Graphic_fieldname:` lines:

```markdown
**Stat 1** (5–20s)
Text: 72% BYPRODUCT MINING
Explanation: Silver output tied to copper, gold, zinc production decisions
Graphic_type: percent_fill
Graphic_value: 72
Graphic_label: Byproduct
Graphic_remainder_label: Primary
Narration: Roughly 72 percent of mine supply comes as a byproduct of gold, copper, zinc, and lead mining...
```
````

- [ ] **Step 3: Add Media Strategy section**

Add a new section after `## 11b.`:

````markdown
## 11c. Media Strategy — Video Clips + Photos

Every segment background is sourced in this priority order:

1. **Pixabay video** (portrait MP4, slow cinematic playback)
2. **Pexels video** (portrait MP4 fallback)
3. **Pixabay photo** (large, portrait)
4. **Pexels photo** (large, portrait fallback)

Chart, CTA, and Question segments always get a photo (clean background needed for readability).

### media_queries section in reel-data.md

Replaces `pexels_queries`. Add `prefer: video` (default) or `prefer: photo` per segment:

```markdown
## media_queries
- segment: 0
  query: "silver bullion bars dramatic lighting"
  prefer: video
- segment: 2
  query: "solar panels photovoltaic field aerial"
  prefer: video
- segment: 5
  query: "silver coins collection close up"
  prefer: photo
```

- `prefer:` defaults to `video` if omitted
- Write specific, visual queries — avoid abstract words
- Aim for 1 entry per segment (hook + all stat segments at minimum)
- The old `pexels_queries` name still works for legacy posts

### Video clip behavior

Video clips play at 0.75× speed for a cinematic slow-motion feel. They loop if the segment is longer than the clip. A dark overlay is applied to keep text readable (same opacity as photos).
````

- [ ] **Step 4: Update pre-render checklist with subtitle sync check**

Find `#### Pre-render script audit checklist` in REEL-SOP.md. Under the **Timing validation** section, add:

```markdown
**Subtitle sync (run after render, before posting)**
- [ ] Scrub to 3 random mid-video points — subtitle text matches spoken word within 0.5 seconds
- [ ] If subtitles consistently lag: re-run `node scripts/generate-captions.mjs --post=<slug>` and re-render
```

- [ ] **Step 5: Update §Step 5 Review checklist**

In the `### Step 5 — Review checklist` section, add:

```
- [ ] Subtitles match audio — scrub to 3 random points, subtitles appear with or slightly before spoken word
- [ ] Video clips playing on hook and stat segments (not black frames or still photos)
```

- [ ] **Step 6: Commit REEL-SOP.md**

```bash
cd "/Users/nick/Documents/New project"
git add video/REEL-SOP.md
git commit -m "docs(reel-sop): add graphic types, media strategy, subtitle sync rules"
```

---

### Task 10: Update BLOG-SOP.md §11

**Files:**
- Modify: `blog/BLOG-SOP.md`

- [ ] **Step 1: Update §11 reel-data.md format**

In `blog/BLOG-SOP.md`, find `## 11. reel-data.md`. Replace the `## stats` section of the format block with:

````markdown
```markdown
## stats
List every significant stat from the post. Each becomes one Stat segment.
- text: 42% LABEL IN 5 WORDS MAX
  explanation: One plain sentence — what this number means without audio
  graphic_type: percent_fill
  graphic:
    value: 42
    label: Category
    remainder_label: Other
  narration: 2–4 sentences. Match blog wording closely.
- text: 73% SHORT LABEL HERE
  explanation: One plain sentence context
  graphic_type: percent_fill
  graphic:
    value: 73
    label: Category
    remainder_label: Other
  narration: 2–3 sentences.
[continue for all major stats — aim for 5–10 entries covering the full post]
```
````

Also replace the `## pexels_queries` section with:

````markdown
```markdown
## media_queries
- segment: 0
  query: "specific visual query for hook"
  prefer: video
- segment: 2
  query: "visual query for this segment"
  prefer: video
[one entry per segment — prefer video for hook and stats, photo for chart/question]
```
````

Also add a note after the rules block:

```markdown
- Every stat entry requires `explanation:`, `graphic_type:`, and `graphic:` block — see REEL-SOP.md §11b for all 8 graphic types and their fields
- Use `graphic_type: none` only when no type fits — `explanation:` is always required
- `media_queries` replaces `pexels_queries` — add `prefer: video` (default) or `prefer: photo` per segment
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add blog/BLOG-SOP.md
git commit -m "docs(blog-sop): update reel-data.md format with graphic types and media_queries"
```

---

## Self-Review

**Spec coverage check:**
- Track A (explanation + 8 graphics): Tasks 1–4 ✓
- Track B (video clips, dual source): Tasks 5–7 ✓
- Track C (subtitle sync): Task 8 ✓
- REEL-SOP.md updates: Task 9 ✓
- BLOG-SOP.md §11 update: Task 10 ✓
- Pixabay API key in .env: Done (pre-plan) ✓
- `media_queries` replaces `pexels_queries`: Tasks 5, 9, 10 ✓

**No placeholders found.**

**Type consistency:**
- `MediaEntry` defined in Task 1 → used in Tasks 5, 6, 7 ✓
- `GraphicType` / `GraphicData` defined in Task 1 → used in Tasks 2, 4 ✓
- `InlineGraphic` created in Task 2 → imported in Task 4 ✓
- `fetchMedia` exported in Task 5 → imported in Task 7 ✓
- `media` prop name consistent across BlogReel.tsx and render.mjs in Task 7 ✓
