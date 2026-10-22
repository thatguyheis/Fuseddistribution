#!/usr/bin/env node
// Publish reviewed blog deltas against the last reviewed production snapshot.
// Never upload the shared, dirty public tree as an incidental blog deployment.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { newestFirst } from '../public/blog/scripts/lib/post-order.mjs';
import { assertEditorialDeployment } from './lib/editorial-deployment-gate.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const baseline = join(root, '.workflow-state/deployment-baseline');
const args = process.argv.slice(2);
const slug = args.find(arg => arg.startsWith('--slug='))?.slice(7);
if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Invalid slug');
if (!existsSync(join(baseline, 'wrangler.jsonc'))) throw new Error('Reviewed deployment baseline missing; owner must restore it');
function run(command, argv, cwd = root, env = process.env) {
  const result = spawnSync(command, argv, { cwd, stdio: 'inherit', env });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}
if (slug) {
  if (existsSync(join(root, '.workflow-state/editorial-holds', `${slug}.json`))) {
    throw new Error(`${slug}: active owner editorial hold`);
  }
  const source = join(root, 'public/blog', slug);
  assertEditorialDeployment(source, slug);
  const publicationDate = JSON.parse(readFileSync(join(source, 'meta.json'), 'utf8')).date;
  const operatingDate = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Los_Angeles'}).format(new Date());
  if (publicationDate > operatingDate) throw new Error(`${slug}: future approved package is not due for deployment`);
  run(process.execPath, ['public/blog/scripts/qa-local.mjs', `--slug=${slug}`, `--out=/tmp/fused-deploy-qa-${slug}.json`]);
  const postsPath = join(baseline, 'public/blog/posts.json');
  const baselinePosts = JSON.parse(readFileSync(postsPath, 'utf8'));
  const entry = JSON.parse(readFileSync(join(root, 'public/blog/posts.json'), 'utf8')).find(p => p.slug === slug);
  if (!entry) throw new Error(`${slug}: not registered`);
  const previous = baselinePosts.find(p => p.slug === slug);
  if (previous && previous.date !== entry.date) throw new Error(`${slug}: original publication date changed`);
  mkdirSync(join(baseline, 'public/blog', slug), { recursive: true });
  cpSync(source, join(baseline, 'public/blog', slug), { recursive: true });
  writeFileSync(postsPath, JSON.stringify(newestFirst([...baselinePosts.filter(p => p.slug !== slug), entry]), null, 2) + '\n');
  // A new, validated post may have been absent when the baseline was captured.
  const ignorePath = join(baseline, 'public/.assetsignore');
  const prefix = `/blog/${slug}/`;
  writeFileSync(ignorePath, readFileSync(ignorePath, 'utf8').split('\n').filter(line => !line.startsWith(prefix)).join('\n'));
  run(process.execPath, [join(baseline, 'public/blog/scripts/generate-sitemap.mjs')], baseline);
}
if (slug) cpSync(join(root, 'public/blog/index.html'), join(baseline, 'public/blog/index.html'));
// Scheduled owners use the same configured credential as the media uploader.
// Load only the deployment token, without executing or exporting the env file.
const deployEnv = { ...process.env };
const credentialPath = join(root, 'video/.env');
if (!deployEnv.CLOUDFLARE_API_TOKEN && existsSync(credentialPath)) {
  const token = parseEnv(readFileSync(credentialPath, 'utf8')).CLOUDFLARE_API_TOKEN;
  if (token) deployEnv.CLOUDFLARE_API_TOKEN = token;
}
run(join(root, 'node_modules/.bin/wrangler'), ['deploy', '--config', join(baseline, 'wrangler.jsonc'),
  ...(args.includes('--dry-run') ? ['--dry-run', '--outdir=/tmp/fused-approved-blog-dry-run'] : [])], root, deployEnv);
