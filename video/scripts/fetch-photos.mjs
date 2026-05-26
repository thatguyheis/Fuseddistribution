/**
 * Fetches one portrait photo per segment from Pexels API.
 * Requires PEXELS_API_KEY env var. Skips silently if not set.
 * Photos saved to public/photos/<slug>/segment-N.jpg
 * Writes out/<slug>/photos.json with index → staticFile path mapping.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get as httpsGet } from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = join(__dirname, '..');

function loadReelDataQueries(slug) {
  const reelDataPath = join(videoDir, '..', 'blog', slug, 'reel-data.md');
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

export async function fetchPhotos(slug) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.log('  ℹ  PEXELS_API_KEY not set — skipping photos (dark bg will be used)');
    return {};
  }

  const scriptPath = join(videoDir, 'out', slug, 'script.json');
  if (!existsSync(scriptPath)) {
    console.error(`script.json not found: ${scriptPath}`); return {};
  }
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const photoDir = join(videoDir, 'public', 'photos', slug);
  mkdirSync(photoDir, { recursive: true });

  const photos = {};
  const usedIds = new Set();
  const reelQueries = loadReelDataQueries(slug);

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    const dest = join(photoDir, `segment-${i}.jpg`);

    // Skip if a valid file already exists (>1 KB — guards against corrupt concurrency_exceeded responses)
    if (existsSync(dest) && statSync(dest).size > 1024) {
      photos[i] = `photos/${slug}/segment-${i}.jpg`;
      console.log(`  ↷  segment-${i}.jpg already exists — skipping`);
      continue;
    }

    const query = encodeURIComponent(reelQueries[i] ?? segmentKeywords(seg));
    const url = `https://api.pexels.com/v1/search?query=${query}&orientation=portrait&per_page=15&size=large`;

    try {
      const data = await fetchJson(url, { Authorization: apiKey });
      if (!data.photos) {
        console.warn(`  ⚠  segment-${i}: unexpected Pexels response (no photos field) — skipping`);
        continue;
      }
      const photo = data.photos.find(p => !usedIds.has(p.id));
      if (!photo) { console.log(`  ⚠  No unused photo for segment ${i} (${seg.type})`); continue; }
      usedIds.add(photo.id);

      const imgUrl = photo.src.large2x ?? photo.src.large;
      await downloadFile(imgUrl, dest);

      // Verify download isn't a corrupt stub (concurrency_exceeded writes ~20 bytes)
      if (statSync(dest).size < 1024) {
        console.warn(`  ⚠  segment-${i}.jpg suspiciously small (${statSync(dest).size}B) — likely Pexels rate limit response, skipping`);
        continue;
      }

      photos[i] = `photos/${slug}/segment-${i}.jpg`;
      console.log(`  ✓ segment-${i}.jpg (${seg.type} — "${photo.alt ?? query}")`);
    } catch (err) {
      console.warn(`  ⚠  segment-${i} photo failed: ${err.message}`);
    }
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
