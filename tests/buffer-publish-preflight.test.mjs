import test from 'node:test';
import assert from 'node:assert/strict';
import { assertMediaVerification, mediaUrlFromJob, preflightBufferMedia } from '../public/blog/scripts/lib/buffer-publish-preflight.mjs';

test('extracts the exact outgoing video URL', () => {
  assert.equal(mediaUrlFromJob({ publicMediaUrl: ' https://cdn.example/reel.mp4 ' }), 'https://cdn.example/reel.mp4');
  assert.equal(mediaUrlFromJob({ createPostPayload: { assets: [{ video: { url: 'https://cdn.example/payload.mp4' } }] } }), 'https://cdn.example/payload.mp4');
});

test('fails closed when media verification fails', async () => {
  await assert.rejects(
    () => preflightBufferMedia({ slug: 'bad-reel', publicMediaUrl: 'https://cdn.example/bad.mp4' }, { verify: async () => ({ ok: false, reason: 'media_too_large' }) }),
    /No Buffer create request was sent/,
  );
});

test('rejects a missing or non-HTTPS media URL', async () => {
  await assert.rejects(() => preflightBufferMedia({ slug: 'missing' }, { verify: async () => ({ ok: true }) }), /requires one HTTPS media URL/);
  assert.throws(() => assertMediaVerification({ ok: false, reason: 'public_media_url_not_mp4' }, 'reel'), /public_media_url_not_mp4/);
});

test('rejects a queue whose metadata and payload point at different media', async () => {
  await assert.rejects(
    () => preflightBufferMedia({ slug: 'mismatch', publicMediaUrl: 'https://cdn.example/a.mp4', createPostPayload: { assets: [{ video: { url: 'https://cdn.example/b.mp4' } }] } }),
    /conflicting media URLs/,
  );
});

test('rejects media that exceeds the safe duration headroom', async () => {
  await assert.rejects(
    () => preflightBufferMedia({ slug: 'long-reel', publicMediaUrl: 'https://cdn.example/long.mp4', publicMediaDurationSeconds: 175.001 }, { verify: async () => ({ ok: true, bytes: 100 }) }),
    /rejected duration 175\.001s; maximum is 175s/,
  );
});

test('rejects a hosted copy that does not match the queue manifest', async () => {
  await assert.rejects(
    () => preflightBufferMedia({ slug: 'stale-reel', publicMediaUrl: 'https://cdn.example/stale.mp4', publicMediaBytes: 200 }, { verify: async () => ({ ok: true, bytes: 100 }) }),
    /stale hosted bytes \(100; expected 200\)/,
  );
});
