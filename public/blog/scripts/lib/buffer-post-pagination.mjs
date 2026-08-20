export async function collectBufferPostPages(fetchPage) {
  const posts = [];
  let after = null;

  do {
    const page = await fetchPage(after);
    if (!Array.isArray(page?.posts)) {
      throw new Error('Buffer post page is missing posts.');
    }
    posts.push(...page.posts);
    after = page.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  return posts;
}
