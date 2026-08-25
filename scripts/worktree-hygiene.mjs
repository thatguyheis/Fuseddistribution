import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, statSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PROTOCOL_RULES = [
  ['ada', /^(ops\/profit-system\/evolution\/|video\/scripts\/register-ada-generation\.mjs$)/],
  ['reel', /^(video\/|public\/reels(?:-x)?\/|scripts\/render-missing-reels\.sh$)/],
  ['blog', /^public\/blog\//],
  ['books', /^book-factory\//],
  ['operations', /^(ops\/|scripts\/|tests\/)/],
  ['site', /^public\//],
  ['docs', /^(docs\/|[^/]+(?:SOP|PLAN)[^/]*\.md$|AGENTS\.md$)/i],
  ['career', /^(deliverables\/|tools\/build_targeted_resume\.py$)/],
  ['repository', /^(\.github\/|\.githooks\/|\.gitignore$|package(?:-lock)?\.json$)/],
];

const FORBIDDEN_PATTERNS = [
  ['dependency-cache', /(^|\/)node_modules\//],
  ['local-environment', /(^|\/)\.env(?:\.|$)/],
  ['workflow-runtime', /^(\.workflow-state|\.workflow-blocked)\//],
  ['reel-media-cache', /^video\/public\/(?:photos|videos)\//],
  ['local-generated-library', /^video\/local\//],
  ['rendered-video', /^(?:video\/out|public\/reels(?:-x)?)\/.*\.mp4$/i],
  ['posting-staging', /^\.facebook-reels-staging\//],
  ['runtime-log', /(?:^|\/)(?:ffmpeg2pass-[^/]*|daily-blog-reel|\.qa-brain|server)\.log(?:\.|$)/],
  ['python-cache', /(?:^|\/)__pycache__\/|\.pyc$/],
];

function git(args) {
  const result = spawnSync('git', args, {cwd: projectDir, encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  return result.stdout;
}

function nullSeparated(output) {
  return output.split('\0').filter(Boolean);
}

export function classifyProtocol(filePath) {
  return PROTOCOL_RULES.find(([, pattern]) => pattern.test(filePath))?.[0] || 'unclassified';
}

export function forbiddenArtifact(filePath) {
  if (/(^|\/)\.env(?:\.cron)?\.example$/.test(filePath)) return null;
  const match = FORBIDDEN_PATTERNS.find(([, pattern]) => pattern.test(filePath));
  return match ? {path: filePath, reason: match[0]} : null;
}

export function groupProtocolFiles(files) {
  const groups = {};
  for (const filePath of files) {
    const tag = classifyProtocol(filePath);
    groups[tag] ??= [];
    groups[tag].push(filePath);
  }
  return groups;
}

export function recommendedCommitTags(groups) {
  return Object.keys(groups)
    .filter((tag) => tag !== 'repository' && groups[tag].length > 0)
    .sort();
}

function stagedFiles() {
  return nullSeparated(git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMRT']));
}

function dirtyFiles() {
  return [...new Set([
    ...nullSeparated(git(['diff', '--name-only', '-z', '--diff-filter=ACMRT'])),
    ...stagedFiles(),
    ...nullSeparated(git(['ls-files', '--others', '--exclude-standard', '-z'])),
  ])].sort();
}

function oversizedFiles(files, maxBytes) {
  return files.flatMap((filePath) => {
    const absolutePath = resolve(projectDir, filePath);
    if (!existsSync(absolutePath)) return [];
    const size = statSync(absolutePath).size;
    return size > maxBytes ? [{path: filePath, size, maxBytes}] : [];
  });
}

function writeReport(report) {
  const reportPath = resolve(projectDir, '.workflow-state', 'worktree-hygiene.json');
  mkdirSync(dirname(reportPath), {recursive: true});
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

export function buildHygieneReport({files, staged, maxFiles = 250, maxBytes = 25 * 1024 * 1024}) {
  const groups = groupProtocolFiles(files);
  const forbidden = files.map(forbiddenArtifact).filter(Boolean);
  const oversized = oversizedFiles(files, maxBytes);
  const tags = recommendedCommitTags(groups);
  const issues = [];
  if (forbidden.length > 0) issues.push(`${forbidden.length} generated or local artifact(s) must not enter Git`);
  if (oversized.length > 0) issues.push(`${oversized.length} file(s) exceed ${Math.round(maxBytes / 1048576)} MiB`);
  if (staged && files.length > maxFiles) issues.push(`${files.length} staged files exceed the ${maxFiles}-file review limit`);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: staged ? 'staged' : 'worktree',
    fileCount: files.length,
    protocolTags: tags,
    groups: Object.fromEntries(Object.entries(groups).map(([tag, paths]) => [tag, {count: paths.length, files: paths}])),
    forbidden,
    oversized,
    issues,
    clean: files.length === 0,
    approved: issues.length === 0,
  };
}

function printReport(report) {
  const labels = report.protocolTags.length > 0 ? report.protocolTags.join(', ') : 'none';
  console.log(`Worktree hygiene: ${report.mode} files=${report.fileCount} tags=${labels}`);
  for (const [tag, group] of Object.entries(report.groups)) console.log(`- ${tag}: ${group.count}`);
  for (const item of report.forbidden) console.error(`BLOCKED ${item.path}: ${item.reason}`);
  for (const item of report.oversized) console.error(`BLOCKED ${item.path}: ${(item.size / 1048576).toFixed(1)} MiB`);
  for (const issue of report.issues) console.error(`BLOCKED ${issue}`);
  if (report.clean) console.log('Worktree is clean.');
}

function main() {
  const args = new Set(process.argv.slice(2));
  const staged = args.has('--staged');
  const strict = args.has('--strict');
  const files = staged ? stagedFiles() : dirtyFiles();
  const maxFiles = Number.parseInt(process.env.WORKTREE_HYGIENE_MAX_STAGED_FILES || '250', 10);
  const maxMiB = Number.parseInt(process.env.WORKTREE_HYGIENE_MAX_FILE_MIB || '25', 10);
  const report = buildHygieneReport({files, staged, maxFiles, maxBytes: maxMiB * 1024 * 1024});
  if (!args.has('--quiet')) printReport(report);
  if (args.has('--write-report')) console.log(`Report: ${writeReport(report)}`);
  if (args.has('--json')) console.log(JSON.stringify(report, null, 2));
  if (strict && (!report.approved || (!staged && !report.clean))) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
