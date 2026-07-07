#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const namespaceId = '20cd4e65773842deb15b8a12356c8e96';
const maxBytes = 25 * 1024 * 1024;

function usage() {
  console.error(`Usage: node public/blog/scripts/sync-buffer-media-kv.mjs [options]

Uploads Buffer-safe MP4s to remote Cloudflare KV so /reels and /reels-x URLs survive Worker deploys.

Options:
  --slugs=a,b              Upload exact slugs. If omitted, uploads all public/reels and public/reels-x MP4s.
  --platform=all|youtube|x Upload only one media tree. Default: all.
  --dry-run                Print planned uploads without writing KV.
`);
}

function parseArgs(argv) {
  const args = { slugs: [], platform: 'all', dryRun: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg.startsWith('--slugs=')) {
      args.slugs = arg.slice('--slugs='.length).split(',').map((slug) => slug.trim()).filter(Boolean);
    } else if (arg.startsWith('--platform=')) {
      args.platform = arg.slice('--platform='.length).trim();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!['all', 'youtube', 'x'].includes(args.platform)) {
    throw new Error('--platform must be one of all, youtube, or x');
  }
  return args;
}

function mp4PathFor(platform, slug) {
  const root = platform === 'youtube' ? 'reels' : 'reels-x';
  return join(repoRoot, 'public', root, slug, `${slug}.mp4`);
}

function discoverSlugs(rootName) {
  const root = join(repoRoot, 'public', rootName);
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => existsSync(join(root, slug, `${slug}.mp4`)));
}

function plannedFiles(args) {
  const platforms = args.platform === 'all' ? ['youtube', 'x'] : [args.platform];
  const files = [];
  for (const platform of platforms) {
    const slugs = args.slugs.length
      ? args.slugs
      : discoverSlugs(platform === 'youtube' ? 'reels' : 'reels-x');
    for (const slug of slugs) {
      const file = mp4PathFor(platform, slug);
      if (existsSync(file)) files.push({ platform, slug, file });
      else if (args.slugs.length) throw new Error(`Missing ${platform} MP4 for ${slug}: ${file}`);
    }
  }
  return files;
}

function kvKeyFor(file) {
  return relative(join(repoRoot, 'public'), file).split('/').join('/');
}

function uploadFile(file) {
  const key = kvKeyFor(file);
  const result = spawnSync(
    'npx',
    [
      'wrangler',
      'kv',
      'key',
      'put',
      key,
      '--path',
      file,
      '--namespace-id',
      namespaceId,
      '--metadata',
      '{"contentType":"video/mp4"}',
      '--remote',
    ],
    { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

  if (result.status !== 0) {
    throw new Error(`KV upload failed for ${key}\n${result.stdout}\n${result.stderr}`);
  }
  return key;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const files = plannedFiles(args);
  if (!files.length) throw new Error('No MP4 files found to upload.');

  for (const { platform, slug, file } of files) {
    const bytes = statSync(file).size;
    if (bytes > maxBytes) {
      throw new Error(`${platform} MP4 is too large for KV/Buffer: ${slug} ${bytes} > ${maxBytes}`);
    }
    const key = kvKeyFor(file);
    if (args.dryRun) {
      console.log(`[buffer-media-kv] dry-run ${key} bytes=${bytes}`);
      continue;
    }
    uploadFile(file);
    console.log(`[buffer-media-kv] uploaded ${key} bytes=${bytes}`);
  }
} catch (error) {
  console.error(`[buffer-media-kv] ${error.message}`);
  process.exit(1);
}
