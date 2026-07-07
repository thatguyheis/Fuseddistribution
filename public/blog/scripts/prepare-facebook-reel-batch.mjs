#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const blogRoot = join(repoRoot, 'public', 'blog');
const videoRoot = join(repoRoot, 'video', 'out');
const DEFAULT_LIMIT = 7;

function usage() {
  console.error(`Usage: node public/blog/scripts/prepare-facebook-reel-batch.mjs [options]

Creates a local handoff pack for manually posting Facebook reels in batches.

Options:
  --limit=N                 Number of reels to include. Default: 7.
  --slugs=a,b,c             Optional explicit reel order. Default: newest rendered posts from posts.json.
  --out=path                Output prefix, .json path, or .md path. Default: .facebook-reels-batch.
  --posted-log=path         Local posted log. Default: .facebook-reels-posted.json.
  --include-posted          Include slugs already present in the posted log.
  --mark-posted=a,b,c       Mark slugs as posted in the posted log, then exit.

Examples:
  npm run social:facebook:batch
  npm run social:facebook:batch -- --limit=7
  npm run social:facebook:batch -- --slugs=slug-one,slug-two
  npm run social:facebook:batch -- --mark-posted=slug-one,slug-two
`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = {
    limit: DEFAULT_LIMIT,
    slugs: [],
    out: join(repoRoot, '.facebook-reels-batch'),
    postedLog: join(repoRoot, '.facebook-reels-posted.json'),
    includePosted: false,
    markPosted: [],
  };

  for (const arg of argv) {
    if (arg === '--include-posted') args.includePosted = true;
    else if (arg.startsWith('--limit=')) args.limit = parsePositiveInt(arg, '--limit');
    else if (arg.startsWith('--slugs=')) args.slugs = parseSlugList(arg.slice('--slugs='.length));
    else if (arg.startsWith('--out=')) args.out = resolve(arg.slice('--out='.length));
    else if (arg.startsWith('--posted-log=')) args.postedLog = resolve(arg.slice('--posted-log='.length));
    else if (arg.startsWith('--mark-posted=')) args.markPosted = parseSlugList(arg.slice('--mark-posted='.length));
    else usage();
  }

  if (args.limit < 1 || args.limit > 50) throw new Error('--limit must be between 1 and 50.');
  return args;
}

function parsePositiveInt(arg, name) {
  const raw = arg.slice(`${name}=`.length);
  if (!/^[1-9]\d*$/.test(raw)) throw new Error(`${name} must be a positive integer.`);
  return Number(raw);
}

function parseSlugList(raw) {
  return raw
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse JSON at ${path}: ${error.message}`);
  }
}

function readJsonIfExists(path, fallback) {
  if (!path || !existsSync(path)) return fallback;
  return readJson(path);
}

function cleanText(value) {
  return String(value || '')
    .replace(/[—–]/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function canonicalBlogUrl(slug) {
  return `https://fuseddistribution.com/blog/${slug}/`;
}

function localVideoPath(slug) {
  return join(videoRoot, slug, `${slug}.mp4`);
}

function socialCopyPath(slug) {
  return join(blogRoot, slug, 'social-copy.json');
}

function reelScriptPath(slug) {
  return join(blogRoot, slug, 'reel-script.md');
}

function postedEntries(path) {
  const json = readJsonIfExists(path, []);
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.posts)) return json.posts;
  if (Array.isArray(json.posted)) return json.posted;
  return [];
}

function postedSlugs(path) {
  return new Set(
    postedEntries(path)
      .map((entry) => (typeof entry === 'string' ? entry : entry?.slug))
      .filter(Boolean),
  );
}

function writePostedLog(path, slugs) {
  const existing = postedEntries(path).map((entry) =>
    typeof entry === 'string' ? { slug: entry } : entry,
  );
  const bySlug = new Map(existing.filter((entry) => entry?.slug).map((entry) => [entry.slug, entry]));
  const postedAt = new Date().toISOString();

  for (const slug of slugs) {
    bySlug.set(slug, {
      ...bySlug.get(slug),
      slug,
      platform: 'facebook_professional_profile',
      posted_at: postedAt,
      source: 'manual_facebook_reel_batch',
    });
  }

  const log = {
    updated_at: postedAt,
    posts: [...bySlug.values()].sort((a, b) => String(b.posted_at || '').localeCompare(String(a.posted_at || ''))),
  };

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(log, null, 2)}\n`);
  console.log(`[facebook-batch] marked ${slugs.length} posted slug(s) in ${path}`);
}

function renderedBacklogFromPosts() {
  const posts = readJson(join(blogRoot, 'posts.json'));
  return posts
    .filter((post) => post?.slug)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map((post) => post.slug);
}

function postMetaBySlug() {
  const posts = readJson(join(blogRoot, 'posts.json'));
  return new Map(posts.filter((post) => post?.slug).map((post) => [post.slug, post]));
}

function buildFacebookCaption(copy) {
  const caption = copy?.reel?.facebook || copy?.photo?.facebook || '';
  const question = copy?.discussion_question || '';
  return cleanText([caption, question].filter(Boolean).join('\n\n'));
}

function extractReelScript(markdown) {
  const lines = cleanText(markdown).split('\n');
  const scriptLines = [];

  for (const line of lines) {
    const match = line.match(/^(Narration|Text|Subtext):\s*(.+)$/i);
    if (match) {
      scriptLines.push({
        type: match[1].toLowerCase(),
        text: cleanText(match[2]),
      });
    }
  }

  const narration = scriptLines
    .filter((line) => line.type === 'narration')
    .map((line) => line.text)
    .join(' ');
  const question = scriptLines.find((line) => line.type === 'text')?.text || '';
  const subtext = scriptLines.find((line) => line.type === 'subtext')?.text || '';

  return {
    narration: cleanText(narration),
    question: cleanText([question, subtext].filter(Boolean).join(' - ')),
  };
}

function truncateText(text, max) {
  const clean = cleanText(text);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}...`;
}

function reelTextSample(script) {
  const sample = [script.narration, script.question ? `Question card: ${script.question}` : '']
    .filter(Boolean)
    .join('\n\n');
  return truncateText(sample, 550);
}

function categoryForPost(copy, meta) {
  const topic = String(copy?.topic || '').toLowerCase();
  const tags = Array.isArray(meta?.tags) ? meta.tags.map((tag) => String(tag).toLowerCase()) : [];

  if (topic === 'silver' || tags.includes('silver') || tags.includes('investing')) {
    return { id: 'silver', label: 'Silver' };
  }
  if (topic === 'tech' || tags.includes('local business') || tags.includes('marketing')) {
    return { id: 'technology', label: 'Technology' };
  }
  return { id: 'other', label: 'Other' };
}

function candidateStatus(slug, posted, includePosted) {
  const missing = [];
  if (!existsSync(localVideoPath(slug))) missing.push('rendered MP4');
  if (!existsSync(socialCopyPath(slug))) missing.push('social-copy.json');
  if (!existsSync(reelScriptPath(slug))) missing.push('reel-script.md');
  if (posted.has(slug) && !includePosted) missing.push('already posted to Facebook log');
  return missing;
}

function buildItem(slug, position, meta) {
  const copy = readJson(socialCopyPath(slug));
  const scriptMarkdown = readFileSync(reelScriptPath(slug), 'utf8');
  const script = extractReelScript(scriptMarkdown);
  const blogUrl = copy.blog_url || canonicalBlogUrl(slug);
  const category = categoryForPost(copy, meta);

  return {
    position,
    slug,
    title: meta?.title || slug,
    date: meta?.date || '',
    category: category.id,
    category_label: category.label,
    blog_url: blogUrl,
    facebook_text: buildFacebookCaption(copy),
    reel_text_sample: reelTextSample(script),
  };
}

function outputPaths(out) {
  if (out.endsWith('.json')) return { json: out, markdown: out.replace(/\.json$/i, '.md') };
  if (out.endsWith('.md')) return { json: out.replace(/\.md$/i, '.json'), markdown: out };
  return { json: `${out}.json`, markdown: `${out}.md` };
}

function fenced(value) {
  return ['```text', cleanText(value), '```'];
}

function groupedItems(items) {
  const order = ['silver', 'technology', 'other'];
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.category)) {
      groups.set(item.category, {
        id: item.category,
        label: item.category_label,
        items: [],
      });
    }
    groups.get(item.category).items.push(item);
  }
  return order
    .filter((category) => groups.has(category))
    .map((category) => groups.get(category));
}

function writeMarkdown(batch, path) {
  const lines = [
    '# Facebook Reel Batch',
    '',
    `Generated: ${batch.generated_at}`,
    `Batch size: ${batch.items.length}`,
    '',
  ];

  for (const group of batch.groups) {
    lines.push(`## ${group.label}`, '');

    for (const [index, item] of group.items.entries()) {
      lines.push(
        `### ${index + 1}. ${item.title}`,
        '',
        `Blog URL: ${item.blog_url}`,
        '',
        'Facebook text:',
        '',
        ...fenced(item.facebook_text),
        '',
        'Reel text sample:',
        '',
        ...fenced(item.reel_text_sample),
        '',
      );
    }
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${lines.join('\n')}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.markPosted.length) {
    writePostedLog(args.postedLog, args.markPosted);
    return;
  }

  const posted = postedSlugs(args.postedLog);
  const metaBySlug = postMetaBySlug();
  const slugs = args.slugs.length ? args.slugs : renderedBacklogFromPosts();
  const selected = [];
  const skipped = [];

  for (const slug of [...new Set(slugs)]) {
    const reasons = candidateStatus(slug, posted, args.includePosted);
    if (reasons.length) {
      skipped.push({ slug, reasons });
      continue;
    }
    selected.push(slug);
    if (selected.length >= args.limit) break;
  }

  const batch = {
    generated_at: new Date().toISOString(),
    limit: args.limit,
    posted_log: args.postedLog,
    items: selected.map((slug, index) => buildItem(slug, index + 1, metaBySlug.get(slug))),
    skipped,
  };
  batch.groups = groupedItems(batch.items);

  const paths = outputPaths(args.out);
  mkdirSync(dirname(paths.json), { recursive: true });
  writeFileSync(paths.json, `${JSON.stringify(batch, null, 2)}\n`);
  writeMarkdown(batch, paths.markdown);

  console.log(`[facebook-batch] wrote ${paths.json}`);
  console.log(`[facebook-batch] wrote ${paths.markdown}`);
  console.log(`[facebook-batch] selected ${batch.items.length}; skipped ${batch.skipped.length}`);
}

try {
  main();
} catch (error) {
  console.error(`[facebook-batch] ${error.message}`);
  process.exit(1);
}
