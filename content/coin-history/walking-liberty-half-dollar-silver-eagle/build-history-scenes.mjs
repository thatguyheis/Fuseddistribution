import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const root = process.cwd();
const slug = 'walking-liberty-half-dollar-silver-eagle';
const work = path.join(root, 'content/coin-history', slug);
const blog = path.join(root, 'public/blog', slug);
const library = path.join(work, 'reusable-library');
const sources = {
  half: path.join(blog, 'images/half-dollar.jpg'),
  eagle: path.join(blog, 'images/silver-eagle.jpg'),
  pair: path.join(blog, 'images/comparison.jpg'),
};
fs.mkdirSync(path.join(library, 'walking-liberty'), {recursive: true});
fs.mkdirSync(path.join(work, 'artwork-source/reel-scenes'), {recursive: true});
fs.mkdirSync(path.join(blog, 'images/reel-scenes'), {recursive: true});

const photo = {};
for (const [key, file] of Object.entries(sources)) {
  photo[key] = `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`;
}
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function image(source, x, y, w, h, crop = false) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#fffdf7" stroke="#c9c0ae" stroke-width="3"/><image href="${photo[source]}" x="${x + 12}" y="${y + 12}" width="${w - 24}" height="${h - 24}" preserveAspectRatio="${crop ? 'xMidYMid slice' : 'xMidYMid meet'}"/>`;
}

function frame(scene) {
  const eyebrow = 'FUSED DISTRIBUTION / COIN HISTORY';
  const title = esc(scene.title);
  let visual = '';
  if (scene.kind === 'pair') {
    visual += image('half', 42, 370, 310, 430);
    visual += image('eagle', 368, 370, 310, 430);
    visual += `<text x="197" y="834" text-anchor="middle" class="bright-label">WALKING LIBERTY HALF DOLLAR</text><text x="523" y="834" text-anchor="middle" class="bright-label">SILVER EAGLE / 2021 EXAMPLE</text>`;
  } else if (scene.kind === 'half') {
    visual += image('half', 78, 390, 564, 430);
    if (scene.detail) visual += `<path d="M486 412 L586 330" stroke="#d9b647" stroke-width="6"/><circle cx="486" cy="412" r="22" fill="none" stroke="#d9b647" stroke-width="6"/>`;
  } else if (scene.kind === 'eagle') {
    visual += image('eagle', 78, 390, 564, 430);
  } else if (scene.kind === 'timeline') {
    const columns = scene.cards;
    const gap = 18;
    const width = (636 - gap * (columns.length - 1)) / columns.length;
    visual += columns.map((card, index) => {
      const x = 42 + index * (width + gap);
      const fill = index === scene.highlight ? '#f3d45c' : '#fffdf7';
      const color = index === scene.highlight ? '#102e3a' : '#f5edda';
      const textColor = index === scene.highlight ? '#102e3a' : '#102e3a';
      const y = 430;
      return `<rect x="${x}" y="${y}" width="${width}" height="280" rx="18" fill="${fill}" stroke="#d6c8a8" stroke-width="3"/><text x="${x + width / 2}" y="${y + 86}" text-anchor="middle" class="year" fill="${textColor}">${esc(card.year)}</text><text x="${x + width / 2}" y="${y + 143}" text-anchor="middle" class="label" fill="${textColor}">${esc(card.line1)}</text><text x="${x + width / 2}" y="${y + 178}" text-anchor="middle" class="label" fill="${textColor}">${esc(card.line2 || '')}</text>`;
    }).join('');
    if (scene.photo === 'half') visual += image('half', 188, 730, 344, 210);
    if (scene.photo === 'eagle') visual += image('eagle', 188, 730, 344, 210);
  } else if (scene.kind === 'split') {
    visual += `<rect x="55" y="410" width="610" height="210" rx="20" fill="#fffdf7"/><text x="360" y="471" text-anchor="middle" class="label">${esc(scene.topLabel)}</text><text x="360" y="552" text-anchor="middle" class="year">${esc(scene.topValue)}</text><rect x="55" y="660" width="610" height="210" rx="20" fill="#f3d45c"/><text x="360" y="721" text-anchor="middle" class="label ink">${esc(scene.bottomLabel)}</text><text x="360" y="802" text-anchor="middle" class="year ink">${esc(scene.bottomValue)}</text>`;
  }

  const kicker = scene.kicker ? `<text x="360" y="895" text-anchor="middle" class="kicker">${esc(scene.kicker)}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
<defs>
  <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="#59707a" stroke-width="1" opacity=".2"/></pattern>
  <style>.brand{font:600 17px Arial,sans-serif;letter-spacing:4px;fill:#58d6ff}.label{font:700 16px Arial,sans-serif;letter-spacing:1.3px;fill:#102e3a}.bright-label{font:700 16px Arial,sans-serif;letter-spacing:1.3px;fill:#f5edda}.year{font:bold 47px Georgia,serif;fill:#102e3a}.kicker{font:700 22px Arial,sans-serif;letter-spacing:2px;fill:#f3d45c}.note{font:16px Arial,sans-serif;fill:#b9cbd1}.ink{fill:#102e3a}</style>
</defs>
<rect width="720" height="1280" fill="#071923"/><rect width="720" height="1280" fill="url(#grid)"/>
${visual}${kicker}
<path d="M42 985H678" stroke="#58d6ff" stroke-opacity=".35" stroke-width="2"/>
<text x="42" y="1224" class="brand">FUSED <tspan fill="#d9c6a5">DISTRIBUTION</tspan></text>
</svg>`;
}

const sections = [
  [
    {title:'Same Liberty? Different coin.',kind:'pair',kicker:'A DESIGN WITH TWO CHAPTERS',note:'Separate specimens / compared by visible obverse design'},
    {title:'Start with the half dollar.',kind:'half',detail:true,kicker:'THE WALKING LIBERTY DESIGN',note:'Owner photograph / no specimen date inferred'},
    {title:'Follow the design across eras.',kind:'pair',kicker:'HALF DOLLAR  →  SILVER EAGLE',note:'Design history, not a claim that these are the same coin'},
  ],
  [
    {title:'Design debut: 1916',kind:'timeline',highlight:0,cards:[{year:'1916',line1:'DESIGN',line2:'INTRODUCED'},{year:'A. A.',line1:'ADOLPH',line2:'WEINMAN'}],photo:'half',note:'Date graphic describes the design, not the pictured specimen'},
    {title:'Liberty in full stride.',kind:'half',detail:true,kicker:'FLAG / OUTSTRETCHED ARM / BRANCHES',note:'U.S. Mint design description'},
    {title:'The half dollar carries the image.',kind:'half',kicker:'WALKING LIBERTY HALF DOLLAR',note:'1916 design / obverse shown'},
  ],
  [
    {title:'The run ends: 1947',kind:'timeline',highlight:1,cards:[{year:'1916',line1:'FIRST',line2:'YEAR'},{year:'1947',line1:'FINAL',line2:'YEAR'}],photo:'half',note:'The photographed coin is not identified by date'},
    {title:'A new half dollar: 1948',kind:'timeline',highlight:1,cards:[{year:'1947',line1:'LIBERTY',line2:'FINAL YEAR'},{year:'1948',line1:'FRANKLIN',line2:'REPLACES LIBERTY'}],kicker:'THE REVERSE ALSO CHANGES',note:'Historical timeline / not a photograph of a Franklin coin'},
    {title:'Liberty Bell replaces the eagle.',kind:'split',topLabel:'WALKING LIBERTY REVERSE',topValue:'EAGLE + PINE BRANCH',bottomLabel:'FRANKLIN HALF DOLLAR REVERSE',bottomValue:'LIBERTY BELL',kicker:'THE DENOMINATION STAYS THE SAME',note:'Text-only comparison / neither reverse is shown in owner photos'},
  ],
  [
    {title:'A new program begins: 1986',kind:'timeline',highlight:1,cards:[{year:'1916',line1:'HALF DOLLAR',line2:'DESIGN'},{year:'1986',line1:'EAGLE',line2:'PROGRAM'}],photo:'eagle',note:'The Silver Eagle program date is not the pictured coin date'},
    {title:'The design returns on silver.',kind:'eagle',kicker:'WALKING LIBERTY OBVERSE',note:'Owner photograph / date visible: 2021'},
    {title:'Same obverse, new program.',kind:'pair',kicker:'CIRCULATING HALF DOLLAR  →  BULLION PROGRAM',note:'Separate coin types and separate specimens'},
  ],
  [
    {title:'The photographed Eagle: 2021',kind:'eagle',kicker:'DATE VISIBLE ON THE COIN',note:'Holder label not used as grading evidence'},
    {title:'The front stays familiar.',kind:'eagle',kicker:'WALKING LIBERTY ON THE OBVERSE',note:'The coin photo shows the obverse only'},
    {title:'The reverse changes in 2021.',kind:'split',topLabel:'OBVERSE IN OWNER PHOTO',topValue:'WALKING LIBERTY',bottomLabel:'MINT HISTORY',bottomValue:'REVERSE REFRESHED',kicker:'THE REVERSE IS NOT SHOWN HERE',note:'Text-only fact / U.S. Mint source'},
  ],
  [
    {title:'Different coins. One design lineage.',kind:'pair',kicker:'FOLLOW THE WALKING FIGURE',note:'A design introduced in 1916 returns on the Silver Eagle in 1986'},
    {title:'1916 → 1986 → 2021',kind:'timeline',highlight:1,cards:[{year:'1916',line1:'DESIGN',line2:'DEBUT'},{year:'1986',line1:'EAGLE',line2:'PROGRAM'},{year:'2021',line1:'PHOTO',line2:'EXAMPLE'}],kicker:'THREE DATES / THREE DIFFERENT ROLES',note:'The visible 2021 coin does not date the original design'},
    {title:'The design carries the history.',kind:'pair',kicker:'WALKING LIBERTY / TWO COINS',note:'Fused Distribution / coin history'},
  ],
];

const allAssets = [];
const segments = [];
for (const [segmentIndex, scenes] of sections.entries()) {
  const shotPaths = [];
  for (const [shotIndex, scene] of scenes.entries()) {
    const id = `walking-liberty-scene-${String(segmentIndex * 3 + shotIndex).padStart(2, '0')}`;
    const source = frame(scene);
    const svgPath = path.join(work, 'artwork-source/reel-scenes', `${id}.svg`);
    const libraryPath = path.join(library, 'walking-liberty', `${id}.jpg`);
    const publicPath = path.join(blog, 'images/reel-scenes', `${id}.jpg`);
    fs.writeFileSync(svgPath, source);
    await sharp(Buffer.from(source)).jpeg({quality: 94, mozjpeg: true}).toFile(libraryPath);
    fs.copyFileSync(libraryPath, publicPath);
    const shot = {
      path: path.relative(root, libraryPath),
      type: 'photo',
      title: scene.title,
      eyebrow: 'FUSED / WALKING LIBERTY HISTORY',
      credit: scene.note || 'Owner coin photo / U.S. Mint sourced timeline',
      weight: 1,
      fit: 'cover',
      focus: 'center',
      sha256: hash(libraryPath),
    };
    shotPaths.push(shot);
    allAssets.push({
      id,
      title: scene.title,
      kind: 'editorial-graphic-with-owner-photo',
      sourceSvg: path.relative(root, svgPath),
      reusableImage: path.relative(root, libraryPath),
      publicPreview: path.relative(root, publicPath),
      sha256: hash(libraryPath),
      sourceCoinIds: scene.kind === 'pair' ? ['coin-0020', 'coin-0013'] : scene.kind === 'half' ? ['coin-0020'] : scene.kind === 'eagle' ? ['coin-0013'] : scene.photo === 'half' ? ['coin-0020'] : scene.photo === 'eagle' ? ['coin-0013'] : [],
      role: scene.kind === 'timeline' || scene.kind === 'split' ? 'sourced explainer graphic, not a coin photograph' : 'owner coin photograph in verified comparison treatment',
      reuse: 'Fused-owned blog, reel, and future coin-history graphics; keep the accompanying fact labels and specimen limitations.',
      rights: 'Owner photo reuse for Fused content; no standalone or public stock redistribution grant.',
      reviewStatus: 'reviewed-for-this-episode',
    });
  }
  segments.push(shotPaths);
}

const planPath = path.join(blog, 'presentation-plan.json');
fs.writeFileSync(planPath, `${JSON.stringify({version: 2, segments}, null, 2)}\n`);
const libraryPath = path.join(root, 'content/coin-library/reusable-assets.json');
const prior = fs.existsSync(libraryPath) ? JSON.parse(fs.readFileSync(libraryPath, 'utf8')) : {version: 1, assets: []};
const kept = prior.assets.filter(asset => !asset.id.startsWith('walking-liberty-scene-'));
fs.writeFileSync(libraryPath, `${JSON.stringify({version: 1, updated: '2026-10-15', assets: [...kept, ...allAssets]}, null, 2)}\n`);
console.log(`Built ${allAssets.length} reusable image plates across ${segments.length} narrated sections.`);
