import test from 'node:test';
import assert from 'node:assert/strict';
import { collectBufferPostPages } from '../public/blog/scripts/lib/buffer-post-pagination.mjs';

test('collectBufferPostPages reads every cursor page so current sent posts are not omitted', async () => {
  const cursors = [];
  const posts = await collectBufferPostPages(async (after) => {
    cursors.push(after);
    if (after === null) {
      return {
        posts: [{ id: 'older-sent' }],
        pageInfo: { hasNextPage: true, endCursor: 'page-2' },
      };
    }
    return {
      posts: [{ id: 'current-sent' }],
      pageInfo: { hasNextPage: false, endCursor: null },
    };
  });

  assert.deepEqual(cursors, [null, 'page-2']);
  assert.deepEqual(posts.map((post) => post.id), ['older-sent', 'current-sent']);
});

test('collectBufferPostPages rejects malformed Buffer pages', async () => {
  await assert.rejects(() => collectBufferPostPages(async () => ({ pageInfo: {} })), /missing posts/);
});
