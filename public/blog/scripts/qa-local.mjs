#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseReelScript } from '../../../video/scripts/parse-script.mjs';
import { validateReelScript } from '../../../video/scripts/validate-reel.mjs';
import { findUncitedSources } from './lib/sourced-stats.mjs';
import { validateChart } from './build-chart-inject.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = resolve(__dirname, '..');

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function pushIf(condition, blockers, message) {
  if (condition) blockers.push(message);
}

function collectStrings(value, path = []) {
  if (typeof value === 'string') return [{ path: path.join('.'), value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => collectStrings(item, [...path, String(index)]));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => collectStrings(item, [...path, key]));
  }
  return [];
}

function validateTextSurface(label, text, blockers, allowedFutureYears = new Set()) {
  pushIf(/\[SLOT]|\[VERIFY]/i.test(text), blockers, `${label}: leftover placeholder`);
  // Model instructions often include a colon inside placeholders such as
  // [SOURCED STATS: ...], so validate the whole bracketed instruction rather
  // than only the narrow alphanumeric form.
  pushIf(/\[[A-Z][^\]\n]{2,}\]/.test(text), blockers, `${label}: unreplaced bracket placeholder`);
  pushIf(/\bNote:\s*Replace\b/i.test(text), blockers, `${label}: leftover replacement instruction`);
  pushIf(/\b(?:REQUIREMENTS:|Output ONLY the markdown article|Claude: apply writing rules|Topic contract is mandatory)\b/i.test(text), blockers, `${label}: model prompt leaked into publishable content`);
  pushIf(/\bHere (?:are|is) (?:six-word|6-word).*(?:alt texts?|options?)\b/i.test(text), blockers, `${label}: model option preamble leaked into publishable content`);
  pushIf(/[—–]/.test(text), blockers, `${label}: contains em/en dash`);
  // HTML attributes contain opaque identifiers (for example social post IDs)
  // that can be much longer than a year. Validate the rendered text surface
  // for year checks so a URL cannot turn a valid post into a false quality
  // failure, while preserving the check for malformed years in copy.
  const yearSurface = label === 'index.html' ? textFromHtml(text) : text;
  pushIf(/\b(?:19|20|21)\d{3,}\b/.test(yearSurface), blockers, `${label}: suspicious malformed year`);
  const futureYears = [...yearSurface.matchAll(/\b20[3-9]\d\b/g)].map((match) => match[0]);
  pushIf(futureYears.some((year) => !allowedFutureYears.has(year)), blockers, `${label}: future year needs manual source check`);
  pushIf(/\$\s*\d+(?:\.\d{2})?\s+(?:to|-)\s+\$\s*\d+\.\d{2}\b/i.test(text), blockers, `${label}: budget range uses cents; likely numeric typo`);
}

const TOPIC_STOPWORDS = new Set([
  'about', 'after', 'again', 'against', 'alongside', 'before', 'best', 'better',
  'business', 'businesses', 'complete', 'does', 'explained', 'from', 'getting',
  'find', 'found', 'guide', 'into', 'local', 'more', 'need', 'needs', 'small',
  'step', 'stop', 'that', 'their', 'them', 'they', 'this', 'what', 'when',
  'where', 'which', 'while', 'with', 'without', 'your', '2025', '2026',
]);

const REPETITION_STOPWORDS = new Set([
  ...TOPIC_STOPWORDS,
  'also', 'because', 'been', 'being', 'could', 'down', 'each', 'even', 'first',
  'have', 'here', 'just', 'like', 'make', 'many', 'most', 'much', 'must', 'only',
  'over', 'same', 'should', 'some', 'than', 'then', 'there', 'these', 'thing',
  'things', 'through', 'time', 'using', 'very', 'were', 'will', 'work', 'works',
]);

function textFromHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractArticleBody(html) {
  return html.match(/<div class="article-body">([\s\S]*?)<\/article>/i)?.[1] ?? html;
}

function extractTitle(html) {
  const raw = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    ?? html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?? '';
  return textFromHtml(raw).replace(/\s*\|\s*Fused.*$/i, '').trim();
}

function words(text) {
  return text.toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
}

function topicTokens(title) {
  const tokens = words(title)
    .filter((word) => word.length >= 4 && !TOPIC_STOPWORDS.has(word));
  return [...new Set(tokens)].slice(0, 8);
}

function validateTopicCoherence(html, blockers) {
  const bodyHtml = extractArticleBody(html);
  const title = extractTitle(html);
  const tokens = topicTokens(title);
  if (tokens.length < 2) return;

  const h2s = [...bodyHtml.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((match) => textFromHtml(match[1]))
    .filter((h2) => h2 && !/^related$/i.test(h2));
  if (h2s.length === 0) return;

  const h2Hits = h2s.filter((h2) => {
    const set = new Set(words(h2));
    return tokens.some((token) => set.has(token));
  });
  pushIf(h2Hits.length === 0, blockers, `topic coherence: no H2 contains title topic terms (${tokens.join(', ')})`);
}

function sectionWordSet(sectionHtml) {
  const sectionWords = words(textFromHtml(sectionHtml))
    .filter((word) => word.length >= 4 && !REPETITION_STOPWORDS.has(word));
  return new Set(sectionWords);
}

function jaccard(a, b) {
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function validateSectionRepetition(html, blockers) {
  const bodyHtml = extractArticleBody(html);
  const chunks = bodyHtml.split(/<h2\b[^>]*>[\s\S]*?<\/h2>/i).slice(1);
  const sections = chunks
    .map(sectionWordSet)
    .filter((set) => set.size >= 45);

  for (let i = 0; i < sections.length; i += 1) {
    for (let j = i + 1; j < sections.length; j += 1) {
      const similarity = jaccard(sections[i], sections[j]);
      if (similarity >= 0.72) {
        blockers.push(`section repetition: H2 sections ${i + 1} and ${j + 1} are too similar (${similarity.toFixed(2)})`);
        return;
      }
    }
  }
}

function validateSilverTaxAccuracy(html, slug, blockers) {
  if (!/\bsilver\b/i.test(slug) && !/\bsilver\b/i.test(html)) return;
  const text = textFromHtml(html);
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!/\b(?:irs|form 1099-b|form 8300|form 8949|schedule d|capital gains?)\b/i.test(normalized)) return;

  // These patterns reflect a known published failure mode: claiming that
  // personal silver purchases themselves trigger IRS reporting thresholds.
  pushIf(
    /\b(?:reporting threshold is|threshold is)\s*\$200\b/i.test(normalized),
    blockers,
    'financial accuracy: unsupported $200 silver reporting threshold claim',
  );
  pushIf(
    /\b(?:if you(?:'re| are)? buying silver|if you purchase silver|if you buy silver|buying silver coins|silver coin purchases?)\b[^.]{0,180}\b(?:must|need to|required to)\b[^.]{0,120}\breport\b/i.test(normalized),
    blockers,
    'financial accuracy: article claims silver purchases themselves trigger personal IRS reporting',
  );
  pushIf(
    /\bpurchases?\b[^.]{0,140}\$10,000[^.]{0,140}\b(?:report|form 1099-b)\b/i.test(normalized),
    blockers,
    'financial accuracy: article ties a $10,000 silver purchase threshold to IRS reporting',
  );
  pushIf(
    /\bschedule b of form 8949\b/i.test(normalized),
    blockers,
    'financial accuracy: invalid "Schedule B of Form 8949" filing reference',
  );
  pushIf(
    /\bform 1099-b\b[^.]{0,160}\bpurchas/i.test(normalized) || /\bpurchas[^.]{0,160}\bform 1099-b\b/i.test(normalized),
    blockers,
    'financial accuracy: article conflates Form 1099-B with buyer purchase reporting',
  );
}

function validateSocial(socialPath, blockers) {
  if (!existsSync(socialPath)) {
    blockers.push('missing social-copy.json');
    return;
  }

  let social;
  try {
    social = JSON.parse(readText(socialPath));
  } catch {
    blockers.push('social-copy.json is invalid JSON');
    return;
  }

  for (const { path, value } of collectStrings(social)) {
    validateTextSurface(`social-copy.json ${path}`, value, blockers);
  }

  const x = social?.reel?.x;
  pushIf(typeof x !== 'string' || x.length > 280, blockers, 'social-copy.json reel.x missing or over 280 characters');
  pushIf(typeof social?.discussion_question !== 'string' || !social.discussion_question.trim().endsWith('?'), blockers, 'discussion_question must be a complete question');
  pushIf(!social?.blog_url || !String(social.blog_url).includes(`/blog/${social.slug}/`), blockers, 'blog_url missing expected slug URL');
}

const STOP_LABEL_ENDINGS = new Set([
  'A', 'AN', 'AND', 'AROUND', 'AT', 'BY', 'FOR', 'FROM', 'IN', 'INTO', 'OF', 'ON',
  'OR', 'THE', 'THEN', 'TO', 'WITH', 'WITHOUT', 'YOUR',
]);

function validateReelMarkdown(reelScriptPath, reelDataPath, slug, blockers, allowedFutureYears) {
  if (!existsSync(reelScriptPath)) {
    blockers.push('missing reel-script.md');
    return;
  }

  const md = readText(reelScriptPath);
  const reelData = readText(reelDataPath);
  validateTextSurface('reel-script.md', md, blockers, allowedFutureYears);

  let script;
  try {
    script = parseReelScript(md, slug, reelData);
  } catch (error) {
    blockers.push(`reel-script.md parse failed: ${error.message}`);
    return;
  }

  const result = validateReelScript(script);
  for (const error of result.errors) blockers.push(`reel validation: ${error}`);

  for (const [index, segment] of script.segments.entries()) {
    if (!['stat', 'overlay'].includes(segment.type)) continue;
    const text = String(segment.text ?? '').trim();
    const words = text.split(/\s+/).filter(Boolean);
    const last = words.at(-1)?.replace(/[^A-Z0-9%$]/gi, '').toUpperCase();
    pushIf(words.length < 2, blockers, `reel segment ${index}: label too short`);
    pushIf(last && STOP_LABEL_ENDINGS.has(last), blockers, `reel segment ${index}: label ends with filler word "${last}"`);
    pushIf(/\b(?:IN AND|IN THAT|TO MILES|FOR A FREE MINUTE|JUST FROM)\b/i.test(text), blockers, `reel segment ${index}: awkward generated label "${text}"`);
  }
}

function validateInlineLinks(html, blockers, slugDirRoot, selfSlug) {
  // NB: the T7 template has no </article>; fall back to </body> (always present)
  const bodyMatch = html.match(/<div class="article-body">([\s\S]*?)(?=<h2\b[^>]*>\s*Related\s*<\/h2>|<\/article>|<\/body>)/i);
  if (!bodyMatch) { blockers.push('inline links: article-body not found'); return; }
  const body = bodyMatch[1];

  // Check 1: >=2 inline internal links before the Related block
  const inline = (body.match(/href="\/blog\/[a-z0-9-]+\/"/g) || []);
  pushIf(inline.length < 2, blockers, `inline internal links: ${inline.length} found, need >=2`);

  // Check 2: Related block with >=2 items + Read next line
  const relatedBlock = html.match(/<h2\b[^>]*>\s*Related\s*<\/h2>([\s\S]*?)(?=<h2\b|<\/div>)/i)?.[1] ?? '';
  const relatedLinks = (relatedBlock.match(/href="\/blog\//g) || []).length;
  pushIf(relatedLinks < 2, blockers, `related block: ${relatedLinks} links, need >=2`);
  pushIf(!/Read next:/i.test(html), blockers, 'missing Read next line');

  // Check 3: every internal blog link target exists locally (HTTP would be
  // flaky mid-pipeline; the current post is not deployed yet)
  const targets = [...html.matchAll(/href="\/blog\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
  for (const t of new Set(targets)) {
    if (t === selfSlug) continue;
    pushIf(!existsSync(join(slugDirRoot, t, 'index.html')), blockers, `link target missing: /blog/${t}/`);
  }

  // Check 4: bare internal paths in prose (text nodes, not attributes)
  const text = textFromHtml(body);
  pushIf(/(^|[^\w"'=\/])\/(reserve|blog\/[a-z0-9-]+)\/(\s|[.,)]|$)/.test(text), blockers, 'bare internal path in prose');
}

function validateSourcedStats(html, blockers, slug) {
  // Fabricated stat attributions: any named-source claim in body prose must
  // trace to research.json (see lib/sourced-stats.mjs).
  const bodyMatch = html.match(/<div class="article-body">([\s\S]*?)(?=<\/article>|<\/body>)/i);
  const text = textFromHtml(bodyMatch ? bodyMatch[1] : html);
  for (const { source, count } of findUncitedSources(text, join(BLOG_DIR, slug, 'research.json'))) {
    blockers.push(`uncited stat attribution: "${source}" (${count}x) not in research.json`);
  }
}

function validateCustomGraphic(html, blockers) {
  const visualPatterns = [
    /class="[^"]*\bchart-wrap\b/i,
    /class="[^"]*\bstat-row\b/i,
    /class="[^"]*\bmath-box\b/i,
    /class="[^"]*\bcoin-grid\b/i,
    /class="[^"]*\bwatch-list\b/i,
    /class="[^"]*\bsocial-video\b/i,
  ];
  pushIf(!visualPatterns.some(pattern => pattern.test(html)), blockers, 'custom graphic: none found');
}

function validateNumericVisual(slug, blockers) {
  const dir = join(BLOG_DIR, slug);
  const visualPath = join(dir, 'chart.json');
  if (!existsSync(visualPath)) return;
  let visual;
  try { visual = JSON.parse(readText(visualPath)); }
  catch { blockers.push('numeric visual: chart.json is invalid JSON'); return; }
  if (visual.skipped) return;
  pushIf(visual.schema_version !== 2, blockers, 'numeric visual: schema_version 2 required');
  const sourceText = [readText(join(dir, 'verified.md')), readText(join(dir, 'research.json'))].join('\n');
  for (const error of validateChart(visual, sourceText)) blockers.push(`numeric visual: ${error}`);
}

function validateHtml(htmlPath, blockers, slug, allowedFutureYears) {
  const html = readText(htmlPath);
  pushIf(!html, blockers, 'missing index.html');
  validateTextSurface('index.html', html, blockers, allowedFutureYears);
  pushIf(html && !/<script type="application\/ld\+json">/i.test(html), blockers, 'index.html missing JSON-LD schema');
  if (html) {
    pushIf(/href="[^"]*(?:SOURCED STATS|\]\(|\[https?:)/i.test(html), blockers, 'index.html: malformed source markup leaked into href');
    validateTopicCoherence(html, blockers);
    validateSectionRepetition(html, blockers);
    validateInlineLinks(html, blockers, BLOG_DIR, slug);
    validateSourcedStats(html, blockers, slug);
    validateCustomGraphic(html, blockers);
    validateSilverTaxAccuracy(html, slug, blockers);
  }
}

function main() {
  const slug = argValue('--slug') || process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  if (!slug) {
    console.error('usage: qa-local.mjs --slug=<slug> [--out=<path>]');
    process.exit(2);
  }

  const dir = join(BLOG_DIR, slug);
  const outPath = argValue('--out', join(dir, 'qa.json'));
  const blockers = [];
  const researchText = readText(join(dir, 'research.json'));
  const allowedFutureYears = new Set(researchText.match(/\b20[3-9]\d\b/g) ?? []);

  validateHtml(join(dir, 'index.html'), blockers, slug, allowedFutureYears);
  validateNumericVisual(slug, blockers);
  validateSocial(join(dir, 'social-copy.json'), blockers);
  validateReelMarkdown(join(dir, 'reel-script.md'), join(dir, 'reel-data.md'), slug, blockers, allowedFutureYears);

  const pass = blockers.length === 0;
  const qa = {
    slug,
    score: pass ? 90 : 0,
    pass,
    blockers,
    mode: 'deterministic-local',
  };

  writeFileSync(outPath, `${JSON.stringify(qa, null, 2)}\n`);
  if (pass) {
    console.log(`[qa-local] pass ${slug}`);
    return;
  }

  console.error(`[qa-local] fail ${slug}: ${blockers.join('; ')}`);
  process.exit(1);
}

main();
