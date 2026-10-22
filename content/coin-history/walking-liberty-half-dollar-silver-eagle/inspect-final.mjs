import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { transitionDurationFrames } from '../../../video/scripts/transition-timing.mjs';

const slug = 'walking-liberty-half-dollar-silver-eagle';
const dir = `video/out/${slug}`;
const props = JSON.parse(fs.readFileSync(`${dir}/render-props.json`, 'utf8'));
const frames = [{ frame: 0, label: 'HERO / 0.00s' }];
let cursor = 0;
for (const [segmentIndex, segment] of props.script.segments.entries()) {
  const duration = Math.round((segment.endSec - segment.startSec) * 30);
  const shots = props.presentation.segments[segmentIndex];
  const totalWeight = shots.reduce((sum, shot) => sum + shot.weight, 0);
  let weight = 0;
  for (const [shotIndex, shot] of shots.entries()) {
    const shotStart = Math.round((weight / totalWeight) * duration);
    weight += shot.weight;
    const shotEnd = Math.round((weight / totalWeight) * duration);
    const frame = cursor + Math.floor((shotStart + shotEnd) / 2);
    frames.push({ frame, label: `${segmentIndex + 1}.${shotIndex + 1} / ${(frame / 30).toFixed(2)}s`, title: shot.title });
    if (shotIndex > 0) frames.push({ frame: cursor + shotStart + 7, label: `DISSOLVE ${segmentIndex + 1}.${shotIndex + 1}`, transition: true });
  }
  const next = props.script.segments[segmentIndex + 1];
  const overlap = next ? transitionDurationFrames(segment.type, next.type, segmentIndex) : 0;
  if (next) frames.push({ frame: cursor + duration - Math.ceil(overlap / 2), label: `SCENE ${segmentIndex + 1} > ${segmentIndex + 2}`, transition: true });
  cursor += duration - overlap;
}
frames.push({ frame: cursor - 1, label: 'FINAL FRAME' });
const reviewDir = `${dir}/review`;
fs.mkdirSync(reviewDir, { recursive: true });
for (const [index, frame] of frames.entries()) {
  const path = `${reviewDir}/frame-${String(index).padStart(2, '0')}.jpg`;
  execFileSync('ffmpeg', ['-v', 'error', '-ss', String(frame.frame / 30), '-i', `${dir}/${slug}.mp4`, '-frames:v', '1', '-q:v', '2', '-y', path]);
  frame.path = path;
}
for (const [name, selected] of [['shots', frames.filter((frame) => !frame.transition)], ['transitions', frames.filter((frame) => frame.transition)]]) {
  const width = 300, height = 560, columns = 4, rows = Math.ceil(selected.length / columns), composite = [];
  for (const [index, frame] of selected.entries()) {
    const image = await sharp(frame.path).resize(width, 534).jpeg({ quality: 86 }).toBuffer();
    const left = (index % columns) * width, top = Math.floor(index / columns) * height;
    composite.push({ input: image, left, top });
    const safeLabel = frame.label.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const label = Buffer.from(`<svg width="300" height="26"><rect width="300" height="26" fill="#07151d"/><text x="8" y="18" fill="white" font-size="15">${safeLabel}</text></svg>`);
    composite.push({ input: label, left, top: top + 534 });
  }
  await sharp({ create: { width: columns * width, height: rows * height, channels: 3, background: '#07151d' } }).composite(composite).jpeg({ quality: 90 }).toFile(`${reviewDir}/${name}-contact-sheet.jpg`);
}
fs.writeFileSync(`${reviewDir}/frame-plan.json`, `${JSON.stringify(frames, null, 2)}\n`);
console.log(`Extracted ${frames.length} frames from all shots, scene changes, the opening, and the close.`);
