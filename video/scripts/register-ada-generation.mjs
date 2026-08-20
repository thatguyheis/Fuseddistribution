import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './audio-rights.mjs';

const arg = name => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : null;
};

function required(name) {
  const value = arg(name);
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

function main() {
  const brand = required('brand').toLowerCase();
  const platform = required('platform').toLowerCase();
  const slug = required('slug');
  const generation = Number(arg('generation') ?? 1);
  const variant = Number(arg('variant') ?? 1);
  if (!Number.isInteger(generation) || generation < 1 || !Number.isInteger(variant) || variant < 1) {
    throw new Error('generation and variant must be positive integers');
  }
  const geneticId = `ADA-${brand.toUpperCase()}-${platform.toUpperCase()}-G${String(generation).padStart(3, '0')}-V${String(variant).padStart(2, '0')}`;
  const mutationGene = arg('mutation-gene');
  const mutationFrom = arg('mutation-from');
  const mutationTo = arg('mutation-to');
  if ((mutationGene || mutationFrom || mutationTo) && !(mutationGene && mutationFrom && mutationTo)) {
    throw new Error('mutation-gene, mutation-from, and mutation-to must be supplied together');
  }
  const path = join(repoRoot, 'ops/profit-system/evolution/generations', `${geneticId}.json`);
  if (existsSync(path)) throw new Error(`Generation already exists: ${geneticId}`);
  mkdirSync(join(repoRoot, 'ops/profit-system/evolution/generations'), { recursive: true });
  const record = {
    geneticId, parentGeneticId: arg('parent') ?? null, generation, variant,
    agentId: 'hermes-local', brand, platform, slug, bufferPostId: null, status: 'registered',
    genes: {
      hookType: arg('hook-type') ?? 'unassigned', openingSeconds: Number(arg('opening-seconds') ?? 5),
      durationBucket: arg('duration-bucket') ?? '100-139', segmentDensity: arg('segment-density') ?? 'medium',
      visualPattern: arg('visual-pattern') ?? 'stat-led', captionPattern: arg('caption-pattern') ?? 'specific-question',
      questionType: arg('question-type') ?? 'binary-choice', musicMode: arg('music-mode') ?? 'approved-cycle',
      voiceProfile: 'nick-chatterbox-v1',
    },
    mutation: mutationGene ? { gene: mutationGene, from: mutationFrom, to: mutationTo, reason: arg('mutation-reason') ?? 'Bounded ADA experiment' } : null,
    qualityScores: {}, bufferSnapshots: {}, fitness: null, decision: null,
  };
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`[ada] registered ${geneticId}: ${path}`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  try { main(); } catch (error) { console.error(`[ada] ${error.message}`); process.exit(1); }
}
