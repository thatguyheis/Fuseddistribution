// Queue absence after the daily deadline is missing production, never zero work.
export function dailyProductionState(queue, completion, hourPacific, plan = null, verifiedSlugs = []) {
  const due = hourPacific >= 9;
  // Partial current proofs supplement an unfinished plan. They do not reopen a
  // completed historical plan merely because later edits made old proof stale.
  const recordedComplete = !completion?.unavailable && Number.isInteger(completion?.live) && completion.live >= (plan?.posts?.length || Infinity);
  if(plan?.posts?.length && verifiedSlugs.length && !recordedComplete) {
    const publishedSlugs=plan.posts.filter(p=>verifiedSlugs.includes(p.slug)).map(p=>p.slug);
    const remaining=plan.posts.filter(p=>!publishedSlugs.includes(p.slug));
    return {state:remaining.length?'partial_daily_production':'live_verified',actionable:due&&remaining.length>0,publishedSlugs,missingSlugs:remaining.map(p=>p.slug),intendedPosts:remaining,nextAction:remaining.length?'Finish the remaining named articles; preserve the already live verified packages.':'All planned slugs have current artifact-bound live proof.'};
  }
  const validQueue = queue && !queue.unavailable && Array.isArray(queue.posts) && queue.posts.length > 0;
  if (!validQueue) return {
    state: due ? 'missing_daily_production' : 'awaiting_daily_queue',
    actionable: due,
    intendedPosts: Array.isArray(plan?.posts) ? plan.posts : [],
    reason: 'Today has no usable research queue. Prior-day completion and zero registered unpublished slugs do not satisfy today.',
    nextAction: 'Inspect today research failure logs and preserved briefs/candidates. Repair the existing material under current editorial authority; do not blindly regenerate or lower QA. Defer heavy inference while a renderer owns compute.',
  };
  const missingSlugs = (plan?.posts || []).filter(post => !queue.posts.some(queued => queued.slug === post.slug)).map(post => post.slug);
  if (missingSlugs.length) return {
    state: 'partial_daily_production', actionable: due, missingSlugs,
    nextAction: 'Recover the planned topics absent from the queue. A partial completion does not satisfy the daily plan.',
  };
  const incomplete = !completion || completion.unavailable === true || !Number.isInteger(completion.live) || completion.live < queue.posts.length;
  return {
    state: incomplete ? 'queued_completion_unverified' : 'completion_evidence_requires_verification',
    actionable: due && incomplete,
    queuedPosts: queue.posts.length,
    nextAction: 'Compare queue slugs with current artifact and live proof; a completion file alone is not publication verification.',
  };
}
