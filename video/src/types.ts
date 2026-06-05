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
  src: string;
  thumb?: string;
  source?: string;
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
