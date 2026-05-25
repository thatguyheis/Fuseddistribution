import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

export function parseReelScript(md, slug) {
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
    segments.push({
      type: 'hook',
      startSec: parseInt(hookM[1], 10),
      endSec: parseInt(hookM[2], 10),
      text: hookM[3].trim(),
      narration: null,
    });
  }

  // BODY segments
  const bodyM = md.match(/## BODY\n([\s\S]*?)(?=\n---\n## CTA|\n## CTA)/);
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
        segments.push({
          type, startSec, endSec,
          text: textM ? textM[1].trim() : '',
          narration: narrM ? cleanNarr(narrM[1]) : null,
        });
      }
    }
  }

  // CTA
  const ctaM = md.match(/## CTA \((\d+)[–\-](\d+)s\)\n([\s\S]*?)(?=\n---|\n## VISUAL|$)/);
  if (ctaM) {
    const body = ctaM[3];
    const textM = body.match(/Text:\s*(.+)/);
    const narrM = body.match(/Narration:\s*([\s\S]*?)$/);
    segments.push({
      type: 'cta',
      startSec: parseInt(ctaM[1], 10),
      endSec: parseInt(ctaM[2], 10),
      text: textM ? textM[1].trim() : body.trim(),
      narration: narrM ? narrM[1].trim() : null,
    });
  }

  return { slug, title, totalDuration, segments };
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const postArg = process.argv.find(a => a.startsWith('--post='));
  if (!postArg) { console.error('Usage: node parse-script.mjs --post=<slug>'); process.exit(1); }
  const slug = postArg.replace('--post=', '');
  const mdPath = join(__dirname, '../../blog', slug, 'reel-script.md');
  let md;
  try { md = readFileSync(mdPath, 'utf8'); }
  catch { console.error(`reel-script.md not found: ${mdPath}`); process.exit(1); }
  const script = parseReelScript(md, slug);
  const outDir = join(__dirname, '../out', slug);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'script.json');
  writeFileSync(outPath, JSON.stringify(script, null, 2));
  console.log(`Parsed ${script.segments.length} segments → ${outPath}`);
}
