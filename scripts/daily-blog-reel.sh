#!/bin/zsh
# Daily blog + reel pipeline — runs via launchd at 9 AM

PROJECT_DIR="/Users/nick/Documents/New project"
LOG_FILE="$HOME/Library/Logs/daily-blog-reel.log"

echo "\n=== $(date) ===" >> "$LOG_FILE"

# Anchor: line count at run start, so end-of-run scans only THIS run's output
RUN_START_LINE=$(wc -l < "$LOG_FILE" | tr -d ' ')

cd "$PROJECT_DIR" || exit 1

# Guard: .env must exist before pipeline starts
[ -f video/.env ] || { echo "ERROR: video/.env missing — pipeline aborted" >> "$LOG_FILE"; exit 1; }

# Guard: topic-history.md must exist (create from template if missing)
[ -f blog/topic-history.md ] || { echo "## Tech Posts\n\n| Date | Slug | Broad Category | Angle |\n|------|------|----------------|-------|\n\n## Silver Posts\n\n| Date | Slug | Broad Category | Angle |\n|------|------|----------------|-------|" > blog/topic-history.md && echo "Created topic-history.md from template" >> "$LOG_FILE"; }

# Kill any stale Remotion chrome-headless-shell processes from previous runs
ZOMBIE_COUNT=$(pgrep -f "chrome-headless-shell" | wc -l | tr -d ' ')
if [ "$ZOMBIE_COUNT" -gt 0 ]; then
  pkill -f "chrome-headless-shell" 2>/dev/null
  echo "Killed $ZOMBIE_COUNT stale Remotion chrome processes" >> "$LOG_FILE"
fi

# Pre-compute deterministic music track — mod 9 + 2 skips ambient-01 (46s, too short for Long Form)
MUSIC_TRACK=$(printf "ambient-%02d.mp3" $(( ($(date +%j) % 9) + 2 )))
[ -n "$MUSIC_TRACK" ] || { echo "ERROR: MUSIC_TRACK not computed" >> "$LOG_FILE"; exit 1; }

/Users/nick/.local/bin/claude -p \
"Follow the blog+reel pipeline in blog/BLOG-SOP.md and video/REEL-SOP.md.

Run: one tech post + one silver post + two reels.

IMPORTANT: This is a fully automated pipeline. Do NOT ask for confirmation, approval, or direction at any point. Pick the angles yourself and execute all steps without stopping. The only acceptable output is completed work and a git commit.

Today's music track: ${MUSIC_TRACK} — pass this as --music=${MUSIC_TRACK} on every render command.

Steps:
1. Read blog/topic-history.md to see all covered angles with dates. Apply these rules:
   - Do NOT repeat any angle posted within the last 180 days.
   - Do NOT pick two posts in the same broad category if one was posted within the last 7 days.
   - After a topic is 180+ days old, it may be revisited with a fresh angle.
   Tech: pick from Websites / Local Business / Marketing / Google / Social Media.
   Silver: rotate through — Buying Guide → Investing → Storage → History → Market.
   Choose immediately and proceed. Do not propose or ask.

2. Write TECH post:
   - FIRST: Use the seo-plan skill to identify target keyword, search intent, and top competitor gap for the chosen angle. Record the target keyword.
   - Use the blog-write skill to draft the post body — pass target keyword from seo-plan; enforces E-E-A-T and sourced stats
   - Use the blog-seo-check skill after drafting to validate on-page SEO signals
   - Use the seo-local skill if the post covers local business, Google, or map pack topics
   - Read blog/BLOG-SOP.md (instructions) and blog/BLOG-REF.md (HTML/CSS templates)
   - Create blog/[slug-tech]/index.html + hero.svg following the SOP
   - Target keyword must appear in: title, h1, meta description, first paragraph, and at least one h2
   - Add FAQ block (3+ questions) near end of article body + matching FAQPage JSON-LD in head
   - Internal linking: read posts.json, pick 2-3 topically related existing posts, add anchor links inline (intro, body, next-read before CTA)
   - Generate hero.jpg from hero.svg (required for OG tags and reel segment-0 thumbnail):
     \"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome\" \\
       --headless=new --disable-gpu \\
       --screenshot=/tmp/hero-tmp.png \\
       --window-size=1200,630 \\
       \"file://\$(pwd)/blog/[slug-tech]/hero.svg\" 2>/dev/null && \\
     sips -s format jpeg /tmp/hero-tmp.png --out blog/[slug-tech]/hero.jpg -s formatOptions 85 && \\
     rm /tmp/hero-tmp.png
   - Run: node blog/scripts/fetch-pexels.mjs --post=[slug-tech] --queries=\"q1|q2\"
   - Create blog/[slug-tech]/reel-data.md following §11, §11b, and §11c of the SOP (include graphic_type, graphic: fields, and media_queries per segment)
   - Write blog/[slug-tech]/photo-post.svg following §15 of the SOP (1200x1200 square)
   - Generate photo-post.jpg from photo-post.svg:
     \"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome\" \\
       --headless=new --disable-gpu \\
       --screenshot=/tmp/photo-post-tmp.png \\
       --window-size=1200,1200 \\
       \"file://\$(pwd)/blog/[slug-tech]/photo-post.svg\" 2>/dev/null && \\
     sips -s format jpeg /tmp/photo-post-tmp.png --out blog/[slug-tech]/photo-post.jpg -s formatOptions 85 && \\
     rm /tmp/photo-post-tmp.png
   - Write blog/[slug-tech]/social-copy.json following §14 of the SOP (single reel schema, 5-hashtag max, share CTA, disclaimer)
   - Prepend entry to blog/posts.json

3. Write SILVER post (same as step 2, use silver brand routing from §1 of the SOP).

4. Render TECH reel:
   - Read blog/[slug-tech]/reel-data.md
   - Write blog/[slug-tech]/reel-script.md following video/REEL-SOP.md
   - REQUIRED script validation gate — if any check fails, fix reel-script.md before render, do not skip:
     grep -c \"—\" blog/[slug-tech]/reel-script.md        # MUST BE 0 — no em dashes
     grep -c \"## QUESTION\" blog/[slug-tech]/reel-script.md  # MUST BE ≥ 1
     grep -cE \"Narration:.*\bUS\b\" blog/[slug-tech]/reel-script.md  # MUST BE 0 — use USA
     grep -c \"Narration:.*%\" blog/[slug-tech]/reel-script.md   # MUST BE 0 — use \"percent\"
     if grep -q \"^## chart\" blog/[slug-tech]/reel-data.md 2>/dev/null; then grep -cE \"^\*\*Chart\" blog/[slug-tech]/reel-script.md; fi  # MUST BE ≥ 1 if chart exists
   - REQUIRED: Run timing validation on every segment (words ÷ 2.5 + 2 = minimum window seconds). Fix failures by extending window, never shortening narration.
   - Run: cd video && export \$(cat .env | xargs) && node scripts/render.mjs --post=[slug-tech] --music=${MUSIC_TRACK}
   - Verify output: ls -lh video/out/[slug-tech]/[slug-tech].mp4 — must be > 5 MB. If smaller, render silently failed. Re-run.
   - If near 5 MB threshold, run: ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 video/out/[slug-tech]/[slug-tech].mp4 — duration must match declared target within 10s.
   - AFTER render completes, write the slug to /tmp/reel-pipeline-slugs.txt — one line per slug, format: tech=[slug-tech]

5. Render SILVER reel (same as step 4, using [slug-silver]).
   Note: QUESTION narration for silver = \"Follow for more silver news.\" / tech = \"Follow for more tips to grow your business.\" — verify correct variant is in reel-script.md before render.
   - AFTER render completes, write the slug to /tmp/reel-pipeline-slugs.txt — append: silver=[slug-silver]

6. Append new entries to blog/topic-history.md under the correct section:
   | YYYY-MM-DD | [slug] | [Broad Category] | [one-line angle description] |

7. Git commit, push, and deploy:
   git add blog/ video/out/ blog/topic-history.md
   git commit -m \"feat: [tech-title] + [silver-title] + reels\"
   git push origin main
   npx wrangler deploy || CLOUDFLARE_API_TOKEN=\$(security find-generic-password -s cloudflare-api-token -w) npx wrangler deploy
   (Fallback: if OAuth fails, the second command pulls the API token from macOS Keychain at runtime. Never echo or write the token anywhere. If BOTH fail, log \"DEPLOY FAILED — slugs NOT LIVE: [slugs]\" and continue with remaining steps.)
   Then verify sitemap (wait 10s after deploy for Cloudflare propagation, then retry up to 3 times):
   sleep 10 && for slug in [slug-tech] [slug-silver]; do
     found=0; for i in 1 2 3; do
       curl -s https://fuseddistribution.com/sitemap.xml | grep -q \"\$slug\" && found=1 && break
       sleep 5
     done
     [ \$found -eq 0 ] && echo \"SITEMAP MISSING: \$slug\" >> blog/SITEMAP_GAPS.log
   done" \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep,Skill" \
  --max-turns 120 \
  >> "$LOG_FILE" 2>&1

CLAUDE_EXIT=$?
echo "Claude exit code: $CLAUDE_EXIT" >> "$LOG_FILE"

# ── Session-limit auto-retry ────────────────────────────────────────────────
# "You've hit your session limit · resets 1pm" killed 3 of the last 6 morning
# runs. Parse the reset time, sleep until reset + 10 min, re-exec once.
if [ -z "$DAILY_BLOG_RETRY" ]; then
  RUN_LOG=$(tail -n +"$((RUN_START_LINE + 1))" "$LOG_FILE")
  if echo "$RUN_LOG" | grep -q "session limit"; then
    RESET_RAW=$(echo "$RUN_LOG" | grep -oE "resets [0-9]{1,2}(:[0-9]{2})?(am|pm)" | head -1 | sed 's/resets //')
    if [ -n "$RESET_RAW" ]; then
      H=$(echo "$RESET_RAW" | grep -oE "^[0-9]{1,2}")
      M=$(echo "$RESET_RAW" | grep -oE ":[0-9]{2}" | tr -d ':'); M=${M:-0}
      AP=$(echo "$RESET_RAW" | grep -oE "(am|pm)")
      [ "$AP" = "pm" ] && [ "$H" -ne 12 ] && H=$((H + 12))
      [ "$AP" = "am" ] && [ "$H" -eq 12 ] && H=0
      TARGET=$(date -j -f "%H:%M:%S" "$(printf "%02d:%02d:00" "$H" "$M")" +%s 2>/dev/null)
      NOW=$(date +%s)
      WAIT=$((TARGET - NOW + 600))
      if [ "$WAIT" -gt 0 ] && [ "$WAIT" -le 28800 ]; then
        echo "Session limit — sleeping ${WAIT}s until $RESET_RAW + 10 min, then retrying once" >> "$LOG_FILE"
        sleep "$WAIT"
        DAILY_BLOG_RETRY=1 exec "$0"
      fi
    fi
    echo "Session limit hit but reset time unparseable or out of range — no retry" >> "$LOG_FILE"
  fi
fi

# ── Post-run MP4 verification ──────────────────────────────────────────────
# Read slugs written by Claude during the run
SLUG_FILE="/tmp/reel-pipeline-slugs.txt"
MISSING_RENDERS=0

if [ ! -f "$SLUG_FILE" ]; then
  echo "PIPELINE WARNING: slug file not written — Claude may have been rate-limited before render step" >> "$LOG_FILE"
  MISSING_RENDERS=1
else
  while IFS='=' read -r TYPE SLUG; do
    MP4="$PROJECT_DIR/video/out/$SLUG/$SLUG.mp4"
    SIZE=$(stat -f%z "$MP4" 2>/dev/null || echo 0)
    if [ "$SIZE" -lt 5000000 ]; then
      echo "RENDER FAILED: $SLUG ($SIZE bytes) — attempting direct render" >> "$LOG_FILE"
      MISSING_RENDERS=1
      # Fallback: render directly via remotion (skips re-fetch, uses existing assets)
      cd "$PROJECT_DIR/video" && \
        export $(cat .env | xargs) && \
        npx remotion render src/Root.tsx BlogReel "out/$SLUG/$SLUG.mp4" \
          --props="{\"slug\":\"$SLUG\"}" \
          >> "$LOG_FILE" 2>&1
      RENDER_EXIT=$?
      NEW_SIZE=$(stat -f%z "$MP4" 2>/dev/null || echo 0)
      if [ "$NEW_SIZE" -gt 5000000 ]; then
        echo "RENDER RETRY OK: $SLUG ($NEW_SIZE bytes)" >> "$LOG_FILE"
        MISSING_RENDERS=$((MISSING_RENDERS - 1))
      else
        echo "RENDER RETRY FAILED: $SLUG — manual intervention required" >> "$LOG_FILE"
      fi
    else
      echo "RENDER OK: $SLUG ($SIZE bytes)" >> "$LOG_FILE"
    fi
  done < "$SLUG_FILE"
  rm -f "$SLUG_FILE"
fi

# Kill any Remotion processes left over from this run
pkill -f "chrome-headless-shell" 2>/dev/null

# ── Failure alert (macOS notification) ─────────────────────────────────────
notify() {
  osascript -e "display notification \"$1\" with title \"Daily Blog Pipeline\" sound name \"Basso\"" 2>/dev/null
}

# Scan only THIS run's log lines for blocker keywords Claude may have written
RUN_ERRORS=$(tail -n +"$((RUN_START_LINE + 1))" "$LOG_FILE" | grep -cE "DEPLOY FAILED|NOT LIVE|BLOCKED|session limit|PIPELINE WARNING|RETRY FAILED")

if [ "$MISSING_RENDERS" -gt 0 ]; then
  echo "PIPELINE INCOMPLETE: $MISSING_RENDERS render(s) failed — check log" >> "$LOG_FILE"
  notify "FAILED: $MISSING_RENDERS render(s) incomplete. Check daily-blog-reel.log"
  echo "Exit code: 1" >> "$LOG_FILE"
  exit 1
fi

if [ "$CLAUDE_EXIT" -ne 0 ] || [ "$RUN_ERRORS" -gt 0 ]; then
  notify "Completed with warnings ($RUN_ERRORS flagged lines). Check daily-blog-reel.log"
fi

echo "Exit code: 0" >> "$LOG_FILE"
