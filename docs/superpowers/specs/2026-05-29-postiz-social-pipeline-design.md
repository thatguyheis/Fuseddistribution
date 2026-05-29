---
name: postiz-social-pipeline
description: Design spec for automated social media posting via Postiz, integrated with the existing daily blog+reel pipeline
metadata:
  type: project
---

# Postiz Social Pipeline — Design Spec

**Date:** 2026-05-29
**Status:** Approved — implementation pending Postiz setup

---

## Goal

Extend the existing daily Claude pipeline to automatically schedule social media posts via a self-hosted Postiz instance running on a dedicated Windows PC. No manual posting. Content AI creates gets posted without human intervention.

---

## Architecture

```
Mac (9am daily LaunchAgent)                  Windows PC (always-on)
────────────────────────────────             ──────────────────────────────
daily-blog-reel.sh runs claude CLI   →       Postiz Docker stack (port 4007)
  │                                            ├── PostgreSQL 17
  ├── Write tech blog post                     ├── Redis 7.2
  ├── Write silver blog post                   ├── Temporal + Elasticsearch
  ├── Render 3 reels per blog (×2)             └── Postiz app
  ├── Generate photo-post.svg (×2)
  ├── Generate social-copy.json (×2)    →     Upload media → schedule at best time
  └── git push + wrangler deploy               → FB + IG + LinkedIn + X
```

---

## Daily Output

Per blog post (runs twice — once tech, once silver):

| Asset | Count | Destination |
|---|---|---|
| Blog post (HTML) | 1 | fuseddistribution.com via git |
| Reels (MP4) | 3 | FB + IG + LinkedIn + X |
| Photo post (SVG) | 1 | FB + IG + LinkedIn |
| social-copy.json | 1 | Consumed by postiz-schedule.mjs |

Total per day: 2 blogs, 6 reels, 2 photo posts.

---

## Reel Strategy

3 reels per blog post, each hitting a different hook angle:

| Reel | Angle | Hook type preference |
|---|---|---|
| reel-1 | Lead stat — strongest number from post | contrarian_stat or pain_point |
| reel-2 | Core concept — "how it works" | immediate_value or contradiction |
| reel-3 | CTA direct — offer/action | pain_point or immediate_value |

All 3 reels are Express format (25–40s) unless the content demands Standard. Each reel is fully independent — different hook, different stats, can stand alone without context from the others.

---

## Photo Post

- Format: SVG, 1200×1200 (square for FB/IG feed)
- Brand styling: same dark theme, cyan accents as hero SVG
- Composition: post title (large) + one key stat + hero image element + blog URL CTA
- Saved as: `blog/[slug]/photo-post.svg`
- Posted to: Facebook + Instagram + LinkedIn (not X)

---

## social-copy.json

Saved as `blog/[slug]/social-copy.json`. Claude writes all captions during pipeline run.

```json
{
  "slug": "post-slug",
  "topic": "silver|tech",
  "blog_url": "https://fuseddistribution.com/blog/post-slug/",
  "reels": {
    "reel-1": {
      "angle": "lead_stat",
      "facebook": "2-4 sentences. No hashtags. Ends with discussion_question.",
      "instagram": "Punchier. Hashtags at end.",
      "linkedin": "Professional. 2-3 sentences. Link to blog.",
      "x": "Under 280 chars. Blog URL included."
    },
    "reel-2": { "angle": "concept", "facebook": "...", "instagram": "...", "linkedin": "...", "x": "..." },
    "reel-3": { "angle": "cta_direct", "facebook": "...", "instagram": "...", "linkedin": "...", "x": "..." }
  },
  "photo": {
    "facebook": "Longer copy. 3-5 sentences. No hashtags.",
    "instagram": "Caption + hashtags.",
    "linkedin": "Professional framing."
  },
  "hashtags": "#Tag1 #Tag2 #Tag3",
  "discussion_question": "One opinion-inviting question."
}
```

---

## Postiz Setup (Windows PC)

**Hardware:** Existing Windows desktop PC on local network.

**Requirements:**
- Windows 10 2004+ or Windows 11
- Docker Desktop with WSL2 backend
- Static LAN IP via router DHCP reservation (e.g. 192.168.1.50)
- Port 4007 open in Windows Firewall

**Social API credentials needed (one-time):**
- Facebook + Instagram: Facebook Developer App → App ID + App Secret
- LinkedIn: LinkedIn Developer App → Client ID + Client Secret
- X: X Developer Portal → API Key + API Secret

**Mac-side config:**
- `POSTIZ_URL=http://[PC-LAN-IP]:4007` in `video/.env`
- `POSTIZ_API_KEY=[key from Postiz Settings > Developers]` in `video/.env`

---

## postiz-schedule.mjs (future — not yet implemented)

Script: `blog/scripts/postiz-schedule.mjs`

Responsibilities:
1. Read `blog/[slug]/social-copy.json`
2. Upload `video/out/[slug]/[slug]-reel-1.mp4` through `-reel-3.mp4` to Postiz
3. Upload `blog/[slug]/photo-post.svg` to Postiz
4. Call `POST /public/v1/posts` with `scheduleType: "best_time"` per platform per asset
5. Log schedule confirmation to pipeline log

Not implemented until Postiz is installed and channels are connected.

---

## Implementation Phases

**Phase 1 (current):** SOP updates + content pipeline changes
- Update reel-data.md format (3 reels)
- Update render loop (3× per blog)
- Add photo-post.svg generation
- Add social-copy.json generation
- Update daily-blog-reel.sh prompt

**Phase 2 (Windows PC setup):**
- Install Docker Desktop + WSL2
- Deploy Postiz docker-compose
- Configure social API credentials
- Connect FB/IG/LinkedIn/X accounts in Postiz UI
- Set static LAN IP + firewall

**Phase 3 (integration):**
- Write postiz-schedule.mjs
- Add to daily pipeline
- Test full end-to-end run

---

## What Is NOT in Scope

- TikTok (no account)
- YouTube Shorts (no account)
- Cross-post analytics or reporting
- AI image generation for photo posts (Claude writes SVG directly)
- Caption A/B testing
