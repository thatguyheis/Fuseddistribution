import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const videoDir = join(import.meta.dirname, '..');
const pilotDir = join(videoDir, 'out', 'paper-collage-storyboard-pilot');
const planPath = join(videoDir, 'out', 'silver-price-history-and-long-term-trends', 'storyboard.json');
const outputPath = join(pilotDir, 'storyboard-preview.mp4');
const contactPath = join(pilotDir, 'storyboard-contact-sheet.jpg');
const frameDir = join(pilotDir, 'storyboard-frames');
if (!existsSync(outputPath) || !existsSync(planPath)) throw new Error('Storyboard preview or plan is missing');
const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', outputPath], { encoding: 'utf8' }));
const video = metadata.streams.find((stream) => stream.codec_type === 'video');
const audio = metadata.streams.find((stream) => stream.codec_type === 'audio');
const duration = Number(metadata.format.duration);
const fps = Number(video.r_frame_rate.split('/')[0]) / Number(video.r_frame_rate.split('/')[1]);
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const props = JSON.parse(readFileSync(join(pilotDir, 'storyboard-props.json'), 'utf8'));
if (!video || video.width !== 720 || video.height !== 1280) throw new Error('Storyboard preview dimensions are invalid');
if (!audio) throw new Error('Storyboard preview has no audio');
if (duration < 170 || duration > 200) throw new Error(`Storyboard preview duration ${duration.toFixed(2)}s is outside the three-minute pilot range`);
if (Math.abs(fps - 30) > 0.01) throw new Error(`Storyboard preview fps ${fps} is invalid`);
if (plan.route !== 'storyboard-pilot' || plan.segments.length !== 10) throw new Error('Storyboard plan is incomplete');
mkdirSync(frameDir, { recursive: true });
for (const segment of plan.segments) {
  const source = props.script.segments[segment.segmentIndex];
  const midpoint = (source.startSec + source.endSec) / 2;
  const framePath = join(frameDir, `frame-${String(segment.segmentIndex).padStart(2, '0')}.jpg`);
  execFileSync('ffmpeg', ['-y', '-ss', String(midpoint), '-i', outputPath, '-frames:v', '1', '-vf', 'scale=270:480', framePath], { cwd: videoDir, stdio: 'ignore' });
}
execFileSync('ffmpeg', ['-y', '-pattern_type', 'glob', '-i', join(frameDir, 'frame-*.jpg'), '-vf', 'tile=10x1', '-frames:v', '1', contactPath], { cwd: videoDir, stdio: 'inherit' });
const report = { status: 'pass', checkedAt: new Date().toISOString(), outputPath, contactPath, duration, fps, width: video.width, height: video.height, audio: true, paperSegments: plan.segments.filter((segment) => segment.visual === 'paper-collage').map((segment) => segment.segmentIndex), normalSegments: plan.segments.filter((segment) => segment.visual !== 'paper-collage').map((segment) => segment.segmentIndex) };
writeFileSync(join(pilotDir, 'storyboard-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`✓ Storyboard QA passed: ${join(pilotDir, 'storyboard-qa.json')}`);
