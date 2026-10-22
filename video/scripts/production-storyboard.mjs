import { existsSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const videoDir = join(import.meta.dirname, '..');
const paperAssets = [
  ['paper-collage-pilot/source-still.png', '#315c62', '#d8b84c', 'THE SIGNAL', 'LOOK FOR THE DECISION'],
  ['paper-collage-pilot/timeline.png', '#d86b3f', '#d8b84c', 'THE CONTEXT', 'THE PATTERN MATTERS'],
  ['paper-collage-pilot/ratio-balance.png', '#4b285f', '#d8b84c', 'THE COMPARISON', 'PUT THE NUMBERS IN CONTEXT'],
  ['paper-collage-pilot/solar-demand.png', '#c89f2d', '#315c62', 'THE PRESSURE', 'FOLLOW THE REAL DRIVER'],
];

export function buildProductionStoryboard(script, slug, media = {}) {
  const segments = script.segments.map((segment, segmentIndex) => {
    const isHook = segment.type === 'hook';
    const isQuestion = segment.type === 'question';
    const shouldCollage = isHook || (!isQuestion && segmentIndex > 0 && segmentIndex % 5 === 0);
    const paper = paperAssets[(segmentIndex / 5 | 0) % paperAssets.length];
    const visual = media[segmentIndex] && ['hook', 'overlay'].includes(segment.type) && !['fused-owned-coin-library', 'fused-verified-coin-evidence'].includes(media[segmentIndex].source)
      ? 'media-feature'
      : shouldCollage
      ? 'paper-collage'
      : segment.type === 'chart' ? 'chart'
        : isQuestion ? 'question' : 'standard-card';
    return {
      segmentIndex,
      chapter: isHook ? 'opening signal' : isQuestion ? 'closing question' : 'evidence and action',
      purpose: segment.narration ?? segment.text ?? segment.title,
      visual,
      ...(shouldCollage ? {
        asset: `photos/${slug}/editorial-hero.jpg`, backgroundColor: paper[1], accentColor: paper[2],
        label: 'FUSED DISTRIBUTION', message: segment.text || segment.title || script.title,
      } : {}),
      assemblyOrder: visual === 'media-feature' ? ['full frame supporting media', 'compact headline', 'caption layer'] : shouldCollage
        ? ['paper field', 'primary subject', 'meaning marker', 'caption layer']
        : ['existing production card', 'approved media', 'caption layer'],
      transitionIntent: visual === 'media-feature' ? 'reveal headline over visible media, then slide or wipe into the next scene' : shouldCollage
        ? 'snap into a tactile paper cutout, then hold for the message'
        : 'preserve the existing production transition rhythm',
    };
  });
  if (!segments.some((segment) => ['paper-collage', 'media-feature'].includes(segment.visual))) {
    throw new Error(`Production storyboard for ${slug} could not assign a paper collage beat`);
  }
  return {
    route: 'storyboard-production',
    planner: 'local-deterministic',
    version: 3,
    scriptHash: createHash('sha256').update(JSON.stringify(script)).digest('hex'),
    fixture: slug,
    narrativeArc: ['frame the signal', 'show evidence', 'make the implication clear', 'close with a question'],
    segments,
  };
}

export function loadOrBuildProductionStoryboard(slug, script, media = {}) {
  const hero = join(videoDir, '..', 'public', 'blog', slug, 'hero.jpg');
  if (!existsSync(hero)) throw new Error(`Missing approved article artwork for ${slug}`);
  const photos = join(videoDir, 'public', 'photos', slug);
  mkdirSync(photos, { recursive: true });
  copyFileSync(hero, join(photos, 'editorial-hero.jpg'));
  // Rebuild cheaply so newly selected media cannot inherit a stale card plan.
  return buildProductionStoryboard(script, slug, media);
}
