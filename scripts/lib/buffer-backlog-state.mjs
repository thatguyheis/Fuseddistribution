export function statusRequestPlan(capacityOnly = false) {
  return { liveStatuses: ['scheduled', 'sending'], fetchSentHistory: !capacityOnly };
}
export function retryAtFromMessage(message, now = Date.now()) {
  const exact = message.match(/retryAt=([^\s]+)/i)?.[1];
  const timestamp = exact ? Date.parse(exact) : NaN;
  if (Number.isFinite(timestamp)) return new Date(timestamp);
  const seconds = Number(message.match(/retryAfter=(\d+)/i)?.[1] || 3600);
  return new Date(now + Math.max(60, seconds) * 1000);
}
