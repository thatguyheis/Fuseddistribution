#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCutdownDuration } from './lib/buffer-video-integrity.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const publicReelsRoot = join(repoRoot, 'public', 'reels');
const publicXReelsRoot = join(repoRoot, 'public', 'reels-x');
const videoOutRoot = join(repoRoot, 'video', 'out');
const DEFAULT_MAX_DURATION_SECONDS = 135;
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_BASE_URL = 'https://fuseddistribution.luxraycoco.workers.dev/reels-x';

function usage() {
  console.error(`Usage: node public/blog/scripts/prepare-buffer-x-media.mjs --slugs=a,b,c [options]

Creates X-safe MP4 cutdowns and writes a dedicated X media URL map.

Options:
  --slugs=a,b,c                  Required slug list.
  --max-duration-seconds=N       Output duration cap. Default: 135.
  --max-bytes=N                  Output size cap. Default: 26214400.
  --base-url=https://...         Hosted base URL after deploy. Default: workers.dev /reels-x.
  --out=path                     Output media map. Default: .buffer-x-media-urls.json.

Examples:
  npm run social:buffer:x:media -- --slugs=slug-one,slug-two
`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = {
    slugs: [],
    maxDurationSeconds: DEFAULT_MAX_DURATION_SECONDS,
    maxBytes: DEFAULT_MAX_BYTES,
    baseUrl: DEFAULT_BASE_URL,
    out: join(repoRoot, '.buffer-x-media-urls.json'),
  };

  for (const arg of argv) {
    if (arg.startsWith('--slugs=')) args.slugs = parseSlugList(arg.slice('--slugs='.length));
    else if (arg.startsWith('--max-duration-seconds=')) args.maxDurationSeconds = parsePositiveNumber(arg, '--max-duration-seconds');
    else if (arg.startsWith('--max-bytes=')) args.maxBytes = parsePositiveInt(arg.slice('--max-bytes='.length), '--max-bytes');
    else if (arg.startsWith('--base-url=')) args.baseUrl = trimTrailingSlash(arg.slice('--base-url='.length).trim());
    else if (arg.startsWith('--out=')) args.out = resolve(arg.slice('--out='.length));
    else usage();
  }

  if (!args.slugs.length) throw new Error('Missing --slugs.');
  return args;
}

function parseSlugList(raw) {
  return raw
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);
}

function parsePositiveNumber(arg, name) {
  const raw = arg.slice(`${name}=`.length);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
  return value;
}

function parsePositiveInt(raw, name) {
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) throw new Error(`${name} must be a positive integer.`);
  return Number(raw);
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function readJsonIfExists(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sourceVideoPath(slug) {
  const publicPath = join(publicReelsRoot, slug, `${slug}.mp4`);
  if (existsSync(publicPath)) return publicPath;
  return join(videoOutRoot, slug, `${slug}.mp4`);
}

function outputVideoPath(slug) {
  return join(publicXReelsRoot, slug, `${slug}.mp4`);
}

function durationSeconds(path) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  const duration = Number(result.stdout.trim());
  return Number.isFinite(duration) ? duration : null;
}

function fileSizeBytes(path) {
  try {
    return statSync(path).size;
  } catch {
    return null;
  }
}

function assertDecodable(path) {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'null', '-'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0 || result.stderr.trim()) {
    throw new Error(`Output contains undecodable media packets: ${path}`);
  }
}

function transcodeCutdown(input, output, maxDurationSeconds, crf) {
  mkdirSync(dirname(output), { recursive: true });
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      input,
      '-t',
      String(maxDurationSeconds),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      String(crf),
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-movflags',
      '+faststart',
      output,
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${input}: ${result.stderr || result.stdout}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const map = readJsonIfExists(args.out, {});
  const results = [];

  for (const slug of [...new Set(args.slugs)]) {
    const input = sourceVideoPath(slug);
    if (!existsSync(input)) throw new Error(`Missing source MP4 for ${slug}: ${input}`);

    const output = outputVideoPath(slug);
    const temporaryOutput = `${output}.tmp.mp4`;
    const sourceDuration = durationSeconds(input);
    const sourceBytes = fileSizeBytes(input);
    if (sourceDuration === null) throw new Error(`Could not read duration for ${input}`);
    if (sourceBytes === null) throw new Error(`Could not read size for ${input}`);

    rmSync(temporaryOutput, { force: true });
    try {
      if (sourceDuration <= args.maxDurationSeconds && sourceBytes <= args.maxBytes) {
        mkdirSync(dirname(temporaryOutput), { recursive: true });
        copyFileSync(input, temporaryOutput);
      } else {
        for (const crf of [28, 31, 34]) {
          transcodeCutdown(input, temporaryOutput, args.maxDurationSeconds, crf);
          const temporaryBytes = fileSizeBytes(temporaryOutput);
          if (temporaryBytes !== null && temporaryBytes <= args.maxBytes) break;
        }
      }

      const temporaryDuration = durationSeconds(temporaryOutput);
      const temporaryBytes = fileSizeBytes(temporaryOutput);
      if (temporaryDuration === null) throw new Error(`Could not read output duration for ${temporaryOutput}`);
      const durationIntegrity = validateCutdownDuration({
        sourceDuration,
        outputDuration: temporaryDuration,
        maximumDuration: args.maxDurationSeconds,
      });
      if (durationIntegrity.reason === 'output_truncated') {
        throw new Error(`Output is truncated for X Buffer: ${temporaryDuration.toFixed(3)}s < ${durationIntegrity.minimumDuration.toFixed(3)}s expected`);
      }
      if (durationIntegrity.reason === 'output_too_long') {
        throw new Error(`Output is too long for X Buffer: ${temporaryDuration.toFixed(3)}s > ${args.maxDurationSeconds}s`);
      }
      if (!durationIntegrity.ok) throw new Error(`Output duration is invalid for X Buffer: ${temporaryDuration}`);
      if (temporaryBytes === null) throw new Error(`Could not read output size for ${temporaryOutput}`);
      if (temporaryBytes > args.maxBytes) {
        throw new Error(`Output is too large for Cloudflare assets: ${temporaryBytes} bytes > ${args.maxBytes}`);
      }
      assertDecodable(temporaryOutput);
      renameSync(temporaryOutput, output);
    } catch (error) {
      rmSync(temporaryOutput, { force: true });
      throw error;
    }

    const outputDuration = durationSeconds(output);
    const outputBytes = fileSizeBytes(output);
    const url = `${args.baseUrl}/${slug}/${slug}.mp4`;
    map[slug] = url;
    results.push({
      slug,
      sourceDuration: Number(sourceDuration.toFixed(3)),
      outputDuration: Number(outputDuration.toFixed(3)),
      outputBytes,
      output,
      url,
    });
  }

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(map, null, 2)}\n`);

  for (const result of results) {
    console.log(
      `[buffer-x-media] ${result.slug}: ${result.sourceDuration}s -> ${result.outputDuration}s/${result.outputBytes} bytes ${result.output}`,
    );
  }
  console.log(`[buffer-x-media] wrote ${args.out}`);
}

try {
  main();
} catch (error) {
  console.error(`[buffer-x-media] ${error.message}`);
  process.exit(1);
}
