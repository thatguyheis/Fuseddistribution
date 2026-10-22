import test from 'node:test';
import assert from 'node:assert/strict';
import { runLifecycle } from '../scripts/ada-lifecycle.mjs';

test('ADA lifecycle is dry-run by default and reports evidence state', () => {
  const report = runLifecycle({ date: '2026-08-26' });
  assert.equal(report.apply, false);
  assert.ok(report.records.length >= 1);
  assert.ok(report.records.every((record) => ['registered', 'distributed', 'awaiting_evidence', 'quality_blocked', 'ready_for_selection'].includes(record.status)));
});
