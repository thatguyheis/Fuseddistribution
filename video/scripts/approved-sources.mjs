import {assertOwnerHook, approvedOwnerHook} from './lib/owner-hook.mjs';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attentionReviewErrors } from './attention-review.mjs';
import { parseReelScript } from './parse-script.mjs';
import { validateEnrichmentPlan, prepareEnrichment } from './production-enrichment.mjs';
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
  if (approvedOwnerHook(root, slug)) {
    const source = readFileSync(join(directory,'reel-script.md'),'utf8');
    const hook = parseReelScript(source,slug,readFileSync(join(directory,'reel-data.md'),'utf8')).segments[0];
    const attention = JSON.parse(readFileSync(join(directory,'attention-review.json'),'utf8'));
    assertOwnerHook(root,slug,hook?.narration,hook?.text);
    assertOwnerHook(root,slug,attention.hook?.spokenText,attention.hook?.visibleText);
    assertOwnerHook(root,slug,qa.hook?.spokenText,qa.hook?.visibleText);
  }
  const artifacts = [...required, ...(existsSync(join(directory,'enrichment-plan.json')) ? ['enrichment-plan.json'] : []), ...(existsSync(join(directory,'caption-corrections.json')) ? ['caption-corrections.json'] : [])];
  for (const name of artifacts) {
    const digest = createHash('sha256').update(readFileSync(join(directory,name))).digest('hex');
    if (qa.artifactSha256?.[name] !== digest) throw new Error(`Approved source changed: ${slug}/${name}; editorial review required`);
  }
  const enrichmentPath = join(directory, 'enrichment-plan.json');
  if (existsSync(enrichmentPath)) {
    const reelScript = readFileSync(join(directory, 'reel-script.md'), 'utf8');
    const reelDataPath = join(directory, 'reel-data.md');
    const reelData = existsSync(reelDataPath) ? readFileSync(reelDataPath, 'utf8') : null;
    const parsedScript = parseReelScript(reelScript, slug, reelData);
    validateEnrichmentPlan(JSON.parse(readFileSync(enrichmentPath, 'utf8')), parsedScript.segments.length);
    // Verify rights, hashes and the exact audible excerpts before consuming a render attempt.
    prepareEnrichment(root, slug, parsedScript.segments.length);
  }
  const presentationPath=join(directory,'presentation-plan.json');
  if(existsSync(presentationPath)) {
    const bytes=readFileSync(presentationPath);
    if(qa.artifactSha256?.['presentation-plan.json']!==createHash('sha256').update(bytes).digest('hex'))throw Error('Presentation plan changed after editorial approval');
    const plan=JSON.parse(bytes);
    const parsed=parseReelScript(readFileSync(join(directory,'reel-script.md'),'utf8'),slug,readFileSync(join(directory,'reel-data.md'),'utf8'));
    if(!Array.isArray(plan.segments)||plan.segments.length!==parsed.segments.length)throw Error('Presentation must cover every narration segment before handoff');
    if(plan.profile==='business-growth-v1')for(const shots of plan.segments) {
      if(!Array.isArray(shots)||!shots.length)throw Error('Presentation scene has no approved artwork');
      for(const shot of shots) {
        const asset=realpathSync(resolve(root,shot.path));
        if(!asset.startsWith(realpathSync(directory)+sep)||shot.sha256!==createHash('sha256').update(readFileSync(asset)).digest('hex'))throw Error('Presentation asset changed or escaped its approved package');
      }
    }
  }
  if (qa.attentionOptimizationVersion === 1) {
    const attentionPath = join(directory, 'attention-review.json');
    if (!existsSync(attentionPath)) throw new Error(`Missing attention review: ${slug}/attention-review.json`);
    const attentionBytes = readFileSync(attentionPath);
    const attentionHash = createHash('sha256').update(attentionBytes).digest('hex');
    if (qa.artifactSha256?.['attention-review.json'] !== attentionHash) {
      throw new Error(`Approved attention review changed: ${slug}/attention-review.json`);
    }
    const attention = JSON.parse(attentionBytes);
    const scriptText = readFileSync(join(directory, 'reel-script.md'), 'utf8');
    const errors = attentionReviewErrors(attention, scriptText);
    if (errors.length) throw new Error(`Attention review failed for ${slug}: ${errors.join('; ')}`);
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
