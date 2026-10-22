import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySitemaps } from '../scripts/verify-sitemap.mjs';

const posts = [{ slug: 'how-to-get-repeat-customers' }, { slug: 'older-post' }];
const xml = (urls) => `<urlset>${urls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`;
const base = 'https://fuseddistribution.com';
const repeat = `${base}/blog/how-to-get-repeat-customers/`;
const older = `${base}/blog/older-post/`;

test('reports exact missed URL instead of relying on counts', () => {
  assert.throws(
    () => verifySitemaps({ localXml: xml([older]), liveXml: xml([repeat, older]), posts }),
    new RegExp(`missing URL\\(s\\): ${repeat.replaceAll('/', '\\/')}`),
  );
});

test('passes equal sets and formats actual counts', () => {
  const result = verifySitemaps({ localXml: xml([repeat, older]), liveXml: xml([older, repeat]), posts });
  assert.equal(result.localCount, 2);
  assert.equal(result.liveCount, 2);
  assert.match(result.summary, /sitemap 2 local = 2 live; 2 catalog URLs present/);
});

test('rejects missing static URLs even with all catalog URLs present', () => {
  assert.throws(() => verifySitemaps({localXml:xml([repeat,older,`${base}/extra/`]),liveXml:xml([repeat,older]),posts}), /location sets differ/);
});
test('rejects equal counts with different static locations', () => {
  assert.throws(() => verifySitemaps({localXml:xml([repeat,older,`${base}/one/`]),liveXml:xml([repeat,older,`${base}/two/`]),posts}), /location sets differ/);
});
