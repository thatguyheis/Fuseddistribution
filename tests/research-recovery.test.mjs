import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const nightly = readFileSync('public/blog/scripts/gemma-nightly.sh', 'utf8');
const watchdog = readFileSync('scripts/ollama-publisher-watchdog.sh', 'utf8');

test('existing queue exits before topic selection or local model startup', () => {
  const root = mkdtempSync(join(tmpdir(), 'research-existing-'));
  const queue = join(root, 'queue.json');
  writeFileSync(queue, '{"posts":[{"slug":"preserved"}]}');
  const block = nightly.slice(nightly.indexOf('# An existing queue'), nightly.indexOf('# ── FD pre-flight'));
  const result = spawnSync('/bin/bash', ['-c', 'set -eu\n' + block + '\nexit 99'], {
    env: { ...process.env, QUEUE_FILE: queue }, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(queue, 'utf8'), '{"posts":[{"slug":"preserved"}]}');
  assert.ok(nightly.indexOf(block) < nightly.indexOf('SILVER_TOPICS=('));
});

test('missing queue wakes research once per generator revision', () => {
  const root = mkdtempSync(join(tmpdir(), 'research-wake-'));
  mkdirSync(join(root, 'public/blog/scripts'), { recursive: true });
  const generator = join(root, 'public/blog/scripts/gemma-nightly.sh');
  writeFileSync(generator, 'revision one');
  const block = watchdog.slice(watchdog.indexOf('# A missing queue'), watchdog.indexOf('\npending=$(oldest_pending)'));
  const harness = `set -u\nPROJECT_DIR="$1"\nLOG_FILE="$PROJECT_DIR/log"\nlog() { print -r -- "$*" >> "$LOG_FILE"; }\nlaunchctl() { print wake >> "$PROJECT_DIR/wakes"; }\ndate() { if [[ "$1" == '+%H' ]]; then print 12; else print 2026-09-15; fi; }\n${block}`;
  const run = () => {
    const r = spawnSync('/bin/zsh', ['-c', harness, 'test', root], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  };
  run(); run();
  assert.equal(readFileSync(join(root, 'wakes'), 'utf8'), 'wake\n');
  writeFileSync(generator, 'revision two');
  run();
  assert.equal(readFileSync(join(root, 'wakes'), 'utf8'), 'wake\nwake\n');
});

test('daily plan survives retries and is never a publish queue', () => {
 const root=mkdtempSync(join(tmpdir(),'daily-plan-'));
 const run=(topics)=>spawnSync('python3',['public/blog/scripts/daily-research-plan.py',root,'2026-09-25',...topics],{encoding:'utf8'});
 assert.equal(run(['silver one','silver two','tech one','tech two']).status,0);
 const path=join(root,'2026-09-25-plan.json');
 const before=readFileSync(path,'utf8');
 assert.equal(run(['replacement one','replacement two','replacement three','replacement four']).status,0);
 assert.equal(readFileSync(path,'utf8'),before);
 assert.equal(JSON.parse(before).status,'intended_production_requires_editorial_review');
 assert.equal(run(['incomplete']).status,1);
});


test('research runner separates daytime recovery from next-day preparation', () => {
  const runner = readFileSync('scripts/gemma-research-runner.sh', 'utf8');
  const block = runner.slice(runner.indexOf('TODAY='), runner.indexOf('echo "===', runner.indexOf('TODAY=')));
  for (const [hour, explicit, expected] of [['07', '', '2026-10-01'], ['12', '', '2026-10-01'], ['22', '', '2026-10-01'], ['23', '', 'unset'], ['23', '2026-09-29', '2026-09-29']]) {
    const harness = `date() { if [[ "$1" == '+%H' ]]; then print '${hour}'; else print 2026-10-01; fi; }\n${block}\nprint -r -- "\${GEMMA_RUN_DATE:-unset}"`;
    const env = {...process.env, GEMMA_RUN_DATE: explicit, BLOG_RUN_DATE: ''};
    const result = spawnSync('/bin/zsh', ['-c', harness], {cwd: tmpdir(), env, encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), expected);
  }
});
