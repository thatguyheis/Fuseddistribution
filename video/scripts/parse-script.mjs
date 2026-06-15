import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse chart data from reel-data.md (new long-form format)
function parseReelDataChart(reelDataMd) {
  if (!reelDataMd) return { title: '', bars: [] };
  // Split into sections by \n## to find the chart section
  const sections = reelDataMd.split(/\n(?=## )/);
  const chartSection = sections.find(s => /^## chart\b/i.test(s.trim()));
  if (!chartSection) return { title: '', bars: [] };
  const titleM = chartSection.match(/^title:\s*(.+)/m);
  const title = titleM ? titleM[1].trim() : '';
  // Extract bars: block (indented list after "bars:")
  const barsM = chartSection.match(/^bars:\n((?:[ \t]*-[^\n]*\n?)+)/m);
  const bars = [];
  if (barsM) {
    for (const line of barsM[1].split('\n')) {
      const m = line.match(/^\s*-\s+(.+?):\s*~?(\d+(?:\.\d+)?)%/);
      if (m) bars.push({ label: m[1].trim(), value: parseFloat(m[2]) });
    }
  }
  return { title, bars };
}

// Parse hook display text from reel-data.md
function parseReelDataHook(reelDataMd) {
  if (!reelDataMd) return '';
  const m = reelDataMd.match(/^hook:\s*(.+)/m);
  return m ? m[1].trim() : '';
}

// Compute segment duration from narration word count (words / 2.5 wps + 2s buffer)
function durationFromNarration(narration) {
  if (!narration) return 10;
  return Math.ceil(narration.split(/\s+/).filter(Boolean).length / 2.5) + 2;
}

// New long-form format: ## HOOK / ## STAT: label / ## CHART: label / ## SEGMENT N: label / ## QUESTION
// May or may not have **Duration:** Xs minimum fields; falls back to word-count timing
function parseNewLongFormScript(md, slug, reelDataMd) {
  const titleLine = md.split('\n').find(l => l.startsWith('# Reel Script:'));
  const title = titleLine ? titleLine.replace('# Reel Script:', '').trim() : '';
  const { title: chartTitle, bars: chartBars } = parseReelDataChart(reelDataMd);
  const hookText = parseReelDataHook(reelDataMd);
  const stripQ = s => s ? s.replace(/^["']+|["']+$/g, '').trim() : s;

  const segments = [];
  let currentSec = 0;

  for (const section of md.split(/\n---\n/)) {
    const s = section.trim();
    if (!s.startsWith('##')) continue;

    // Extract narration: everything after "Narration: " until blank line or another field
    const narrIdx = s.indexOf('\nNarration: ');
    let narration = null;
    if (narrIdx >= 0) {
      const raw = s.slice(narrIdx + '\nNarration: '.length);
      const stop = raw.search(/\n\n\S/);
      narration = (stop >= 0 ? raw.slice(0, stop) : raw).trim();
    }

    // Duration: explicit **Duration:** field, or compute from word count
    const durM = s.match(/\*\*Duration:\*\*\s*(\d+)s/);
    const dur = durM ? parseInt(durM[1], 10) : durationFromNarration(narration);
    const startSec = currentSec;
    const endSec = currentSec + dur;

    if (/^## HOOK\b/m.test(s)) {
      segments.push({
        type: 'hook',
        startSec, endSec,
        text: hookText || (narration || '').split(/\.\s+/)[0] + '.',
        narration,
      });
    } else if (/^## STAT:/m.test(s)) {
      const labelM = s.match(/^## STAT:\s*(.+)/m);
      segments.push({ type: 'stat', startSec, endSec, text: labelM ? labelM[1].trim() : '', narration });
    } else if (/^## SEGMENT\s+\d+:/m.test(s)) {
      const labelM = s.match(/^## SEGMENT\s+\d+:\s*(.+)/m);
      const label = labelM ? labelM[1].trim() : '';
      // Detect if this is a chart segment by label
      if (/chart/i.test(label)) {
        segments.push({ type: 'chart', startSec, endSec, title: chartTitle, bars: chartBars, narration });
      } else {
        segments.push({ type: 'stat', startSec, endSec, text: label.toUpperCase(), narration });
      }
    } else if (/^## CHART:/m.test(s)) {
      segments.push({ type: 'chart', startSec, endSec, title: chartTitle, bars: chartBars, narration });
    } else if (/^## QUESTION\b/m.test(s)) {
      const textM = s.match(/^Text(?:\s+on\s+screen)?:\s*(.+)/m);
      const subtextM = s.match(/^Subtext:\s*(.+)/m);
      const seg = {
        type: 'question', startSec, endSec,
        text: textM ? stripQ(textM[1].trim()) : '',
        narration,
      };
      if (subtextM) seg.subtext = stripQ(subtextM[1].trim());
      segments.push(seg);
    } else {
      continue; // skip non-segment sections (visual direction, etc.)
    }

    currentSec = endSec;
  }

  const lastSeg = segments[segments.length - 1];
  return { slug, title, totalDuration: lastSeg ? lastSeg.endSec : 0, segments };
}

function parseBars(barsText) {
  return barsText
    .split('\n')
    .filter(l => l.trim().startsWith('-'))
    .map(line => {
      const m = line.match(/^-\s+(.+?):\s+(\d+)%/);
      return m ? { label: m[1].trim(), value: parseInt(m[2], 10) } : null;
    })
    .filter(Boolean);
}

export function parseReelScript(md, slug, reelDataMd = null) {
  // Detect new long-form format (no inline timestamps in section headers)
  const headerBlock = md.split('\n').slice(0, 6).join('\n');
  if (/^format:\s*long-form/im.test(headerBlock)) {
    return parseNewLongFormScript(md, slug, reelDataMd);
  }

  const lines = md.split('\n');

  const titleLine = lines.find(l => l.startsWith('# Reel Script:'));
  const title = titleLine ? titleLine.replace('# Reel Script:', '').trim() : '';

  const durLine = lines.find(l => l.startsWith('Target length:'));
  const durMatch = durLine?.match(/(\d+)/);
  const totalDuration = durMatch ? parseInt(durMatch[1], 10) : 0;

  const segments = [];

  // HOOK
  const hookM = md.match(/## HOOK \((\d+)[–\-](\d+)s\)\n([\s\S]*?)(?=\n---|\n## )/);
  if (hookM) {
    const hookBody = hookM[3];
    const hookTextM = hookBody.match(/Text:\s*(.+)/);
    const hookNarrM = hookBody.match(/Narration:\s*([\s\S]*?)$/);
    const stripQuotes = (s) => s ? s.replace(/^["']+|["']+$/g, '').trim() : s;
    const cleanNarr = (s) => s ? s.trim().replace(/\s*\n---\s*$/, '').trim() : null;
    segments.push({
      type: 'hook',
      startSec: parseInt(hookM[1], 10),
      endSec: parseInt(hookM[2], 10),
      text: hookTextM ? stripQuotes(hookTextM[1].trim()) : hookBody.trim(),
      narration: hookNarrM ? cleanNarr(hookNarrM[1]) : null,
    });
  }

  // BODY segments
  const bodyM = md.match(/## BODY\n([\s\S]*?)(?=\n---\n## CTA|\n## CTA|\n---\n## QUESTION|\n## QUESTION)/);
  if (bodyM) {
    const blockRe = /\*\*([^*]+)\*\*\s*\((\d+)[–\-](\d+)s\)([\s\S]*?)(?=\n\*\*[^*]+\*\*\s*\(\d|$)/g;
    let m;
    while ((m = blockRe.exec(bodyM[1])) !== null) {
      const label = m[1].toLowerCase().trim();
      const startSec = parseInt(m[2], 10);
      const endSec = parseInt(m[3], 10);
      const body = m[4];

      if (label.includes('chart')) {
        const titleM2 = body.match(/Title:\s*(.+)/);
        const barsM = body.match(/Bars:\n([\s\S]*?)(?=Narration:|$)/);
        const narrM = body.match(/Narration:\s*([\s\S]*?)$/);
        const cleanNarr = (s) => s ? s.trim().replace(/\s*\n---\s*$/, '').trim() : null;
        segments.push({
          type: 'chart',
          startSec, endSec,
          title: titleM2 ? titleM2[1].trim() : '',
          bars: barsM ? parseBars(barsM[1]) : [],
          narration: narrM ? cleanNarr(narrM[1]) : null,
        });
      } else {
        const type = label.includes('stat') ? 'stat' : 'overlay';
        const textM = body.match(/Text:\s*(.+)/);
        const narrM = body.match(/Narration:\s*([\s\S]*?)$/);
        const cleanNarr = (s) => s ? s.trim().replace(/\s*\n---\s*$/, '').trim() : null;
        const stripQuotes = (s) => s ? s.replace(/^["']+|["']+$/g, '').trim() : s;
        const explanationM = body.match(/Explanation:\s*(.+)/);
        const graphicTypeM = body.match(/Graphic_type:\s*(\S+)/i);

        let graphicData = undefined;
        const graphicFieldRe = /Graphic_([a-z_]+):\s*(.+)/gi;
        let gm;
        while ((gm = graphicFieldRe.exec(body)) !== null) {
          const key = gm[1].toLowerCase();
          const raw = gm[2].trim();
          if (!graphicData) graphicData = {};
          graphicData[key] = isNaN(Number(raw)) ? raw : Number(raw);
        }

        const seg = {
          type, startSec, endSec,
          text: textM ? stripQuotes(textM[1].trim()) : '',
          narration: narrM ? cleanNarr(narrM[1]) : null,
        };
        if (explanationM) seg.explanation = explanationM[1].trim();
        if (graphicTypeM) seg.graphic_type = graphicTypeM[1].trim().toLowerCase();
        if (graphicData) seg.graphic = graphicData;
        segments.push(seg);
      }
    }
  }

  // CTA (legacy — keep for backward compat)
  const ctaM = md.match(/## CTA \((\d+)[–\-](\d+)s\)\n([\s\S]*?)(?=\n---|\n## VISUAL|\n## QUESTION|$)/);
  if (ctaM) {
    const body = ctaM[3];
    const textM = body.match(/Text:\s*(.+)/);
    const narrM = body.match(/Narration:\s*([\s\S]*?)$/);
    segments.push({
      type: 'cta',
      startSec: parseInt(ctaM[1], 10),
      endSec: parseInt(ctaM[2], 10),
      text: textM ? textM[1].trim().replace(/^["']+|["']+$/g, '') : body.trim(),
      narration: narrM ? narrM[1].trim() : null,
    });
  }

  // QUESTION (new closing segment — replaces CTA for long-form reels)
  const questionM = md.match(/## QUESTION \((\d+)[–\-](\d+)s\)\n([\s\S]*?)(?=\n---|\n## VISUAL|$)/);
  if (questionM) {
    const body = questionM[3];
    const textM = body.match(/Text:\s*(.+)/);
    const subtextM = body.match(/Subtext:\s*(.+)/);
    const narrM = body.match(/Narration:\s*([\s\S]*?)$/);
    const seg = {
      type: 'question',
      startSec: parseInt(questionM[1], 10),
      endSec: parseInt(questionM[2], 10),
      text: textM ? textM[1].trim().replace(/^["']+|["']+$/g, '') : body.trim(),
      narration: narrM ? narrM[1].trim() : null,
    };
    if (subtextM) seg.subtext = subtextM[1].trim().replace(/^["']+|["']+$/g, '');
    segments.push(seg);
  }

  // Derive totalDuration from last segment so composition ends exactly when content ends.
  // Never use the "Target length:" header value — it may exceed actual segment end, causing a black gap.
  const lastSeg = segments[segments.length - 1];
  const derivedDuration = lastSeg ? lastSeg.endSec : totalDuration;
  return { slug, title, totalDuration: derivedDuration, segments };
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const postArg = process.argv.find(a => a.startsWith('--post='));
  const reelArg = process.argv.find(a => a.startsWith('--reel='));
  if (!postArg) { console.error('Usage: node parse-script.mjs --post=<slug> [--reel=N]'); process.exit(1); }
  const slug = postArg.replace('--post=', '');
  const reelN = reelArg ? reelArg.replace('--reel=', '') : null;
  const scriptFile = reelN ? `reel-script-${reelN}.md` : 'reel-script.md';
  const mdPath = join(__dirname, '../../public/blog', slug, scriptFile);
  let md;
  try { md = readFileSync(mdPath, 'utf8'); }
  catch { console.error(`${scriptFile} not found: ${mdPath}`); process.exit(1); }
  let reelDataMd = null;
  try { reelDataMd = readFileSync(join(__dirname, '../../public/blog', slug, 'reel-data.md'), 'utf8'); } catch {}
  const script = parseReelScript(md, slug, reelDataMd);
  const outDir = join(__dirname, '../out', slug);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'script.json');
  writeFileSync(outPath, JSON.stringify(script, null, 2));
  console.log(`Parsed ${script.segments.length} segments → ${outPath}`);
}
