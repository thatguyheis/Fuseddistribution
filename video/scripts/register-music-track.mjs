import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = resolve(__dirname, '..');
const repoRoot = resolve(videoDir, '..');
const rightsPath = join(videoDir, 'data', 'audio-rights.json');
const musicDir = join(videoDir, 'public', 'music');
const allowedPlatforms = ['youtube', 'facebook', 'instagram', 'linkedin', 'x'];

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--no-cycle') options.noCycle = true;
    else if (arg.startsWith('--')) {
      const [rawKey, ...rawValue] = arg.slice(2).split('=');
      const key = rawKey.replaceAll('-', '_');
      options[key] = rawValue.length > 0 ? rawValue.join('=') : true;
    }
  }
  return options;
}

function usage() {
  return `Usage:
  npm run video:music:register -- --source=<candidate.wav> --id=fused-ace-01 --title="Fused ACE 01"

Options:
  --source=<path>             Required candidate audio file.
  --id=<track-id>             Required output basename; .mp3 is added automatically.
  --title=<title>             Required human-readable title.
  --source-name=<text>        Defaults to ACE-Step local AI music generation.
  --license=<text>            Defaults to fused-original-ai-assisted.
  --review-notes=<text>       Optional listening/review notes.
  --no-cycle                  Register as approved but do not add to trustedCycle.
  --force=true                Overwrite an existing output MP3.
`;
}

function requireString(options, key) {
  const value = options[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required --${key.replaceAll('_', '-')}.`);
  }
  return value.trim();
}

function sanitizeTrackId(id) {
  return id
    .trim()
    .replace(/\.mp3$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readOptionalJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${command} failed${output ? `:\n${output}` : ''}`);
  }
  return result.stdout.trim();
}

function audioDuration(path) {
  const output = run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1',
    path,
  ]);
  const value = Number.parseFloat(output);
  return Number.isFinite(value) ? value : null;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(usage());
  process.exit(0);
}

try {
  const source = resolve(requireString(options, 'source'));
  const trackId = sanitizeTrackId(requireString(options, 'id'));
  const title = requireString(options, 'title');

  if (!trackId) throw new Error('Track id is empty after sanitization.');
  if (!existsSync(source)) throw new Error(`Source file does not exist: ${source}`);
  if (!existsSync(rightsPath)) throw new Error(`Audio rights database missing: ${rightsPath}`);

  const targetFile = `${trackId}.mp3`;
  const targetPath = join(musicDir, targetFile);
  const force = options.force === true || options.force === 'true';
  if (existsSync(targetPath) && !force) {
    throw new Error(`Target already exists: ${targetPath}. Pass --force=true to overwrite.`);
  }

  mkdirSync(musicDir, { recursive: true });
  run('ffmpeg', [
    '-y',
    '-i', source,
    '-vn',
    '-ac', '2',
    '-ar', '48000',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-codec:a', 'libmp3lame',
    '-b:a', '192k',
    targetPath,
  ]);

  const sourceExt = extname(source);
  const sourceBase = sourceExt ? source.slice(0, -sourceExt.length) : source;
  const sidecarPath = `${sourceBase}_input_params.json`;
  const generationParams = readOptionalJson(sidecarPath);
  const manifestPath = join(dirname(source), `${sourceBase.split('/').pop()}.manifest.json`);
  const manifest = readOptionalJson(manifestPath);
  const date = new Date().toISOString().slice(0, 10);
  const db = JSON.parse(readFileSync(rightsPath, 'utf8'));

  db.updatedAt = date;
  db.tracks ??= {};
  db.policy ??= {};
  db.policy.trustedCycle ??= [];

  const prompt = generationParams?.prompt ?? manifest?.prompt ?? null;
  const lyrics = generationParams?.lyrics ?? manifest?.lyrics ?? null;
  const seed = Array.isArray(generationParams?.actual_seeds) ? generationParams.actual_seeds.join(',') : (manifest?.seed ?? null);
  const duration = audioDuration(targetPath);
  const generationDetail = [
    'Generated locally with ACE-Step and promoted after human review.',
    prompt ? `Prompt: ${prompt}` : null,
    lyrics ? `Lyrics field: ${lyrics}` : null,
    seed ? `Seed: ${seed}` : null,
    duration ? `Normalized duration: ${duration.toFixed(2)} seconds.` : null,
    'No downloaded song, stock-music track, third-party melody, sample pack, vocal recording, or lyric source was used as source media.',
  ].filter(Boolean).join(' ');

  db.tracks[targetFile] = {
    title,
    status: 'approved',
    sha256: sha256File(targetPath),
    sourceName: String(options.source_name ?? 'ACE-Step local AI music generation'),
    sourceUrl: `local:${targetPath.replace(`${repoRoot}/`, '')}`,
    license: String(options.license ?? 'fused-original-ai-assisted'),
    acquiredAt: date,
    verifiedAt: date,
    allowedPlatforms,
    generationMethod: generationDetail,
    sourceCandidate: `local:${source.replace(`${repoRoot}/`, '')}`,
    reviewNotes: String(options.review_notes ?? 'Approved for Fused Distribution reel background music cycle.'),
  };

  if (!options.noCycle && !db.policy.trustedCycle.includes(targetFile)) {
    db.policy.trustedCycle.push(targetFile);
  }

  writeFileSync(rightsPath, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
  console.log(`Registered ${targetFile}`);
  console.log(`Output: ${targetPath}`);
  console.log(`Rights: ${rightsPath}`);
} catch (error) {
  console.error(error.message);
  console.error(usage());
  process.exit(1);
}
