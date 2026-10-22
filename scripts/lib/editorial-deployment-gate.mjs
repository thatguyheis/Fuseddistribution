import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertApprovedSources } from '../../video/scripts/approved-sources.mjs';

const reviewedFiles = ['verified.md', 'index.html', 'meta.json', 'research.json',
  'hero.jpg', 'photo-post.jpg', 'reel-script.md', 'reel-data.md', 'social-copy.json'];

export function assertEditorialDeployment(dir, slug) {
  const qa = JSON.parse(readFileSync(join(dir, 'qa.json'), 'utf8'));
  const automatedCoinApproval = qa.mode === 'coin-history-automated'
    && qa.automaticApproval?.policy === 'coin-history-auto-v1'
    && qa.automaticApproval?.transcriptHashVerified === true;
  if (automatedCoinApproval) {
    if (qa.slug !== slug || qa.pass !== true || qa.score < 85 || !Array.isArray(qa.blockers) || qa.blockers.length) {
      throw new Error(`${slug}: automated coin-history QA did not pass`);
    }
    assertApprovedSources(join(dir, '../../..'), slug);
    return;
  }
  if (qa.slug !== slug || qa.pass !== true || !Number.isFinite(qa.score) || qa.score < 85 ||
      qa.mode !== 'codex-editorial' || !Array.isArray(qa.blockers) || qa.blockers.length ||
      !Number.isFinite(Date.parse(qa.reviewed_at)) || !qa.review_notes?.length) {
    throw new Error(`${slug}: recorded owner editorial review is required`);
  }
  for (const file of reviewedFiles) {
    const hash = createHash('sha256').update(readFileSync(join(dir, file))).digest('hex');
    if (qa.artifactSha256?.[file] !== hash) {
      throw new Error(`${slug}: ${file} changed or lacks a reviewed hash; review before deployment`);
    }
  }
}
