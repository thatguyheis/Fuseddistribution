import test from 'node:test';
import assert from 'node:assert/strict';
import {addPanelToHtml} from '../public/blog/scripts/lib/social-video-panel.mjs';

const panel = '<!-- SOCIAL_VIDEO_START -->\n<aside>Current reel</aside>\n<!-- SOCIAL_VIDEO_END -->';

test('social video panel replacement is idempotent and does not accumulate blank lines', () => {
  const original = '<div class="article-body">\n<p>Opening.</p>\n            \n            \n<!-- SOCIAL_VIDEO_START -->\n<aside>Old reel</aside>\n<!-- SOCIAL_VIDEO_END -->\n            \n            \n<h2>Next</h2>\n</div>';
  const once = addPanelToHtml(original, panel);
  const twice = addPanelToHtml(once, panel);
  assert.equal(twice, once);
  assert.equal((once.match(/SOCIAL_VIDEO_START/g) || []).length, 1);
  assert.doesNotMatch(once, /<!-- SOCIAL_VIDEO_END -->\n[ \t]*\n/);
});
