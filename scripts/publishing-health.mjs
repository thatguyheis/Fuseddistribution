#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { auditPublishing } from './lib/publishing-health.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const report = auditPublishing(root, { today });
if (process.argv.includes('--write')) {
  mkdirSync(join(root, '.workflow-state'), { recursive: true });
  writeFileSync(join(root, '.workflow-state/publishing-health.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.healthy ? 0 : 1;
