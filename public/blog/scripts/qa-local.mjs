#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseReelScript } from '../../../video/scripts/parse-script.mjs';
import { validateReelScript } from '../../../video/scripts/validate-reel.mjs';

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

function validateTextSurface(label, text, blockers) {
  pushIf(/\[SLOT]|\[VERIFY]/i.test(text), blockers, `${label}: leftover placeholder`);
  pushIf(/\[[A-Z][A-Za-z0-9 _-]{2,}\]/.test(text), blockers, `${label}: unreplaced bracket placeholder`);
  pushIf(/\bNote:\s*Replace\b/i.test(text), blockers, `${label}: leftover replacement instruction`);
  pushIf(/[—–]/.test(text), blockers, `${label}: contains em/en dash`);
  pushIf(/\b(?:19|20|21)\d{3,}\b/.test(text), blockers, `${label}: suspicious malformed year`);
  pushIf(/\b20[3-9]\d\b/.test(text), blockers, `${label}: future year needs manual source check`);
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

function validateReelMarkdown(reelScriptPath, reelDataPath, slug, blockers) {
  if (!existsSync(reelScriptPath)) {
    blockers.push('missing reel-script.md');
    return;
  }

  const md = readText(reelScriptPath);
  const reelData = readText(reelDataPath);
  validateTextSurface('reel-script.md', md, blockers);

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

function validateHtml(htmlPath, blockers) {
  const html = readText(htmlPath);
  pushIf(!html, blockers, 'missing index.html');
  validateTextSurface('index.html', html, blockers);
  pushIf(html && !/<script type="application\/ld\+json">/i.test(html), blockers, 'index.html missing JSON-LD schema');
  if (html) {
    validateTopicCoherence(html, blockers);
    validateSectionRepetition(html, blockers);
  }
}

function main() {
  const slug = argValue('--slug') || process.argv.find((arg) => !arg.startsWith('--'));
  if (!slug) {
    console.error('usage: qa-local.mjs --slug=<slug> [--out=<path>]');
    process.exit(2);
  }

  const dir = join(BLOG_DIR, slug);
  const outPath = argValue('--out', join(dir, 'qa.json'));
  const blockers = [];

  validateHtml(join(dir, 'index.html'), blockers);
  validateSocial(join(dir, 'social-copy.json'), blockers);
  validateReelMarkdown(join(dir, 'reel-script.md'), join(dir, 'reel-data.md'), slug, blockers);

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
