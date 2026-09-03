import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const videoDir = join(import.meta.dirname, '..');
const paperAssets = [
  ['paper-collage-pilot/source-still.png', '#315c62', '#d8b84c', 'THE SIGNAL', 'LOOK FOR THE DECISION'],
  ['paper-collage-pilot/timeline.png', '#d86b3f', '#d8b84c', 'THE CONTEXT', 'THE PATTERN MATTERS'],
  ['paper-collage-pilot/ratio-balance.png', '#4b285f', '#d8b84c', 'THE COMPARISON', 'PUT THE NUMBERS IN CONTEXT'],
  ['paper-collage-pilot/solar-demand.png', '#c89f2d', '#315c62', 'THE PRESSURE', 'FOLLOW THE REAL DRIVER'],
];

export function buildProductionStoryboard(script, slug) {
  const segments = script.segments.map((segment, segmentIndex) => {
    const isHook = segment.type === 'hook';
    const isQuestion = segment.type === 'question';
    const shouldCollage = isHook || (!isQuestion && segmentIndex > 0 && segmentIndex % 5 === 0);
    const paper = paperAssets[(segmentIndex / 5 | 0) % paperAssets.length];
    const visual = shouldCollage
      ? 'paper-collage'
      : segment.type === 'chart' ? 'chart'
        : isQuestion ? 'question' : 'standard-card';
    return {
      segmentIndex,
      chapter: isHook ? 'opening signal' : isQuestion ? 'closing question' : 'evidence and action',
      purpose: segment.narration ?? segment.text ?? segment.title,
      visual,
      ...(shouldCollage ? {
        asset: paper[0], backgroundColor: paper[1], accentColor: paper[2],
        label: paper[3], message: paper[4],
      } : {}),
      assemblyOrder: shouldCollage
        ? ['paper field', 'primary subject', 'meaning marker', 'caption layer']
        : ['existing production card', 'approved media', 'caption layer'],
      transitionIntent: shouldCollage
        ? 'snap into a tactile paper cutout, then hold for the message'
        : 'preserve the existing production transition rhythm',
    };
  });
  if (!segments.some((segment) => segment.visual === 'paper-collage')) {
    throw new Error(`Production storyboard for ${slug} could not assign a paper collage beat`);
  }
  return {
    route: 'storyboard-production',
    planner: 'local-deterministic',
    fixture: slug,
    narrativeArc: ['frame the signal', 'show evidence', 'make the implication clear', 'close with a question'],
    segments,
  };
}

export function loadOrBuildProductionStoryboard(slug, script) {
  const existingPath = join(videoDir, 'out', slug, 'storyboard.json');
  if (existsSync(existingPath)) {
    const existing = JSON.parse(readFileSync(existingPath, 'utf8'));
    if (existing.route === 'storyboard-production') return existing;
  }
  return buildProductionStoryboard(script, slug);
}
