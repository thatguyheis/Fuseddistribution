import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const BUSINESS_PRESENTATION_PROFILE = 'business-growth-v1';
export const BUSINESS_SCENE_ART = Object.freeze({
  width: 1080,
  height: 1920,
  background: '#0A1A2A',
  white: '#FFFFFF',
  cyan: '#58D6FF',
  captionSafeTop: 1670,
  socialSafeRight: 930,
  captionBottomClearance: 250,
  socialUiRightClearance: 150,
  graphicBottomLimit: 1400,
});

const MAX_HEADLINE_CHARS = 90;
const MAX_DETAIL_CHARS = 150;
const MAX_PANEL_ITEMS = 3;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

function boundedText(value, label, maxCharacters, {required = false} = {}) {
  if (typeof value !== 'string') {
    if (!required && value === undefined) return '';
    throw new Error(`${label} must be a string`);
  }
  const text = value.trim().replace(/\s+/g, ' ');
  if (required && !text) throw new Error(`${label} is required`);
  if (text.length > maxCharacters) throw new Error(`${label} exceeds ${maxCharacters} characters`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) {
    throw new Error(`${label} contains unsupported control characters`);
  }
  return text;
}

function characterWidthUnits(character) {
  if (/[MW@%&]/.test(character)) return 0.9;
  if (/[A-Z0-9]/.test(character)) return 0.68;
  if (/[il1.,'!:;]/.test(character)) return 0.3;
  if (/\s/.test(character)) return 0.32;
  if (/[mw]/.test(character)) return 0.75;
  return 0.54;
}

function lineWidthUnits(text) {
  return [...text].reduce((sum, character) => sum + characterWidthUnits(character), 0);
}

function wrapWords(text, maxWidthUnits, maxLines, label) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && lineWidthUnits(candidate) > maxWidthUnits) {
      lines.push(line);
      line = word;
    } else if (!line && lineWidthUnits(word) > maxWidthUnits) {
      throw new Error(`${label} contains a word too wide to fit`);
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) throw new Error(`${label} needs more than ${maxLines} lines`);
  return lines;
}

function validateScene(scene, index) {
  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) throw new Error(`Scene ${index + 1} must be an object`);
  if (typeof scene.id !== 'string' || !ID_PATTERN.test(scene.id)) throw new Error(`Scene ${index + 1} needs a lowercase kebab-case id`);
  if (!['hook', 'body', 'cta'].includes(scene.kind)) throw new Error(`Scene ${scene.id} kind must be hook, body, or cta`);

  const eyebrow = boundedText(scene.eyebrow, `${scene.id} eyebrow`, 28, {required: true});
  const headline = boundedText(scene.headline, `${scene.id} headline`, MAX_HEADLINE_CHARS, {required: true});
  const detail = boundedText(scene.detail, `${scene.id} detail`, MAX_DETAIL_CHARS);
  const headlineLines = wrapWords(headline, 780 / 64, 3, `${scene.id} headline`);
  const detailLines = detail ? wrapWords(detail, 25.5, 2, `${scene.id} detail`) : [];
  const headlineSize = Math.min(80, Math.floor(780 / Math.max(...headlineLines.map(lineWidthUnits))));
  if (headlineSize < 64) throw new Error(`${scene.id} headline cannot fit at 64 px or larger`);

  let panel = null;
  if (scene.panel !== undefined && scene.panel !== null) {
    if (!scene.panel || typeof scene.panel !== 'object' || Array.isArray(scene.panel)) throw new Error(`${scene.id} panel must be an object`);
    const title = boundedText(scene.panel.title, `${scene.id} panel title`, 60, {required: true});
    if (!Array.isArray(scene.panel.items) || scene.panel.items.length < 1 || scene.panel.items.length > MAX_PANEL_ITEMS) {
      throw new Error(`${scene.id} panel must contain one to ${MAX_PANEL_ITEMS} reviewed items`);
    }
    const items = scene.panel.items.map((item, itemIndex) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${scene.id} panel item ${itemIndex + 1} must be an object`);
      return {
        label: boundedText(item.label, `${scene.id} panel label ${itemIndex + 1}`, 60, {required: true}),
        value: boundedText(item.value, `${scene.id} panel value ${itemIndex + 1}`, 60, {required: true}),
      };
    });
    const titleLines = wrapWords(title, 21.5, 2, `${scene.id} panel title`);
    panel = {
      title,
      titleLines,
      items: items.map((item, itemIndex) => ({
        ...item,
        labelLines: wrapWords(item.label, 7.3, 2, `${scene.id} panel label ${itemIndex + 1}`),
        valueLines: wrapWords(item.value, 8.5, 2, `${scene.id} panel value ${itemIndex + 1}`),
      })),
    };
  }

  const weight = scene.weight === undefined ? 1 : Number(scene.weight);
  if (!Number.isFinite(weight) || weight <= 0) throw new Error(`${scene.id} weight must be a positive number`);
  if (scene.reservedGraphic !== undefined && typeof scene.reservedGraphic !== 'boolean') throw new Error(`${scene.id} reservedGraphic must be a boolean`);
  const reservedGraphic = scene.reservedGraphic ?? false;
  return {id: scene.id, kind: scene.kind, eyebrow, headline, headlineLines, headlineSize, detail, detailLines, panel: reservedGraphic ? null : panel, weight, reservedGraphic};
}

export function validateBusinessSceneSpec(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new Error('Scene spec must be an object');
  if (typeof spec.slug !== 'string' || !ID_PATTERN.test(spec.slug)) throw new Error('Scene spec needs a lowercase kebab-case slug');
  if (!Array.isArray(spec.scenes) || spec.scenes.length < 1 || spec.scenes.length > 30) throw new Error('Scene spec must contain one to 30 scenes');
  const scenes = spec.scenes.map(validateScene);
  const ids = scenes.map((scene) => scene.id);
  if (new Set(ids).size !== ids.length) throw new Error('Scene ids must be unique');
  if (scenes[0].kind !== 'hook') throw new Error('The first scene must be a hook');
  if (scenes.at(-1).kind !== 'cta') throw new Error('The final scene must be a CTA');
  return {slug: spec.slug, profile: BUSINESS_PRESENTATION_PROFILE, scenes};
}

function textLines(lines, {x, y, fontSize, lineHeight, fill = BUSINESS_SCENE_ART.white, weight = 700, anchor = 'middle', className = ''}) {
  const tspans = lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join('');
  return `<text class="${className}" x="${x}" y="${y}" fill="${fill}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${weight}" text-anchor="${anchor}">${tspans}</text>`;
}

function panelMarkup(panel) {
  if (!panel) return '';
  const x = 150;
  const y = 885;
  const width = 780;
  const titleLines = panel.titleLines ?? [];
  const titleMarkup = titleLines.length
    ? textLines(titleLines, {x: x + 42, y: y + 64, fontSize: 32, lineHeight: 36, fill: BUSINESS_SCENE_ART.cyan, weight: 700, anchor: 'start'})
    : '';
  let cursor = y + 64 + titleLines.length * 36 + 34;
  const rows = panel.items.map((item) => {
    const baseline = cursor;
    cursor += Math.max(item.labelLines.length, item.valueLines.length) * 44 + 20;
    return {item, baseline};
  });
  const height = Math.max(360, cursor - y + 12);
  if (y + height > BUSINESS_SCENE_ART.graphicBottomLimit) throw new Error('Panel copy is too tall for the caption clear area');
  const rowMarkup = rows.map(({item, baseline}, index) => `${index ? `<path d="M192 ${baseline - 42}h696" stroke="#FFFFFF" stroke-opacity=".2" stroke-width="2"/>` : ''}<circle cx="198" cy="${baseline - 11}" r="7" fill="${BUSINESS_SCENE_ART.cyan}"/>${textLines(item.labelLines, {x: 230, y: baseline, fontSize: 40, lineHeight: 44, fill: BUSINESS_SCENE_ART.white, weight: 700, anchor: 'start'})}${textLines(item.valueLines, {x: 884, y: baseline, fontSize: 40, lineHeight: 44, fill: BUSINESS_SCENE_ART.cyan, weight: 700, anchor: 'end'})}`).join('');
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="36" fill="#10283D" stroke="#58D6FF" stroke-opacity="0.68" stroke-width="3"/>${titleMarkup}${rowMarkup}</g>`;
}

export function renderBusinessSceneSvg(scene) {
  const normalized = validateScene(scene, 0);
  const panelTitleLayout = Boolean(normalized.panel);
  const headingY = normalized.reservedGraphic || panelTitleLayout
    ? normalized.headlineLines.length === 1 ? 700 : normalized.headlineLines.length === 2 ? 620 : 540
    : normalized.headlineLines.length === 1 ? 884 : normalized.headlineLines.length === 2 ? 812 : 740;
  const eyebrowY = normalized.reservedGraphic || panelTitleLayout ? 430 : 628;
  const detailY = headingY + normalized.headlineLines.length * normalized.headlineSize * 1.12 + 42;
  const detail = normalized.reservedGraphic ? '' : normalized.detailLines.length
    ? textLines(normalized.detailLines, {x: 540, y: detailY, fontSize: 30, lineHeight: 42, fill: '#DCE8F1', weight: 500})
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs><radialGradient id="glow"><stop offset="0" stop-color="#58D6FF" stop-opacity=".17"/><stop offset="1" stop-color="#58D6FF" stop-opacity="0"/></radialGradient><linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#58D6FF" stop-opacity=".45"/><stop offset="1" stop-color="#58D6FF" stop-opacity=".06"/></linearGradient></defs>
  <rect width="1080" height="1920" fill="#0A1A2A"/>
  <circle cx="700" cy="580" r="220" fill="url(#glow)"/><circle cx="164" cy="1500" r="275" fill="url(#glow)"/>
  <path d="M70 0v1920" stroke="url(#edge)" stroke-width="2"/>
  <path d="M150 510h180M750 510h180" stroke="#58D6FF" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>
  <circle cx="540" cy="510" r="8" fill="#58D6FF"/>
  ${textLines([normalized.eyebrow.toUpperCase()], {x: 540, y: eyebrowY, fontSize: 25, lineHeight: 32, fill: BUSINESS_SCENE_ART.cyan, weight: 700, className: 'eyebrow'})}
  ${textLines(normalized.headlineLines, {x: 540, y: headingY, fontSize: normalized.headlineSize, lineHeight: normalized.headlineSize * 1.12, fill: BUSINESS_SCENE_ART.white, weight: 800, className: 'headline'})}
  ${detail}
  ${panelMarkup(normalized.reservedGraphic ? null : normalized.panel)}
  <path d="M150 1560h780" stroke="#58D6FF" stroke-opacity=".22" stroke-width="2"/>
  <circle cx="170" cy="1560" r="6" fill="#58D6FF"/><circle cx="910" cy="1560" r="6" fill="#58D6FF"/>
  </svg>`;
  return svg.replace(/^[ \t]+$/gm, '');
}

export async function generateBusinessSceneArt(spec, outputDirectory, repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')) {
  const normalized = validateBusinessSceneSpec(spec);
  const outDir = resolve(outputDirectory);
  const artDir = join(outDir, 'images');
  const relativeOutput = relative(resolve(repositoryRoot), outDir);
  const relativeArtDir = relative(resolve(repositoryRoot), artDir);
  if (!relativeOutput || relativeOutput === '..' || relativeOutput.startsWith(`..${sep}`) || relativeOutput.startsWith(sep)) {
    throw new Error('Output directory must be inside the repository');
  }
  mkdirSync(artDir, {recursive: true});
  const sharpModule = await import('sharp');
  const sharp = sharpModule.default;
  const outputs = await Promise.all(normalized.scenes.map(async (scene, index) => {
    const svg = renderBusinessSceneSvg(scene);
    const basename = `scene-${index}-${scene.id}`;
    const svgPath = join(artDir, `${basename}.svg`);
    const jpgPath = join(artDir, `${basename}.jpg`);
    writeFileSync(svgPath, svg);
    await sharp(Buffer.from(svg)).jpeg({quality: 90, chromaSubsampling: '4:4:4', mozjpeg: true}).toFile(jpgPath);
    const metadata = await sharp(jpgPath).metadata();
    if (metadata.width !== BUSINESS_SCENE_ART.width || metadata.height !== BUSINESS_SCENE_ART.height) {
      throw new Error(`Generated scene ${scene.id} is ${metadata.width}x${metadata.height}, expected 1080x1920`);
    }
    return {scene, basename, svg: svgPath, jpg: jpgPath, width: metadata.width, height: metadata.height};
  }));
  const plan = {
    version: 1,
    source: 'fused-original-business-scene-art',
    profile: BUSINESS_PRESENTATION_PROFILE,
    mode: 'all-scenes',
    safeZones: {width: 1080, height: 1920, captionBottomClearancePx: 250, socialUiRightClearancePx: 150},
    segments: outputs.map(({scene, basename}) => {
      const jpgPath = join(artDir, `${basename}.jpg`);
      const path = join(relativeArtDir, `${basename}.jpg`).split(sep).join('/');
      const sha256 = createHash('sha256').update(readFileSync(jpgPath)).digest('hex');
      return [{type: 'photo', path, sha256, weight: scene.weight, title: scene.headline, eyebrow: scene.eyebrow, credit: 'Fused original vector graphic', fit: 'cover', fullFrame: true, ...(scene.reservedGraphic ? {reservedGraphic: true} : {})}];
    }),
  };
  const planPath = join(outDir, 'presentation-plan.json');
  writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  return {planPath, plan, scenes: outputs.map(({scene, svg, jpg, width, height}) => ({id: scene.id, svg, jpg, width, height}))};
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const [key, inlineValue] = argv[index].split('=', 2);
    if (!key.startsWith('--')) continue;
    options[key.slice(2)] = inlineValue ?? argv[++index];
  }
  return options;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args['output-dir']) throw new Error('Usage: node video/scripts/create-business-scene-art.mjs --input=<scene-spec.json> --output-dir=<directory>');
  const spec = JSON.parse(readFileSync(resolve(args.input), 'utf8'));
  const outputDirectory = resolve(args['output-dir']);
  const outputs = await generateBusinessSceneArt(spec, outputDirectory);
  console.log(JSON.stringify({slug: spec.slug, profile: BUSINESS_PRESENTATION_PROFILE, outputDirectory, planPath: outputs.planPath, scenes: outputs.scenes}, null, 2));
}

if (process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
