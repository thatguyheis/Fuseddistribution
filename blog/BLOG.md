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

## Writing style rules — follow these every post

The goal is to sound like a knowledgeable local person talking to a business owner, not a marketing team or a chatbot.

**Never use em dashes (—).** Use a comma, a period, or rewrite the sentence instead.

**Never use these words or phrases:**
- leverage, utilize, streamline, robust, seamlessly, cutting-edge, game-changing
- dive in, delve into, it's important to note, it's worth noting
- in today's digital landscape, in the modern era, at the end of the day
- first and foremost, in conclusion, to summarize, to recap
- unlock, empower, harness, elevate, transform
- comprehensive, holistic, synergy, ecosystem

**Write like a person:**
- Short sentences work. Mix them with longer ones.
- Use "you" and "your business" directly.
- Be specific. "Most small business websites load in 6 seconds on a phone" beats "slow load times hurt conversions."
- Say what something actually does, not what it "enables" or "allows."
- If a sentence sounds like it came from a brochure, rewrite it.
- Never start a post with a rhetorical question as a hook.
- Avoid passive voice when active voice is clearer.

**Tone:**
- Helpful and direct, not enthusiastic
- No hype, no urgency tricks
- Treat the reader like they're smart and busy

---

## Slug naming convention

- Lowercase, hyphens only: `how-to-set-up-google-business`
- Keep it short and descriptive
- No dates in the slug

---

## Adding a hero image

Each post should include a hero image saved as `blog/[slug]/hero.jpg`.

Download from the Unsplash CDN using curl (no API key needed):
```
curl -s "https://images.unsplash.com/photo-[PHOTO_ID]?auto=format&fit=crop&w=1200&q=82" -o blog/[slug]/hero.jpg
```

Known relevant photo IDs by topic:
- Websites / analytics: `1460925895917-afdab827c52f` (laptop with analytics dashboard, by Isaac Smith)
- Local business / retail: `1556742049-0cfed4f6a45d` (business owner with customer)
- Office / tech work: `1551434678-e076c223a692` (person working on laptop)
- AI / automation: pick a relevant one from Unsplash

In the post HTML, add this block between `.article-meta` and `.article-divider`:
```html
<figure class="article-hero">
  <img src="hero.jpg" alt="[Descriptive alt text]" width="1200" height="630" />
  <figcaption>Photo by <a href="https://unsplash.com/@[handle]" target="_blank" rel="noreferrer">[Photographer Name]</a> on <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a></figcaption>
</figure>
```

Also update the `og:image` and `twitter:image` meta tags to point to the hosted image:
```
https://fuseddistribution.com/blog/[slug]/hero.jpg
```

Copy the `.article-hero` CSS from `blog/why-your-website-isnt-getting-customers/index.html` into each new post's `<style>` block.

---

## After adding a post

Commit both files and push:
```
git add blog/posts.json blog/[slug]/
git commit -m "Add blog post: [Post Title]"
git push origin main
```
