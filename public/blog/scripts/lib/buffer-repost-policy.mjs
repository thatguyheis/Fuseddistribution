const terminalStatuses = new Set(['error', 'failed', 'blocked', 'deleted']);

export function scheduledEntryBlocksPlanning(entry, { repostAfterDays = 0, now = Date.now() } = {}) {
  if (typeof entry === 'string') return true;
  const status = String(entry?.status || '').toLowerCase();
  if (terminalStatuses.has(status)) return false;
  if (status !== 'sent' || repostAfterDays <= 0) return true;

  const lastPublishedAt = Date.parse(entry?.sentAt || entry?.dueAt || entry?.scheduledAt || '');
  if (!Number.isFinite(lastPublishedAt)) return true;
  return lastPublishedAt > now - repostAfterDays * 24 * 60 * 60 * 1000;
}
