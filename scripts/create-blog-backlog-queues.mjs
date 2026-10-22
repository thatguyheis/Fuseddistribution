import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const research = join(root, 'public', 'blog', 'research');
const days = [
  ['2026-08-28', ['how to compare silver premiums across dealers', 'should you buy silver in dips or dollar cost average'], ['how often to post on social media for small business', 'tiktok for local business does it work']],
  ['2026-08-29', ['american silver eagle complete buying guide', 'canadian silver maple leaf vs american silver eagle'], ['social media content ideas for small business', 'instagram stories for local business how to use']],
  ['2026-08-30', ['silver bars vs silver coins which is better', 'silver rounds vs silver coins differences'], ['facebook ads for local business beginner guide', 'how to target local customers with facebook ads']],
  ['2026-08-31', ['1 oz silver coins vs 10 oz silver bars which to buy', '100 oz silver bars pros and cons'], ['best time to post on instagram for local business', 'social media analytics what metrics actually matter']],
  ['2026-09-01', ['junk silver coins guide pre-1965 US silver', 'what is 90 percent silver junk silver worth buying'], ['email marketing for small business getting started', 'how to build an email list for your local business']],
  ['2026-09-02', ['morgan silver dollars as investment', 'proof silver coins worth buying or not'], ['email newsletter ideas for small business', 'best email marketing tools for small business 2026']],
];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55);
}

function entry(keyword, brand) {
  const slug = slugify(keyword);
  return { slug, keyword, brand, draft: `public/blog/${slug}/gemma_draft.md`, ad_formats: ['google-search', 'stat-card'], ugc_angle: keyword.includes('vs') || keyword.includes('best') ? 'comparison' : 'demo' };
}

mkdirSync(research, { recursive: true });
for (const [date, silver, tech] of days) {
  const path = join(research, `${date}-queue.json`);
  if (existsSync(path)) continue;
  const posts = [...silver.map((keyword) => entry(keyword, 'silver')), ...tech.map((keyword) => entry(keyword, 'tech'))];
  writeFileSync(path, `${JSON.stringify({ date, posts }, null, 2)}\n`);
  console.log(`created ${path}`);
}
