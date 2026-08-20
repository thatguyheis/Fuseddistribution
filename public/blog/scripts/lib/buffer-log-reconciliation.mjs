export function normalizeScheduledLog(value) {
  if (Array.isArray(value)) return { scheduled: value };
  if (value && typeof value === 'object') {
    return {
      ...value,
      scheduled: Array.isArray(value.scheduled)
        ? value.scheduled
        : Array.isArray(value.posts)
          ? value.posts
          : [],
    };
  }
  return { scheduled: [] };
}

function signatureForRecord(record) {
  return [
    record?.slug || '',
    record?.channelId || '',
    record?.dueAt || '',
  ].join('::');
}

export function reconcileScheduledLog(logValue, visiblePosts, reconciledAt = new Date().toISOString()) {
  const log = normalizeScheduledLog(logValue);
  const visibleById = new Map();
  const visibleBySignature = new Map();

  for (const post of visiblePosts || []) {
    if (post?.id) visibleById.set(post.id, post);
    const signature = signatureForRecord(post);
    if (signature !== '::::') visibleBySignature.set(signature, post);
  }

  let changed = 0;
  const scheduled = log.scheduled.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const currentStatus = String(entry.status || '').toLowerCase();
    if (!['scheduled', 'sending'].includes(currentStatus)) return entry;

    const match = visibleById.get(entry.postId) || visibleBySignature.get(signatureForRecord(entry));
    if (!match) return entry;

    const nextStatus = String(match.status || '').toLowerCase();
    if (!['scheduled', 'sending', 'sent'].includes(nextStatus)) return entry;

    const nextEntry = {
      ...entry,
      status: nextStatus,
      reconciledAt,
    };

    if (match.sentAt) nextEntry.sentAt = match.sentAt;
    if (match.externalLink) nextEntry.viewPostUrl = match.externalLink;
    if (nextStatus !== currentStatus || nextEntry.sentAt !== entry.sentAt || nextEntry.viewPostUrl !== entry.viewPostUrl) {
      changed += 1;
      return nextEntry;
    }
    return entry;
  });

  return {
    changed,
    log: {
      ...log,
      scheduled,
    },
  };
}
