export const BUFFER_DAILY_MINIMUM = 3;

export const BUFFER_CHANNELS = {
  youtube: '6a3e63375ab6d2f1067461b2',
  x: '6a3e73fb5ab6d2f10674b516',
  instagram: '6a67c5d64b2d03035f4f0228',
};

const pacificDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const pacificTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
});

export function pacificDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(pacificDateFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function mergeBufferPosts(...groups) {
  const postsByKey = new Map();
  for (const post of groups.flat()) {
    if (!post) continue;
    const key = post.id || `${post.channelId || ''}:${post.status || ''}:${post.dueAt || ''}`;
    postsByKey.set(key, post);
  }
  return [...postsByKey.values()];
}

export function calculateDailyChannelTargets(posts, {
  operatingDate = pacificDate(new Date()),
  minimum = BUFFER_DAILY_MINIMUM,
} = {}) {
  const counts = Object.fromEntries(Object.keys(BUFFER_CHANNELS).map((name) => [name, 0]));
  const nameByChannelId = new Map(Object.entries(BUFFER_CHANNELS).map(([name, id]) => [id, name]));

  for (const post of posts) {
    const status = String(post?.status || '').toLowerCase();
    if (!['scheduled', 'sending', 'sent'].includes(status)) continue;
    const activityAt = status === 'sent' ? post?.sentAt || post?.dueAt : post?.dueAt;
    if (pacificDate(activityAt) !== operatingDate) continue;
    const name = nameByChannelId.get(post?.channelId);
    if (name) counts[name] += 1;
  }

  const channels = Object.fromEntries(Object.entries(BUFFER_CHANNELS).map(([name, channelId]) => {
    const scheduledToday = counts[name];
    return [name, {
      channelId,
      scheduledToday,
      minimum,
      deficit: Math.max(0, minimum - scheduledToday),
    }];
  }));
  const deficits = Object.values(channels).map((channel) => channel.deficit);

  return {
    operatingDate,
    baselineMinimumPerChannel: BUFFER_DAILY_MINIMUM,
    targetPerChannel: minimum,
    channels,
    deficitPlatformCount: deficits.filter((deficit) => deficit > 0).length,
    totalDeficit: deficits.reduce((sum, deficit) => sum + deficit, 0),
  };
}

export function evaluateDailyFloorReadinessCheckpoint({
  operatingDate = pacificDate(new Date()),
  now = new Date(),
  finalSlotHour = 21,
  requiredLeadHours = 4,
} = {}) {
  if (!Number.isInteger(finalSlotHour) || finalSlotHour < 0 || finalSlotHour > 23) {
    throw new Error('finalSlotHour must be an integer from 0 through 23.');
  }
  if (!Number.isInteger(requiredLeadHours) || requiredLeadHours < 1 || requiredLeadHours > finalSlotHour) {
    throw new Error('requiredLeadHours must be an integer between 1 and finalSlotHour.');
  }

  const observedDate = pacificDate(now);
  const deadlineHour = finalSlotHour - requiredLeadHours;
  if (observedDate !== operatingDate) {
    return {
      status: 'not_operating_day',
      operatingDate,
      observedDate,
      finalSlotHour,
      requiredLeadHours,
      deadlineHour,
    };
  }

  const parts = Object.fromEntries(pacificTimeFormatter.formatToParts(now).map((part) => [part.type, part.value]));
  const observedHour = Number(parts.hour);
  const observedMinute = Number(parts.minute);
  return {
    status: observedHour < deadlineHour ? 'on_time' : 'late',
    operatingDate,
    observedDate,
    observedHour,
    observedMinute,
    finalSlotHour,
    requiredLeadHours,
    deadlineHour,
  };
}

export function evaluateDailyFloorEnforcement({ dailyTargets, readinessCheckpoint }) {
  const deficitChannels = Object.entries(dailyTargets?.channels || {})
    .filter(([, channel]) => Number(channel?.deficit) > 0)
    .map(([name]) => name);
  const checkpointIsLate = readinessCheckpoint?.status === 'late';

  return {
    status: checkpointIsLate && deficitChannels.length ? 'failed' : 'passed',
    deficitChannels,
    reason: checkpointIsLate && deficitChannels.length
      ? 'late_checkpoint_with_daily_floor_deficit'
      : null,
  };
}
