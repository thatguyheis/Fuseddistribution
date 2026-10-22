import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

// Conservative operating budget below the observed account limits. All callers
// reserve before sending, so failed HTTP attempts count too.
export const requestWindows = [
  { milliseconds: 900_000, limit: 80 },
  { milliseconds: 86_400_000, limit: 90 },
  { milliseconds: 2_592_000_000, limit: 2700 },
];

export function budgetDecision(requests, now, windows = requestWindows) {
  const blocked = windows.flatMap(({ milliseconds, limit }) => {
    const recent = requests.filter(time => time > now - milliseconds).sort((a, b) => a - b);
    return recent.length >= limit ? [recent[recent.length - limit] + milliseconds] : [];
  });
  return blocked.length ? Math.max(...blocked) : null;
}

export function reserveBufferRequest(path, { now = Date.now(), windows = requestWindows, reserve = 0 } = {}) {
  if (!Number.isInteger(reserve) || reserve < 0 || windows.some(w => reserve >= w.limit)) throw new Error('Invalid scheduling request reserve');
  mkdirSync(dirname(path), { recursive: true });
  const lock = `${path}.lock`;
  try { mkdirSync(lock); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let pid;
    try { pid = Number(readFileSync(`${lock}/pid`, 'utf8')); } catch { throw new Error('Buffer budget lock owner unknown; defer request'); }
    if (!Number.isInteger(pid) || pid <= 0) throw new Error('Buffer budget lock owner invalid; defer request');
    try { process.kill(pid, 0); throw new Error('Buffer budget lock busy; defer request'); }
    catch (probe) { if (probe.code !== 'ESRCH') throw probe; }
    renameSync(lock, `${lock}.stale.${now}.${process.pid}`);
    mkdirSync(lock);
  }
  writeFileSync(`${lock}/pid`, String(process.pid));
  try {
    let state = { requests: [] };
    try { state = JSON.parse(readFileSync(path, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!Array.isArray(state.requests) || state.requests.some(time => !Number.isFinite(time))) throw new Error('Invalid Buffer request ledger');
    const requests = state.requests.filter(time => time > now - Math.max(...windows.map(w => w.milliseconds)));
    const due = budgetDecision(requests, now, windows.map(w => ({...w,limit:w.limit-reserve})));
    if (due) {
      const error = new Error(`Buffer request budget exhausted; retryAt=${new Date(due).toISOString()}`);
      error.retryAt = due;
      throw error;
    }
    requests.push(now);
    const temporary = `${path}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify({ requests, updatedAt: new Date(now).toISOString() }) + '\n');
    renameSync(temporary, path);
  } finally {
    renameSync(lock, `${lock}.finished.${now}.${randomUUID()}`);
  }
}

export function remainingBufferRequests(path, now = Date.now(), windows = requestWindows) {
  let requests = [];
  try { requests = JSON.parse(readFileSync(path, 'utf8')).requests; }
  catch(error) { if (error.code !== 'ENOENT') throw error; }
  if (!Array.isArray(requests) || requests.some(time => !Number.isFinite(time))) throw new Error('Invalid Buffer request ledger');
  return Math.max(0, Math.min(...windows.map(({milliseconds,limit}) => limit - requests.filter(time => time > now - milliseconds).length)));
}

export function requireBufferRequestCapacity(path, needed, now = Date.now()) {
  if (!Number.isInteger(needed) || needed < 1) throw new Error('Invalid request reservation size');
  let requests = [];
  try { requests = JSON.parse(readFileSync(path,'utf8')).requests; } catch(error) { if (error.code !== 'ENOENT') throw error; }
  if (!Array.isArray(requests) || requests.some(time=>!Number.isFinite(time))) throw new Error('Invalid Buffer request ledger');
  const due = budgetDecision(requests, now, requestWindows.map(window => ({...window,limit:window.limit-needed+1})));
  if (due) throw new Error(`Buffer request budget exhausted; retryAt=${new Date(due).toISOString()}`);
}
