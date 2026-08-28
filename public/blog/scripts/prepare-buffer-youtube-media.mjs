#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertRenderedReelAudioCleared } from '../../../video/scripts/audio-rights.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const publicReelsRoot = join(repoRoot, 'public', 'reels');
const videoOutRoot = join(repoRoot, 'video', 'out');

// Leave a four second margin below Buffer's documented 179 second ceiling.
// Boundary length media has produced generic attachment failures in Buffer.
const DEFAULT_MAX_DURATION_SECONDS = 135;
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_LONG_EDGE = 1280;
const DEFAULT_MAX_VIDEO_BITRATE = 25_000_000;
const DEFAULT_MAX_AUDIO_BITRATE = 192_000;
const DEFAULT_BASE_URL = 'https://fuseddistribution.luxraycoco.workers.dev/reels';

function usage() {
  console.error(`Usage: node public/blog/scripts/prepare-buffer-youtube-media.mjs --slugs=a,b,c [options]

Creates Buffer-safe YouTube MP4 files under public/reels and updates the YouTube media URL map.

Options:
  --slugs=a,b,c                  Required slug list.
  --max-duration-seconds=N       Output duration cap. Default: 175.
  --max-bytes=N                  Output size cap. Default: 26214400.
  --max-long-edge=N              Output long-edge pixel cap. Default: 1280.
  --base-url=https://...         Hosted base URL after deploy. Default: workers.dev /reels.
  --out=path                     Output media map. Default: .buffer-media-urls.json.

Examples:
  npm run social:buffer:youtube:media -- --slugs=slug-one,slug-two
`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = {
    slugs: [],
    maxDurationSeconds: DEFAULT_MAX_DURATION_SECONDS,
    maxBytes: DEFAULT_MAX_BYTES,
    maxLongEdge: DEFAULT_MAX_LONG_EDGE,
    baseUrl: DEFAULT_BASE_URL,
    out: join(repoRoot, '.buffer-media-urls.json'),
  };

  for (const arg of argv) {
    if (arg.startsWith('--slugs=')) args.slugs = parseSlugList(arg.slice('--slugs='.length));
    else if (arg.startsWith('--max-duration-seconds=')) args.maxDurationSeconds = parsePositiveNumber(arg, '--max-duration-seconds');
    else if (arg.startsWith('--max-bytes=')) args.maxBytes = parsePositiveInt(arg.slice('--max-bytes='.length), '--max-bytes');
    else if (arg.startsWith('--max-long-edge=')) args.maxLongEdge = parsePositiveInt(arg.slice('--max-long-edge='.length), '--max-long-edge');
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

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sourceVideoPath(slug) {
  const standardPath = join(videoOutRoot, slug, `${slug}.mp4`);
  if (existsSync(standardPath)) return standardPath;
  if (slug === 'paper-collage-storyboard-pilot') {
    return join(videoOutRoot, slug, 'storyboard-preview.mp4');
  }
  return standardPath;
}

function outputVideoPath(slug) {
  return join(publicReelsRoot, slug, `${slug}.mp4`);
}

function renderMetaPath(slug) {
  return join(videoOutRoot, slug, 'render-meta.json');
}

function isoMtime(path) {
  return statSync(path).mtime.toISOString();
}

function durationSeconds(path) {
  const info = mediaInfo(path);
  return info?.duration ?? null;
}

function mediaInfo(path) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  try {
    const json = JSON.parse(result.stdout);
    const video = (json.streams || []).find((stream) => stream.codec_type === 'video');
    const audio = (json.streams || []).find((stream) => stream.codec_type === 'audio');
    const duration = Number(json.format?.duration);
    return {
      duration: Number.isFinite(duration) ? duration : null,
      formatBitRate: positiveNumber(json.format?.bit_rate),
      videoCodec: video?.codec_name || null,
      videoBitRate: positiveNumber(video?.bit_rate),
      width: positiveNumber(video?.width),
      height: positiveNumber(video?.height),
      audioCodec: audio?.codec_name || null,
      audioBitRate: positiveNumber(audio?.bit_rate),
    };
  } catch {
    return null;
  }
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
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

function scaleFilter(maxLongEdge) {
  return `scale=if(gt(iw\\,ih)\\,min(iw\\,${maxLongEdge})\\,-2):if(gt(iw\\,ih)\\,-2\\,min(ih\\,${maxLongEdge}))`;
}

function transcode(input, output, args, crf) {
  mkdirSync(dirname(output), { recursive: true });
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      input,
      '-t',
      String(args.maxDurationSeconds),
      '-vf',
      scaleFilter(args.maxLongEdge),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-profile:v',
      'high',
      '-level',
      '4.2',
      '-preset',
      'veryfast',
      '-crf',
      String(crf),
      '-c:a',
      'aac',
      '-b:a',
      '128k',
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

function needsTranscode(info, bytes, args) {
  if (!info) return true;
  const longEdge = Math.max(info.width || 0, info.height || 0);
  return (
    info.duration === null ||
    info.duration > args.maxDurationSeconds ||
    bytes > args.maxBytes ||
    info.videoCodec !== 'h264' ||
    (info.audioCodec !== null && info.audioCodec !== 'aac') ||
    longEdge > args.maxLongEdge ||
    (info.videoBitRate !== null && info.videoBitRate > DEFAULT_MAX_VIDEO_BITRATE) ||
    (info.audioBitRate !== null && info.audioBitRate > DEFAULT_MAX_AUDIO_BITRATE)
  );
}

function validateOutput(output, args) {
  const outputInfo = mediaInfo(output);
  const outputBytes = fileSizeBytes(output);
  if (!outputInfo || outputInfo.duration === null) throw new Error(`Could not read output media info for ${output}`);
  if (outputBytes === null) throw new Error(`Could not read output size for ${output}`);
  if (outputInfo.duration > args.maxDurationSeconds + 0.25) {
    throw new Error(`Output is too long for Buffer YouTube: ${outputInfo.duration.toFixed(3)}s > ${args.maxDurationSeconds}s`);
  }
  if (outputBytes > args.maxBytes) {
    throw new Error(`Output is too large for Cloudflare assets: ${outputBytes} bytes > ${args.maxBytes}`);
  }
  if (outputInfo.videoCodec !== 'h264') {
    throw new Error(`Output video codec must be h264 for Buffer reliability: ${outputInfo.videoCodec || 'unknown'}`);
  }
  if (outputInfo.audioCodec !== null && outputInfo.audioCodec !== 'aac') {
    throw new Error(`Output audio codec must be aac for Buffer reliability: ${outputInfo.audioCodec}`);
  }
  if (Math.max(outputInfo.width || 0, outputInfo.height || 0) > args.maxLongEdge) {
    throw new Error(`Output long edge is too large for Buffer reliability: ${outputInfo.width}x${outputInfo.height} > ${args.maxLongEdge}`);
  }
  if (outputInfo.videoBitRate !== null && outputInfo.videoBitRate > DEFAULT_MAX_VIDEO_BITRATE) {
    throw new Error(`Output video bitrate is too high for Buffer reliability: ${outputInfo.videoBitRate} > ${DEFAULT_MAX_VIDEO_BITRATE}`);
  }
  if (outputInfo.audioBitRate !== null && outputInfo.audioBitRate > DEFAULT_MAX_AUDIO_BITRATE) {
    throw new Error(`Output audio bitrate is too high for Buffer reliability: ${outputInfo.audioBitRate} > ${DEFAULT_MAX_AUDIO_BITRATE}`);
  }
  return { outputInfo, outputBytes };
}

function prepareOutput(input, output, args) {
  const sourceInfo = mediaInfo(input);
  const sourceDuration = sourceInfo?.duration ?? null;
  const sourceBytes = fileSizeBytes(input);
  if (sourceDuration === null) throw new Error(`Could not read duration for ${input}`);
  if (sourceBytes === null) throw new Error(`Could not read size for ${input}`);

  const temporaryOutput = `${output}.tmp.mp4`;
  mkdirSync(dirname(temporaryOutput), { recursive: true });
  rmSync(temporaryOutput, { force: true });
  try {
    if (!needsTranscode(sourceInfo, sourceBytes, args)) {
      copyFileSync(input, temporaryOutput);
    } else {
      for (const crf of [24, 27, 30, 33]) {
        transcode(input, temporaryOutput, args, crf);
        const temporaryBytes = fileSizeBytes(temporaryOutput);
        if (temporaryBytes !== null && temporaryBytes <= args.maxBytes) break;
      }
    }
    const validated = validateOutput(temporaryOutput, args);
    assertDecodable(temporaryOutput);
    renameSync(temporaryOutput, output);
    const { outputInfo, outputBytes } = validated;

    return {
      sourceDuration,
      sourceBytes,
      sourceWidth: sourceInfo.width,
      sourceHeight: sourceInfo.height,
      outputDuration: outputInfo.duration,
      outputBytes,
      outputWidth: outputInfo.width,
      outputHeight: outputInfo.height,
      outputVideoCodec: outputInfo.videoCodec,
      outputAudioCodec: outputInfo.audioCodec,
    };
  } catch (error) {
    rmSync(temporaryOutput, { force: true });
    throw error;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const map = readJsonIfExists(args.out, {});
  const results = [];

  for (const slug of [...new Set(args.slugs)]) {
    const input = sourceVideoPath(slug);
    if (!existsSync(input)) throw new Error(`Missing source MP4 for ${slug}: ${input}`);
    const audioRights = assertRenderedReelAudioCleared(slug, { repoRoot });
    const renderMeta = readJson(renderMetaPath(slug));

    const output = outputVideoPath(slug);
    const media = prepareOutput(input, output, args);
    const url = `${args.baseUrl}/${slug}/${slug}.mp4`;
    map[slug] = {
      url,
      generatedAt: new Date().toISOString(),
      sourceVideo: input,
      sourceMtime: isoMtime(input),
      sourceRenderedAt: renderMeta.renderedAt || null,
      sourceMusicTrack: audioRights.musicTrack,
      sourceMusicRightsStatus: audioRights.status,
      outputVideo: output,
      outputMtime: isoMtime(output),
      outputDurationSeconds: Number(media.outputDuration.toFixed(3)),
      outputBytes: media.outputBytes,
      outputWidth: media.outputWidth,
      outputHeight: media.outputHeight,
      outputVideoCodec: media.outputVideoCodec,
      outputAudioCodec: media.outputAudioCodec,
    };
    results.push({ slug, output, url, musicTrack: audioRights.musicTrack, ...media });
  }

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(map, null, 2)}\n`);

  for (const result of results) {
    console.log(
      `[buffer-youtube-media] ${result.slug}: ${result.sourceDuration.toFixed(3)}s/${result.sourceBytes} bytes ${result.sourceWidth}x${result.sourceHeight} -> ${result.outputDuration.toFixed(3)}s/${result.outputBytes} bytes ${result.outputWidth}x${result.outputHeight} ${result.musicTrack} ${result.output}`,
    );
  }
  console.log(`[buffer-youtube-media] wrote ${args.out}`);
}

try {
  main();
} catch (error) {
  console.error(`[buffer-youtube-media] ${error.message}`);
  process.exit(1);
}
