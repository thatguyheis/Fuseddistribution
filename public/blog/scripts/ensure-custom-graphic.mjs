#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = resolve(__dirname, '..');
const GRAPHIC_PATTERN = /class="[^"]*\b(?:chart-wrap|stat-row|math-box|coin-grid|watch-list|social-video)\b/i;

function argValue(name) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : '';
}

function stripTags(text) {
  return String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function xml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractHeadings(markdown) {
  return [...markdown.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((heading) => heading && !/^related$/i.test(heading))
    .slice(0, 3);
}

function renderWatchList(headings) {
  const items = headings.map((heading, index) => `              <div class="watch-list-item">
                <strong>Watch ${index + 1}</strong>
                <span>${xml(heading)}</span>
              </div>`).join('\n');
  const aria = headings.map((heading) => stripTags(heading)).join('; ');
  return `            <div class="watch-list" role="img" aria-label="What this guide covers: ${xml(aria)}">
${items}
            </div>`;
}

const slug = argValue('--slug');
if (!slug) {
  console.error('error: --slug is required');
  process.exit(1);
}

const dir = join(BLOG_DIR, slug);
const htmlPath = join(dir, 'index.html');
const markdownPath = join(dir, 'verified.md');
if (!existsSync(htmlPath) || !existsSync(markdownPath)) {
  console.error('skip: missing index.html or verified.md');
  process.exit(0);
}

const html = readFileSync(htmlPath, 'utf8');
if (GRAPHIC_PATTERN.test(html)) {
  console.log('custom-graphic: already present');
  process.exit(0);
}

const headings = extractHeadings(readFileSync(markdownPath, 'utf8'));
if (headings.length === 0) {
  console.error('skip: no H2 headings available for fallback graphic');
  process.exit(0);
}

const fallbackHtml = renderWatchList(headings);
const bodyMarker = '<div class="article-body">';
const bodyIndex = html.indexOf(bodyMarker);
if (bodyIndex === -1) {
  console.error('skip: article-body not found');
  process.exit(0);
}

const firstParagraphClose = html.indexOf('</p>', bodyIndex);
const insertionPoint = firstParagraphClose === -1 ? bodyIndex + bodyMarker.length : firstParagraphClose + 4;
const updated = `${html.slice(0, insertionPoint)}\n${fallbackHtml}${html.slice(insertionPoint)}`;
writeFileSync(htmlPath, updated);
console.log('custom-graphic: injected watch-list fallback');
