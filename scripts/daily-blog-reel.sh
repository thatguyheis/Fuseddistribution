#!/bin/zsh
# Daily blog pipeline — runs via launchd at 9 AM.
# Per-post mode: each post is a separate Claude call with local commit handoff.
# Pre-flight session probe before each post prevents wasted runs on limit hits.

PROJECT_DIR="/Users/nick/projects/fuseddistribution"
LOG_FILE="$HOME/Library/Logs/daily-blog-reel.log"

export PATH="/usr/local/bin:/opt/homebrew/bin:/Users/nick/.local/bin:$PATH"
AUTO_DEPLOY="${BLOG_AUTO_DEPLOY:-0}"
GIT_SYNC="${BLOG_GIT_SYNC:-0}"
HERMES_TAKEOVER="${HERMES_TAKEOVER:-0}"
CLAUDE_ENABLED="${CLAUDE_ENABLED:-1}"
LOCAL_LLM="${LOCAL_LLM:-$HOME/bin/hermes-local.sh}"
HERMES_LOCAL_MODEL="${HERMES_LOCAL_MODEL:-gemma3:4b-it-qat}"
PROBE_TIMEOUT_SECONDS="${BLOG_PROBE_TIMEOUT_SECONDS:-120}"
VERIFY_ATTEMPTS="${BLOG_VERIFY_ATTEMPTS:-8}"
VERIFY_DELAY_SECONDS="${BLOG_VERIFY_DELAY_SECONDS:-15}"
RUN_DATE_OVERRIDE="${BLOG_RUN_DATE:-}"
export HERMES_TAKEOVER CLAUDE_ENABLED LOCAL_LLM HERMES_LOCAL_MODEL

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
  if [[ "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" ]]; then
    python3 - "$PROBE_TIMEOUT_SECONDS" "$LOCAL_LLM" <<'PY'
import subprocess
import sys

timeout = int(sys.argv[1])
try:
    result = subprocess.run(
        [sys.argv[2], "reply ok"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=timeout,
        check=False,
    )
except subprocess.TimeoutExpired:
    print(f"local model probe timed out after {timeout}s", file=sys.stderr)
    raise SystemExit(124)
raise SystemExit(result.returncode)
PY
    return $?
  fi
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
  local sleep_secs="${2:-21600}"
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
    <key>BLOG_AUTO_DEPLOY</key><string>${AUTO_DEPLOY}</string>
    <key>BLOG_RUN_DATE</key><string>${TODAY}</string>
    <key>CLAUDE_ENABLED</key><string>${CLAUDE_ENABLED}</string>
    <key>HERMES_TAKEOVER</key><string>${HERMES_TAKEOVER}</string>
    <key>LOCAL_LLM</key><string>${LOCAL_LLM}</string>
    <key>HERMES_LOCAL_MODEL</key><string>${HERMES_LOCAL_MODEL}</string>
    <key>HERMES_LOCAL_BASE_URL</key><string>${HERMES_LOCAL_BASE_URL:-http://localhost:11434/v1}</string>
    <key>HERMES_LOCAL_MAX_TOKENS</key><string>${HERMES_LOCAL_MAX_TOKENS:-256}</string>
  </dict>
  <key>SoftResourceLimits</key>
  <dict><key>NumberOfFiles</key><integer>65536</integer></dict>
  <key>HardResourceLimits</key>
  <dict><key>NumberOfFiles</key><integer>65536</integer></dict>
</dict>
</plist>
PLIST
  launchctl bootout "gui/$(id -u)/${retry_label}" 2>/dev/null
  local bootstrap_err bootstrap_rc
  bootstrap_err=$(launchctl bootstrap "gui/$(id -u)" "$retry_plist" 2>&1)
  bootstrap_rc=$?
  if [[ $bootstrap_rc -ne 0 ]]; then
    echo "RETRY SCHEDULE FAILED: bootstrap rc=$bootstrap_rc: $bootstrap_err" >> "$LOG_FILE"
    notify "retry failed" "Could not schedule ${retry_hour}:$(printf '%02d' "$retry_min") catch-up run — check daily-blog-reel.log"
    return 1
  fi
  if ! launchctl list "$retry_label" >/dev/null 2>&1; then
    echo "RETRY SCHEDULE FAILED: bootstrap returned 0 but ${retry_label} is not in launchctl list" >> "$LOG_FILE"
    notify "retry failed" "Catch-up job did not register with launchd — check daily-blog-reel.log"
    return 1
  fi
  echo "Retry scheduled for ${retry_hour}:$(printf '%02d' "$retry_min") (${sleep_secs}s from now) — confirmed loaded" >> "$LOG_FILE"
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
  "date": "${TODAY:-$(date +%Y-%m-%d)}",
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

verify_live_slug() {
  local slug="$1"
  local code="000"
  local attempt=1
  while (( attempt <= VERIFY_ATTEMPTS )); do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "https://fuseddistribution.com/blog/$slug/")
    if [[ "$code" == "200" ]]; then
      echo "$code"
      return 0
    fi
    echo "VERIFY WAIT: /blog/$slug/ returned $code (attempt $attempt/$VERIFY_ATTEMPTS)" >> "$LOG_FILE"
    (( attempt < VERIFY_ATTEMPTS )) && sleep "$VERIFY_DELAY_SECONDS"
    attempt=$(( attempt + 1))
  done
  echo "$code"
  return 1
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
if [[ "$HERMES_TAKEOVER" == "1" ]]; then
  echo "Mode: HERMES_TAKEOVER=1, local LLM=$LOCAL_LLM" >> "$LOG_FILE"
fi

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
if [[ "$FD_USED" == <-> && "$FD_MAX" == <-> && "$FD_MAX" -gt 0 ]] && (( FD_USED * 100 / FD_MAX > 80 )); then
  echo "WARN: kernel file table at ${FD_USED}/${FD_MAX} (>80%)" | tee -a "$LOG_FILE"
  notify "fd" "kernel file table ${FD_USED}/${FD_MAX}"
fi
ulimit -n 65536 2>/dev/null || true

cd "$PROJECT_DIR" || exit 1

# Checkpoint today's queue before selecting an older pending day. Without this,
# backlog recovery can consume the only daily launch and silently skip today.
CALENDAR_TODAY=$(date '+%Y-%m-%d')
CALENDAR_QUEUE="public/blog/research/${CALENDAR_TODAY}-queue.json"
CALENDAR_PENDING="public/blog/research/${CALENDAR_TODAY}-pending.json"
CALENDAR_COMPLETE="public/blog/research/${CALENDAR_TODAY}-complete.json"
if [[ -f "$CALENDAR_QUEUE" && ! -f "$CALENDAR_PENDING" && ! -f "$CALENDAR_COMPLETE" ]]; then
  TODAY="$CALENDAR_TODAY"
  CURRENT_SLUGS=($(python3 -c \
    "import json; [print(p['slug']) for p in json.load(open('$CALENDAR_QUEUE'))['posts']]" 2>/dev/null))
  if (( ${#CURRENT_SLUGS[@]} > 0 )); then
    write_pending "$CALENDAR_PENDING" "${CURRENT_SLUGS[@]}"
    echo "Recovery: checkpointed today's queue before backlog selection: $CALENDAR_PENDING" >> "$LOG_FILE"
  fi
fi

if [[ -n "$RUN_DATE_OVERRIDE" ]]; then
  TODAY="$RUN_DATE_OVERRIDE"
else
  OLDEST_PENDING=$(find public/blog/research -maxdepth 1 -type f -name '????-??-??-pending.json' -print 2>/dev/null | sort | head -1)
  if [[ -n "$OLDEST_PENDING" ]]; then
    PENDING_NAME="${OLDEST_PENDING:t:r}"
    TODAY="${PENDING_NAME%-pending}"
    echo "Recovery: resuming oldest pending blog date $TODAY" >> "$LOG_FILE"
  else
    TODAY=$(date '+%Y-%m-%d')
  fi
fi
QUEUE_FILE="public/blog/research/${TODAY}-queue.json"
PENDING_FILE="public/blog/research/${TODAY}-pending.json"
COMPLETE_FILE="public/blog/research/${TODAY}-complete.json"

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

# Write recovery state before the first model call. This survives a power loss,
# where traps and cleanup handlers cannot run.
if $QUEUE_MODE && (( ${#SLUGS[@]} > 0 )); then
  write_pending "$PENDING_FILE" "${SLUGS[@]}"
fi

# ── Initial session probe ─────────────────────────────────────────────────────
# Deployment recovery does not require model credits. Probe only when at least
# one queued item still needs content work; completed artifacts must remain
# deployable while Claude or the local model service is unavailable.
NEEDS_MODEL=0
for PROBE_SLUG in "${SLUGS[@]}"; do
  if [[ ! -f "public/blog/$PROBE_SLUG/index.html" || ! -f "public/blog/$PROBE_SLUG/hero.jpg" ]] \
     || ! grep -q "\"slug\": \"$PROBE_SLUG\"" public/blog/posts.json 2>/dev/null; then
    NEEDS_MODEL=1
    break
  fi
done
if (( NEEDS_MODEL == 1 )); then
  echo "Probe: checking session availability for blog date $TODAY..." >> "$LOG_FILE"
  PROBE_OUT=$(probe_session 2>&1)
  if [[ $? -ne 0 ]]; then
    RESET_RAW=$(echo "$PROBE_OUT" | grep -oiE "resets? (at )?[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)" \
      | head -1 | grep -oiE "[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)")
    echo "Session probe failed at start (${PROBE_OUT:-no detail}). Scheduling retry for $TODAY." >> "$LOG_FILE"
    notify "session unavailable" "$TODAY preserved; retry scheduled"
    schedule_retry "$RESET_RAW"
    exit 0
  fi
  echo "Probe: session OK" >> "$LOG_FILE"
else
  echo "Probe: skipped; all pending slugs are registered deployment checkpoints" >> "$LOG_FILE"
fi

# ── Per-post loop ─────────────────────────────────────────────────────────────
FAILS=0
DEFERRED=0
QUALITY_BLOCKED=0
SYNC_FAILS=0
BUILT=()
RETRY_SLUGS=()
typeset -U RETRY_SLUGS

if ! $QUEUE_MODE && [[ "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" ]]; then
  echo "No queue found and Hermes takeover is active. Skipping old self-directed Claude fallback." >> "$LOG_FILE"
  notify "no queue" "Hermes takeover active; old Claude fallback skipped"
  exit 0
fi

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
  REMAINING_SLUGS=($(remaining_from "$SLUG" "${SLUGS[@]}"))
  write_pending "$PENDING_FILE" "${RETRY_SLUGS[@]}" "${REMAINING_SLUGS[@]}"
  echo "\n--- Post: $SLUG ---" >> "$LOG_FILE"

  # Skip only fully registered posts. Partial QA-failed folders must be rebuilt or blocked.
  if [[ -f "public/blog/$SLUG/index.html" && -f "public/blog/$SLUG/hero.jpg" ]]      && grep -q "\"slug\": \"$SLUG\"" public/blog/posts.json 2>/dev/null; then
    if [[ "$AUTO_DEPLOY" == "1" ]]; then
      CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "https://fuseddistribution.com/blog/$SLUG/")
      if [[ "$CODE" != "200" ]]; then
        echo "RESUME: $SLUG is registered but not live ($CODE); redeploying checkpointed artifacts" >> "$LOG_FILE"
        if ! npx wrangler deploy >> "$LOG_FILE" 2>&1; then
          echo "DEPLOY FAIL: $SLUG retained for retry" >> "$LOG_FILE"
          FAILS=$(( FAILS + 1 ))
          RETRY_SLUGS+=("$SLUG")
          continue
        fi
        CODE=$(verify_live_slug "$SLUG")
      fi
      if [[ "$CODE" != "200" ]]; then
        echo "VERIFY FAIL: /blog/$SLUG/ ($CODE) - retained for retry" >> "$LOG_FILE"
        FAILS=$(( FAILS + 1 ))
        RETRY_SLUGS+=("$SLUG")
        continue
      fi
      echo "VERIFY PASS: /blog/$SLUG/ (200, recovered)" >> "$LOG_FILE"
    else
      echo "SKIP: $SLUG already built and registered" >> "$LOG_FILE"
      RETRY_SLUGS+=("$SLUG")
    fi
    BUILT+=("$SLUG")
    continue
  fi

  # Pre-flight probe before this post
  PROBE_OUT=$(probe_session 2>&1)
  if [[ $? -ne 0 ]]; then
    REMAINING_SLUGS=($(remaining_from "$SLUG" "${SLUGS[@]}"))
    RESET_RAW=$(echo "$PROBE_OUT" | grep -oiE "resets? (at )?[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)" \
      | head -1 | grep -oiE "[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)")
    write_pending "$PENDING_FILE" "${RETRY_SLUGS[@]}" "${REMAINING_SLUGS[@]}"
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

  # Run the decoupled pipeline (local LLM + optional Claude brain + deterministic scripts).
  # Covers write/polish, internal links, hooks, svg, html, reel-data, social,
  # optional enhancements, assets, qa, posts.json, topic-history.
  POST_TMPOUT=$(mktemp)
  HERMES_TAKEOVER="$HERMES_TAKEOVER" CLAUDE_ENABLED="$CLAUDE_ENABLED" LOCAL_LLM="$LOCAL_LLM" \
    BLOG_PUBLISH_DATE="$TODAY" \
    public/blog/scripts/build-post.sh "$SLUG" --brand="$BRAND" --keyword="$KW" 2>&1 \
    | tee -a "$LOG_FILE" "$POST_TMPOUT" > /dev/null
  POST_EXIT=$pipestatus[1]

  # A clean but undersized article can pass the style lint and become a stale
  # resume checkpoint while the required reel stage fails forever. Rebuild the
  # writer and dependent artifacts once before retaining the post for retry.
  if [[ $POST_EXIT -eq 0 && -s "public/blog/$SLUG/verified.md" ]] \
     && [[ ! -s "public/blog/$SLUG/reel-data.md" || ! -s "public/blog/$SLUG/reel-script.md" ]]; then
    echo "RECOVERY: $SLUG is missing required reel artifacts; forcing one full content rebuild" >> "$LOG_FILE"
    HERMES_TAKEOVER="$HERMES_TAKEOVER" CLAUDE_ENABLED="$CLAUDE_ENABLED" LOCAL_LLM="$LOCAL_LLM" \
      BLOG_PUBLISH_DATE="$TODAY" \
      public/blog/scripts/build-post.sh "$SLUG" --brand="$BRAND" --keyword="$KW" --force 2>&1 \
      | tee -a "$LOG_FILE" "$POST_TMPOUT" > /dev/null
    POST_EXIT=$pipestatus[1]
  fi

  echo "Post $SLUG exit: $POST_EXIT" >> "$LOG_FILE"

  # Session limit mid-post — schedule retry for remaining slugs
  if grep -qi "session limit\|usage limit\|hit your limit" "$POST_TMPOUT" && ! grep -q "\[build-post:$SLUG\] DONE\." "$POST_TMPOUT"; then
    REMAINING_SLUGS=($(remaining_from "$SLUG" "${SLUGS[@]}"))
    RESET_RAW=$(grep -oiE "resets? (at )?[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)" "$POST_TMPOUT" \
      | head -1 | grep -oiE "[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)")
    write_pending "$PENDING_FILE" "${RETRY_SLUGS[@]}" "${REMAINING_SLUGS[@]}"
    echo "Session limit mid-$SLUG. ${#REMAINING_SLUGS[@]} slug(s) pending." >> "$LOG_FILE"
    notify "session limit" "$SLUG interrupted — retry scheduled"
    schedule_retry "$RESET_RAW"
    rm -f "$POST_TMPOUT"
    exit 0
  fi
  rm -f "$POST_TMPOUT"

  # Deferred = a claude brain-stage outage (write or QA), NOT a quality failure.
  # Keep artifacts in place for the next run; do not quarantine, do not count as FAIL.
  if grep -q -- '-deferred"' "public/blog/$SLUG/_status.json" 2>/dev/null \
     && ! grep -q "\"slug\": \"$SLUG\"" public/blog/posts.json 2>/dev/null; then
    echo "DEFERRED: $SLUG — brain-stage outage, left in place for retry." >> "$LOG_FILE"
    notify "qa deferred" "$SLUG — brain QA outage, will retry"
    DEFERRED=$(( DEFERRED + 1 ))
    RETRY_SLUGS+=("$SLUG")
    continue
  fi

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
    echo "DEFERRED: $SLUG missing required files: ${MISSING[*]} - artifacts retained for recovery" >> "$LOG_FILE"
    notify "publish deferred" "$SLUG: ${#MISSING[@]} required file(s) will retry"
    FAILS=$(( FAILS + 1 ))
    DEFERRED=$(( DEFERRED + 1 ))
    RETRY_SLUGS+=("$SLUG")
    continue
  fi

  # build-post registers posts.json only after QA passes. If absent, do not publish.
  if ! grep -q "\"slug\": \"$SLUG\"" public/blog/posts.json 2>/dev/null; then
    # A same-batch internal link can point to a later queue item whose HTML does
    # not exist yet. This is an ordering dependency, not a content defect. Keep
    # the post in place and retry it after the rest of the batch has built.
    if python3 - "$PROJECT_DIR/public/blog/$SLUG/qa.json" "$PROJECT_DIR/public/blog" <<'PY'
import json, re, sys
from pathlib import Path
qa_path, blog_dir = Path(sys.argv[1]), Path(sys.argv[2])
try:
    blockers = json.loads(qa_path.read_text()).get("blockers", [])
except Exception:
    raise SystemExit(1)
messages = [b if isinstance(b, str) else str(b.get("description", "")) for b in blockers]
targets = [re.search(r"link target missing: /blog/([a-z0-9-]+)/", m) for m in messages]
retryable = bool(messages) and all(targets) and all((blog_dir / m.group(1) / "verified.md").exists() for m in targets)
raise SystemExit(0 if retryable else 1)
PY
    then
      echo "DEFERRED: $SLUG — same-batch link target is not built yet; retry retained." >> "$LOG_FILE"
      DEFERRED=$(( DEFERRED + 1 ))
      RETRY_SLUGS+=("$SLUG")
      continue
    fi
    echo "BLOCKED: $SLUG missing from posts.json - QA failed or registration skipped; skipping local commit" >> "$LOG_FILE"
    notify "publish blocked" "$SLUG not in posts.json — QA/registration failed"
    FAILS=$(( FAILS + 1 ))
    QUALITY_BLOCKED=$(( QUALITY_BLOCKED + 1 ))
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
    echo "PUBLISH PENDING: $SLUG committed locally. Hermes/Codex owner must review, push, deploy, and verify live." >> "$LOG_FILE"
    BUILT+=("$SLUG")
    RETRY_SLUGS+=("$SLUG")
    continue
  fi

  # Website publication is independent of GitHub synchronization. A GitHub
  # credential outage must not prevent an approved post from reaching the site.
  if [[ "$GIT_SYNC" == "1" ]]; then
    PUSH_ERR=$(git push origin main 2>&1)
    if [[ $? -ne 0 ]]; then
      echo "$PUSH_ERR" >> "$LOG_FILE"
      echo "SYNC WARN: GitHub push failed; continuing Cloudflare deployment" >> "$LOG_FILE"
      notify "source sync failed" "website deploy is continuing; see log"
      SYNC_FAILS=$(( SYNC_FAILS + 1 ))
    fi
  else
    echo "SYNC PENDING: local commit retained for Claude review; website deployment continues" >> "$LOG_FILE"
  fi

  if ! npx wrangler deploy >> "$LOG_FILE" 2>&1; then
    echo "DEPLOY FAIL: $SLUG retained for retry" >> "$LOG_FILE"
    FAILS=$(( FAILS + 1 ))
    RETRY_SLUGS+=("$SLUG")
    notify "deploy failed" "$SLUG retained for retry"
    continue
  fi
  CODE=$(verify_live_slug "$SLUG")
  if [[ "$CODE" == "200" ]]; then
    echo "VERIFY PASS: /blog/$SLUG/ (200)" >> "$LOG_FILE"
    BUILT+=("$SLUG")
  else
    echo "VERIFY FAIL: /blog/$SLUG/ ($CODE) — NOT LIVE" >> "$LOG_FILE"
    FAILS=$(( FAILS + 1 ))
    RETRY_SLUGS+=("$SLUG")
    notify "verify fail" "$SLUG returned $CODE"
  fi

done

if [[ "$AUTO_DEPLOY" == "1" ]]; then
  LIVE_LOCS=$(curl -s --max-time 20 "https://fuseddistribution.com/sitemap.xml" | grep -c "<loc>")
  LOCAL_LOCS=$(grep -c "<loc>" public/sitemap.xml 2>/dev/null || echo 0)
  if [[ "$LIVE_LOCS" == "$LOCAL_LOCS" ]]; then
    echo "VERIFY PASS: sitemap ($LIVE_LOCS URLs live = $LOCAL_LOCS local)" >> "$LOG_FILE"
  else
    echo "VERIFY FAIL: sitemap live=$LIVE_LOCS local=$LOCAL_LOCS" >> "$LOG_FILE"
    FAILS=$(( FAILS + 1 ))
    RETRY_SLUGS+=("${BUILT[@]}")
  fi

  # posts.json content verify — a wrangler deploy can race the file writes and
  # ship a stale asset manifest (2026-07-02: listing missed 4 posts while the
  # post URLs were live). Compare newest live slug against local; one redeploy
  # retry, then re-check with a propagation wait.
  LOCAL_NEWEST=$(python3 -c "import json; print(json.load(open('public/blog/posts.json'))[0]['slug'])" 2>/dev/null || echo "")
  verify_posts_json() {
    LIVE_NEWEST=$(curl -s --max-time 20 "https://fuseddistribution.com/blog/posts.json" \
      | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['slug'])" 2>/dev/null || echo "")
    [[ -n "$LOCAL_NEWEST" && "$LIVE_NEWEST" == "$LOCAL_NEWEST" ]]
  }
  if verify_posts_json; then
    echo "VERIFY PASS: posts.json (newest live slug = $LOCAL_NEWEST)" >> "$LOG_FILE"
  else
    echo "VERIFY WARN: posts.json stale (live=$LIVE_NEWEST local=$LOCAL_NEWEST) — redeploying once" >> "$LOG_FILE"
    npx wrangler deploy >> "$LOG_FILE" 2>&1
    PJ_OK=0
    for wait_round in 1 2 3 4 5 6; do
      sleep 120
      if verify_posts_json; then PJ_OK=1; break; fi
    done
    if [[ "$PJ_OK" == "1" ]]; then
      echo "VERIFY PASS: posts.json fresh after redeploy (newest=$LOCAL_NEWEST)" >> "$LOG_FILE"
    else
      echo "VERIFY FAIL: posts.json still stale after redeploy + 12 min (live=$LIVE_NEWEST local=$LOCAL_NEWEST)" >> "$LOG_FILE"
      notify "posts.json stale" "blog listing missing new posts — manual check needed"
      FAILS=$(( FAILS + 1 ))
      RETRY_SLUGS+=("${BUILT[@]}")
    fi
  fi
else
  echo "AUTO_DEPLOY=0: skipped git push, wrangler deploy, and live sitemap verification." >> "$LOG_FILE"
fi

UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
if [[ "$UNPUSHED" -ge 8 ]]; then
  echo "NOTICE: $UNPUSHED commits unpushed to origin/main — Claude review/push overdue" >> "$LOG_FILE"
  notify "git backlog" "$UNPUSHED commits awaiting push to GitHub — ask Claude to review and push"
fi

# Clear recovery state only after every approved post and the global listing
# checks are live. QA-blocked posts are terminal and recorded separately.
if (( ${#RETRY_SLUGS[@]} > 0 )); then
  write_pending "$PENDING_FILE" "${RETRY_SLUGS[@]}"
  echo "Recovery marker retained: $PENDING_FILE (${#RETRY_SLUGS[@]} retryable)" >> "$LOG_FILE"
  schedule_retry ""
else
  rm -f "$PENDING_FILE"
  cat > "$COMPLETE_FILE" <<JSON
{
  "date": "$TODAY",
  "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "live": ${#BUILT[@]},
  "quality_blocked": $QUALITY_BLOCKED,
  "source_sync_warnings": $SYNC_FAILS
}
JSON
  if [[ "$TODAY" != "$CALENDAR_TODAY" && -f "$CALENDAR_PENDING" ]]; then
    PREVIOUS_TODAY="$TODAY"
    TODAY="$CALENDAR_TODAY"
    schedule_retry "" 300
    TODAY="$PREVIOUS_TODAY"
    echo "Recovery: current-day follow-up scheduled after completing $PREVIOUS_TODAY" >> "$LOG_FILE"
  fi
fi

DEFERRED_NOTE=""
(( DEFERRED > 0 )) && DEFERRED_NOTE=" — $DEFERRED deferred (brain QA outage, retry pending)"
if (( FAILS > 0 )); then
  notify "verification" "$FAILS check(s) FAILED — see daily-blog-reel.log"
  echo "RESULT: $FAILS verification failure(s)${DEFERRED_NOTE} — built: ${BUILT[*]:-none}" >> "$LOG_FILE"
else
  echo "RESULT: all verifications passed (${#BUILT[@]} slugs + sitemap)${DEFERRED_NOTE}" >> "$LOG_FILE"
fi
