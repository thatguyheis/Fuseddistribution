// ISO publication dates sort lexically. Stable ties preserve editorial order.
export function newestFirst(posts) {
  for (const post of posts) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date || '') ||
        !Number.isFinite(Date.parse(post.date)) ||
        new Date(post.date).toISOString().slice(0, 10) !== post.date) {
      throw new Error(`Invalid publication date for ${post.slug}: ${post.date}`);
    }
  }
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}
