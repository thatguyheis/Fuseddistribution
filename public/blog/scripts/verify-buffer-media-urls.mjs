#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isHttpsUrl, verifyPublicMp4Url } from './lib/buffer-media-verification.mjs';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

function usage() {
  console.error(`Usage: node public/blog/scripts/verify-buffer-media-urls.mjs [options]

Verifies public MP4 URLs before sending them to Buffer.

Options:
  --url=https://...              Verify one explicit URL.
  --media-map=path               JSON map of slug to URL. Supports { "slug": "url" } and { "videos": ... }.
  --slugs=a,b,c                  Slugs to verify from --media-map. Defaults to every map entry.
  --max-bytes=N                  Maximum allowed media size. Default: 26214400.
  --timeout-ms=N                 Request timeout. Default: 15000.

Examples:
  npm run social:buffer:verify-media -- --url=https://cdn.example.com/reel.mp4
  npm run social:buffer:verify-media -- --media-map=.buffer-media-urls.json --slugs=slug-one,slug-two
`);
  process.exit(2);
}

function parsePositiveInt(raw, name) {
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) throw new Error(`${name} must be a positive integer.`);
  return Number(raw);
}

function parseArgs(argv) {
  const args = {
    urls: [],
    mediaMap: '',
    slugs: [],
    maxBytes: DEFAULT_MAX_BYTES,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (const arg of argv) {
    if (arg.startsWith('--url=')) args.urls.push(arg.slice('--url='.length).trim());
    else if (arg.startsWith('--media-map=')) args.mediaMap = resolve(arg.slice('--media-map='.length));
    else if (arg.startsWith('--slugs=')) args.slugs = arg.slice('--slugs='.length).split(',').map((slug) => slug.trim()).filter(Boolean);
    else if (arg.startsWith('--max-bytes=')) args.maxBytes = parsePositiveInt(arg.slice('--max-bytes='.length), '--max-bytes');
    else if (arg.startsWith('--timeout-ms=')) args.timeoutMs = parsePositiveInt(arg.slice('--timeout-ms='.length), '--timeout-ms');
    else usage();
  }

  if (args.urls.length === 0 && !args.mediaMap) usage();
  return args;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse JSON at ${path}: ${error.message}`);
  }
}

function readMediaMap(path) {
  if (!existsSync(path)) throw new Error(`Missing media map: ${path}`);
  const json = readJson(path);
  return json.videos || json.media || json;
}

function mediaUrlFromValue(value) {
  if (typeof value === 'string') return value.trim();
  if (value?.url) return String(value.url).trim();
  if (value?.public_media_url) return String(value.public_media_url).trim();
  if (value?.publicMediaUrl) return String(value.publicMediaUrl).trim();
  return '';
}

function targetsFromArgs(args) {
  const targets = args.urls.map((url, index) => ({ label: `url-${index + 1}`, url }));
  if (!args.mediaMap) return targets;

  const mediaMap = readMediaMap(args.mediaMap);
  const slugs = args.slugs.length ? args.slugs : Object.keys(mediaMap);
  for (const slug of slugs) {
    targets.push({ label: slug, url: mediaUrlFromValue(mediaMap[slug]) });
  }
  return targets;
}

async function verifyUrl(target, args) {
  const { label, url } = target;
  if (!isHttpsUrl(url)) {
    return { label, url, ok: false, reason: 'missing_https_url' };
  }

  const result = await verifyPublicMp4Url(url, {
    maxBytes: args.maxBytes,
    timeoutMs: args.timeoutMs,
  });
  return { label, ...result };
}

function printResult(result) {
  const status = result.ok ? 'OK' : 'FAIL';
  const parts = [
    `[buffer-media] ${status} ${result.label}`,
    result.reason ? `reason=${result.reason}` : '',
    result.status ? `status=${result.status}` : '',
    result.contentType ? `content-type=${result.contentType}` : '',
    Number.isFinite(result.bytes) ? `bytes=${result.bytes}` : '',
    result.detail ? `detail=${result.detail}` : '',
    result.url,
  ].filter(Boolean);
  console.log(parts.join(' '));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = targetsFromArgs(args);
  if (targets.length === 0) throw new Error('No media URLs to verify.');

  const results = [];
  for (const target of targets) {
    const result = await verifyUrl(target, args);
    results.push(result);
    printResult(result);
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    console.error(`[buffer-media] ${failed.length}/${results.length} URL(s) failed verification. Do not create or retry Buffer posts for failed URLs.`);
    process.exit(1);
  }
  console.log(`[buffer-media] Verified ${results.length}/${results.length} URL(s).`);
}

try {
  await main();
} catch (error) {
  console.error(`[buffer-media] ${error.message}`);
  process.exit(1);
}
