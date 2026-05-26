#!/bin/zsh
# Daily blog + reel pipeline — runs via launchd at 9 AM

PROJECT_DIR="/Users/nick/Documents/New project"
LOG_FILE="$HOME/Library/Logs/daily-blog-reel.log"

echo "\n=== $(date) ===" >> "$LOG_FILE"

cd "$PROJECT_DIR" || exit 1

/Users/nick/.local/bin/claude -p \
'Follow the blog+reel pipeline in blog/BLOG-SOP.md and video/REEL-SOP.md.

Run: one tech post + one silver post + two reels.

IMPORTANT: This is a fully automated pipeline. Do NOT ask for confirmation, approval, or direction at any point. Pick the angles yourself and execute all steps without stopping. The only acceptable output is completed work and a git commit.

Steps:
1. Read blog/topic-history.md to see all covered angles with dates. Apply these rules:
   - Do NOT repeat any angle posted within the last 180 days.
   - Do NOT pick two posts in the same broad category if one was posted within the last 7 days.
   - After a topic is 180+ days old, it may be revisited with a fresh angle.
   Tech: pick from Websites / Local Business / Marketing / Google / Social Media.
   Silver: rotate through — Buying Guide → Investing → Storage → History → Market.
   Choose immediately and proceed. Do not propose or ask.

2. Write TECH post:
   - Read blog/BLOG-SOP.md (instructions) and blog/BLOG-REF.md (HTML/CSS templates)
   - Create blog/[slug-tech]/index.html + hero.svg following the SOP
   - Run: node blog/scripts/fetch-pexels.mjs --post=[slug-tech] --queries="q1|q2"
   - Create blog/[slug-tech]/reel-data.md following §11 of the SOP
   - Prepend entry to blog/posts.json

3. Write SILVER post (same as step 2, use silver brand routing from §1 of the SOP).

4. Render TECH reel:
   - Read blog/[slug-tech]/reel-data.md
   - Write blog/[slug-tech]/reel-script.md following video/REEL-SOP.md
   - Run: cd video && export $(cat .env | xargs) && node scripts/render.mjs --post=[slug-tech]

5. Render SILVER reel (same as step 4).

6. Append new entries to blog/topic-history.md under the correct section:
   | YYYY-MM-DD | [slug] | [Broad Category] | [one-line angle description] |

7. Git commit (no push — requires explicit permission):
   git add blog/ video/out/ blog/topic-history.md
   git commit -m "feat: [tech-title] + [silver-title] + reels"' \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep" \
  >> "$LOG_FILE" 2>&1

echo "Exit code: $?" >> "$LOG_FILE"
