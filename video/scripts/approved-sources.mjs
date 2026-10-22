import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const required = ['verified.md','index.html','meta.json','research.json','hero.jpg','photo-post.jpg','reel-script.md','reel-data.md','social-copy.json'];
export function assertApprovedSources(root, slug) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid reel slug');
  const directory = join(root, 'public/blog', slug);
  const qa = JSON.parse(readFileSync(join(directory,'qa.json')));
  const automatedCoinApproval = qa.mode === 'coin-history-automated'
    && qa.automaticApproval?.policy === 'coin-history-auto-v1'
    && qa.automaticApproval?.transcriptHashVerified === true;
  if (!qa.pass || (!automatedCoinApproval && qa.mode !== 'codex-editorial') || qa.score < 85 || qa.blockers?.length) {
    throw new Error('Editorial approval required');
  }
  const artifacts = [...required, ...(existsSync(join(directory,'caption-corrections.json')) ? ['caption-corrections.json'] : [])];
  for (const name of artifacts) {
    const digest = createHash('sha256').update(readFileSync(join(directory,name))).digest('hex');
    if (qa.artifactSha256?.[name] !== digest) throw new Error(`Approved source changed: ${slug}/${name}; editorial review required`);
  }
  if (automatedCoinApproval) {
    const work = join(root, 'content', 'coin-history', slug);
    const inputs = JSON.parse(readFileSync(join(directory, 'production-inputs.json'), 'utf8'));
    const approval = JSON.parse(readFileSync(join(work, 'script-approval.json'), 'utf8'));
    const transcript = readFileSync(join(work, 'narration-v1-approved.txt'));
    const transcriptHash = createHash('sha256').update(transcript).digest('hex');
    if (approval.transcriptApproved !== true || approval.approvedTranscriptSha256 !== transcriptHash
      || inputs.transcriptSha256 !== transcriptHash) throw new Error(`Approved transcript changed: ${slug}`);
    for (const name of ['narration-v1-approved.txt', 'script-approval.json', 'claim-map.json']) {
      const path = join(work, name);
      const digest = createHash('sha256').update(readFileSync(path)).digest('hex');
      if (qa.artifactSha256?.[`content/coin-history/${slug}/${name}`] !== digest) {
        throw new Error(`Coin history source evidence changed: ${slug}/${name}`);
      }
    }
  }
  return qa.artifactSha256;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { assertApprovedSources(fileURLToPath(new URL('../..', import.meta.url)), process.argv[2]); }
  catch(error) { console.error(error.message);process.exitCode=1; }
}
