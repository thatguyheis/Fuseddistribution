import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { verifiedCanonicalEquivalents } from './lib/publishing-health.mjs';

export function wakeEligible(pending, resolutions, equivalents, maxAttempts = 3) {
  if (!Array.isArray(pending.remaining) || !pending.remaining.length) return false;
  return pending.remaining.some(slug => {
    const needsReview = resolutions.some(row => row.queuedSlug === slug) && !equivalents.has(slug);
    return !needsReview || (pending.attempts?.[slug] || 0) < maxAttempts;
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const registryPath = `${process.cwd()}/.workflow-state/canonical-topic-resolutions.json`;
    const registry = existsSync(registryPath) ? JSON.parse(readFileSync(registryPath, 'utf8')) : {resolutions: []};
    const equivalents = verifiedCanonicalEquivalents(process.cwd());
    if (process.argv[2] === '--select') {
      const directory = `${process.cwd()}/public/blog/research`;
      const start = process.argv[3] || '0000-00-00';
      const today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Los_Angeles'}).format(new Date());
      for (const name of readdirSync(directory).filter(name => /^\d{4}-\d{2}-\d{2}-pending\.json$/.test(name) && name.slice(0,10) >= start && name.slice(0,10) <= today).sort()) {
        const path = `${directory}/${name}`;
        if (wakeEligible(JSON.parse(readFileSync(path, 'utf8')), registry.resolutions, equivalents)) {
          console.log(path);
          break;
        }
      }
    } else {
      const pending = JSON.parse(readFileSync(process.argv[2], 'utf8'));
      process.exitCode = wakeEligible(pending, registry.resolutions, equivalents) ? 0 : 1;
    }
  } catch (error) {
    console.error(`Cannot establish publisher wake eligibility: ${error.message}`);
    process.exitCode = 1;
  }
}
