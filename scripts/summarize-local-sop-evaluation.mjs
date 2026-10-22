#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { score, normalizeEnvelope } from './evaluate-local-sop-models.mjs';
const directory = resolve(process.argv[2] || 'ops/profit-system/model-benchmarks/sop-evaluation-2026-09-24');
const summaries = [];
for (const filename of readdirSync(directory).filter(name => name.endsWith('.json') && name !== 'summary.json')) {
  const report = JSON.parse(readFileSync(resolve(directory, filename), 'utf8'));
  if (!Array.isArray(report.cases) || !Array.isArray(report.results)) continue;
  const rows = report.results.map(row => {
    const task = report.cases.find(item => item.id === row.id);
    const normalized = typeof row.raw === 'string' ? score(task, normalizeEnvelope(row.raw)) : { pass: false };
    return { ...row, normalizedPass: normalized.pass && !row.error && row.finishReason !== 'length' };
  });
  const times = rows.map(row => row.seconds).sort((a, b) => a - b);
  const samples = rows.flatMap(row => row.memorySamples || []);
  const rss = samples.map(sample => sample.observedProcessRssKiB?.filter(line => /ollama/i.test(line)).reduce((sum, line) => sum + Number(line.trim().split(/\s+/)[0]), 0)).filter(Number.isFinite);
  summaries.push({
    file: filename, model: report.model, variant: report.variant || 'baseline',
    uniqueCases: report.cases.length, completed: Boolean(report.completedAt), responses: rows.length,
    strictPasses: rows.filter(row => row.pass).length,
    firstPassResponses: rows.filter(row => row.repeat === 0).length,
    firstPassStrict: rows.filter(row => row.repeat === 0 && row.pass).length,
    firstPassNormalized: rows.filter(row => row.repeat === 0 && row.normalizedPass).length,
    normalizedPasses: rows.filter(row => row.normalizedPass).length,
    criticalFailuresAfterNormalization: rows.filter(row => row.critical && !row.normalizedPass).map(row => `${row.id}:${row.repeat}`),
    medianSeconds: times.length ? times[Math.floor(times.length / 2)] : null,
    p95Seconds: times.length ? times[Math.ceil(times.length * 0.95) - 1] : null,
    totalSeconds: Number(rows.reduce((sum, row) => sum + row.seconds, 0).toFixed(2)),
    maxSampledOllamaRssMiB: rss.length ? Math.round(Math.max(...rss) / 1024) : null,
    swapBefore: report.memoryBefore?.swap, swapAfter: report.memoryAfterLastCall?.swap,
    failures: rows.filter(row => !row.normalizedPass).map(row => ({ id: row.id, repeat: row.repeat, checks: row.checks, error: row.error })),
  });
}
writeFileSync(resolve(directory, 'summary.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summaries }, null, 2) + '\n');
console.log(summaries.map(row => `${row.file}: strict ${row.strictPasses}/${row.responses}, normalized ${row.normalizedPasses}/${row.responses}, median ${row.medianSeconds}s, complete=${row.completed}`).join('\n'));
