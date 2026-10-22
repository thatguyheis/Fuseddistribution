/** Permission denial is not evidence of death: preserve another worker's lock. */
export function processIsAlive(pid, probe = process.kill.bind(process)) {
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Cannot establish render lock owner');
  try { probe(pid, 0); return true; }
  catch (error) { if (error.code === 'ESRCH') return false; return true; }
}
