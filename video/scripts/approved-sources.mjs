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
    if (inputs.coinMediaGateVersion === 1) {
      const mediaManifest = JSON.parse(readFileSync(join(directory, 'image-sources.json'), 'utf8'));
      const evidence = mediaManifest.assets?.filter(asset => asset.role === 'coin evidence') ?? [];
      const mediaReview = JSON.parse(readFileSync(join(work, 'coin-image-relevance.json'), 'utf8'));
      const claimMap = JSON.parse(readFileSync(join(work, 'claim-map.json'), 'utf8'));
      const claimIds = new Set((claimMap.claims || []).map(claim => claim.id));
      const preferredPath = join(directory, 'preferred-media.json');
      const preferredBytes = readFileSync(preferredPath);
      const preferred = JSON.parse(preferredBytes);
      const checks = mediaReview.reviews ?? [];
      if (!evidence.length || mediaReview.checkpoint !== 'package-intake-and-pre-render') {
        throw new Error(`Coin image relevance double check is incomplete: ${slug}`);
      }
      if (qa.artifactSha256?.['preferred-media.json'] !== createHash('sha256').update(preferredBytes).digest('hex')) {
        throw new Error(`Coin image scene map changed after editorial QA: ${slug}`);
      }
      if (!Array.isArray(preferred.segments) || !preferred.segments.length) throw new Error(`No coin evidence is mapped into reel beats: ${slug}`);
      for (const segment of preferred.segments) {
        if (segment.coinIdentity !== inputs.coinIdentity || !segment.role?.includes(inputs.coinIdentity)) {
          throw new Error(`Coin image scene is not tied to the episode identity: ${slug}`);
        }
        if ((segment.relatedClaimIds || []).some(id => !claimIds.has(id))) throw new Error(`Coin image scene references an unknown claim: ${slug}`);
        if (!evidence.some(asset => asset.path === segment.path.replace(`public/blog/${slug}/`, '') && asset.sha256 === segment.sha256)) {
          throw new Error(`Coin image scene does not match reviewed source evidence: ${slug}`);
        }
      }
      for (const asset of evidence) {
        const matching = checks.filter(check => check.imageSha256 === asset.sha256 && check.coinIdentity === inputs.coinIdentity);
        const intake = matching.find(check => check.checkpoint === 'package-intake');
        const render = matching.find(check => check.checkpoint === 'pre-render');
        if (!intake?.matchesCoin || Number(intake.confidence) < 0.85 || !render?.matchesCoin || Number(render.confidence) < 0.85) {
          throw new Error(`Coin image does not have passing intake and pre-render checks: ${slug}`);
        }
        if (asset.coinIdentity !== inputs.coinIdentity) throw new Error(`Coin image identity differs from episode: ${slug}`);
        const imagePath = join(directory, asset.path);
        if (createHash('sha256').update(readFileSync(imagePath)).digest('hex') !== asset.sha256) {
          throw new Error(`Coin image changed after relevance checks: ${slug}`);
        }
      }
      if (qa.coinImageReview?.matchesCoin !== true || qa.coinImageReview?.imagesChecked !== evidence.length) {
        throw new Error(`Editorial QA does not record the passing coin image review: ${slug}`);
      }
    }
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
