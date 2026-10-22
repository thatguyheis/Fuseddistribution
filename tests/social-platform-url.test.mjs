import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlatformUrl } from '../public/blog/scripts/lib/social-platform-url.mjs';

test('accepts Buffer current and legacy X post URLs', () => {
  for (const host of ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']) {
    assert.equal(isPlatformUrl('x', `https://${host}/thatguyheis/status/2097414889266364432`), true);
  }
});

test('rejects unrelated hosts, credentials and malformed post paths', () => {
  for (const url of ['http://x.com/user/status/123', 'https://x.com.evil.test/user/status/123',
    'https://x.com@evil.test/user/status/123', 'https://user@x.com/user/status/123',
    'https://x.com:8443/user/status/123', 'https://x.com/user/status/123garbage',
    'https://twitter.com/user', 'not a URL', null]) {
    assert.equal(isPlatformUrl('x', url), false, String(url));
  }
});

test('retains supported YouTube and Instagram destinations', () => {
  assert.equal(isPlatformUrl('youtube', 'https://www.youtube.com/watch?v=BRXHUHXSLqQ'), true);
  assert.equal(isPlatformUrl('youtube', 'https://youtu.be/BRXHUHXSLqQ'), true);
  assert.equal(isPlatformUrl('instagram', 'https://www.instagram.com/reel/abc/'), true);
  assert.equal(isPlatformUrl('instagram', 'https://instagram.com.evil.test/reel/abc/'), false);
  assert.equal(isPlatformUrl('unknown', 'https://x.com/user/status/123'), false);
});
