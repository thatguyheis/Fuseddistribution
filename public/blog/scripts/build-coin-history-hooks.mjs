#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const slug = process.argv.find((arg) => arg.startsWith('--slug='))?.slice(7);
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  throw new Error('usage: build-coin-history-hooks.mjs --slug=<slug>');
}

const directory = join(process.cwd(), 'public/blog', slug);
const plan = JSON.parse(readFileSync(join(directory, 'content-plan.json'), 'utf8'));
const social = JSON.parse(readFileSync(join(directory, 'social-copy.json'), 'utf8'));
const hook = String(plan.reel?.promise || '').trim();
const question = String(social.discussion_question || '').trim();
const hashtags = Array.isArray(social.hashtags) ? social.hashtags.join(' ') : '';
if (!hook || hook.split(/\s+/).length > 14) throw new Error('approved coin-history hook is missing or too long');
if (!question.endsWith('?') || question.split(/\s+/).length > 10) throw new Error('coin-history discussion question must be readable and end in a question mark');
if (!hashtags) throw new Error('coin-history hashtags are missing');

const output = {
  hook,
  hook_type: 'historical_reveal',
  key_stat: { value: '', label: '' },
  discussion_question: question,
  engagement_type: 'debate',
  content_kind: 'educate',
  hashtags,
};
writeFileSync(join(directory, 'hooks.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`coin-history hooks: source-mapped deterministic checkpoint written for ${slug}`);
