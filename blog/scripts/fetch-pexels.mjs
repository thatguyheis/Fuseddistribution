import { existsSync, mkdirSync, createWriteStream, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get as httpsGet } from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const blogDir = join(__dirname, '..');

function loadApiKey() {
  const envPath = join(__dirname, '../../video/.env');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^PEXELS_API_KEY=(.+)/);
      if (m) return m[1].trim();
    }
  }
  return process.env.PEXELS_API_KEY ?? null;
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

export async function fetchBlogPhotos(slug, queries, orientation = 'landscape') {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('PEXELS_API_KEY not set — check video/.env');
    process.exit(1);
  }

  const imgDir = join(blogDir, slug, 'images');
  mkdirSync(imgDir, { recursive: true });

  const usedIds = new Set();
  const results = [];

  for (let i = 0; i < queries.length; i++) {
    const dest = join(imgDir, `pexels-${i}.jpg`);
    if (existsSync(dest)) {
      console.log(`  ↷  pexels-${i}.jpg already exists — skipping`);
      results.push({ index: i, file: `pexels-${i}.jpg`, skipped: true });
      continue;
    }

    const query = encodeURIComponent(queries[i]);
    const url = `https://api.pexels.com/v1/search?query=${query}&orientation=${orientation}&per_page=15&size=large`;

    try {
      const data = await fetchJson(url, { Authorization: apiKey });
      const photo = data.photos?.find(p => !usedIds.has(p.id));
      if (!photo) {
        console.warn(`  ⚠  No unused photo for: "${queries[i]}"`);
        continue;
      }
      usedIds.add(photo.id);

      const imgUrl = photo.src.large2x ?? photo.src.large;
      await downloadFile(imgUrl, dest);

      const attribution = `Photo by ${photo.photographer} on Pexels (${photo.url})`;
      console.log(`  ✓  pexels-${i}.jpg — ${attribution}`);
      results.push({ index: i, file: `pexels-${i}.jpg`, attribution });
    } catch (err) {
      console.warn(`  ⚠  pexels-${i} failed: ${err.message}`);
    }
  }

  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const postArg = process.argv.find(a => a.startsWith('--post='));
  const queriesArg = process.argv.find(a => a.startsWith('--queries='));
  const orientArg = process.argv.find(a => a.startsWith('--orientation='));

  if (!postArg || !queriesArg) {
    console.error('Usage: node fetch-pexels.mjs --post=<slug> --queries="q1|q2" [--orientation=landscape|portrait]');
    process.exit(1);
  }

  const slug = postArg.replace('--post=', '');
  const queries = queriesArg.replace('--queries=', '').split('|').map(q => q.trim());
  const orientation = orientArg ? orientArg.replace('--orientation=', '') : 'landscape';

  console.log(`\nFetching ${queries.length} photo(s) for: ${slug}\n`);
  fetchBlogPhotos(slug, queries, orientation).then(results => {
    const downloaded = results.filter(r => !r.skipped).length;
    console.log(`\nDone. ${downloaded} photo(s) downloaded.\n`);
    const withAttribution = results.filter(r => r.attribution);
    if (withAttribution.length) {
      console.log('Attributions (paste into <figcaption>):');
      withAttribution.forEach(r => console.log(`  ${r.file} — ${r.attribution}`));
    }
  });
}
