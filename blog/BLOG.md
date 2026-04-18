# Blog — How to Add a Post

## To add a new post, do two things:

### 1. Add an entry to `posts.json`

Insert a new object at the **top** of the array (newest first):

```json
{
  "slug": "your-slug-here",
  "title": "Your Post Title",
  "date": "YYYY-MM-DD",
  "excerpt": "One or two sentences summarizing the post. Shown on the blog listing page.",
  "tags": ["Tag One", "Tag Two"],
  "author": "Fused Team"
}
```

- `slug` must match the folder name exactly
- `date` format: `YYYY-MM-DD`
- Keep `excerpt` under 160 characters
- Tags: pick from existing ones or add new ones (Title Case)

---

### 2. Create `blog/[slug]/index.html`

Copy the structure from `blog/welcome-to-fused/index.html` and update:

| Field | Where to change |
|---|---|
| `<title>` | Page title tag |
| `<meta name="description">` | SEO description |
| `og:url` and `canonical` | Update slug in URL |
| `og:title` and `og:description` | Match post title/excerpt |
| JSON-LD `headline`, `datePublished`, `url`, `description` | Match post metadata |
| `.eyebrow` text | Tags separated by `·` |
| `<h1>` | Post title |
| `<time datetime="">` and display date | Post date |
| `.pill` spans | One per tag |
| `.article-body` | Full post content |

---

## Content guidelines

- Lead with the main point — no long intros
- Use `<h2>` for section headings inside `.article-body`
- Use `<p>`, `<ul>`, `<li>`, `<strong>`, `<a>` for body content
- Keep posts focused on one practical topic
- End with the `.article-cta` block (already in template, edit text as needed)

---

## Slug naming convention

- Lowercase, hyphens only: `how-to-set-up-google-business`
- Keep it short and descriptive
- No dates in the slug

---

## After adding a post

Commit both files and push:
```
git add blog/posts.json blog/[slug]/
git commit -m "Add blog post: [Post Title]"
git push origin main
```
