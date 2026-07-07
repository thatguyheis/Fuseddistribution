#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    const sourceDuration = durationSeconds(input);
    const sourceBytes = fileSizeBytes(input);
    if (sourceDuration === null) throw new Error(`Could not read duration for ${input}`);
    if (sourceBytes === null) throw new Error(`Could not read size for ${input}`);

    if (sourceDuration <= args.maxDurationSeconds && sourceBytes <= args.maxBytes) {
      mkdirSync(dirname(output), { recursive: true });
      copyFileSync(input, output);
    } else {
      for (const crf of [28, 31, 34]) {
        transcodeCutdown(input, output, args.maxDurationSeconds, crf);
        const outputBytes = fileSizeBytes(output);
        if (outputBytes !== null && outputBytes <= args.maxBytes) break;
      }
    }

    const outputDuration = durationSeconds(output);
    const outputBytes = fileSizeBytes(output);
    if (outputDuration === null) throw new Error(`Could not read output duration for ${output}`);
    if (outputDuration > args.maxDurationSeconds + 0.25) {
      throw new Error(`Output is too long for X Buffer: ${outputDuration.toFixed(3)}s > ${args.maxDurationSeconds}s`);
    }
    if (outputBytes === null) throw new Error(`Could not read output size for ${output}`);
    if (outputBytes > args.maxBytes) {
      throw new Error(`Output is too large for Cloudflare assets: ${outputBytes} bytes > ${args.maxBytes}`);
    }
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
