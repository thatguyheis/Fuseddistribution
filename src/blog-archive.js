// Server-rendered list of every blog post, added after the JS-driven grid on /blog/.
// The grid is filled from posts.json in the browser, which AI crawlers (GPTBot,
// ClaudeBot, PerplexityBot) do not run, so without this they only see a handful
// of posts. posts.json stays the single source; nothing here needs regenerating.

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function archiveHtml(posts) {
  const valid = (Array.isArray(posts) ? posts : [])
    .filter((post) => post && SLUG.test(post.slug || "") && post.title)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  if (!valid.length) return "";
  const items = valid
    .map((post) => `<li><a href="/blog/${post.slug}/">${escapeHtml(post.title)}</a>${post.date ? ` <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>` : ""}</li>`)
    .join("");
  return `<section class="fx-archive" aria-label="All articles"><details><summary>Browse all ${valid.length} articles</summary><ul>${items}</ul></details></section>`;
}

export function addBlogArchive(rewriter, posts) {
  const html = archiveHtml(posts);
  if (!html) return rewriter;
  return rewriter.on("#post-list", {
    element(element) {
      element.after(html, { html: true });
    },
  });
}

export function renderBlogArchive(response, posts) {
  return addBlogArchive(new HTMLRewriter(), posts).transform(response);
}
