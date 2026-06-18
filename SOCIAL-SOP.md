# Social Media SOP — Fused Distribution

Governs content creation for social media. Posting automation via Postiz is handled separately (not yet configured).

**Platforms:** Facebook, Instagram, LinkedIn, X
**Content types:** Reels (video), Photo posts (SVG/image)

---

## Daily Output

Per approved blog post:

| Asset | Count | Platforms |
|---|---|---|
| Long-form reel (MP4) | 1 | FB + IG + LinkedIn + X |
| Photo post (SVG) | 1 | FB + IG + LinkedIn |
| social-copy.json | 1 | Consumed by postiz-schedule.mjs |

---

## Content Creation Pipeline

Content is created during the daily Claude pipeline run (`daily-blog-reel.sh`). By the time the pipeline finishes, these files exist per blog post:

```
blog/[slug]/
  reel-data.md        ← validated source facts and media queries
  reel-script.md      ← one long-form reel script (from REEL-SOP.md)
  photo-post.svg      ← 1200×1200 feed image (see BLOG-SOP.md §15)
  social-copy.json    ← all captions per platform (see BLOG-SOP.md §14)

video/out/[slug]/
  [slug].mp4
```

---

## Caption Writing Rules

All captions written by Claude during pipeline. Same writing style rules as blog posts apply: no em dashes, no buzzwords, no rhetorical hooks, direct and specific.

### Facebook
- 2-5 sentences
- No hashtags in body
- Conversational tone — not a press release
- End with the discussion_question from reel-data.md on its own line
- For photo posts: slightly longer, 3-5 sentences

### Instagram
- Punchy opener (first sentence must hook before the "more" cutoff)
- 2-3 sentences
- Hashtag block at end, separated by blank line
- 8-12 hashtags max — specific beats generic
- Use discussion_question as the last line before hashtags

### LinkedIn
- Professional but not corporate
- Lead with the insight, not the brand
- Include blog URL naturally in body
- 2-3 sentences
- No hashtags (they perform poorly on LinkedIn)

### X
- Under 280 chars total including URL
- Direct stat or claim
- Blog URL at end
- One sentence. No em dashes. No hashtag spam.

---

## Reel Standard

Each approved blog post produces one 180-240 second vertical reel. It uses the strongest supported hook, covers the full article arc, and ends with a question designed to earn comments. `video/REEL-SOP.md` is authoritative for script, timing, render, and QA rules.

---

## Photo Post Spec

Full spec in BLOG-SOP.md §15. Quick reference:

- SVG, 1200×1200, dark brand theme
- Top zone: category eyebrow + "FUSED" brand mark
- Center: post title (large Impact) + one key stat
- Bottom: one-sentence excerpt + blog URL CTA
- Posted to: Facebook + Instagram + LinkedIn (not X)

---

## Platform API Setup (one-time, required for Postiz)

> Complete this after Postiz is running on the Windows PC.

### Facebook + Instagram
1. Go to https://developers.facebook.com
2. Create an app (type: Business)
3. Add products: Facebook Login, Instagram Graph API
4. Required permissions: `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`
5. Note App ID and App Secret → add to Postiz docker-compose env

### LinkedIn
1. Go to https://www.linkedin.com/developers
2. Create an app linked to your LinkedIn page
3. Request permissions: `w_member_social`, `r_basicprofile`
4. Note Client ID and Client Secret → add to Postiz docker-compose env

### X (Twitter)
1. Go to https://developer.twitter.com
2. Create a project + app
3. Set app permissions to "Read and Write"
4. Note API Key and API Secret → add to Postiz docker-compose env

---

## Posting Schedule

Postiz schedules all posts at platform-optimal times automatically (`scheduleType: "best_time"`). No manual scheduling needed once configured.

> **Not yet active.** Postiz setup pending (see docs/WINDOWS-PC-SETUP.md).

---

## Manual Posting (interim — until Postiz is running)

Until Postiz is configured, post manually using the generated assets:

1. Open `blog/[slug]/social-copy.json`
2. Upload `video/out/[slug]/[slug].mp4` to each platform
3. Paste the platform-specific reel caption from `social-copy.json`
4. For the photo post, upload `blog/[slug]/photo-post.svg` and use the photo caption
5. First comment on each post: paste the live blog URL

---

## File Naming Reference

| File | Location | Format |
|---|---|---|
| Long-form reel | `video/out/[slug]/[slug].mp4` | 1080×1920 MP4 |
| Photo post | `blog/[slug]/photo-post.svg` | 1200×1200 SVG |
| Captions | `blog/[slug]/social-copy.json` | JSON |
