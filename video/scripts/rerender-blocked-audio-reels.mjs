import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditAudioRights, assertRenderedReelAudioCleared, repoRoot, videoDir } from './audio-rights.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultReportDir = join(videoDir, 'out', 'audio-rerender-reports');

function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (!key || process.env[key]) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function usage() {
  console.log(`Usage: node scripts/rerender-blocked-audio-reels.mjs [options]

Options:
  --limit=<n>             Number of blocked reels to render in this batch. Default: 4
  --max-minutes=<n>       Stop before starting a new reel after this many minutes. Default: no limit
  --voice=<name>          Voice passed to render.mjs. Default: chatterbox
  --continue-on-error     Continue with the next reel if one fails
  --rebuild-reel-scripts  Rebuild trusted reel source before rendering
  --dry-run               Print selected slugs without rendering
`);
}

if (hasFlag('help') || hasFlag('h')) {
  usage();
  process.exit(0);
}

const limit = positiveInteger(argValue('limit'), 4);
const maxMinutes = positiveInteger(argValue('max-minutes'), 0);
const voice = argValue('voice', 'chatterbox');
const continueOnError = hasFlag('continue-on-error');
const rebuildReelScripts = hasFlag('rebuild-reel-scripts');
const dryRun = hasFlag('dry-run');
const startedAt = new Date();
const startedMs = Date.now();

loadEnvFile(join(videoDir, '.env'));

const initialAudit = auditAudioRights({ includeRenders: true });
const candidates = initialAudit.failedRenders;
const dryRunSelection = candidates.slice(0, limit);

console.log('Audio backlog rerender');
console.log(`Generated: ${startedAt.toISOString()}`);
console.log(`Blocked rendered reels before batch: ${initialAudit.summary.renderedReelsBlocked}`);
console.log(`Batch render attempt limit: ${limit}`);
console.log(`Blocked candidate count: ${candidates.length}`);

if (candidates.length === 0) {
  console.log('No blocked rendered reels found.');
  process.exit(0);
}

console.log('\nNext blocked slugs:');
for (const [index, item] of dryRunSelection.entries()) {
  console.log(`${index + 1}. ${item.slug} (${item.musicTrack}: ${item.reason})`);
}

if (dryRun) process.exit(0);

const results = [];
const selected = [];
let processedCandidates = 0;

for (const item of candidates) {
  if (processedCandidates >= limit) break;
  processedCandidates += 1;
  selected.push(item);
  const elapsedMinutes = (Date.now() - startedMs) / 60000;
  if (maxMinutes > 0 && elapsedMinutes >= maxMinutes) {
    results.push({
      slug: item.slug,
      status: 'skipped',
      reason: 'max_minutes_reached',
      elapsedMinutes: Math.round(elapsedMinutes * 10) / 10,
    });
    break;
  }

  console.log(`\n=== Rerendering ${item.slug} ===`);
  if (rebuildReelScripts) {
    const verifiedPath = join(repoRoot, 'public', 'blog', item.slug, 'verified.md');
    if (!existsSync(verifiedPath)) {
      results.push({ slug: item.slug, status: 'skipped', reason: 'missing_verified_source_for_reel_rebuild' });
      continue;
    }
    const post = JSON.parse(readFileSync(join(repoRoot, 'public', 'blog', 'posts.json'), 'utf8'))
      .find((entry) => entry.slug === item.slug);
    const tags = post?.tags ?? [];
    const brand = tags.some((tag) => /silver|precious metals/i.test(tag)) || /silver/i.test(item.slug) ? 'silver' : 'tech';
    const rebuild = spawnSync(
      join(repoRoot, 'public', 'blog', 'scripts', 'build-reel.sh'),
      [item.slug, `--brand=${brand}`, `--keyword=${post?.title ?? item.slug.replaceAll('-', ' ')}`],
      { cwd: repoRoot, env: process.env, stdio: 'inherit' },
    );
    if (rebuild.status !== 0) {
      results.push({ slug: item.slug, status: 'failed', reason: 'reel_script_rebuild_failed', exitCode: rebuild.status });
      if (!continueOnError) break;
      continue;
    }
  }
  const command = [
    'scripts/render.mjs',
    `--post=${item.slug}`,
    '--music=cycle',
    `--voice=${voice}`,
  ];
  const render = spawnSync(process.execPath, command, {
    cwd: videoDir,
    env: process.env,
    stdio: 'inherit',
  });

  if (render.status !== 0) {
    const result = {
      slug: item.slug,
      status: 'failed',
      reason: 'render_command_failed',
      exitCode: render.status,
      signal: render.signal,
    };
    results.push(result);
    if (!continueOnError) break;
    continue;
  }

  try {
    const rights = assertRenderedReelAudioCleared(item.slug, { repoRoot });
    const release = spawnSync(process.execPath, ['scripts/release-reel.mjs', `--post=${item.slug}`], {
      cwd: videoDir,
      env: process.env,
      stdio: 'inherit',
    });
    if (release.status !== 0) throw new Error('release_quality_gate_failed');
    results.push({
      slug: item.slug,
      status: 'approved',
      musicTrack: rights.musicTrack,
      renderedAt: rights.renderedAt,
    });
  } catch (error) {
    results.push({
      slug: item.slug,
      status: 'failed',
      reason: 'post_render_rights_check_failed',
      detail: error.message,
    });
    if (!continueOnError) break;
  }
}

const finalAudit = auditAudioRights({ includeRenders: true });
const completedAt = new Date();
const report = {
  startedAt: startedAt.toISOString(),
  completedAt: completedAt.toISOString(),
  elapsedMinutes: Math.round(((completedAt.getTime() - startedAt.getTime()) / 60000) * 10) / 10,
  initialBlocked: initialAudit.summary.renderedReelsBlocked,
  finalBlocked: finalAudit.summary.renderedReelsBlocked,
  initialApproved: initialAudit.summary.renderedReelsApproved,
  finalApproved: finalAudit.summary.renderedReelsApproved,
  selected: selected.map((item) => ({
    slug: item.slug,
    previousMusicTrack: item.musicTrack,
    previousReason: item.reason,
  })),
  results,
};

mkdirSync(defaultReportDir, { recursive: true });
const stamp = completedAt.toISOString().replace(/[:.]/g, '-');
const reportPath = join(defaultReportDir, `${stamp}.json`);
const latestPath = join(defaultReportDir, 'latest.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
writeFileSync(latestPath, JSON.stringify(report, null, 2));

console.log('\nAudio backlog rerender summary');
console.log(`Approved renders before: ${report.initialApproved}`);
console.log(`Approved renders after: ${report.finalApproved}`);
console.log(`Blocked renders before: ${report.initialBlocked}`);
console.log(`Blocked renders after: ${report.finalBlocked}`);
console.log(`Report: ${resolve(reportPath)}`);

const failed = results.filter((result) => result.status === 'failed');
process.exit(failed.length > 0 ? 1 : 0);
