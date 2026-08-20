import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const filesIn = (dir, name) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, dir, entry.name, name)))
  .map((entry) => entry.name);

const report = readJson('ops/profit-system/reports/2026-08-17.json');
const latest = readJson('ops/profit-system/latest.json');
const blogSlugs = filesIn('public/blog', '_status.json');
const blogStatuses = blogSlugs.map((slug) => ({ slug, ...readJson(`public/blog/${slug}/_status.json`) }));
const qaSlugs = filesIn('video/out', 'release-qa.json');
const releaseQa = qaSlugs.map((slug) => readJson(`video/out/${slug}/release-qa.json`));
const books = fs.readdirSync(path.join(root, 'book-factory/books'))
  .filter((file) => file.endsWith('.json'))
  .map((file) => readJson(`book-factory/books/${file}`))
  .sort((a, b) => a.scoring.rank - b.scoring.rank);
const evolution = readJson('ops/profit-system/evolution/generations/ADA-SILVER-INSTAGRAM-G001-V01.json');

const stageCount = (stage) => blogStatuses.filter((item) => item.stages?.includes(stage)).length;
const qaPending = releaseQa.filter((item) => !item.readyForPosting);
const blockedBlogs = blogStatuses.filter((item) => item.stages?.some((stage) => /fail|defer/.test(stage)));
const bookCounts = books.reduce((counts, book) => {
  counts[book.status] = (counts[book.status] || 0) + 1;
  return counts;
}, {});

const data = {
  generatedAt: new Date().toISOString(),
  operatingDate: report.date,
  summary: {
    attention: report.operationalState.reelRelease.manualCaptionReviewPendingSlugs.length + report.operationalState.blogPublication.blockedSlugs.length + Math.min(report.penalties.length, 3),
    healthy: 4,
    score: report.score,
    blogTotal: blogStatuses.length,
    blogComplete: stageCount('qa-brain-pass') + stageCount('qa-pass'),
    reelReady: releaseQa.filter((item) => item.readyForPosting).length,
    reelPending: qaPending.length,
  },
  report: {
    score: report.score,
    comparison: report.comparison.direction,
    penalties: report.penalties,
    improvements: report.improvementCandidates,
    generatedAt: report.generatedAt,
  },
  workflows: {
    blog: {
      expected: report.operationalState.blogPublication.expectedSlugs,
      registered: report.operationalState.blogPublication.registeredQueueSlugs,
      blocked: report.operationalState.blogPublication.blockedSlugs,
      pending: report.operationalState.blogPublication.pendingRemaining,
      complete: report.operationalState.blogPublication.completionStatus === 'complete',
      source: 'public/blog/*/_status.json + 2026-08-17 report',
    },
    reels: {
      ready: report.operationalState.reelRelease.readyForPostingSlugs,
      captionReview: report.operationalState.reelRelease.manualCaptionReviewPendingSlugs,
      qa: releaseQa,
      source: 'video/out/*/release-qa.json',
    },
    books: {
      counts: bookCounts,
      titles: books.map((book) => ({ slug: book.slug, title: book.adaptation?.workingTitle || book.source.title, status: book.status, rights: book.rights.us.status, rank: book.scoring.rank, score: book.scoring.totalScore })),
      source: 'book-factory/books/*.json',
    },
    profit: {
      status: report.completionStatus,
      score: report.score,
      comparison: report.comparison.direction,
      source: report.report || latest.report,
    },
    ada: {
      name: 'ADA evolution protocol',
      status: evolution.status,
      generation: `G${String(evolution.generation).padStart(3, '0')}`,
      variant: `V${String(evolution.variant).padStart(2, '0')}`,
      experiment: evolution.mutation ? `${evolution.mutation.from} → ${evolution.mutation.to}` : 'No mutation recorded',
      fitness: evolution.fitness,
      source: 'ops/profit-system/evolution/generations/ADA-SILVER-INSTAGRAM-G001-V01.json',
    },
    accessibility: {
      name: 'Accessibility & release checks',
      status: 'monitoring',
      checks: ['Captions reviewed', 'Alt text present', 'Readable contrast', 'No release blockers'],
      source: 'blog and reel release checkpoints',
    },
  },
  attention: [
    ...report.operationalState.reelRelease.manualCaptionReviewPendingSlugs.map((slug) => ({ severity: 'attention', type: 'Reel review', title: slug, detail: 'Manual three point caption review is required before posting.', source: 'video/out/*/release-qa.json' })),
    ...report.operationalState.blogPublication.blockedSlugs.map((slug) => ({ severity: 'blocked', type: 'Blog gate', title: slug, detail: 'Quality gate failed. Keep the artifact quarantined until repaired.', source: 'public/blog/*/_status.json + .workflow-blocked' })),
    ...report.penalties.slice(0, 3).map((penalty) => ({ severity: 'warning', type: penalty.type.replaceAll('_', ' '), title: penalty.type.replaceAll('_', ' '), detail: penalty.evidence, source: 'ops/profit-system/reports/2026-08-17.json' })),
  ],
  blogStatuses: blockedBlogs.slice(0, 24).map(({ slug, stages, ts }) => ({ slug, status: stages.at(-1), ts })),
};

fs.mkdirSync(path.join(publicRoot, 'admin'), { recursive: true });
fs.writeFileSync(path.join(publicRoot, 'admin/data.json'), `${JSON.stringify(data, null, 2)}\n`);
const dashboardFile = path.join(publicRoot, 'admin/index.html');
const dashboardHtml = fs.readFileSync(dashboardFile, 'utf8');
const inlineData = JSON.stringify(data).replaceAll('<', '\\u003c');
fs.writeFileSync(dashboardFile, dashboardHtml.replace('__ADMIN_DATA__', inlineData));
console.log(`Admin dashboard data written: ${data.attention.length} attention items, ${blogStatuses.length} blog statuses, ${releaseQa.length} reel QA records.`);
