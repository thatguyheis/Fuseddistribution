import {readFileSync, existsSync, mkdirSync, copyFileSync, writeFileSync, realpathSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {createHash} from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');

/** Stage reviewed owner layouts. Missing plans retain the normal media route. */
export function stageOwnedMedia(root, slug, segmentCount) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid owned-media slug');
  const directory = join(root, 'public/blog', slug);
  const planPath = join(directory, 'preferred-media.json');
  if (!existsSync(planPath)) return null;

  const bytes = readFileSync(planPath);
  const plan = JSON.parse(bytes);
  const qa = JSON.parse(readFileSync(join(directory, 'qa.json')));
  if (qa.artifactSha256?.['preferred-media.json'] !== hash(bytes)) {
    throw new Error('Preferred media plan needs current editorial approval');
  }
  if (!['fused-owned-coin-library', 'fused-verified-coin-evidence'].includes(plan.source) || !Array.isArray(plan.segments) || (plan.mode !== 'mixed' && plan.segments.length !== segmentCount)) {
    throw new Error('Owned media must cover every scene');
  }

  // Validate all inputs before copying any scene. Canonical paths reject symlink escapes.
  const allowedDirectory = realpathSync(directory) + sep;
  const seen = new Set();
  const prepared = plan.segments.map((item, position) => {
    const index = item.index;
    if (!Number.isInteger(index) || index < 0 || index >= segmentCount || seen.has(index) || (plan.mode !== 'mixed' && index !== position) || item.type !== 'photo' || item.reviewed !== true) {
      throw new Error('Unreviewed or unsupported owned scene');
    }
    seen.add(index);
    const path = realpathSync(resolve(root, item.path));
    if (!path.startsWith(allowedDirectory)) throw new Error('Owned scene must stay inside its article package');
    if (hash(readFileSync(path)) !== item.sha256) throw new Error('Owned scene changed after review');
    const cutaways = (item.cutaways || []).map(shot => {
      const shotPath = realpathSync(resolve(root, shot.path));
      if (!shotPath.startsWith(allowedDirectory) || hash(readFileSync(shotPath)) !== shot.sha256) {
        throw new Error('Owned cutaway escaped its article or changed after review');
      }
      return shotPath;
    });
    return {item, path, cutaways};
  });

  const destination = join(root, 'video/public/photos', slug);
  mkdirSync(destination, {recursive: true});
  const media = {}, photos = {}, segments = {};
  for (const {item, path, cutaways} of prepared) {
    const index = item.index;
    copyFileSync(path, join(destination, `segment-${index}.jpg`));
    const src = `photos/${slug}/segment-${index}.jpg`;
    const shots = cutaways.map((shotPath, n) => {
      const filename = `segment-${index}-cutaway-${n}.jpg`;
      copyFileSync(shotPath, join(destination, filename));
      return `photos/${slug}/${filename}`;
    });
    media[index] = {...(shots.length ? {shots: [src, ...shots]} : {}), type: 'photo', src, source: plan.source};
    photos[index] = src;
    segments[index] = {source: plan.source, sha256: item.sha256, assetIds: item.assetIds, role: item.role};
  }
  const output = join(root, 'video/out', slug);
  mkdirSync(output, {recursive: true});
  writeJson(join(output, 'media.json'), media);
  writeJson(join(output, 'photos.json'), photos);
  const manifestPath = join(output, 'media-manifest.json');
  const existingManifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  writeJson(manifestPath, {...existingManifest, slug, source: plan.source, preferredPlanSha256: hash(bytes), segments: {...existingManifest.segments, ...segments}});
  return media;
}

/** Add approved evidence cutaways after automatic supporting media selection. */
export function stageSupportingCutaways(root, slug, media) {
  const directory = join(root, 'public/blog', slug);
  const planPath = join(directory, 'preferred-media.json');
  if (!existsSync(planPath)) return media;
  const bytes = readFileSync(planPath), plan = JSON.parse(bytes);
  if (!plan.supportingCutaways?.length) return media;
  const qa = JSON.parse(readFileSync(join(directory, 'qa.json')));
  if (qa.artifactSha256?.['preferred-media.json'] !== hash(bytes)) throw new Error('Supporting cutaways need current approval');
  const allowed = realpathSync(directory) + sep;
  const seen = new Set();
  const prepared = plan.supportingCutaways.map(entry => {
    if (!Number.isInteger(entry.index) || !media[entry.index] || seen.has(entry.index) || !Array.isArray(entry.shots) || !entry.shots.length) throw new Error('Invalid supporting cutaway scene');
    seen.add(entry.index);
    const paths = entry.shots.map(shot => {
      const path = realpathSync(resolve(root, shot.path));
      if (!path.startsWith(allowed) || hash(readFileSync(path)) !== shot.sha256) throw new Error('Supporting cutaway escaped its article or changed after review');
      return path;
    });
    return {index: entry.index, paths};
  });
  const destination = join(root, 'video/public/photos', slug);
  mkdirSync(destination, {recursive:true});
  for (const {index, paths} of prepared) {
    media[index].evidenceCutaways = paths.map((path,n) => {
      const filename=`supporting-${index}-${n}.jpg`;
      copyFileSync(path,join(destination,filename));
      return `photos/${slug}/${filename}`;
    });
  }
  return media;
}
