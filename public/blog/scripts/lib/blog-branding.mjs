export const AUTHOR_KNOWS_ABOUT = Object.freeze({
  silver: ['coins', 'precious metals', 'numismatics'],
  tech: ['web design', 'local SEO', 'AI automation', 'video marketing'],
});

export function blogPageTitle(title, brand) {
  const suffix = brand === 'silver' ? ' | Fused Reserve' : ' | Fused';
  return title.length + suffix.length <= 60 ? `${title}${suffix}` : title;
}
