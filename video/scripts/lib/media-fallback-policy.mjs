import {existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

// The caller supplies a fresh per-attempt log, never the cumulative scheduler log.
export function recoverFailedSegment({root, slug, logPath, startedAt}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !Number.isFinite(startedAt)) return {recovered:false, reason:'invalid-input'};
  if (!existsSync(logPath) || statSync(logPath).mtimeMs < startedAt) return {recovered:false, reason:'stale-log'};
  const log = readFileSync(logPath,'utf8');
  const failures = [...log.matchAll(/delayRender\(\)[^\n]*<Html5Video\s*\/>[^\n]*src="\/public\/videos\/([a-z0-9-]+)\/segment-(\d+)\.mp4"[^\n]*not cleared after \d+ms/g)];
  if (failures.length !== 1 || failures[0][1] !== slug) return {recovered:false, reason:'unmatched-video-failure'};
  const segment = Number(failures[0][2]);
  const out = join(root,'video/out',slug);
  const dataPath = join(root,'public/blog',slug,'reel-data.md');
  const mediaPath = join(out,'media.json');
  const photo = join(root,'video/public/photos',slug,`segment-${segment}.jpg`);
  const proofDir = join(root,'.workflow-state/media-fallbacks',slug);
  if (existsSync(proofDir)) return {recovered:false, reason:'retry-already-used'};
  if (![photo,mediaPath,dataPath].every(existsSync)) return {recovered:false, reason:'missing-local-media'};
  const media = JSON.parse(readFileSync(mediaPath,'utf8'));
  if (media[segment]?.type !== 'video' || media[segment]?.src !== `videos/${slug}/segment-${segment}.mp4`) return {recovered:false, reason:'manifest-mismatch'};
  const bytes = readFileSync(photo);
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.length < 1000) return {recovered:false, reason:'invalid-photo'};
  const original = readFileSync(dataPath,'utf8');
  const section = original.match(/## (?:media_queries|pexels_queries)\n([\s\S]*?)(?=\n##|$)/);
  const block = `- segment: ${segment}\n  query: "${slug.replaceAll('-',' ')}"\n  prefer: photo\n`;
  // Put the exact override last in the existing section. The production parser's
  // last entry wins; unrelated queries and every narration byte remain intact.
  const updated = section ? original.replace(section[0],`${section[0].trimEnd()}\n${block}`) : `${original.trimEnd()}\n\n## media_queries\n${block}`;
  mkdirSync(proofDir,{recursive:true});
  copyFileSync(mediaPath,join(proofDir,'media.original.json'));
  copyFileSync(dataPath,join(proofDir,'reel-data.original.md'));
  copyFileSync(logPath,join(proofDir,'failure.log'));
  writeFileSync(join(proofDir,'proof.json'),JSON.stringify({slug,segment,startedAt,recordedAt:new Date().toISOString(),photoSha256:createHash('sha256').update(bytes).digest('hex'),originalMedia:media[segment],audioUnchanged:true,originalClipUnchanged:true},null,2)+'\n');
  writeFileSync(dataPath,updated);
  return {recovered:true,slug,segment,proofDir};
}
