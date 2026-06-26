#!/bin/zsh
# Daily blog pipeline — runs via launchd at 9 AM.
# Per-post mode: each post is a separate Claude call with local commit handoff.
# Pre-flight session probe before each post prevents wasted runs on limit hits.

PROJECT_DIR="/Users/nick/projects/fuseddistribution"
LOG_FILE="$HOME/Library/Logs/daily-blog-reel.log"

export PATH="/usr/local/bin:/opt/homebrew/bin:/Users/nick/.local/bin:$PATH"
AUTO_DEPLOY="${BLOG_AUTO_DEPLOY:-0}"

# ── Retry plist cleanup ────────────────────────────────────────────────────────
launchctl bootout "gui/$(id -u)/com.nick.daily-blog-reel.retry" 2>/dev/null
rm -f "$HOME/Library/LaunchAgents/com.nick.daily-blog-reel.retry.plist"

# ── Helpers ───────────────────────────────────────────────────────────────────
notify() { osascript -e "display notification \"$2\" with title \"Blog pipeline: $1\"" 2>/dev/null || true }

log_rotate() {
  if [[ -f "$LOG_FILE" && $(stat -f%z "$LOG_FILE" 2>/dev/null || echo 0) -gt 5242880 ]]; then
    mv "$LOG_FILE" "${LOG_FILE}.1"
  fi
}

probe_session() {
  local out
  out=$(claude -p "respond with ok" 2>&1)
  if echo "$out" | grep -qi "session limit\|usage limit\|rate limit"; then
    echo "$out"
    return 1
  fi
  return 0
}

schedule_retry() {
  local reset_raw="$1"
  local sleep_secs=21600
  if [[ -n "$reset_raw" ]]; then
    local reset_epoch
    reset_epoch=$(date -j -f '%I:%M%p' \
      "$(echo "$reset_raw" | tr -d ' ' | sed -E 's/^([0-9]{1,2})(am|pm)$/\1:00\2/')" \
      '+%s' 2>/dev/null)
    local now_epoch
    now_epoch=$(date '+%s')
    if [[ -n "$reset_epoch" ]]; then
      (( reset_epoch <= now_epoch )) && reset_epoch=$(( reset_epoch + 86400 ))
      sleep_secs=$(( reset_epoch - now_epoch + 600 ))
    fi
  fi
  local retry_epoch=$(( $(date '+%s') + sleep_secs ))
  local retry_hour=$(( 10#$(date -r "$retry_epoch" '+%H') ))
  local retry_min=$(( 10#$(date -r "$retry_epoch" '+%M') ))
  local retry_label="com.nick.daily-blog-reel.retry"
  local retry_plist="$HOME/Library/LaunchAgents/${retry_label}.plist"
  cat > "$retry_plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${retry_label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>/Users/nick/bin/daily-blog-reel.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>${retry_hour}</integer>
    <key>Minute</key><integer>${retry_min}</integer>
  </dict>
  <key>StandardOutPath</key><string>/Users/nick/Library/Logs/daily-blog-reel.log</string>
  <key>StandardErrorPath</key><string>/Users/nick/Library/Logs/daily-blog-reel.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/Users/nick/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>SoftResourceLimits</key>
  <dict><key>NumberOfFiles</key><integer>65536</integer></dict>
  <key>HardResourceLimits</key>
  <dict><key>NumberOfFiles</key><integer>65536</integer></dict>
</dict>
</plist>
PLIST
  launchctl bootout "gui/$(id -u)/${retry_label}" 2>/dev/null
  launchctl bootstrap "gui/$(id -u)" "$retry_plist"
  echo "Retry scheduled for ${retry_hour}:$(printf '%02d' "$retry_min") (${sleep_secs}s from now)" >> "$LOG_FILE"
}

write_pending() {
  local pending_file="$1"
  shift
  local arr_json=""
  for s in "$@"; do
    arr_json+="\"$s\","
  done
  arr_json="[${arr_json%,}]"
  cat > "$pending_file" <<JSON
{
  "date": "$(date +%Y-%m-%d)",
  "remaining": $arr_json,
  "interrupted_at": "$(date -u +%Y-%m-%dT%H:%M:%S)"
}
JSON
}

remaining_from() {
  # remaining_from CURRENT_SLUG SLUG1 SLUG2 ... — returns all slugs from CURRENT_SLUG onward
  local target="$1"; shift
  local found=false
  local result=()
  for s in "$@"; do
    [[ "$s" == "$target" ]] && found=true
    $found && result+=("$s")
  done
  echo "${result[@]}"
}

quarantine_post_dir() {
  local slug="$1"
  local src="public/blog/$slug"
  [[ -d "$src" ]] || return 0
  local dest_root=".workflow-blocked/$(date +%Y-%m-%d)"
  local dest="$dest_root/$slug-$(date +%H%M%S)"
  mkdir -p "$dest_root"
  mv "$src" "$dest"
  echo "QUARANTINED: $slug artifacts moved to $dest" >> "$LOG_FILE"
}

# ── Log rotation + header ─────────────────────────────────────────────────────
log_rotate
echo "\n=== $(date) ===" >> "$LOG_FILE"

# ── Environment ───────────────────────────────────────────────────────────────
set -o allexport
source "$PROJECT_DIR/video/.env"
set +o allexport

if [[ "$AUTO_DEPLOY" == "1" && -z "$CLOUDFLARE_API_TOKEN" ]]; then
  echo "WARN: CLOUDFLARE_API_TOKEN not set in video/.env - auto deploy will fail." | tee -a "$LOG_FILE"
  notify "config" "CLOUDFLARE_API_TOKEN missing from video/.env"
fi

if [[ "$AUTO_DEPLOY" == "1" && -n "$CLOUDFLARE_API_TOKEN" ]]; then
  if ! curl -s --max-time 30 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "https://api.cloudflare.com/client/v4/user/tokens/verify" | grep -q '"status":"active"'; then
    echo "WARN: Cloudflare token verify failed - auto deploy will fail. Roll token at dash.cloudflare.com." | tee -a "$LOG_FILE"
    notify "auth" "Cloudflare token canary failed - auto deploy at risk"
  fi
fi

pkill -f "chrome-headless-shell" 2>/dev/null || true
FD_USED=$(sysctl -n kern.num_files)
FD_MAX=$(sysctl -n kern.maxfiles)
if (( FD_USED * 100 / FD_MAX > 80 )); then
  echo "WARN: kernel file table at ${FD_USED}/${FD_MAX} (>80%)" | tee -a "$LOG_FILE"
  notify "fd" "kernel file table ${FD_USED}/${FD_MAX}"
fi
ulimit -n 65536 2>/dev/null || true

cd "$PROJECT_DIR" || exit 1

TODAY=$(date '+%Y-%m-%d')
QUEUE_FILE="public/blog/research/${TODAY}-queue.json"
PENDING_FILE="public/blog/research/${TODAY}-pending.json"

# ── Initial session probe ─────────────────────────────────────────────────────
echo "Probe: checking session availability..." >> "$LOG_FILE"
PROBE_OUT=$(probe_session 2>&1)
if [[ $? -ne 0 ]]; then
  RESET_RAW=$(echo "$PROBE_OUT" | grep -oiE "resets? (at )?[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)" \
    | head -1 | grep -oiE "[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)")
  echo "Session limit at start. Reset: ${RESET_RAW:-unknown}. Scheduling retry." >> "$LOG_FILE"
  notify "session limit" "Detected before run — retry scheduled"
  schedule_retry "$RESET_RAW"
  exit 0
fi
echo "Probe: session OK" >> "$LOG_FILE"

# ── Build slug list ───────────────────────────────────────────────────────────
QUEUE_MODE=false
ALL_SLUGS=()

if [[ -f "$QUEUE_FILE" ]]; then
  QUEUE_MODE=true
  ALL_SLUGS=($(python3 -c \
    "import json; [print(p['slug']) for p in json.load(open('$QUEUE_FILE'))['posts']]" 2>/dev/null))
fi

if (( ${#ALL_SLUGS[@]} == 0 )); then
  echo "No queue or empty — self-directed fallback" >> "$LOG_FILE"
  QUEUE_MODE=false
fi

# ── Apply pending filter ──────────────────────────────────────────────────────
SLUGS=("${ALL_SLUGS[@]}")
if [[ -f "$PENDING_FILE" ]]; then
  REMAINING=($(python3 -c \
    "import json; [print(s) for s in json.load(open('$PENDING_FILE'))['remaining']]" 2>/dev/null))
  if (( ${#REMAINING[@]} > 0 )); then
    echo "Pending file found — resuming ${#REMAINING[@]} slug(s): ${REMAINING[*]}" >> "$LOG_FILE"
    SLUGS=("${REMAINING[@]}")
  fi
fi

# ── Per-post loop ─────────────────────────────────────────────────────────────
FAILS=0
BUILT=()

if ! $QUEUE_MODE; then
  # ── Fallback: self-directed single claude call ────────────────────────────
  echo "Running self-directed mode (1 silver + 1 tech-or-AI)..." >> "$LOG_FILE"
  SELF_TMPOUT=$(mktemp)
  claude -p \
"Follow the blog pipeline in public/blog/BLOG-SOP.md. Read public/blog/BLOG-REF.md for templates (copy verbatim).
IMPORTANT: Fully automated pipeline. Do NOT ask for confirmation. Rendering happens at 11 AM — do NOT render.

## NO GEMMA QUEUE FOUND FOR TODAY
Fall back to self-directed mode: write ONE silver post + ONE tech/AI post.

For the tech/AI post: alternate between local business / website / marketing topics (brand=tech) and AI topics (how to use AI tools, AI for small business, AI training for business owners, getting started with AI, AI prompting, AI automation — also brand=tech). Check public/blog/topic-history.md to see what was last posted and pick the other category to avoid repetition. If last tech post was AI, do a tech/local-business post and vice versa.

For the silver post: FIRST run `curl -s https://fuseddistribution.com/api/spot` to get live silver and gold spot prices. Use the returned values for ALL price examples — never use assumed round numbers. Quote the price with today's date (e.g. "spot: $64.85/oz as of June 22, 2026"). See §1b in BLOG-SOP.md for exact rules.

Rotate through ALL available silver categories — do NOT default to Buying Guide or General every time. Check topic-history.md Silver Posts section and pick an underrepresented category. Priority order for underrepresented categories: News & Outlook, Tax & Legal, Selling, Retirement, COMEX & Futures, Dealer Reviews, Tools & Tracking, Estate & Inheritance, Mining & Stocks, Coin Guides, then Investing/Storage/Types/History if all others recently used. See §1a in public/blog/BLOG-SOP.md for full category list and topic seeds.

Use seo-plan skill to pick keywords, then blog-write skill for the draft.
Follow public/blog/BLOG-SOP.md fully including §1 Brand Routing for AI posts.
Do NOT commit, push, deploy, or regenerate the sitemap — shell handles that." \
    --allowedTools "Bash,Read,Write,Edit,Glob,Grep,Skill" 2>&1 | tee -a "$LOG_FILE" "$SELF_TMPOUT" > /dev/null
  SELF_EXIT=$pipestatus[1]

  if [[ $SELF_EXIT -ne 0 ]] && grep -qi "session limit\|usage limit" "$SELF_TMPOUT"; then
    RESET_RAW=$(grep -oiE "resets? (at )?[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)" "$SELF_TMPOUT" \
      | head -1 | grep -oiE "[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)")
    echo "Session limit in self-directed mode. Reset: ${RESET_RAW:-unknown}." >> "$LOG_FILE"
    notify "session limit" "Self-directed mode hit limit — retry scheduled"
    schedule_retry "$RESET_RAW"
    rm -f "$SELF_TMPOUT"
    exit 0
  fi
  rm -f "$SELF_TMPOUT"

  # Discover slugs built by self-directed claude
  SLUGS=($(git log --since=midnight --diff-filter=A --name-only --pretty=format: \
    -- 'public/blog/*/index.html' 2>/dev/null \
    | sed -E 's|public/blog/([^/]+)/index.html|\1|' | sort -u))
fi

for SLUG in "${SLUGS[@]}"; do
  echo "\n--- Post: $SLUG ---" >> "$LOG_FILE"

  # Skip only fully registered posts. Partial QA-failed folders must be rebuilt or blocked.
  if [[ -f "public/blog/$SLUG/index.html" && -f "public/blog/$SLUG/hero.jpg" ]]      && grep -q "\"slug\": \"$SLUG\"" public/blog/posts.json 2>/dev/null; then
    echo "SKIP: $SLUG already built and registered" >> "$LOG_FILE"
    BUILT+=("$SLUG")
    continue
  fi

  # Pre-flight probe before this post
  PROBE_OUT=$(probe_session 2>&1)
  if [[ $? -ne 0 ]]; then
    REMAINING_SLUGS=($(remaining_from "$SLUG" "${SLUGS[@]}"))
    RESET_RAW=$(echo "$PROBE_OUT" | grep -oiE "resets? (at )?[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)" \
      | head -1 | grep -oiE "[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)")
    write_pending "$PENDING_FILE" "${REMAINING_SLUGS[@]}"
    echo "Session limit before $SLUG. ${#REMAINING_SLUGS[@]} slug(s) pending." >> "$LOG_FILE"
    notify "session limit" "$SLUG pending — retry scheduled"
    schedule_retry "$RESET_RAW"
    exit 0
  fi

  # Build single-post context from queue JSON
  POST_DATA=$(python3 -c "
import json, sys
posts = json.load(open('$QUEUE_FILE'))['posts']
p = next((p for p in posts if p['slug'] == '$SLUG'), None)
if p: print(json.dumps(p, indent=2))
else: print('{}')
" 2>/dev/null)

  # Extract brand + keyword from queue post data
  BRAND=$(echo "$POST_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin).get('brand','silver'))" 2>/dev/null)
  KW=$(echo "$POST_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin).get('keyword',''))" 2>/dev/null)

  # Run the decoupled pipeline (gemma leaf + claude brain + deterministic scripts).
  # Covers polish, internal links, hooks, svg, html, reel-data, social, social-ad,
  # ugc, assets, qa, posts.json, topic-history. Degrades gracefully on claude limit.
  POST_TMPOUT=$(mktemp)
  public/blog/scripts/build-post.sh "$SLUG" --brand="$BRAND" --keyword="$KW" 2>&1 \
    | tee -a "$LOG_FILE" "$POST_TMPOUT" > /dev/null
  POST_EXIT=$pipestatus[1]

  echo "Post $SLUG exit: $POST_EXIT" >> "$LOG_FILE"

  # Session limit mid-post — schedule retry for remaining slugs
  if grep -qi "session limit\|usage limit\|hit your limit" "$POST_TMPOUT" && ! grep -q "\[build-post:$SLUG\] DONE\." "$POST_TMPOUT"; then
    REMAINING_SLUGS=($(remaining_from "$SLUG" "${SLUGS[@]}"))
    RESET_RAW=$(grep -oiE "resets? (at )?[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)" "$POST_TMPOUT" \
      | head -1 | grep -oiE "[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)")
    write_pending "$PENDING_FILE" "${REMAINING_SLUGS[@]}"
    echo "Session limit mid-$SLUG. ${#REMAINING_SLUGS[@]} slug(s) pending." >> "$LOG_FILE"
    notify "session limit" "$SLUG interrupted — retry scheduled"
    schedule_retry "$RESET_RAW"
    rm -f "$POST_TMPOUT"
    exit 0
  fi
  rm -f "$POST_TMPOUT"

  # Validate required output files. Missing artifacts mean this slug is not publishable.
  MISSING=()
  for F in \
    "public/blog/$SLUG/index.html" \
    "public/blog/$SLUG/hero.jpg" \
    "public/blog/$SLUG/reel-data.md" \
    "public/blog/$SLUG/reel-script.md" \
    "public/blog/$SLUG/social-copy.json"; do
    [[ ! -f "$F" ]] && MISSING+=("$F")
  done
  if (( ${#MISSING[@]} > 0 )); then
    echo "BLOCKED: $SLUG missing required files: ${MISSING[*]} - skipping local commit" >> "$LOG_FILE"
    notify "publish blocked" "$SLUG: ${#MISSING[@]} required file(s) absent"
    FAILS=$(( FAILS + 1 ))
    quarantine_post_dir "$SLUG"
    continue
  fi

  # build-post registers posts.json only after QA passes. If absent, do not publish.
  if ! grep -q "\"slug\": \"$SLUG\"" public/blog/posts.json 2>/dev/null; then
    echo "BLOCKED: $SLUG missing from posts.json - QA failed or registration skipped; skipping local commit" >> "$LOG_FILE"
    notify "publish blocked" "$SLUG not in posts.json — QA/registration failed"
    FAILS=$(( FAILS + 1 ))
    quarantine_post_dir "$SLUG"
    continue
  fi

  # Regenerate sitemap
  node public/blog/scripts/generate-sitemap.mjs >> "$LOG_FILE" 2>&1

  # Commit this post
  git add \
    "public/blog/$SLUG/" \
    public/sitemap.xml \
    public/blog/posts.json \
    public/blog/topic-history.md 2>/dev/null
  git commit -m "feat: $SLUG" >> "$LOG_FILE" 2>&1

  if [[ "$AUTO_DEPLOY" != "1" ]]; then
    echo "PUBLISH PENDING: $SLUG committed locally. Claude must review, push, deploy, and verify live." >> "$LOG_FILE"
    BUILT+=("$SLUG")
    continue
  fi

  # Push + deploy is opt-in only. Default automation stops at local commit.
  PUSH_ERR=$(git push origin main 2>&1)
  if [[ $? -ne 0 ]]; then
    echo "$PUSH_ERR" >> "$LOG_FILE"
    if echo "$PUSH_ERR" | grep -qi "secret"; then
      echo "BLOCKED: GitHub secret scanning. Fix per BLOG-SOP.md §17, then: git push origin main && npx wrangler deploy" >> "$LOG_FILE"
      notify "push blocked" "secret scanning — see log for scrub recipe"
    else
      notify "push failed" "see daily-blog-reel.log"
    fi
    FAILS=$(( FAILS + 1 ))
    continue
  fi

  npx wrangler deploy >> "$LOG_FILE" 2>&1
  sleep 45

  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "https://fuseddistribution.com/blog/$SLUG/")
  if [[ "$CODE" == "200" ]]; then
    echo "VERIFY PASS: /blog/$SLUG/ (200)" >> "$LOG_FILE"
    BUILT+=("$SLUG")
  else
    echo "VERIFY FAIL: /blog/$SLUG/ ($CODE) — NOT LIVE" >> "$LOG_FILE"
    FAILS=$(( FAILS + 1 ))
    notify "verify fail" "$SLUG returned $CODE"
  fi

done

# ── Cleanup + final summary ────────────────────────────────────────────────────
rm -f "$PENDING_FILE"

if [[ "$AUTO_DEPLOY" == "1" ]]; then
  LIVE_LOCS=$(curl -s --max-time 20 "https://fuseddistribution.com/sitemap.xml" | grep -c "<loc>")
  LOCAL_LOCS=$(grep -c "<loc>" public/sitemap.xml 2>/dev/null || echo 0)
  if [[ "$LIVE_LOCS" == "$LOCAL_LOCS" ]]; then
    echo "VERIFY PASS: sitemap ($LIVE_LOCS URLs live = $LOCAL_LOCS local)" >> "$LOG_FILE"
  else
    echo "VERIFY FAIL: sitemap live=$LIVE_LOCS local=$LOCAL_LOCS" >> "$LOG_FILE"
    FAILS=$(( FAILS + 1 ))
  fi
else
  echo "AUTO_DEPLOY=0: skipped git push, wrangler deploy, and live sitemap verification." >> "$LOG_FILE"
fi

if (( FAILS > 0 )); then
  notify "verification" "$FAILS check(s) FAILED — see daily-blog-reel.log"
  echo "RESULT: $FAILS verification failure(s) — built: ${BUILT[*]:-none}" >> "$LOG_FILE"
else
  echo "RESULT: all verifications passed (${#BUILT[@]} slugs + sitemap)" >> "$LOG_FILE"
fi
