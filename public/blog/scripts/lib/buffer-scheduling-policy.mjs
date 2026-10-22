export function channelPriority(dailyTargets, day = new Date().getUTCDate()) {
  const platforms = ['youtube','x','instagram'];
  const rotated = [...platforms.slice(day % 3), ...platforms.slice(0, day % 3)];
  return rotated.sort((a,b) => (dailyTargets.channels[b]?.deficit || 0) - (dailyTargets.channels[a]?.deficit || 0)
    || (dailyTargets.channels[a]?.scheduledToday || 0) - (dailyTargets.channels[b]?.scheduledToday || 0));
}

// Bounded history is incomplete evidence. Missing posts never imply delivery.
export async function boundedSentHistory(fetchPage, remaining, {maxPages = 2, reserve = 12} = {}) {
  const posts = [];let after = null;let complete = false;let pages = 0;
  while (pages < maxPages && remaining() > reserve) {
    const page = await fetchPage(after);
    if (!Array.isArray(page?.posts)) throw new Error('Malformed sent history');
    posts.push(...page.posts);pages++;
    if (!page.pageInfo?.hasNextPage) { complete = true;break; }
    if (!page.pageInfo.endCursor || page.pageInfo.endCursor === after) throw new Error('Invalid history cursor');
    after = page.pageInfo.endCursor;
  }
  return {posts, complete, pages, limited:!complete};
}
