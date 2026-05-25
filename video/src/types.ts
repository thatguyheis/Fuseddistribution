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
