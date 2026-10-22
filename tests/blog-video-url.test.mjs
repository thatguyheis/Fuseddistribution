import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';

function render(video) {
  const root = mkdtempSync(join(tmpdir(), 'blog-video-url-'));
  const scripts = join(root, 'scripts');
  const article = join(root, 'coin-story');
  mkdirSync(scripts); mkdirSync(article);
  copyFileSync(new URL('../public/blog/scripts/build-html.mjs', import.meta.url), join(scripts, 'build-html.mjs'));
  writeFileSync(join(article, 'meta.json'), JSON.stringify({slug: 'coin-story', title: 'Coin History', brand: 'silver', date: '2026-10-13', description: 'History through a photographed coin.', alt: 'Coin', tags: ['History']}));
  writeFileSync(join(article, 'verified.md'), '# Coin History\n\nA photographed coin tells a story.\n');
  writeFileSync(join(article, 'social-video.json'), JSON.stringify({...video, showPending: false}));
  execFileSync(process.execPath, [join(scripts, 'build-html.mjs'), '--slug=coin-story']);
  return readFileSync(join(article, 'index.html'), 'utf8');
}
test('approved hosted video creates a same-origin embedded player', () => {
  const html = render({primaryVideo: {url: 'https://fuseddistribution.luxraycoco.workers.dev/reels/coin-story/coin-story.mp4'}});
  assert.match(html, /<video controls playsinline/);
  assert.match(html, /<source src="https:\/\/fuseddistribution.com\/reels\/coin-story\/coin-story.mp4"/);
});
test('approved YouTube URL creates an iframe', () => {
  assert.match(render({platforms: {youtube: {url: 'https://www.youtube.com/watch?v=abcdefghijk'}}}), /<iframe src="https:\/\/www.youtube-nocookie.com\/embed\/abcdefghijk/);
});
test('lookalike hosts and unsafe schemes never create players', () => {
  for (const url of ['https://fuseddistribution.luxraycoco.workers.dev.evil.example/reels/coin-story/coin-story.mp4', 'javascript:alert(1)']) {
    assert.doesNotMatch(render({primaryVideo: {url}}), /<video\b|<iframe\b/);
  }
});
