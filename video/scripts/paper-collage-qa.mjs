import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const videoDir = join(import.meta.dirname, '..');
const pilotDir = join(videoDir, 'out', 'paper-collage-pilot');
const files = {
  paper: join(pilotDir, 'paper-collage-hook-5s.mp4'),
  normal: join(pilotDir, 'normal-hook-5s.mp4'),
  comparison: join(pilotDir, 'comparison-contact-sheet.jpg'),
};

function probe(path) {
  const raw = execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], { encoding: 'utf8' });
  return JSON.parse(raw);
}

function inspect(path) {
  const metadata = probe(path);
  const video = metadata.streams.find((stream) => stream.codec_type === 'video');
  const audio = metadata.streams.find((stream) => stream.codec_type === 'audio');
  if (!video) throw new Error(`No video stream in ${path}`);
  const duration = Number(metadata.format.duration);
  const fps = Number(video.r_frame_rate.split('/')[0]) / Number(video.r_frame_rate.split('/')[1]);
  const expectedWidth = path.endsWith('paper-collage-hook-5s.mp4') ? 720 : 540;
  const expectedHeight = path.endsWith('paper-collage-hook-5s.mp4') ? 1280 : 960;
  if (video.width !== expectedWidth) throw new Error(`Clip width is ${video.width}, expected ${expectedWidth}`);
  if (video.height !== expectedHeight) throw new Error(`Clip height is ${video.height}, expected ${expectedHeight}`);
  if (Math.abs(duration - 5) > 0.1) throw new Error(`Clip duration is ${duration.toFixed(3)}s, expected 5s`);
  if (Math.abs(fps - 30) > 0.01) throw new Error(`Clip frame rate is ${fps}, expected 30`);
  return { path, duration, width: video.width, height: video.height, fps, videoCodec: video.codec_name, audio: Boolean(audio), audioCodec: audio?.codec_name ?? null };
}

for (const path of Object.values(files)) {
  if (!existsSync(path)) throw new Error(`Missing pilot output: ${path}`);
}
const report = {
  status: 'pass',
  checkedAt: new Date().toISOString(),
  paper: inspect(files.paper),
  normal: inspect(files.normal),
  comparison: files.comparison,
  checks: ['dimensions', 'duration', 'frame_rate', 'video_stream', 'comparison_contact_sheet'],
};
writeFileSync(join(pilotDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`✓ Pilot QA passed: ${join(pilotDir, 'qa-report.json')}`);
