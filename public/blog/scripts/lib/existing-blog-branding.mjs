import { AUTHOR_KNOWS_ABOUT, blogPageTitle } from './blog-branding.mjs';

const schemaPattern = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function readBlogPosting(html) {
  const matches = [...html.matchAll(schemaPattern)]
    .map(match => ({ match, value: JSON.parse(match[1]) }))
    .filter(item => item.value['@type'] === 'BlogPosting');
  if (matches.length !== 1) throw new Error(`Expected one BlogPosting schema, found ${matches.length}`);
  return matches[0];
}

export function rebuildExistingBlogBranding(html, brand) {
  if (!AUTHOR_KNOWS_ABOUT[brand]) throw new Error(`Unknown brand: ${brand}`);
  const { match, value } = readBlogPosting(html);
  if (!value.headline || !value.datePublished || !value.dateModified) {
    throw new Error('BlogPosting needs a headline and both publication dates');
  }
  const originalDates = [value.datePublished, value.dateModified];
  value.author = {
    ...value.author,
    name: 'Nick Hughes',
    url: 'https://fuseddistribution.com/about/',
    knowsAbout: AUTHOR_KNOWS_ABOUT[brand],
  };
  value.publisher = {
    ...value.publisher,
    '@type': 'Organization',
    name: 'Fused Distribution',
    '@id': 'https://fuseddistribution.com/#organization',
  };
  if (brand === 'silver') value.brand = { '@type': 'Brand', name: 'Fused Reserve' };
  else delete value.brand;

  const script = match[0].replace(match[1], `\n    ${JSON.stringify(value, null, 2).replaceAll('\n', '\n    ')}\n    `);
  let result = html.slice(0, match.index) + script + html.slice(match.index + match[0].length);
  const titlePattern = /<title>[\s\S]*?<\/title>/i;
  if ([...result.matchAll(/<title>[\s\S]*?<\/title>/gi)].length !== 1) throw new Error('Expected one title');
  result = result.replace(titlePattern, `<title>${escapeHtml(blogPageTitle(value.headline, brand))}</title>`);
  if (brand === 'silver') {
    const logoPattern = /<span class="brand-sub">[^<]*<\/span>/g;
    if ([...result.matchAll(logoPattern)].length !== 1) throw new Error('Expected one brand subtitle');
    result = result.replace(logoPattern, '<span class="brand-sub">Reserve</span>');
    result = result.replace(/(&copy;|&#169;) 2026 Fused (?:Distribution|Technology Solutions)\. All rights reserved\./,
      '$1 2026 Fused Reserve. All rights reserved.');
  }
  const updatedSchema = readBlogPosting(result).value;
  if (updatedSchema.datePublished !== originalDates[0] || updatedSchema.dateModified !== originalDates[1]) {
    throw new Error('Publication dates changed during branding rebuild');
  }
  const originalMain = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0];
  const updatedMain = result.match(/<main\b[\s\S]*?<\/main>/i)?.[0];
  if (!originalMain || originalMain !== updatedMain) throw new Error('Article body changed during branding rebuild');
  return result;
}
