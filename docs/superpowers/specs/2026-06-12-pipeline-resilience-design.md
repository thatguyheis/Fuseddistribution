# Pipeline Resilience + Folder Move Design

**Date:** 2026-06-12  
**Status:** Approved

## Problem

On 2026-06-11, the daily blog pipeline hit Claude's session token limit at 9am. The single `claude -p` call for all 4 posts died mid-run. The retry plist fired at 7:50pm — 10+ hours late. Posts published same day but far outside the target window.

Secondary issue: project folder at `/Users/nick/Documents/New project` is in iCloud-synced Documents, causing repeated permission prompts in Claude Code.

## Goals

1. Move project folder out of Documents to eliminate permission prompts.
2. Publish each post incrementally as it finishes — not batch at end.
3. Detect session limit before wasting tokens on a doomed call.
4. On limit hit, schedule retry and resume from exactly where it stopped.
5. Keep all tasks sequential — no parallel execution (low-resource hardware: MacBook with 8GB RAM).

## Out of Scope

- Parallel post processing
- Multiple Claude accounts / API key fallback
- Changing the 9am schedule

---

## Part 1: Folder Move

**From:** `/Users/nick/Documents/New project`  
**To:** `/Users/nick/projects/fuseddistribution`

### Files to update

| File | Change |
|------|--------|
| `/Users/nick/bin/daily-blog-reel.sh` | `PROJECT_DIR` line |
| `/Users/nick/bin/render-missing-reels.sh` | `PROJECT_DIR` line |
| `/Users/nick/bin/gemma-research-runner.sh` | Two hardcoded path references |

LaunchAgent plists are unaffected — they call `/Users/nick/bin/*.sh` directly.  
Wrangler config uses relative `./public` — no change needed.  
Git remote is GitHub — local path change has no effect.

### Steps

1. `mkdir /Users/nick/projects`
2. `mv "/Users/nick/Documents/New project" /Users/nick/projects/fuseddistribution`
3. Update the 3 scripts above (sed or Edit tool)
4. Verify: `cd /Users/nick/projects/fuseddistribution && git status && npx wrangler --version`

---

## Part 2: Pre-flight Session Probe

At the top of `daily-blog-reel.sh`, before any post loop, run a cheap Claude probe:

```bash
probe_session() {
  local out
  out=$(claude -p "respond with ok" 2>&1)
  if echo "$out" | grep -qi "session limit\|usage limit\|rate limit"; then
    echo "$out"
    return 1
  fi
  return 0
}
```

If probe fails:
- Parse reset time from probe output (same regex already in script)
- Schedule retry plist
- Log and exit 0 (clean exit — not an error)

Cost: ~2 seconds, minimal tokens. Fires once per run before any work.

---

## Part 3: Per-Post Incremental Loop

### Shell owns: commit, push, deploy, sitemap, verification

Claude's prompt is scoped to **one post only**. No FINAL STEPS block. Claude writes files to disk and exits.

### Loop structure

```
BOOT: launchctl bootout + rm any existing retry plist (same as current script)

READ queue JSON → get ordered list of slugs

CHECK for YYYY-MM-DD-pending.json
  → if exists, filter slugs to only remaining ones

FOR each slug:
  1. Pre-flight probe
       → limit hit? write pending.json with remaining slugs
                     schedule retry plist
                     exit 0
  2. Check if post already built (index.html exists + hero.jpg exists)
       → if yes: log "skipping [slug] — already built", continue
  3. Run: claude -p <single-post prompt> --allowedTools Bash,Read,Write,Edit,Glob,Grep,Skill
       → capture exit code + output
  4. If exit code != 0 AND session limit in output:
       → write pending.json with current slug + remaining slugs
       → schedule retry plist
       → exit 0
  5. Validate output files exist:
       public/blog/[slug]/index.html
       public/blog/[slug]/hero.jpg
       public/blog/[slug]/reel-script.md
       public/blog/[slug]/social-copy.json
       → any missing: log WARN, continue (don't block remaining posts)
  6. node public/blog/scripts/generate-sitemap.mjs
  7. git add public/blog/[slug]/ public/sitemap.xml public/blog/posts.json public/blog/topic-history.md
     git commit -m "feat: [slug]"
  8. git push origin main
  9. npx wrangler deploy
  10. curl verify → log PASS or FAIL
  11. Continue to next slug

AFTER loop completes:
  - Delete pending.json if exists
  - Final sitemap parity check (live vs local)
  - Summary log line
```

### Pending file format

```json
{
  "date": "2026-06-12",
  "remaining": ["slug-b", "slug-c", "slug-d"],
  "interrupted_at": "2026-06-12T09:47:00"
}
```

Written to: `public/blog/research/YYYY-MM-DD-pending.json`

### Claude single-post prompt structure

Same content as current BLOG-SOP.md pipeline prompt, but:
- `$QUEUE_CONTEXT` passes only ONE post's data
- Removes the entire "FINAL STEPS" section (steps 1-9 of current final steps: topic-history, reel validation, social validation, SVG entity check, social-ad skill, ugc-script skill, sitemap regen, commit, deploy)
- Claude still handles: topic-history append, reel validation, social validation, SVG entity check, social-ad skill, ugc-script skill for THIS post
- Shell handles: sitemap regen, git commit, git push, wrangler deploy, curl verify

### What Claude still does per post

Steps 1–16 from current prompt (read draft → polish → SEO check → schema → build HTML → hero SVG/JPG → pexels → reel-data → reel-script → photo-post → social-copy → posts.json entry → internal links) plus the per-post validations (reel script checks, em-dash grep, SVG entity check, social-ad skill, ugc-script skill, topic-history append).

---

## Error Handling

| Condition | Action |
|-----------|--------|
| Probe detects limit | Schedule retry, exit clean |
| Claude call hits limit mid-post | Write pending.json, schedule retry, exit clean |
| Output files missing after Claude | Log WARN, continue to next post |
| `git push` fails (secret scan) | Log BLOCKED with scrub recipe, notify, continue |
| `wrangler deploy` fails | Log FAIL, notify, continue |
| curl verify 404 after deploy | Log VERIFY FAIL, notify |

---

## Files Changed

| File | Change |
|------|--------|
| `/Users/nick/bin/daily-blog-reel.sh` | Full rewrite — probe + per-post loop + path update |
| `/Users/nick/bin/render-missing-reels.sh` | `PROJECT_DIR` path update only |
| `/Users/nick/bin/gemma-research-runner.sh` | Two path references updated |
| Project folder | Moved to `/Users/nick/projects/fuseddistribution` |

No changes to LaunchAgent plists, wrangler.toml, or BLOG-SOP.md.
