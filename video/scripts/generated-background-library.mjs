import {createHash} from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const videoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG_PATTERNS = [
  ['coins', /coin|bullion|bar|stack|vault|safe|storage|estate|inherit|collect/],
  ['mining', /mine|mining|mineral|supply|deficit|shortage/],
  ['warehouse', /comex|inventory|warehouse|delivery/],
  ['industrial', /solar|electric vehicle|industrial|manufactur|electronics/],
  ['investing', /price|market|dollar cost|average|portfolio|invest|premium|spot/],
  ['communication', /email|social|message|sms|communication|customer service|follow.?up/],
  ['local-search', /seo|google|map|review|local|search|listing/],
  ['automation', /automation|artificial intelligence|\bai\b|workflow|repetitive/],
  ['data', /website|analytics|data|speed|conversion|online/],
  ['scheduling', /booking|appointment|schedule|calendar/],
];

export function backgroundLibraryPaths(env = process.env) {
  const root = resolve(env.GENERATIVE_MEDIA_LIBRARY_DIR || join(videoDir, 'local', 'generated-backgrounds'));
  return {root, assetsDir: join(root, 'assets'), catalogPath: join(root, 'catalog.json')};
}

export function backgroundTags({segment, topic, sceneId}) {
  const text = `${segment?.text || ''} ${segment?.title || ''} ${sceneId || ''}`.toLowerCase();
  const tags = new Set([String(topic || 'tech').toLowerCase(), String(sceneId || 'general').toLowerCase()]);
  for (const [tag, pattern] of TAG_PATTERNS) if (pattern.test(text)) tags.add(tag);
  return [...tags].sort();
}

export function loadBackgroundCatalog(env = process.env) {
  const {catalogPath} = backgroundLibraryPaths(env);
  if (!existsSync(catalogPath)) return {version: 1, assets: [], usageHistory: []};
  try {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    return {
      version: 1,
      assets: Array.isArray(catalog.assets) ? catalog.assets : [],
      usageHistory: Array.isArray(catalog.usageHistory) ? catalog.usageHistory : [],
    };
  } catch {
    return {version: 1, assets: [], usageHistory: []};
  }
}

function saveBackgroundCatalog(catalog, env = process.env) {
  const {root, assetsDir, catalogPath} = backgroundLibraryPaths(env);
  mkdirSync(root, {recursive: true});
  mkdirSync(assetsDir, {recursive: true});
  const temporaryPath = `${catalogPath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`);
  renameSync(temporaryPath, catalogPath);
}

function fileHash(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

export function registerGeneratedBackground({filePath, metadata, slug, segmentIndex}, env = process.env) {
  if (!existsSync(filePath) || statSync(filePath).size < 10240) {
    throw new Error(`generated background is missing or undersized: ${filePath}`);
  }
  const catalog = loadBackgroundCatalog(env);
  const sha256 = fileHash(filePath);
  const existing = catalog.assets.find((asset) => asset.sha256 === sha256);
  if (existing) return {...existing, duplicate: true};

  const id = `fused-bg-${sha256.slice(0, 16)}`;
  const {assetsDir} = backgroundLibraryPaths(env);
  mkdirSync(assetsDir, {recursive: true});
  const filename = `${id}.jpg`;
  copyFileSync(filePath, join(assetsDir, filename));
  const createdAt = new Date().toISOString();
  const asset = {
    id,
    filename,
    sha256,
    topic: metadata.topic,
    sceneId: metadata.sceneId,
    tags: metadata.tags,
    sourceSlug: slug,
    sourceSegment: segmentIndex,
    promptHash: metadata.promptHash,
    seed: metadata.seed,
    model: metadata.model,
    modelLicense: metadata.modelLicense,
    backgroundTreatment: metadata.backgroundTreatment,
    status: 'approved-background-only',
    createdAt,
    lastUsedAt: null,
    useCount: 0,
  };
  catalog.assets.push(asset);
  saveBackgroundCatalog(catalog, env);
  return {...asset, duplicate: false};
}

function tagOverlap(assetTags, requestedTags) {
  const requested = new Set(requestedTags);
  return assetTags.filter((tag) => requested.has(tag)).length;
}

export function rankLibraryBackgrounds({assets, usageHistory = [], topic, sceneId, tags, excludeIds = []}) {
  const excluded = new Set(excludeIds.filter(Boolean));
  const recentIds = new Set(usageHistory.slice(-4).map((entry) => entry.assetId));
  return assets.filter((asset) =>
    asset.status === 'approved-background-only'
    && asset.topic === topic
    && !excluded.has(asset.id)
  )
    .map((asset) => ({
      asset,
      score: (asset.topic === topic ? 8 : 0)
        + (asset.sceneId === sceneId ? 12 : 0)
        + (tagOverlap(asset.tags || [], tags) * 3)
        - (recentIds.has(asset.id) ? 100 : 0)
        - Math.min(Number(asset.useCount || 0), 5),
    }))
    .sort((left, right) =>
      right.score - left.score
      || Number(left.asset.useCount || 0) - Number(right.asset.useCount || 0)
      || String(left.asset.lastUsedAt || '').localeCompare(String(right.asset.lastUsedAt || ''))
      || left.asset.id.localeCompare(right.asset.id)
    )
    .map(({asset}) => asset);
}

export function selectLibraryBackground({topic, sceneId, tags, excludeIds = []}, env = process.env) {
  const catalog = loadBackgroundCatalog(env);
  const assetsDir = backgroundLibraryPaths(env).assetsDir;
  return rankLibraryBackgrounds({
    assets: catalog.assets.filter((asset) => existsSync(join(assetsDir, asset.filename))),
    usageHistory: catalog.usageHistory,
    topic,
    sceneId,
    tags,
    excludeIds,
  })[0] || null;
}

export function useLibraryBackground({asset, destination, slug, segmentIndex}, env = process.env) {
  const paths = backgroundLibraryPaths(env);
  const source = join(paths.assetsDir, asset.filename);
  if (!existsSync(source)) throw new Error(`library background file is missing: ${source}`);
  mkdirSync(dirname(destination), {recursive: true});
  copyFileSync(source, destination);

  const catalog = loadBackgroundCatalog(env);
  const stored = catalog.assets.find((entry) => entry.id === asset.id);
  if (!stored) throw new Error(`library background catalog entry is missing: ${asset.id}`);
  const usedAt = new Date().toISOString();
  stored.useCount = Number(stored.useCount || 0) + 1;
  stored.lastUsedAt = usedAt;
  catalog.usageHistory.push({assetId: asset.id, slug, segmentIndex, usedAt});
  catalog.usageHistory = catalog.usageHistory.slice(-100);
  saveBackgroundCatalog(catalog, env);
  return source;
}

export function planGeneratedBackgrounds(segments) {
  const newIndex = segments.findIndex((segment) => segment.type === 'hook');
  const effectiveNewIndex = newIndex >= 0 ? newIndex : segments.findIndex((segment) => ['overlay', 'stat'].includes(segment.type));
  const reuseIndex = segments.findIndex((segment, index) =>
    index !== effectiveNewIndex && ['overlay', 'stat'].includes(segment.type)
  );
  return {
    newIndex: effectiveNewIndex >= 0 ? effectiveNewIndex : null,
    reuseIndex: reuseIndex >= 0 ? reuseIndex : null,
  };
}
