import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as rl from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/performance.json');
const reportPath = join(__dirname, '../data/performance-report.md');

const arg = name => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : null;
};

const avg = values => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
const number = (value, name) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative number`);
  return parsed;
};
const rate = (value, denominator) => denominator > 0 ? Number((value / denominator).toFixed(4)) : null;

export function buildPerformanceEntry({ slug, platform, datePosted, metrics, meta = {} }) {
  if (!slug || !platform) throw new Error('post slug and platform are required');
  const views = number(metrics.views, 'views');
  if (views === null) throw new Error('views is required');
  const reach = number(metrics.reach, 'reach');
  const engagement = metrics.likes + metrics.shares + metrics.comments + metrics.saves;
  const denominator = reach || views;
  return {
    slug,
    datePosted: datePosted ?? new Date().toISOString().split('T')[0],
    platform,
    views,
    reach,
    likes: metrics.likes,
    shares: metrics.shares,
    dmShares: metrics.dmShares,
    saves: metrics.saves,
    comments: metrics.comments,
    profileVisits: metrics.profileVisits,
    linkClicks: metrics.linkClicks,
    follows: metrics.follows,
    watchTimePct: metrics.watchTimePct,
    avgWatchSeconds: metrics.avgWatchSeconds,
    completionPct: metrics.completionPct,
    engagementRate: rate(engagement, denominator),
    saveRate: rate(metrics.saves, denominator),
    sendRate: rate(metrics.shares + metrics.dmShares, denominator),
    hookType: meta.hookType ?? 'unknown',
    segmentCount: meta.segmentCount ?? 0,
    totalDuration: meta.renderedDuration ?? meta.totalDuration ?? meta.scriptDuration ?? 0,
    renderedDuration: meta.renderedDuration,
    musicTrack: meta.musicTrack ?? 'unknown',
  };
}

export function generateReport(records) {
  if (!records.length) return '# Performance Report\n\nNo data yet.\n';
  const byHook = {}, byDur = { '0-30s': [], '30-60s': [], '60s+': [] }, byMusic = {}, byPlatform = {};
  for (const record of records) {
    (byHook[record.hookType] ??= []).push(record.views);
    const duration = record.renderedDuration ?? record.totalDuration;
    (duration <= 30 ? byDur['0-30s'] : duration <= 60 ? byDur['30-60s'] : byDur['60s+']).push(record.views);
    (byMusic[record.musicTrack] ??= []).push(record.views);
    (byPlatform[record.platform] ??= []).push(record.views);
  }
  const top5 = [...records].sort((a, b) => b.views - a.views).slice(0, 5);
  let report = `# Performance Report\nGenerated: ${new Date().toISOString()}\nTotal reels: ${records.length}\n\n`;
  report += '## Top 5 by Views\n';
  top5.forEach(record => { report += `- **${record.slug}** (${record.platform}): ${record.views} views, ${record.likes} likes\n`; });
  report += '\n## Avg Views by Hook Type\n';
  Object.entries(byHook).forEach(([key, values]) => { report += `- **${key}**: ${avg(values)} avg (${values.length} reels)\n`; });
  report += '\n## Avg Views by Duration\n';
  Object.entries(byDur).filter(([, values]) => values.length).forEach(([key, values]) => { report += `- **${key}**: ${avg(values)} avg\n`; });
  report += '\n## Avg Views by Music Track\n';
  Object.entries(byMusic).forEach(([key, values]) => { report += `- **${key}**: ${avg(values)} avg\n`; });
  report += '\n## Avg Views by Platform\n';
  Object.entries(byPlatform).forEach(([key, values]) => { report += `- **${key}**: ${avg(values)} avg (${values.length} reels)\n`; });
  const measured = records.filter(record => record.reach > 0);
  if (measured.length) {
    report += '\n## Share and Save Signals\n';
    report += `- **Avg send rate**: ${(measured.reduce((sum, record) => sum + (record.sendRate ?? 0), 0) / measured.length * 100).toFixed(2)}%\n`;
    report += `- **Avg save rate**: ${(measured.reduce((sum, record) => sum + (record.saveRate ?? 0), 0) / measured.length * 100).toFixed(2)}%\n`;
  }
  return report;
}

function loadMeta(slug) {
  const path = join(__dirname, '../out', slug, 'render-meta.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
}

async function run() {
  let slug = arg('post');
  let platform = arg('platform');
  const fields = ['views', 'reach', 'likes', 'shares', 'dm_shares', 'saves', 'comments', 'profile_visits', 'link_clicks', 'follows', 'watchtime', 'avg_watch_seconds', 'completion_pct'];
  if (!slug || !platform || !arg('views')) {
    const iface = rl.createInterface({ input, output });
    slug ??= await iface.question('Post slug: ');
    platform ??= await iface.question('Platform: ');
    for (const field of fields) process.env[`FEEDBACK_${field.toUpperCase()}`] = await iface.question(`${field.replaceAll('_', ' ')} (blank if unknown): `);
    iface.close();
  }
  const value = field => arg(field) ?? process.env[`FEEDBACK_${field.toUpperCase()}`] ?? null;
  const metrics = {
    views: number(value('views'), 'views'), reach: number(value('reach'), 'reach'),
    likes: number(value('likes'), 'likes') ?? 0, shares: number(value('shares'), 'shares') ?? 0,
    dmShares: number(value('dm_shares'), 'dm_shares') ?? 0, saves: number(value('saves'), 'saves') ?? 0,
    comments: number(value('comments'), 'comments') ?? 0, profileVisits: number(value('profile_visits'), 'profile_visits') ?? 0,
    linkClicks: number(value('link_clicks'), 'link_clicks') ?? 0, follows: number(value('follows'), 'follows') ?? 0,
    watchTimePct: number(value('watchtime'), 'watchtime'), avgWatchSeconds: number(value('avg_watch_seconds'), 'avg_watch_seconds'),
    completionPct: number(value('completion_pct'), 'completion_pct'),
  };
  const entry = buildPerformanceEntry({ slug, platform, metrics, meta: loadMeta(slug) });
  const records = JSON.parse(readFileSync(dataPath, 'utf8'));
  records.push(entry);
  writeFileSync(dataPath, `${JSON.stringify(records, null, 2)}\n`);
  writeFileSync(reportPath, generateReport(records));
  console.log(`\n✓ Logged: ${entry.slug} — ${entry.views} views on ${entry.platform}`);
  console.log('  Report: video/data/performance-report.md\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(error => { console.error(`[feedback] ${error.message}`); process.exit(1); });
}
