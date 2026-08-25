#!/usr/bin/env node
import { resolve } from 'node:path';
import { readContentPlan } from './lib/content-plan.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((item) => {
  const match = item.match(/^--([^=]+)=(.*)$/s);
  if (!match) throw new Error(`invalid argument: ${item}`);
  return [match[1], match[2]];
}));

if (!args.file) {
  console.error('Usage: node validate-content-plan.mjs --file=path [--slug=expected-slug]');
  process.exit(2);
}

try {
  const plan = readContentPlan(resolve(args.file), args.slug || '');
  console.log(`[content-plan] valid: ${plan.slug}, ${plan.sections.length} sections, ${plan.reel.sectionIds.length} Reel sections`);
} catch (error) {
  console.error(`[content-plan] ${error.message}`);
  process.exit(1);
}
