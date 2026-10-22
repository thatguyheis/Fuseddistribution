#!/usr/bin/env node
import { verifiedCanonicalEquivalents } from './lib/publishing-health.mjs';
import { existsSync, readFileSync } from 'node:fs';

const root = process.cwd();
const equivalents = verifiedCanonicalEquivalents(root);
const queued = process.argv.find(arg => arg.startsWith('--queued='))?.slice('--queued='.length);
if (queued) {
  const canonical = equivalents.get(queued);
  if (canonical) { process.stdout.write(`${canonical}\n`); process.exit(0); }
  if (!existsSync(`${root}/.workflow-state/canonical-topic-resolutions.json`)) process.exit(0);
  const registry = JSON.parse(readFileSync(`${root}/.workflow-state/canonical-topic-resolutions.json`, 'utf8'));
  if (registry.resolutions.some(resolution => resolution?.queuedSlug === queued)) process.exit(2);
  process.exit(0);
}
process.stdout.write(`${JSON.stringify(Object.fromEntries(equivalents))}\n`);
