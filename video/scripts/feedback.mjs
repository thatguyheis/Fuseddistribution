import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as rl from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/performance.json');
const reportPath = join(__dirname, '../data/performance-report.md');

const arg = name => {
  const a = process.argv.find(x => x.startsWith(`--${name}=`));
  return a ? a.replace(`--${name}=`, '') : null;
};

const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

function generateReport(records) {
  if (!records.length) return '# Performance Report\n\nNo data yet.\n';
  const byHook = {}, byDur = { '0-30s': [], '30-60s': [], '60s+': [] }, byMusic = {}, byPlatform = {};
  for (const r of records) {
    (byHook[r.hookType] ??= []).push(r.views);
    const duration = r.renderedDuration ?? r.totalDuration;
    (duration <= 30 ? byDur['0-30s'] : duration <= 60 ? byDur['30-60s'] : byDur['60s+']).push(r.views);
    (byMusic[r.musicTrack] ??= []).push(r.views);
    (byPlatform[r.platform] ??= []).push(r.views);
  }
  const top5 = [...records].sort((a, b) => b.views - a.views).slice(0, 5);
  let out = `# Performance Report\nGenerated: ${new Date().toISOString()}\nTotal reels: ${records.length}\n\n`;
  out += `## Top 5 by Views\n`;
  top5.forEach(r => { out += `- **${r.slug}** (${r.platform}): ${r.views} views, ${r.likes} likes\n`; });
  out += `\n## Avg Views by Hook Type\n`;
  Object.entries(byHook).forEach(([k, v]) => { out += `- **${k}**: ${avg(v)} avg (${v.length} reels)\n`; });
  out += `\n## Avg Views by Duration\n`;
  Object.entries(byDur).filter(([, v]) => v.length).forEach(([k, v]) => { out += `- **${k}**: ${avg(v)} avg\n`; });
  out += `\n## Avg Views by Music Track\n`;
  Object.entries(byMusic).forEach(([k, v]) => { out += `- **${k}**: ${avg(v)} avg\n`; });
  out += `\n## Avg Views by Platform\n`;
  Object.entries(byPlatform).forEach(([k, v]) => { out += `- **${k}**: ${avg(v)} avg (${v.length} reels)\n`; });
  return out;
}

async function loadMeta(slug) {
  const p = join(__dirname, '../out', slug, 'render-meta.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8'))
    : { hookType: 'unknown', segmentCount: 0, totalDuration: 0, musicTrack: 'unknown' };
}

async function run() {
  let slug = arg('post'), platform = arg('platform'), views = arg('views');
  let likes = arg('likes'), shares = arg('shares'), comments = arg('comments'), watchtime = arg('watchtime');

  if (!slug || !platform || !views) {
    const iface = rl.createInterface({ input, output });
    console.log('\n=== Log Reel Performance ===\n');
    slug ??= await iface.question('Post slug: ');
    platform ??= await iface.question('Platform (facebook/instagram/tiktok/youtube): ');
    views ??= await iface.question('Views: ');
    likes ??= await iface.question('Likes: ');
    shares ??= await iface.question('Shares: ');
    comments ??= await iface.question('Comments: ');
    watchtime ??= await iface.question('Watch time % (blank if unknown): ');
    iface.close();
  }

  const meta = await loadMeta(slug);
  const entry = {
    slug, datePosted: new Date().toISOString().split('T')[0], platform,
    views: parseInt(views, 10), likes: parseInt(likes ?? '0', 10),
    shares: parseInt(shares ?? '0', 10), comments: parseInt(comments ?? '0', 10),
    watchTimePct: watchtime ? parseInt(watchtime, 10) : null,
    hookType: meta.hookType, segmentCount: meta.segmentCount,
    totalDuration: meta.renderedDuration ?? meta.totalDuration ?? meta.scriptDuration,
    renderedDuration: meta.renderedDuration,
    musicTrack: meta.musicTrack,
  };

  const records = JSON.parse(readFileSync(dataPath, 'utf8'));
  records.push(entry);
  writeFileSync(dataPath, JSON.stringify(records, null, 2));
  writeFileSync(reportPath, generateReport(records));
  console.log(`\n✓ Logged: ${entry.slug} — ${entry.views} views on ${entry.platform}`);
  console.log(`  Report: video/data/performance-report.md\n`);
}

run();
