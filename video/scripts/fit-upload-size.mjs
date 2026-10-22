import {copyFileSync, existsSync, renameSync, statSync, unlinkSync} from 'node:fs';
import {basename, dirname, extname, join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

const TARGET_BYTES = 44_000_000;
const AUDIO_BITRATE = 192_000;
const SIZE_MARGIN = 0.97;

export function calculateVideoBitrate({targetBytes = TARGET_BYTES, durationSeconds, audioBitrate = AUDIO_BITRATE}) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('A positive video duration is required to calculate upload bitrate');
  }
  const availableBitsPerSecond = (targetBytes * 8 * SIZE_MARGIN) / durationSeconds;
  const videoBitrate = Math.floor(availableBitsPerSecond - audioBitrate);
  if (videoBitrate < 300_000) throw new Error('Upload target is too small for a usable video bitrate');
  return videoBitrate;
}

function run(command, args, {capture = false} = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status ?? result.signal}): ${(result.stderr || '').trim()}`);
  }
  return result.stdout?.trim() ?? '';
}

function probe(path) {
  const raw = run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height',
    '-of', 'json', path,
  ], {capture: true});
  const data = JSON.parse(raw);
  const durationSeconds = Number(data.format?.duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`Cannot read a valid duration from ${path}`);
  }
  if (!data.streams?.some((stream) => stream.codec_type === 'video')) {
    throw new Error(`${path} has no video stream`);
  }
  return {durationSeconds, streams: data.streams};
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const [key, inline] = argv[index].split('=', 2);
    if (!key.startsWith('--')) continue;
    options[key.slice(2)] = inline ?? argv[++index];
  }
  return options;
}

export function fitUploadSize({input, targetBytes = TARGET_BYTES, preserveOriginal = true}) {
  if (!input || !existsSync(input)) throw new Error(`Input video does not exist: ${input || '(missing)'}`);
  const sourceBytes = statSync(input).size;
  const target = Number(targetBytes);
  if (!Number.isSafeInteger(target) || target < 1_000_000 || target >= 50_000_000) {
    throw new Error('Target bytes must be between 1 MB and the strict 50 MB upload cap');
  }
  if (sourceBytes <= target) return {input, sourceBytes, outputBytes: sourceBytes, optimized: false};

  const {durationSeconds} = probe(input);
  const dir = dirname(input);
  const ext = extname(input) || '.mp4';
  const tempOutput = join(dir, `.${basename(input, ext)}.size-fit-${process.pid}${ext}`);
  const passLog = join(tmpdir(), `fused-video-size-fit-${process.pid}`);
  const archivePath = `${input}.pre-size-fit-${new Date().toISOString().replaceAll(':', '-')}`;
  let videoBitrate = calculateVideoBitrate({targetBytes: target, durationSeconds});
  let outputBytes = 0;

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      run('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
        '-map', '0:v:0', '-an', '-c:v', 'libx264', '-preset', 'slow',
        '-b:v', String(videoBitrate), '-pass', '1', '-passlogfile', passLog,
        '-f', 'null', process.platform === 'win32' ? 'NUL' : '/dev/null',
      ]);
      run('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
        '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '0', '-map_chapters', '0',
        '-c:v', 'libx264', '-preset', 'slow', '-b:v', String(videoBitrate),
        '-pass', '2', '-passlogfile', passLog, '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', String(AUDIO_BITRATE), '-ar', '48000',
        '-movflags', '+faststart', tempOutput,
      ]);
      const encodedProbe = probe(tempOutput);
      if (Math.abs(encodedProbe.durationSeconds - durationSeconds) > 0.5) {
        throw new Error(`Re-encoded duration changed from ${durationSeconds.toFixed(2)}s to ${encodedProbe.durationSeconds.toFixed(2)}s`);
      }
      outputBytes = statSync(tempOutput).size;
      if (outputBytes < 50_000_000) break;
      const correction = Math.min(0.88, (target / outputBytes) * 0.92);
      videoBitrate = Math.floor(videoBitrate * correction);
      unlinkSync(tempOutput);
    }

    if (outputBytes >= 50_000_000) {
      throw new Error(`Size-corrected file is still ${outputBytes} bytes; upload cap is 50000000`);
    }
    if (preserveOriginal) copyFileSync(input, archivePath, 0);
    renameSync(tempOutput, input);
    const finalBytes = statSync(input).size;
    if (finalBytes >= 50_000_000) {
      throw new Error(`Final output is ${finalBytes} bytes; upload cap is 50000000`);
    }
    return {
      input,
      sourceBytes,
      outputBytes: finalBytes,
      targetBytes: target,
      durationSeconds,
      videoBitrate,
      optimized: true,
      preservedOriginal: preserveOriginal ? archivePath : null,
    };
  } catch (error) {
    if (existsSync(tempOutput)) unlinkSync(tempOutput);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = parseArgs(process.argv.slice(2));
  try {
    const result = fitUploadSize({input: options.input, targetBytes: options['target-bytes'] || TARGET_BYTES});
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
