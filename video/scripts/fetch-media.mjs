/**
 * Fetches media for each segment: Pixabay video → Pexels video → Pixabay photo → Pexels photo.
 * Saves MP4 to public/videos/<slug>/segment-N.mp4 for video entries.
 * Saves JPG to public/photos/<slug>/segment-N.jpg for all entries (thumb for videos).
 * Writes out/<slug>/media.json and a backward-compat out/<slug>/photos.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream, statSync, unlinkSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get as httpsGet } from 'node:https';
import { execSync, spawnSync } from 'node:child_process';
import {
  enrichmentCacheKey,
  generativeMediaMode,
  generateEnrichmentStill,
  openGenerativeAiEnabled,
  selectBackgroundProfile,
} from './generative-enrichment.mjs';
import {
  backgroundTags,
  planGeneratedBackgrounds,
  registerGeneratedBackground,
  selectLibraryBackground,
  useLibraryBackground,
} from './generated-background-library.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = join(__dirname, '..');

export function parseMediaQueries(md) {
  const queries = {};
  const sectionMatch = md.match(/## (?:media_queries|pexels_queries)\n([\s\S]*?)(?=\n##|$)/);
  if (!sectionMatch) return queries;
  let seg = null;
  let prefer = 'video';
  let query = null;
  const flush = () => {
    if (seg !== null && query) queries[seg] = {query, prefer};
  };
  for (const line of sectionMatch[1].split('\n')) {
    const segM = line.match(/^-\s+segment:\s*(\d+)/);
    const queryM = line.match(/^\s+query:\s*"(.+?)"/);
    const preferM = line.match(/^\s+prefer:\s*(\S+)/);
    if (segM) {
      flush();
      seg = parseInt(segM[1], 10);
      prefer = 'video';
      query = null;
    }
    if (queryM && seg !== null) query = queryM[1];
    if (preferM && seg !== null) prefer = preferM[1].toLowerCase();
  }
  flush();
  return queries;
}

function loadReelData(slug) {
  const reelDataPath = join(videoDir, '..', 'public', 'blog', slug, 'reel-data.md');
  if (!existsSync(reelDataPath)) return {queries: {}, topic: 'tech'};
  const md = readFileSync(reelDataPath, 'utf8');
  const topic = md.match(/^topic:\s*(silver|tech)\s*$/m)?.[1] ?? 'tech';
  return {queries: parseMediaQueries(md), topic};
}

function segmentKeywords(seg, topic) {
  const text = seg.text ?? seg.title ?? '';
  return text.replace(/\d+%?/g, '').replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(' ') + (topic === 'silver' ? ' silver' : ' business');
}

function cleanStockQuery(value, fallback) {
  const cleaned = String(value ?? '')
    .replace(/[`"'{}[\]]/g, ' ')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 7)
    .join(' ');
  return cleaned.length >= 4 && cleaned.length <= 80 ? cleaned : fallback;
}

function refineMediaQueriesWithLocalLlm(slug, script, mediaQueries, topic) {
  if (process.env.HERMES_MEDIA_QUERY_LLM === '0') return {};
  const helper = process.env.LOCAL_LLM || '/Users/nick/bin/hermes-local.sh';
  if (!existsSync(helper)) return {};

  const items = script.segments.map((seg, index) => {
    const qEntry = mediaQueries[index];
    const fallback = qEntry?.query ?? segmentKeywords(seg, topic);
    return {index, type: seg.type, prefer: qEntry?.prefer ?? 'video', text: seg.text ?? seg.title ?? '', fallback};
  });
  const prompt = `Return only compact JSON mapping segment indexes to stock media search queries. Each query must be 2-6 plain English words, visual, concrete, safe for Pexels/Pixabay, no punctuation. Topic: ${topic}. Slug: ${slug}. Segments: ${JSON.stringify(items)}`;
  const result = spawnSync(helper, [prompt], {
    encoding: 'utf8',
    timeout: Number(process.env.HERMES_MEDIA_QUERY_TIMEOUT_MS || 20000),
    env: {
      ...process.env,
      HERMES_LOCAL_MAX_TOKENS: process.env.HERMES_MEDIA_QUERY_MAX_TOKENS || '180',
      HERMES_LOCAL_TIMEOUT: process.env.HERMES_MEDIA_QUERY_HTTP_TIMEOUT || '8',
    },
  });
  if (result.status !== 0 || !result.stdout?.trim()) {
    console.warn('  ⚠  local LLM media query refinement unavailable — using deterministic queries');
    return {};
  }

  try {
    const match = result.stdout.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no JSON object');
    const parsed = JSON.parse(match[0]);
    const refined = {};
    for (const item of items) {
      const value = parsed[item.index] ?? parsed[String(item.index)];
      if (value) refined[item.index] = cleanStockQuery(value, item.fallback);
    }
    if (Object.keys(refined).length > 0) console.log(`  ✓ local LLM refined ${Object.keys(refined).length} media querie(s)`);
    return refined;
  } catch {
    console.warn('  ⚠  local LLM media query output invalid — using deterministic queries');
    return {};
  }
}

export function mediaCacheKey(query, prefer, segmentType) {
  return JSON.stringify({query, prefer, segmentType});
}

function loadManifest(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {version: 1, segments: {}}; }
}

function setManifestSegment(manifest, index, key, details = {}) {
  manifest.segments[index] = {
    key,
    ...details,
    updatedAt: new Date().toISOString(),
  };
}

function cachedSource(manifest, index, fallback) {
  const source = manifest.segments?.[index]?.source;
  return source && source !== 'cached' ? source : fallback;
}

function validFile(path, minBytes) {
  try {
    return existsSync(path) && statSync(path).size > minBytes;
  } catch {
    return false;
  }
}

function photoSrc(slug, index) {
  return `photos/${slug}/segment-${index}.jpg`;
}

function videoSrc(slug, index) {
  return `videos/${slug}/segment-${index}.mp4`;
}

function listFallbackPhotoIndexes(photoDir, segmentCount) {
  const indexes = [];
  for (let i = 0; i < segmentCount; i++) {
    if (validFile(join(photoDir, `segment-${i}.jpg`), 1024)) indexes.push(i);
  }
  return indexes;
}

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = httpsGet(url, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error(`Bad JSON: ${url}`)); } });
    });
    req.on('error', reject);
    req.setTimeout(Number(process.env.MEDIA_FETCH_TIMEOUT_MS || 15000), () => {
      req.destroy(new Error(`Timed out fetching JSON: ${url}`));
    });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const follow = (u) => {
      const req = httpsGet(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close(); return follow(res.headers.location);
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(Number(process.env.MEDIA_FETCH_TIMEOUT_MS || 15000), () => {
        req.destroy(new Error(`Timed out downloading media: ${u}`));
      });
    };
    follow(url);
  });
}

async function fetchPixabayVideo(query, dest, usedIds, apiKey) {
  const q = encodeURIComponent(query);
  const url = `https://pixabay.com/api/videos/?key=${apiKey}&q=${q}&per_page=10&safesearch=true`;
  try {
    const data = await fetchJson(url, {});
    if (!data.hits?.length) return false;
    const hit = data.hits.find(v => !usedIds.has(v.id));
    if (!hit) return false;
    const small = hit.videos.small ?? hit.videos.medium ?? hit.videos.large;
    if (!small?.url) return false;
    await downloadFile(small.url, dest);
    if (!existsSync(dest) || statSync(dest).size < 10240) { try { unlinkSync(dest); } catch {} return false; }
    usedIds.add(hit.id);
    return true;
  } catch { return false; }
}

async function fetchPexelsVideo(query, dest, usedIds, apiKey) {
  const q = encodeURIComponent(query);
  const url = `https://api.pexels.com/videos/search?query=${q}&orientation=portrait&per_page=10&size=small`;
  try {
    const data = await fetchJson(url, { Authorization: apiKey });
    if (!data.videos?.length) return false;
    const video = data.videos.find(v => !usedIds.has(v.id));
    if (!video) return false;
    const files = video.video_files.filter(f => f.file_type === 'video/mp4');
    const file = files.sort((a, b) => (a.width ?? 999) - (b.width ?? 999))[0];
    if (!file) return false;
    await downloadFile(file.link, dest);
    if (!existsSync(dest) || statSync(dest).size < 10240) { try { unlinkSync(dest); } catch {} return false; }
    usedIds.add(video.id);
    return true;
  } catch { return false; }
}

async function fetchPixabayPhoto(query, dest, usedIds, apiKey) {
  const q = encodeURIComponent(query);
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${q}&image_type=photo&orientation=vertical&per_page=15&safesearch=true`;
  try {
    const data = await fetchJson(url, {});
    if (!data.hits?.length) return false;
    const hit = data.hits.find(p => !usedIds.has(p.id));
    if (!hit) return false;
    await downloadFile(hit.largeImageURL, dest);
    if (!existsSync(dest) || statSync(dest).size < 1024) { try { unlinkSync(dest); } catch {} return false; }
    usedIds.add(hit.id);
    return true;
  } catch { return false; }
}

async function fetchPexelsPhoto(query, dest, usedIds, apiKey) {
  const q = encodeURIComponent(query);
  const url = `https://api.pexels.com/v1/search?query=${q}&orientation=portrait&per_page=15&size=large`;
  try {
    const data = await fetchJson(url, { Authorization: apiKey });
    if (!data.photos?.length) return false;
    const photo = data.photos.find(p => !usedIds.has(p.id));
    if (!photo) return false;
    await downloadFile(photo.src.large2x ?? photo.src.large, dest);
    if (!existsSync(dest) || statSync(dest).size < 1024) { try { unlinkSync(dest); } catch {} return false; }
    usedIds.add(photo.id);
    return true;
  } catch { return false; }
}

export async function fetchMedia(slug) {
  const pexelsKey = process.env.PEXELS_API_KEY;
  const pixabayKey = process.env.PIXABAY_API_KEY;

  const scriptPath = join(videoDir, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) { console.error(`script.json not found: ${scriptPath}`); return {}; }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));

  const photoDir = join(videoDir, 'public', 'photos', slug);
  const clipDir = join(videoDir, 'public', 'videos', slug);
  mkdirSync(photoDir, { recursive: true });
  mkdirSync(clipDir, { recursive: true });

  const media = {};
  const usedVideoIds = new Set();
  const usedPhotoIds = new Set();
  const {queries: mediaQueries, topic} = loadReelData(slug);
  const refinedQueries = refineMediaQueriesWithLocalLlm(slug, script, mediaQueries, topic);
  const manifestPath = join(videoDir, 'out', slug, 'media-manifest.json');
  const manifest = loadManifest(manifestPath);
  manifest.segments ??= {};
  const generationMode = generativeMediaMode();
  const backgroundLimit = Math.max(0, Number.parseInt(process.env.GENERATIVE_MEDIA_MAX_SEGMENTS || '2', 10) || 0);
  const plannedBackgrounds = planGeneratedBackgrounds(script.segments);
  const generatedBackgroundPlan = {
    newIndex: backgroundLimit >= 1 ? plannedBackgrounds.newIndex : null,
    reuseIndex: backgroundLimit >= 2 ? plannedBackgrounds.reuseIndex : null,
  };
  let newLibraryAssetId = null;
  if (!pexelsKey && !pixabayKey) {
    console.warn('  ⚠  PEXELS_API_KEY and PIXABAY_API_KEY unset — using local copied media only');
  } else {
    console.log('  ✓ stock media API keys available — API fetch enabled for missing segments');
  }

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    const jpgDest = join(photoDir, `segment-${i}.jpg`);
    const mp4Dest = join(clipDir, `segment-${i}.mp4`);
    const qEntry = mediaQueries[i];
    const deterministicQuery = qEntry?.query ?? segmentKeywords(seg, topic);
    const rawQuery = refinedQueries[i] ?? deterministicQuery;
    const prefer = qEntry?.prefer ?? 'video';
    const skipVideo = ['chart', 'cta', 'question'].includes(seg.type) || prefer === 'photo';
    const cacheKey = mediaCacheKey(rawQuery, prefer, seg.type);
    const cacheValid = manifest.segments?.[i]?.key === cacheKey;

    if (openGenerativeAiEnabled() && i === generatedBackgroundPlan.newIndex) {
      manifest.generativeCandidates ??= {};
      const generatedKey = enrichmentCacheKey({slug, index: i, segment: seg, topic});
      const candidateDest = join(videoDir, 'out', slug, 'generative-candidates', `segment-${i}.jpg`);
      const renderedDest = generationMode === 'production' ? jpgDest : candidateDest;
      const generatedRecord = generationMode === 'production'
        ? manifest.segments?.[i]
        : manifest.generativeCandidates?.[i];
      const cachedGenerated = generatedRecord?.key === generatedKey
        && generatedRecord?.source === 'open-generative-ai-local'
        && validFile(renderedDest, 10240);
      if (cachedGenerated) {
        if (generationMode === 'production') {
          const profile = selectBackgroundProfile({segment: seg, topic});
          const libraryAsset = registerGeneratedBackground({
            filePath: jpgDest,
            metadata: {
              topic,
              sceneId: generatedRecord.sceneId || profile.id,
              tags: generatedRecord.tags || backgroundTags({segment: seg, topic, sceneId: profile.id}),
              promptHash: generatedRecord.promptHash,
              seed: generatedRecord.seed,
              model: generatedRecord.model,
              modelLicense: generatedRecord.modelLicense,
              backgroundTreatment: generatedRecord.backgroundTreatment,
            },
            slug,
            segmentIndex: i,
          });
          newLibraryAssetId = libraryAsset.id;
          generatedRecord.libraryAssetId = libraryAsset.id;
          generatedRecord.tags = libraryAsset.tags;
          media[i] = {type: 'photo', src: photoSrc(slug, i), source: 'open-generative-ai-local'};
          console.log(`  ↷  segment-${i} generated hook exists - using cached Open Generative AI asset`);
          continue;
        }
        console.log(`  ↷  segment-${i} generated hook candidate exists - shadow asset remains outside render inputs`);
      }

      try {
        if (cachedGenerated) throw new Error('shadow candidate already cached');
        const generation = await generateEnrichmentStill({
          slug,
          index: i,
          segment: seg,
          topic,
          // Always stage outside Remotion inputs. Production promotion happens
          // only after provenance and model-license checks pass.
          destination: candidateDest,
        });
        if (generationMode === 'production' && generation.modelLicense === 'unverified') {
          throw new Error('custom model license is unverified; set OPEN_GENERATIVE_AI_MODEL_LICENSE after review');
        }
        const tags = backgroundTags({segment: seg, topic, sceneId: generation.sceneId});
        const generationRecord = {
          key: generatedKey,
          ...generation,
          tags,
          query: rawQuery,
          prefer: 'photo',
          attempts: ['open-generative-ai-local'],
          path: generationMode === 'production'
            ? photoSrc(slug, i)
            : `out/${slug}/generative-candidates/segment-${i}.jpg`,
          status: generationMode === 'production' ? 'approved-for-render' : 'pending-visual-review',
          updatedAt: new Date().toISOString(),
        };
        if (generationMode === 'production') {
          const libraryAsset = registerGeneratedBackground({
            filePath: candidateDest,
            metadata: {...generation, tags},
            slug,
            segmentIndex: i,
          });
          if (libraryAsset.duplicate) {
            throw new Error(`generated background duplicates library asset ${libraryAsset.id}`);
          }
          renameSync(candidateDest, jpgDest);
          newLibraryAssetId = libraryAsset.id;
          generationRecord.libraryAssetId = libraryAsset.id;
          media[i] = {type: 'photo', src: photoSrc(slug, i), source: generation.source};
          manifest.segments[i] = generationRecord;
          console.log(`  ✓ segment-${i} generated hook: Open Generative AI local ${generation.model}`);
          continue;
        }
        manifest.generativeCandidates[i] = generationRecord;
        console.log(`  ◌ segment-${i} generated shadow candidate - normal media fallback remains active`);
      } catch (error) {
        if (error.message !== 'shadow candidate already cached') {
          console.warn(`  ⚠  Open Generative AI hook generation unavailable - using normal media fallback: ${error.message}`);
        }
      }
    }

    if (openGenerativeAiEnabled()
      && generationMode === 'production'
      && i === generatedBackgroundPlan.reuseIndex) {
      const profile = selectBackgroundProfile({segment: seg, topic});
      const tags = backgroundTags({segment: seg, topic, sceneId: profile.id});
      const libraryKey = JSON.stringify({
        profileVersion: 1,
        provider: 'fused-generated-background-library',
        topic,
        sceneId: profile.id,
        tags,
      });
      const cachedLibraryRecord = manifest.segments?.[i];
      if (cachedLibraryRecord?.key === libraryKey
        && cachedLibraryRecord?.source === 'fused-generated-background-library'
        && validFile(jpgDest, 10240)) {
        media[i] = {type: 'photo', src: photoSrc(slug, i), source: 'fused-generated-background-library'};
        console.log(`  ↷  segment-${i} tagged Fused background exists - using cached library asset`);
        continue;
      }

      const libraryAsset = selectLibraryBackground({
        topic,
        sceneId: profile.id,
        tags,
        excludeIds: [newLibraryAssetId],
      });
      if (libraryAsset) {
        try {
          useLibraryBackground({asset: libraryAsset, destination: jpgDest, slug, segmentIndex: i});
          media[i] = {type: 'photo', src: photoSrc(slug, i), source: 'fused-generated-background-library'};
          manifest.segments[i] = {
            key: libraryKey,
            source: 'fused-generated-background-library',
            libraryAssetId: libraryAsset.id,
            topic: libraryAsset.topic,
            sceneId: libraryAsset.sceneId,
            tags: libraryAsset.tags,
            sha256: libraryAsset.sha256,
            sourceSlug: libraryAsset.sourceSlug,
            status: libraryAsset.status,
            query: rawQuery,
            prefer: 'photo',
            attempts: ['fused-generated-background-library'],
            path: photoSrc(slug, i),
            updatedAt: new Date().toISOString(),
          };
          console.log(`  ✓ segment-${i} tagged Fused background: ${libraryAsset.id}`);
          continue;
        } catch (error) {
          console.warn(`  ⚠  Fused background library unavailable - using normal media fallback: ${error.message}`);
        }
      } else {
        console.log(`  ◌ segment-${i} no prior matching Fused background - normal media fallback remains active`);
      }
    }

    const hasVideo = validFile(mp4Dest, 10240);
    const hasPhoto = validFile(jpgDest, 1024);
    if (hasVideo && !skipVideo) {
      const source = cacheValid ? cachedSource(manifest, i, 'local-video') : 'local-video';
      media[i] = { type: 'video', src: videoSrc(slug, i), thumb: hasPhoto ? photoSrc(slug, i) : undefined, source };
      setManifestSegment(manifest, i, cacheKey, {source: media[i].source, query: rawQuery, prefer});
      console.log(`  ↷  segment-${i} video exists — using local file${cacheValid ? '' : ' (cache refreshed)'}`);
      continue;
    }
    if (hasPhoto) {
      const source = cacheValid ? cachedSource(manifest, i, 'local-photo') : 'local-photo';
      media[i] = { type: 'photo', src: photoSrc(slug, i), source };
      setManifestSegment(manifest, i, cacheKey, {source: media[i].source, query: rawQuery, prefer});
      console.log(`  ↷  segment-${i} photo exists — using local file${cacheValid ? '' : ' (cache refreshed)'}`);
      continue;
    }

    let fetched = false;
    const attempts = [];

    if (!skipVideo && pixabayKey) {
      attempts.push('pixabay-video');
      const ok = await fetchPixabayVideo(rawQuery, mp4Dest, usedVideoIds, pixabayKey);
      if (ok) {
        try { execSync(`ffmpeg -y -ss 1.5 -i "${mp4Dest}" -vframes 1 -q:v 2 "${jpgDest}" 2>/dev/null`); } catch {}
        media[i] = { type: 'video', src: videoSrc(slug, i), thumb: validFile(jpgDest, 1024) ? photoSrc(slug, i) : undefined, source: 'pixabay' };
        console.log(`  ✓ segment-${i} video (pixabay): "${rawQuery}"`);
        setManifestSegment(manifest, i, cacheKey, {source: 'pixabay-video', query: rawQuery, prefer, attempts});
        fetched = true;
      }
    }

    if (!fetched && !skipVideo && pexelsKey) {
      attempts.push('pexels-video');
      const ok = await fetchPexelsVideo(rawQuery, mp4Dest, usedVideoIds, pexelsKey);
      if (ok) {
        try { execSync(`ffmpeg -y -ss 1.5 -i "${mp4Dest}" -vframes 1 -q:v 2 "${jpgDest}" 2>/dev/null`); } catch {}
        media[i] = { type: 'video', src: videoSrc(slug, i), thumb: validFile(jpgDest, 1024) ? photoSrc(slug, i) : undefined, source: 'pexels' };
        console.log(`  ✓ segment-${i} video (pexels): "${rawQuery}"`);
        setManifestSegment(manifest, i, cacheKey, {source: 'pexels-video', query: rawQuery, prefer, attempts});
        fetched = true;
      }
    }

    if (!fetched && pixabayKey) {
      attempts.push('pixabay-photo');
      const ok = await fetchPixabayPhoto(rawQuery, jpgDest, usedPhotoIds, pixabayKey);
      if (ok) {
        media[i] = { type: 'photo', src: photoSrc(slug, i), source: 'pixabay' };
        console.log(`  ✓ segment-${i} photo (pixabay): "${rawQuery}"`);
        setManifestSegment(manifest, i, cacheKey, {source: 'pixabay-photo', query: rawQuery, prefer, attempts});
        fetched = true;
      }
    }

    if (!fetched && pexelsKey) {
      attempts.push('pexels-photo');
      const ok = await fetchPexelsPhoto(rawQuery, jpgDest, usedPhotoIds, pexelsKey);
      if (ok) {
        media[i] = { type: 'photo', src: photoSrc(slug, i), source: 'pexels' };
        console.log(`  ✓ segment-${i} photo (pexels): "${rawQuery}"`);
        setManifestSegment(manifest, i, cacheKey, {source: 'pexels-photo', query: rawQuery, prefer, attempts});
        fetched = true;
      }
    }

    if (!fetched) {
      const fallbackIndexes = listFallbackPhotoIndexes(photoDir, script.segments.length);
      if (fallbackIndexes.length > 0) {
        const fallbackIndex = fallbackIndexes[i % fallbackIndexes.length];
        media[i] = { type: 'photo', src: photoSrc(slug, fallbackIndex), source: 'local-fallback' };
        setManifestSegment(manifest, i, cacheKey, {source: 'local-fallback', query: rawQuery, prefer, fallback: fallbackIndex, attempts});
        const attemptSummary = attempts.length > 0 ? ` after ${attempts.join(', ')}` : '';
        console.log(`  ↷  segment-${i} media fallback${attemptSummary} -> segment-${fallbackIndex}.jpg`);
      } else {
        console.warn(`  ⚠  segment-${i} has no media: "${rawQuery}"`);
      }
    }
  }

  writeFileSync(join(videoDir, 'out', slug, 'media.json'), JSON.stringify(media, null, 2));
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const photosCompat = {};
  for (const [k, v] of Object.entries(media)) {
    photosCompat[k] = v.thumb ?? v.src;
  }
  writeFileSync(join(videoDir, 'out', slug, 'photos.json'), JSON.stringify(photosCompat, null, 2));
  return media;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const postArg = process.argv.find(a => a.startsWith('--post='));
  if (!postArg) { console.error('Usage: node fetch-media.mjs --post=<slug>'); process.exit(1); }
  const slug = postArg.replace('--post=', '');
  console.log(`\nFetching media for: ${slug}\n`);
  fetchMedia(slug).then(m => console.log(`\nDone. ${Object.keys(m).length} segment(s).`));
}
