/**
 * Fetches one portrait photo per segment from Pexels API.
 * Tries Pexels video first (extracts a frame via ffmpeg) — richer content than stills.
 * Falls back to Pexels photo search if video fails.
 * Requires PEXELS_API_KEY env var. Skips silently if not set.
 * Photos saved to public/photos/<slug>/segment-N.jpg
 * Writes out/<slug>/photos.json with index → staticFile path mapping.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get as httpsGet } from 'node:https';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = join(__dirname, '..');

function loadReelDataQueries(slug) {
  const reelDataPath = join(videoDir, '..', 'public', 'blog', slug, 'reel-data.md');
  if (!existsSync(reelDataPath)) return {};
  const md = readFileSync(reelDataPath, 'utf8');
  const queries = {};
  const sectionMatch = md.match(/## pexels_queries\n([\s\S]*?)(?=\n##|$)/);
  if (!sectionMatch) return queries;
  const lines = sectionMatch[1].split('\n');
  let currentSegment = null;
  for (const line of lines) {
    const segMatch = line.match(/^-\s+segment:\s*(\d+)/);
    const queryMatch = line.match(/^\s+query:\s*"(.+?)"/);
    if (segMatch) currentSegment = parseInt(segMatch[1], 10);
    if (queryMatch && currentSegment !== null) {
      queries[currentSegment] = queryMatch[1];
      currentSegment = null;
    }
  }
  return queries;
}

function segmentKeywords(seg) {
  switch (seg.type) {
    case 'hook':    return extractKeywords(seg.text) + ' business';
    case 'overlay': return extractKeywords(seg.text) + ' local business';
    case 'stat':    return extractKeywords(seg.text) + ' business';
    case 'chart':   return seg.title ?? 'business research online';
    case 'cta':     return 'website business professional';
    default:        return 'business professional';
  }
}

function extractKeywords(text) {
  // Strip percentages, numbers, punctuation — keep meaningful words
  return text
    .replace(/\d+%?/g, '')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 4)
    .join(' ');
}

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = httpsGet(url, { headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Bad JSON from ${url}`)); }
      });
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
          res.destroy();
          follow(res.headers.location);
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    };
    follow(url);
  });
}

async function fetchVideoFrame(query, dest, usedVideoIds, apiKey) {
  const q = encodeURIComponent(query);
  const url = `https://api.pexels.com/videos/search?query=${q}&orientation=portrait&per_page=10&size=small`;
  try {
    const data = await fetchJson(url, { Authorization: apiKey });
    if (!data.videos?.length) return false;
    const video = data.videos.find(v => !usedVideoIds.has(v.id));
    if (!video) return false;

    // Pick smallest MP4 to minimize download time
    const files = video.video_files.filter(f => f.file_type === 'video/mp4');
    const file = files.sort((a, b) => (a.width ?? 999) - (b.width ?? 999))[0];
    if (!file) return false;

    const tmpMp4 = dest.replace(/\.jpg$/, '_tmp.mp4');
    await downloadFile(file.link, tmpMp4);
    if (!existsSync(tmpMp4) || statSync(tmpMp4).size < 4096) {
      try { unlinkSync(tmpMp4); } catch {}
      return false;
    }

    // Extract frame at 1.5s (avoids black/title frames common at 0s)
    execSync(`ffmpeg -y -ss 1.5 -i "${tmpMp4}" -vframes 1 -q:v 2 "${dest}" 2>/dev/null`);
    try { unlinkSync(tmpMp4); } catch {}

    if (!existsSync(dest) || statSync(dest).size < 1024) return false;
    usedVideoIds.add(video.id);
    return true;
  } catch {
    return false;
  }
}

export async function fetchPhotos(slug) {
  const apiKey = process.env.PEXELS_API_KEY;

  const scriptPath = join(videoDir, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) {
    console.error(`script.json not found: ${scriptPath}`); return {};
  }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const photoDir = join(videoDir, 'public', 'photos', slug);
  mkdirSync(photoDir, { recursive: true });

  const photos = {};
  const usedPhotoIds = new Set();
  const usedVideoIds = new Set();
  const reelQueries = loadReelDataQueries(slug);

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    const dest = join(photoDir, `segment-${i}.jpg`);

    // Reuse existing valid files (preserves photos across re-renders)
    if (existsSync(dest) && statSync(dest).size > 1024) {
      photos[i] = `photos/${slug}/segment-${i}.jpg`;
      console.log(`  ↷  segment-${i}.jpg already exists — skipping`);
      continue;
    }

    if (!apiKey) continue;

    const rawQuery = reelQueries[i] ?? segmentKeywords(seg);

    // Skip video fetch for chart/cta — those need clean, minimal backgrounds
    const tryVideo = !['chart', 'cta', 'question'].includes(seg.type);

    let fetched = false;

    if (tryVideo) {
      fetched = await fetchVideoFrame(rawQuery, dest, usedVideoIds, apiKey);
      if (fetched) {
        photos[i] = `photos/${slug}/segment-${i}.jpg`;
        console.log(`  ✓ segment-${i}.jpg (${seg.type} — video frame: "${rawQuery}")`);
      }
    }

    if (!fetched) {
      const query = encodeURIComponent(rawQuery);
      const url = `https://api.pexels.com/v1/search?query=${query}&orientation=portrait&per_page=15&size=large`;
      try {
        const data = await fetchJson(url, { Authorization: apiKey });
        if (!data.photos) {
          console.warn(`  ⚠  segment-${i}: unexpected Pexels response — skipping`);
          continue;
        }
        const photo = data.photos.find(p => !usedPhotoIds.has(p.id));
        if (!photo) { console.log(`  ⚠  No unused photo for segment ${i} (${seg.type})`); continue; }
        usedPhotoIds.add(photo.id);

        const imgUrl = photo.src.large2x ?? photo.src.large;
        await downloadFile(imgUrl, dest);

        if (statSync(dest).size < 1024) {
          console.warn(`  ⚠  segment-${i}.jpg suspiciously small — likely rate limit, skipping`);
          continue;
        }

        photos[i] = `photos/${slug}/segment-${i}.jpg`;
        console.log(`  ✓ segment-${i}.jpg (${seg.type} — photo: "${photo.alt ?? rawQuery}")`);
      } catch (err) {
        console.warn(`  ⚠  segment-${i} photo failed: ${err.message}`);
      }
    }
  }

  if (!apiKey) {
    const count = Object.keys(photos).length;
    console.log(count > 0
      ? `  ℹ  PEXELS_API_KEY not set — using ${count} existing photo(s) from disk`
      : '  ℹ  PEXELS_API_KEY not set and no existing photos — dark bg will be used');
  }

  writeFileSync(join(videoDir, 'out', slug, 'photos.json'), JSON.stringify(photos, null, 2));
  return photos;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const postArg = process.argv.find(a => a.startsWith('--post='));
  if (!postArg) { console.error('Usage: node fetch-photos.mjs --post=<slug>'); process.exit(1); }
  const slug = postArg.replace('--post=', '');
  console.log(`\nFetching photos for: ${slug}\n`);
  fetchPhotos(slug).then(photos => {
    const count = Object.keys(photos).length;
    console.log(`\nDone. ${count} photo(s) fetched.`);
  });
}
