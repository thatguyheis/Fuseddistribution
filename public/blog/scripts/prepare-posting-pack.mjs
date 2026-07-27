#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSocialCopyQuality } from './lib/social-copy-quality.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const blogRoot = join(repoRoot, 'public', 'blog');
const videoRoot = join(repoRoot, 'video', 'out');

function usage() {
  console.error(`Usage: node public/blog/scripts/prepare-posting-pack.mjs <slug> [--media-url=https://...] [--out=path]

Creates a credential-free posting pack for:
- YouTube via Buffer
- Facebook Professional Mode profile via native Facebook tools
`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { slug: '', mediaUrl: '', out: '' };
  for (const arg of argv) {
    if (arg.startsWith('--media-url=')) args.mediaUrl = arg.slice('--media-url='.length).trim();
    else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length).trim();
    else if (arg.startsWith('--')) usage();
    else if (!args.slug) args.slug = arg;
    else usage();
  }
  if (!args.slug) usage();
  return args;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse JSON at ${path}: ${error.message}`);
  }
}

function requireFile(path, label) {
  if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
}

function cleanText(value) {
  return String(value || '')
    .replace(/[—–]/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function firstSentence(text) {
  const match = cleanText(text).match(/^(.+?[.!?])(\s|$)/);
  return match ? match[1].trim() : cleanText(text).slice(0, 90).trim();
}

function truncate(text, max) {
  const clean = cleanText(text);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}...`;
}

function buildYouTubeTitle(copy, slug) {
  const caption = copy?.reel?.youtube || copy?.reel?.instagram || copy?.reel?.facebook || '';
  return truncate(firstSentence(caption) || titleFromSlug(slug), 95);
}

function canonicalBlogUrl(slug) {
  return `https://fuseddistribution.com/blog/${slug}/`;
}

function buildYouTubeDescription(copy, slug) {
  const base = copy?.reel?.youtube || copy?.reel?.instagram || copy?.reel?.facebook || '';
  const blogUrl = canonicalBlogUrl(slug);
  const parts = [
    cleanText(base).replace(/\n+#/g, '\n\n#'),
    `Read the full post: ${blogUrl}`,
    copy.disclaimer || '',
  ].filter(Boolean);
  return cleanText(parts.join('\n\n'));
}

function buildFacebookCaption(copy) {
  const caption = copy?.reel?.facebook || copy?.photo?.facebook || '';
  const question = copy?.discussion_question || '';
  const parts = [caption, question].filter(Boolean);
  return cleanText(parts.join('\n\n'));
}

function writeMarkdown(pack, path) {
  const fb = pack.destinations.facebook_professional_profile;
  const yt = pack.destinations.youtube_buffer;
  const lines = [
    `# Posting Pack: ${pack.slug}`,
    '',
    `Generated: ${pack.generated_at}`,
    `Blog URL: ${pack.assets.blog_url}`,
    `Local video: ${pack.assets.local_video}`,
    '',
    '## YouTube via Buffer',
    '',
    `Status: ${yt.status}`,
    '',
    `Title: ${yt.title}`,
    '',
    'Description:',
    '',
    yt.description,
    '',
    'Tags:',
    '',
    yt.tags.join(', '),
    '',
    'Checklist:',
    '',
    ...yt.checklist.map((item) => `- ${item}`),
    '',
    '## Facebook Professional Profile',
    '',
    `Status: ${fb.status}`,
    '',
    'Caption:',
    '',
    fb.caption,
    '',
    'First comment:',
    '',
    fb.first_comment,
    '',
    'Checklist:',
    '',
    ...fb.checklist.map((item) => `- ${item}`),
    '',
  ];
  writeFileSync(path, `${lines.join('\n')}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.slug;
  const postDir = join(blogRoot, slug);
  const socialCopyPath = join(postDir, 'social-copy.json');
  const localVideoPath = join(videoRoot, slug, `${slug}.mp4`);
  const releaseQaPath = join(videoRoot, slug, 'release-qa.json');
  const defaultOut = join(postDir, 'posting-pack.json');
  const outPath = args.out ? resolve(args.out) : defaultOut;
  const markdownPath = outPath.replace(/\.json$/i, '.md');

  requireFile(socialCopyPath, 'social-copy.json');
  requireFile(localVideoPath, 'rendered reel MP4');
  requireFile(releaseQaPath, 'reel release QA');

  const releaseQa = readJson(releaseQaPath);
  if (!releaseQa.readyForPosting) {
    throw new Error(`Reel is not cleared for posting. Run the release check and complete its required review: ${releaseQaPath}`);
  }

  const copy = readJson(socialCopyPath);
  assertSocialCopyQuality(copy, slug);
  const hashtags = cleanText(copy.hashtags || '')
    .split(/\s+/)
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 15);

  const pack = {
    slug,
    generated_at: new Date().toISOString(),
    assets: {
      blog_url: canonicalBlogUrl(slug),
      local_video: localVideoPath,
      public_media_url: args.mediaUrl || '',
    },
    destinations: {
      youtube_buffer: {
        status: args.mediaUrl ? 'ready_for_buffer_scheduling' : 'needs_public_media_url_or_manual_buffer_upload',
        title: buildYouTubeTitle(copy, slug),
        description: buildYouTubeDescription(copy, slug),
        tags: hashtags,
        buffer_notes: args.mediaUrl
          ? 'Use public_media_url when scheduling through Buffer. Keep the Buffer API key in the local environment, not in this file.'
          : 'Upload the MP4 manually in Buffer, or rerun this script with --media-url after hosting the video at a stable public URL.',
        checklist: [
          'Open Buffer and select the connected YouTube channel.',
          'Upload the MP4 manually, or use the public media URL when API scheduling is enabled.',
          'Paste the title and description from this pack.',
          'Confirm Short/video classification, thumbnail, visibility, and scheduled time in Buffer before publishing.',
        ],
      },
      facebook_professional_profile: {
        status: 'native_manual_required',
        caption: buildFacebookCaption(copy),
        first_comment: canonicalBlogUrl(slug),
        native_notes:
          'Facebook Professional Mode personal profiles are handled through native Facebook tools. Do not use third-party API automation for this profile.',
        checklist: [
          'Open the Facebook app or Professional Dashboard for the personal professional profile.',
          'Create a Reel and upload the local MP4.',
          'Paste the caption from this pack.',
          'Publish or schedule with the native Facebook controls available in the account.',
          'Post the first comment with the blog URL after the reel is live.',
        ],
      },
    },
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(pack, null, 2)}\n`);
  writeMarkdown(pack, markdownPath);

  console.log(`[posting-pack] wrote ${outPath}`);
  console.log(`[posting-pack] wrote ${markdownPath}`);
}

try {
  main();
} catch (error) {
  console.error(`[posting-pack] ${error.message}`);
  process.exit(1);
}
