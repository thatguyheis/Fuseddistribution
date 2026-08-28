import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const videoDir = resolve(scriptDir, '..');
const pilotDir = join(videoDir, 'out', 'paper-collage-pilot');
const publicDir = join(videoDir, 'public', 'paper-collage-pilot');
const propsPath = join(pilotDir, 'paper-collage-props.json');
const sourceStill = join(publicDir, 'source-still.png');
const paperVideo = join(pilotDir, 'paper-collage-hook-5s.mp4');
const normalVideo = join(pilotDir, 'normal-hook-5s.mp4');
const contactSheet = join(pilotDir, 'comparison-contact-sheet.jpg');

function run(command, args) {
  console.log(`→ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd: videoDir, stdio: 'inherit' });
}

function requireFile(path, description) {
  if (!existsSync(path)) throw new Error(`Missing ${description}: ${path}`);
}

mkdirSync(pilotDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });
requireFile(sourceStill, 'local generated source still');
requireFile(join(videoDir, 'out', 'silver-price-history-and-long-term-trends', 'silver-price-history-and-long-term-trends.mp4'), 'normal production reel');

const props = {
  imagePath: 'paper-collage-pilot/source-still.png',
  backgroundColor: '#315c62',
  accentColor: '#d8b84c',
  label: 'SILVER PRICE HISTORY',
  audioPath: 'audio/silver-price-history-and-long-term-trends/segment-0.m4a',
};
writeFileSync(propsPath, `${JSON.stringify(props, null, 2)}\n`);

run('npx', ['remotion', 'render', 'src/Root.tsx', 'PaperCollagePilot', '--concurrency=1', `--props=${propsPath}`, paperVideo]);
const normalizedPaperVideo = `${paperVideo}.normalized.mp4`;
run('ffmpeg', ['-y', '-i', paperVideo, '-t', '5', '-c:v', 'copy', '-c:a', 'aac', '-shortest', normalizedPaperVideo]);
renameSync(normalizedPaperVideo, paperVideo);
run('ffmpeg', ['-y', '-i', join(videoDir, 'out', 'silver-price-history-and-long-term-trends', 'silver-price-history-and-long-term-trends.mp4'), '-t', '5', '-vf', 'scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2:color=black', '-c:v', 'libx264', '-c:a', 'aac', '-shortest', '-pix_fmt', 'yuv420p', normalVideo]);
run('ffmpeg', ['-y', '-i', normalVideo, '-i', paperVideo, '-filter_complex', '[0:v]fps=1,scale=270:480,tile=5x1[left];[1:v]fps=1,scale=270:480,tile=5x1[right];[left][right]hstack=inputs=2', '-frames:v', '1', contactSheet]);
run('node', [join(scriptDir, 'paper-collage-qa.mjs')]);

const metadata = JSON.parse(readFileSync(join(videoDir, 'data', 'paper-collage-pilot.json'), 'utf8'));
metadata.generatedAt = new Date().toISOString();
metadata.status = 'rendered';
metadata.files = { paperVideo, normalVideo, contactSheet, propsPath };
writeFileSync(join(pilotDir, 'pilot-report.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(`✓ Paper-collage pilot complete: ${pilotDir}`);
