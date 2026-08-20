#!/usr/bin/env node
import { rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

function readArgs(argv) {
  const args = {};
  for (const value of argv) {
    const match = value.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

function positiveInteger(value, name, fallback) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

const args = readArgs(process.argv.slice(2));
if (!args.input || !args.output) {
  console.error('usage: render-svg-jpg.mjs --input=hero.svg --output=hero.jpg --width=1200 --height=630 [--quality=85]');
  process.exit(2);
}

const input = resolve(args.input);
const output = resolve(args.output);
const width = positiveInteger(args.width, 'width', 1200);
const height = positiveInteger(args.height, 'height', 630);
const quality = positiveInteger(args.quality, 'quality', 85);
if (quality > 100) throw new Error('quality must be between 1 and 100');

const temporaryOutput = `${output}.tmp-${process.pid}.jpg`;
try {
  await sharp(input, { density: 144 })
    .resize(width, height, { fit: 'fill' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality, chromaSubsampling: '4:4:4' })
    .toFile(temporaryOutput);
  await rename(temporaryOutput, output);
  console.log(`render-svg-jpg: wrote ${output} (${width}x${height})`);
} catch (error) {
  await rm(temporaryOutput, { force: true });
  console.error(`render-svg-jpg: ${error.message}`);
  process.exit(1);
}
