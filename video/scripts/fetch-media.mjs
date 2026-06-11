/**
 * Fetches media for each segment: Pixabay video → Pexels video → Pixabay photo → Pexels photo.
 * Saves MP4 to public/videos/<slug>/segment-N.mp4 for video entries.
 * Saves JPG to public/photos/<slug>/segment-N.jpg for all entries (thumb for videos).
 * Writes out/<slug>/media.json and a backward-compat out/<slug>/photos.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get as httpsGet } from 'node:https';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = join(__dirname, '..');

function loadMediaQueries(slug) {
  const reelDataPath = join(videoDir, '..', 'public', 'blog', slug, 'reel-data.md');
  if (!existsSync(reelDataPath)) return {};
  const md = readFileSync(reelDataPath, 'utf8');
  const queries = {};
  const sectionMatch = md.match(/## (?:media_queries|pexels_queries)\n([\s\S]*?)(?=\n##|$)/);
  if (!sectionMatch) return queries;
  const lines = sectionMatch[1].split('\n');
  let seg = null;
  let prefer = 'video';
  for (const line of lines) {
    const segM = line.match(/^-\s+segment:\s*(\d+)/);
    const queryM = line.match(/^\s+query:\s*"(.+?)"/);
    const preferM = line.match(/^\s+prefer:\s*(\S+)/);
    if (segM) { seg = parseInt(segM[1], 10); prefer = 'video'; }
    if (preferM && seg !== null) prefer = preferM[1].toLowerCase();
    if (queryM && seg !== null) {
      queries[seg] = { query: queryM[1], prefer };
      seg = null;
    }
  }
  return queries;
}

function segmentKeywords(seg) {
  const text = seg.text ?? seg.title ?? '';
  return text.replace(/\d+%?/g, '').replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(' ') + ' silver';
}

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = httpsGet(url, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error(`Bad JSON: ${url}`)); } });
    });
    req.on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const follow = (u) => {
      httpsGet(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close(); return follow(res.headers.location);
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
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
  const mediaQueries = loadMediaQueries(slug);

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    const jpgDest = join(photoDir, `segment-${i}.jpg`);
    const mp4Dest = join(clipDir, `segment-${i}.mp4`);

    const hasVideo = existsSync(mp4Dest) && statSync(mp4Dest).size > 10240;
    const hasPhoto = existsSync(jpgDest) && statSync(jpgDest).size > 1024;
    if (hasVideo) {
      media[i] = { type: 'video', src: `videos/${slug}/segment-${i}.mp4`, thumb: hasPhoto ? `photos/${slug}/segment-${i}.jpg` : undefined, source: 'cached' };
      console.log(`  ↷  segment-${i} video exists — skipping`);
      continue;
    }
    if (hasPhoto) {
      media[i] = { type: 'photo', src: `photos/${slug}/segment-${i}.jpg`, source: 'cached' };
      console.log(`  ↷  segment-${i} photo exists — skipping`);
      continue;
    }

    if (!pexelsKey && !pixabayKey) continue;

    const qEntry = mediaQueries[i];
    const rawQuery = qEntry?.query ?? segmentKeywords(seg);
    const prefer = qEntry?.prefer ?? 'video';
    const skipVideo = ['chart', 'cta', 'question'].includes(seg.type) || prefer === 'photo';

    let fetched = false;

    if (!skipVideo && pixabayKey) {
      const ok = await fetchPixabayVideo(rawQuery, mp4Dest, usedVideoIds, pixabayKey);
      if (ok) {
        try { execSync(`ffmpeg -y -ss 1.5 -i "${mp4Dest}" -vframes 1 -q:v 2 "${jpgDest}" 2>/dev/null`); } catch {}
        media[i] = { type: 'video', src: `videos/${slug}/segment-${i}.mp4`, thumb: existsSync(jpgDest) ? `photos/${slug}/segment-${i}.jpg` : undefined, source: 'pixabay' };
        console.log(`  ✓ segment-${i} video (pixabay): "${rawQuery}"`);
        fetched = true;
      }
    }

    if (!fetched && !skipVideo && pexelsKey) {
      const ok = await fetchPexelsVideo(rawQuery, mp4Dest, usedVideoIds, pexelsKey);
      if (ok) {
        try { execSync(`ffmpeg -y -ss 1.5 -i "${mp4Dest}" -vframes 1 -q:v 2 "${jpgDest}" 2>/dev/null`); } catch {}
        media[i] = { type: 'video', src: `videos/${slug}/segment-${i}.mp4`, thumb: existsSync(jpgDest) ? `photos/${slug}/segment-${i}.jpg` : undefined, source: 'pexels' };
        console.log(`  ✓ segment-${i} video (pexels): "${rawQuery}"`);
        fetched = true;
      }
    }

    if (!fetched && pixabayKey) {
      const ok = await fetchPixabayPhoto(rawQuery, jpgDest, usedPhotoIds, pixabayKey);
      if (ok) {
        media[i] = { type: 'photo', src: `photos/${slug}/segment-${i}.jpg`, source: 'pixabay' };
        console.log(`  ✓ segment-${i} photo (pixabay): "${rawQuery}"`);
        fetched = true;
      }
    }

    if (!fetched && pexelsKey) {
      const ok = await fetchPexelsPhoto(rawQuery, jpgDest, usedPhotoIds, pexelsKey);
      if (ok) {
        media[i] = { type: 'photo', src: `photos/${slug}/segment-${i}.jpg`, source: 'pexels' };
        console.log(`  ✓ segment-${i} photo (pexels): "${rawQuery}"`);
      }
    }
  }

  writeFileSync(join(videoDir, 'out', slug, 'media.json'), JSON.stringify(media, null, 2));
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
