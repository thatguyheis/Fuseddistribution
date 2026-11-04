import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blogPageTitle } from '../public/blog/scripts/lib/blog-branding.mjs';
import { readBlogPosting, rebuildExistingBlogBranding } from '../public/blog/scripts/lib/existing-blog-branding.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputDir = mkdtempSync(join(tmpdir(), 'fused-blog-branding-'));
after(() => rmSync(outputDir, { recursive: true, force: true }));

function buildFixture(brand) {
  const metaPath = join(outputDir, `${brand}-meta.json`);
  const bodyPath = join(outputDir, `${brand}-body.md`);
  const outPath = join(outputDir, `${brand}-index.html`);
  writeFileSync(metaPath, JSON.stringify({ title: 'A Short Post', slug: 'brand-test', description: 'A useful post.',
    alt: 'Article hero', date: '2026-06-01', modifiedDate: '2026-06-08', tags: ['Guide', 'Example'], brand }));
  writeFileSync(bodyPath, '# A Short Post\n\nThis is the approved body.\n');
  execFileSync(process.execPath, ['public/blog/scripts/build-html.mjs', '--slug=brand-test',
    `--meta=${metaPath}`, `--body=${bodyPath}`, `--out=${outPath}`], { cwd: root });
  return readFileSync(outPath, 'utf8');
}

test('new blog pages use concise brand titles and the right author expertise', () => {
  assert.equal(blogPageTitle('A Short Post', 'silver'), 'A Short Post | Fused Reserve');
  assert.equal(blogPageTitle('A Short Post', 'tech'), 'A Short Post | Fused');
  assert.equal(blogPageTitle('A'.repeat(55), 'silver'), 'A'.repeat(55));
  for (const brand of ['silver', 'tech']) {
    const html = buildFixture(brand);
    const schema = readBlogPosting(html).value;
    assert.equal(schema.author.name, 'Nick Hughes');
    assert.equal(schema.author.url, 'https://fuseddistribution.com/about/');
    assert.equal(schema.publisher['@id'], 'https://fuseddistribution.com/#organization');
    assert.equal(schema.datePublished, '2026-06-01');
    assert.equal(schema.dateModified, '2026-06-08');
    if (brand === 'silver') {
      assert.match(html, /<span class="brand-sub">Reserve<\/span>/);
      assert.equal(schema.brand.name, 'Fused Reserve');
      assert.deepEqual(schema.author.knowsAbout, ['coins', 'precious metals', 'numismatics']);
    } else {
      assert.equal(schema.brand, undefined);
      assert.deepEqual(schema.author.knowsAbout, ['web design', 'local SEO', 'AI automation', 'video marketing']);
    }
  }
});

test('legacy branding rebuild preserves body and both article dates', () => {
  const original = buildFixture('tech');
  const updated = rebuildExistingBlogBranding(original, 'silver');
  const originalSchema = readBlogPosting(original).value;
  const updatedSchema = readBlogPosting(updated).value;
  assert.equal(updatedSchema.datePublished, originalSchema.datePublished);
  assert.equal(updatedSchema.dateModified, originalSchema.dateModified);
  assert.equal(updatedSchema.publisher.name, 'Fused Distribution');
  assert.equal(updatedSchema.brand.name, 'Fused Reserve');
  assert.equal(original.match(/<main\b[\s\S]*?<\/main>/)[0], updated.match(/<main\b[\s\S]*?<\/main>/)[0]);
});
