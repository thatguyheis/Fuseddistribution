export type StoryboardVisual = 'paper-collage' | 'data-board' | 'standard-card' | 'chart' | 'question';

export type StoryboardDataBoard = {
  chartType: 'line' | 'bars' | 'donut' | 'process';
  title: string;
  subtitle: string;
  takeaway: string;
  /** Required for line/bar boards. Kept for donut/process legacy metadata. */
  axisLabel?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  labels?: string[];
  values?: number[];
  unit?: string;
  threshold?: number;
  steps?: string[];
  sourceNote: string;
  sourcePeriod: string;
};

export type StoryboardSegment = {
  segmentIndex: number;
  chapter: string;
  purpose: string;
  visual: StoryboardVisual;
  asset?: string;
  backgroundColor?: string;
  accentColor?: string;
  label?: string;
  message?: string;
  dataBoard?: StoryboardDataBoard;
  assemblyOrder: string[];
  transitionIntent: string;
};

export type StoryboardPlan = {
  route: 'storyboard-pilot';
  planner: 'local-deterministic';
  fixture: string;
  narrativeArc: string[];
  segments: StoryboardSegment[];
};
