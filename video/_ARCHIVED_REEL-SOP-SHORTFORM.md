# Short-Form Reel SOP (Backup Reference)

> **This format is not the current pipeline goal.** The primary format is Long Form (180-240s).
> Use this document only when explicitly instructed to produce short-form reels.

---

## Formats

| Format | Target length | Best for |
|--------|--------------|----------|
| **Express** | 25–40s | Maximum algorithm reach; 1 stat + chart or 2 stats; no sub-topics |
| **Standard** | 60–90s | Depth posts with 3+ stats and chart |

Prefer Express when optimizing for discovery reach. Use Standard for posts with 3+ stats.

---

## reel-data.md Format (Short-Form / 3-Reel)

Contains 3 independent reel sections, each a different hook angle from the same blog post.

```markdown
# Reel Data: [slug]
topic: silver|tech

## reel-1
angle: lead_stat
hook: Strongest number from the post. Contrarian Stat or Pain Point formula.
hook_type: contrarian_stat|pain_point

### stats
- text: 42% LABEL IN 5 WORDS MAX
  narration: 2–4 sentences. Match blog wording closely.
- text: 73% SHORT LABEL HERE
  narration: 2–3 sentences.

### chart
title: Chart heading — copy from blog chart exactly
bars:
  - Label: XX%
  - Label: XX%
narration: Explain the data the same way the blog does.

### cta
text: Full breakdown — link in comments.
narration: One sentence. End with save ask or share ask.

---

## reel-2
angle: concept
hook: "How it works" or "why this matters" angle. Immediate Value or Contradiction formula.
hook_type: immediate_value|contradiction

### stats
- text: [Different stat from post — not reused from reel-1]
  narration: 2–4 sentences.

### cta
text: Full breakdown — link in comments.
narration: One sentence. End with discussion question ask.

---

## reel-3
angle: cta_direct
hook: Direct offer/action angle. Pain Point or Immediate Value formula.
hook_type: pain_point|immediate_value

### stats
- text: [Third angle stat or takeaway from post]
  narration: 2–4 sentences.

### cta
text: Full breakdown — link in comments.
narration: One sentence. End with share ask.

---

## shared
discussion_question: One short opinion-inviting question for caption close.
hashtags: #Tag1 #Tag2 #Tag3

## pexels_queries
- reel: 1
  segment: 0
  query: "specific pexels search query"
- reel: 2
  segment: 0
  query: "second specific query"
- reel: 3
  segment: 0
  query: "third specific query"
```

Rules:
- Each reel must use a **different stat or angle** — no repeated numbers across reels
- `### chart` — include in reel-1 only if post has a chart; omit from reel-2 and reel-3
- `### stats` — 2–3 entries max per reel
- All 3 reels target Express format (25–40s) unless content clearly needs Standard
- `## shared` block — one discussion_question and hashtag set, shared across all 3 reels

---

## Render Commands (Short-Form)

```bash
TRACK=$(printf "ambient-%02d.mp3" $(( ($(date +%j) % 10) + 1 )))
cd video && export $(cat .env | xargs) && node scripts/render.mjs --post=[slug] --reel=1 --music=$TRACK
cd video && export $(cat .env | xargs) && node scripts/render.mjs --post=[slug] --reel=2 --music=$TRACK
cd video && export $(cat .env | xargs) && node scripts/render.mjs --post=[slug] --reel=3 --music=$TRACK
```

Script files: `blog/[slug]/reel-script-1.md`, `reel-script-2.md`, `reel-script-3.md`

---

## Segment Planning (Short-Form)

- **Express:** 2–3 body segments. HOOK + 1–2 stats + CTA. Total 25–40s.
- **Standard:** 4–6 body segments. HOOK + stats + chart + CTA. Total 60–90s.
- Set segment duration from narration length — never squeeze narration.
- Close with `## CTA` (not QUESTION). Short-form uses CTA, Long Form uses QUESTION.
