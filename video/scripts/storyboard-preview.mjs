import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { selectTrustedCycleTrack } from './audio-rights.mjs';

const videoDir = join(import.meta.dirname, '..');
const slug = 'silver-price-history-and-long-term-trends';
const sourceDir = join(videoDir, 'out', slug);
const pilotDir = join(videoDir, 'out', 'paper-collage-storyboard-pilot');
const sourceProps = join(sourceDir, 'render-props.json');
const storyboardPath = join(sourceDir, 'storyboard.json');
const propsPath = join(pilotDir, 'storyboard-props.json');
const outputPath = join(pilotDir, 'storyboard-preview.mp4');
const segmentIndex = Number(process.argv.find((value) => value.startsWith('--segment='))?.replace('--segment=', ''));
const musicOverride = process.argv.find((value) => value.startsWith('--music='))?.replace('--music=', '');

function run(command, args) {
  console.log(`→ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd: videoDir, stdio: 'inherit' });
}

if (!existsSync(sourceProps)) throw new Error(`Missing production render props: ${sourceProps}`);
if (!existsSync(storyboardPath)) run('node', [join(import.meta.dirname, 'storyboard-planner.mjs'), `--post=${slug}`]);
mkdirSync(pilotDir, { recursive: true });
const props = JSON.parse(readFileSync(sourceProps, 'utf8'));
props.storyboard = JSON.parse(readFileSync(storyboardPath, 'utf8'));
props.musicTrack = musicOverride ?? selectTrustedCycleTrack(slug);
writeFileSync(propsPath, `${JSON.stringify(props, null, 2)}\n`);
if (Number.isInteger(segmentIndex)) {
  const segment = props.script.segments[segmentIndex];
  if (!segment) throw new Error(`Unknown segment index: ${segmentIndex}`);
  const segmentOutput = join(pilotDir, `segment-${String(segmentIndex).padStart(2, '0')}-preview.mp4`);
  const startFrame = Math.max(0, Math.floor(segment.startSec * 30) - 30);
  const endFrame = Math.ceil(segment.endSec * 30) + 30;
  run('npx', ['remotion', 'render', 'src/Root.tsx', 'BlogReel', '--concurrency=1', `--props=${propsPath}`, `--frames=${startFrame}-${endFrame}`, segmentOutput]);
  console.log(`✓ Storyboard segment ${segmentIndex} preview complete: ${segmentOutput}`);
} else {
  run('npx', ['remotion', 'render', 'src/Root.tsx', 'BlogReel', '--concurrency=1', `--props=${propsPath}`, outputPath]);
  run('node', [join(import.meta.dirname, 'storyboard-preview-qa.mjs')]);
  console.log(`✓ Storyboard preview complete: ${outputPath}`);
}
