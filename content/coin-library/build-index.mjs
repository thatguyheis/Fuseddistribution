import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(await readFile(path.join(directory, 'catalog.json'), 'utf8'));
const reusable = JSON.parse(await readFile(path.join(directory, 'reusable-assets.json'), 'utf8'));
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const localUrl = (file) => path.relative(directory, file).split(path.sep).map(encodeURIComponent).join('/');
const cards = await Promise.all(catalog.items.filter((item) => item.kind === 'photo').map(async (item) => {
  const file = path.resolve(directory, '..', '..', item.source);
  return `<article id="${escape(item.id)}"><img loading="lazy" alt="${escape(item.title)}" src="${escape(localUrl(file))}"/><h2>${escape(item.id)}</h2><p>${escape(item.title)}</p><small>${escape(path.basename(item.source))}</small><p>${escape(item.status)}</p></article>`;
}));
const reusableCards = await Promise.all(reusable.assets.map(async (asset) => {
  const file = path.resolve(directory, '..', '..', asset.reusableImage);
  const sources = asset.sourceCoinIds.map((id) => `<a href="#${escape(id)}">${escape(id)}</a>`).join(', ');
  return `<article><img loading="lazy" alt="${escape(asset.title)}" src="${escape(localUrl(file))}"/><h2>${escape(asset.id)}</h2><p>${escape(asset.title)}</p><p>${escape(asset.role)}</p><p>Source coins: ${sources}</p><small>${escape(asset.reuse)} ${escape(asset.rights)}</small></article>`;
}));
const videoCount = catalog.items.filter((item) => item.kind === 'video').length;
const photoCount = cards.length;
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Fused coin media catalog</title><style>body{background:#071b27;color:#eef7fa;font:16px system-ui;padding:25px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}article{background:#123447;padding:15px;border-radius:12px}img{width:100%;height:320px;object-fit:contain}h2{color:#58d6ff;font-size:18px}small{display:block;overflow-wrap:anywhere;line-height:1.5}a{color:#58d6ff}</style><h1>Fused coin media catalog</h1><p>${photoCount} original photographs and ${videoCount} video. Originals preserved. Labels describe visible evidence, not authentication.</p><div class="grid">${cards.join('')}</div><h1>Reusable editorial assets</h1><p>${reusable.assets.length} reviewed compositions. Use within Fused blog and reel content with each fact label, source credit, rights scope and specimen limitation intact. These are not stand-alone stock images.</p><div class="grid">${reusableCards.join('')}</div>`;
await writeFile(path.join(directory, 'index.html'), html);
console.log(`Built contact catalog for ${photoCount} original photos, ${videoCount} videos and ${reusableCards.length} reusable compositions.`);
