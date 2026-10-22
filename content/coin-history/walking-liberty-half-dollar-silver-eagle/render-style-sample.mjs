import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.dirname(new URL(import.meta.url).pathname);
const blog = path.resolve(root, '../../../public/blog/walking-liberty-half-dollar-silver-eagle/images');
const half = await fs.readFile(path.join(blog, 'half-dollar.jpg'));
const eagle = await fs.readFile(path.join(blog, 'silver-eagle.jpg'));
const halfUri = `data:image/jpeg;base64,${half.toString('base64')}`;
const eagleUri = `data:image/jpeg;base64,${eagle.toString('base64')}`;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1120" viewBox="0 0 1800 1120">
<defs>
  <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#d5cbb5" stroke-width="1" opacity=".34"/></pattern>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#071923" flood-opacity=".28"/></filter>
  <clipPath id="coin1"><rect x="130" y="292" width="390" height="420" rx="8"/></clipPath>
  <clipPath id="coin2"><rect x="710" y="292" width="390" height="420" rx="8"/></clipPath>
  <clipPath id="coin3"><rect x="1290" y="292" width="390" height="420" rx="8"/></clipPath>
</defs>
<rect width="1800" height="1120" fill="#eae2d1"/><rect width="1800" height="1120" fill="url(#grid)"/>
<text x="84" y="76" font-family="Arial,sans-serif" font-size="21" letter-spacing="5" fill="#123442">FUSED DISTRIBUTION · COIN HISTORY STYLE TEST</text>
<text x="84" y="147" font-family="Georgia,serif" font-size="54" font-weight="bold" fill="#102b38">A more focused reel, frame by frame</text>
<text x="84" y="190" font-family="Arial,sans-serif" font-size="22" fill="#52636a">Proposed direction: preserve the real coin, make the timeline do the explaining.</text>

<!-- frame cards -->
<g filter="url(#shadow)"><rect x="68" y="232" width="516" height="786" rx="18" fill="#fffdf7"/><rect x="648" y="232" width="516" height="786" rx="18" fill="#fffdf7"/><rect x="1228" y="232" width="516" height="786" rx="18" fill="#fffdf7"/></g>
<g font-family="Arial,sans-serif" font-size="17" letter-spacing="3" fill="#60727a"><text x="104" y="277">01 / THE HOOK</text><text x="684" y="277">02 / THE TURN</text><text x="1264" y="277">03 / THE PAYOFF</text></g>
<g clip-path="url(#coin1)"><image href="${halfUri}" x="130" y="292" width="390" height="420" preserveAspectRatio="xMidYMid slice"/></g>
<g clip-path="url(#coin2)"><image href="${halfUri}" x="710" y="292" width="390" height="420" preserveAspectRatio="xMidYMid slice"/></g>
<g clip-path="url(#coin3)"><image href="${eagleUri}" x="1290" y="292" width="390" height="420" preserveAspectRatio="xMidYMid slice"/></g>
<g font-family="Georgia,serif" fill="#112f3c"><text x="105" y="778" font-size="48" font-weight="bold">Same Liberty?</text><text x="685" y="778" font-size="48" font-weight="bold">A design returns.</text><text x="1265" y="778" font-size="48" font-weight="bold">Different coin.</text></g>
<g font-family="Arial,sans-serif" font-size="19" fill="#53666d"><text x="107" y="820">Begin on the actual half dollar.</text><text x="687" y="820">A date line replaces exposition.</text><text x="1267" y="820">Match-cut to the 2021 Eagle.</text></g>
<!-- dates and directional progression -->
<g font-family="Arial,sans-serif" font-weight="bold" font-size="28" text-anchor="middle"><rect x="106" y="858" width="144" height="48" rx="8" fill="#f3cd52"/><text x="178" y="891" fill="#123442">1916</text><path d="M258 882h45l-13-12m13 12-13 12" fill="none" stroke="#58d6ff" stroke-width="5"/><rect x="315" y="858" width="144" height="48" rx="8" fill="#123442"/><text x="387" y="891" fill="#fffdf7">1947</text>
<rect x="686" y="858" width="144" height="48" rx="8" fill="#123442"/><text x="758" y="891" fill="#fffdf7">1948</text><path d="M838 882h45l-13-12m13 12-13 12" fill="none" stroke="#58d6ff" stroke-width="5"/><rect x="895" y="858" width="144" height="48" rx="8" fill="#f3cd52"/><text x="967" y="891" fill="#123442">1986</text>
<rect x="1264" y="858" width="144" height="48" rx="8" fill="#123442"/><text x="1336" y="891" fill="#fffdf7">1986</text><path d="M1416 882h45l-13-12m13 12-13 12" fill="none" stroke="#58d6ff" stroke-width="5"/><rect x="1473" y="858" width="144" height="48" rx="8" fill="#f3cd52"/><text x="1545" y="891" fill="#123442">2021</text></g>
<!-- sample captions in phone-safe lower third -->
<g><rect x="105" y="934" width="354" height="54" rx="7" fill="#102b38"/><text x="282" y="970" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="25" fill="#fffdf7">SAME LIBERTY?</text><rect x="685" y="934" width="354" height="54" rx="7" fill="#102b38"/><text x="862" y="970" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="25" fill="#fffdf7">THE DESIGN RETURNS</text><rect x="1265" y="934" width="354" height="54" rx="7" fill="#102b38"/><text x="1442" y="970" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="25" fill="#fffdf7">ONE DESIGN LINEAGE</text></g>
<text x="84" y="1074" font-family="Arial,sans-serif" font-size="18" fill="#52636a">Sample only · real owner photos · proposed motion: slow crop move / date wipe / clean match cut · not a rendered reel</text>
</svg>`;

const svgPath = path.join(root, 'style-sample.svg');
const pngPath = path.join(root, 'style-sample.png');
await fs.writeFile(svgPath, svg);
await sharp(Buffer.from(svg)).png().toFile(pngPath);
console.log(`Wrote ${svgPath} and ${pngPath}`);
