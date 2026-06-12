# Pipeline Resilience + Folder Move Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the project folder out of iCloud Documents and rewrite `daily-blog-reel.sh` so each post runs as a separate sequential Claude call with immediate commit+deploy, a pre-flight session probe, and a pending-file resume system so session limit hits no longer delay all posts by 10+ hours.

**Architecture:** Shell script loop iterates slugs one at a time. Before each post, a cheap Claude probe detects session limits before wasting tokens. If limit hits, remaining slugs are written to a pending JSON file and a retry plist is scheduled. On next run the pending file is read and only unbuilt posts are processed. Each completed post gets its own git commit + wrangler deploy so it goes live immediately.

**Tech Stack:** zsh, launchd, `claude` CLI, `npx wrangler`, `git`, `node`, `curl`, `sips`, `osascript`

---

## File Map

| File | Change |
|------|--------|
| `/Users/nick/projects/fuseddistribution/` | New location — moved from `Documents/New project` |
| `/Users/nick/bin/daily-blog-reel.sh` | Full rewrite — probe + per-post loop |
| `/Users/nick/bin/render-missing-reels.sh` | `PROJECT_DIR` path update only |
| `/Users/nick/bin/gemma-research-runner.sh` | Two hardcoded path references updated |

---

### Task 1: Move project folder

**Files:**
- Move: `/Users/nick/Documents/New project` → `/Users/nick/projects/fuseddistribution`

- [ ] **Step 1: Create projects directory and move folder**

```bash
mkdir -p /Users/nick/projects
mv "/Users/nick/Documents/New project" /Users/nick/projects/fuseddistribution
```

- [ ] **Step 2: Verify git is intact**

```bash
cd /Users/nick/projects/fuseddistribution
git status
git remote -v
```

Expected: clean working tree (or normal status), remote shows `origin` pointing to GitHub.

- [ ] **Step 3: Verify wrangler still resolves**

```bash
cd /Users/nick/projects/fuseddistribution
npx wrangler --version
```

Expected: prints wrangler version, no path errors.

- [ ] **Step 4: Commit nothing (folder move is not a git change)**

Git tracks content, not the folder location on disk. No commit needed here.

---

### Task 2: Update path references in support scripts

**Files:**
- Modify: `/Users/nick/bin/render-missing-reels.sh`
- Modify: `/Users/nick/bin/gemma-research-runner.sh`

- [ ] **Step 1: Update render-missing-reels.sh PROJECT_DIR**

Find line: `PROJECT_DIR="/Users/nick/Documents/New project"`  
Replace with: `PROJECT_DIR="/Users/nick/projects/fuseddistribution"`

```bash
sed -i '' 's|/Users/nick/Documents/New project|/Users/nick/projects/fuseddistribution|g' /Users/nick/bin/render-missing-reels.sh
```

- [ ] **Step 2: Verify render-missing-reels.sh**

```bash
grep "PROJECT_DIR" /Users/nick/bin/render-missing-reels.sh
```

Expected: `PROJECT_DIR="/Users/nick/projects/fuseddistribution"`

- [ ] **Step 3: Update gemma-research-runner.sh (two references)**

```bash
sed -i '' 's|/Users/nick/Documents/New project|/Users/nick/projects/fuseddistribution|g' /Users/nick/bin/gemma-research-runner.sh
```

- [ ] **Step 4: Verify gemma-research-runner.sh**

```bash
grep "fuseddistribution\|New project" /Users/nick/bin/gemma-research-runner.sh
```

Expected: both lines show new path, zero matches for "New project".

- [ ] **Step 5: Commit**

```bash
git -C /Users/nick/projects/fuseddistribution add .
git -C /Users/nick/projects/fuseddistribution commit -m "chore: update PROJECT_DIR to new path in support scripts"
```

Wait — support scripts are in `~/bin/`, not in the repo. No commit needed. Verify with:

```bash
ls /Users/nick/bin/
```

These are standalone shell scripts outside git. Changes are saved as plain files.

---

### Task 3: Rewrite daily-blog-reel.sh

**Files:**
- Modify: `/Users/nick/bin/daily-blog-reel.sh`

This is a full rewrite. Read the current file first (already done in context), then write the new version.

- [ ] **Step 1: Write the new script**

Write the following content to `/Users/nick/bin/daily-blog-reel.sh`:

```bash
#!/bin/zsh
# Daily blog pipeline — runs via launchd at 9 AM.
# Per-post mode: each post is a separate claude call with immediate commit+deploy.
# Pre-flight session probe before each post prevents wasted runs on limit hits.

PROJECT_DIR="/Users/nick/projects/fuseddistribution"
LOG_FILE="$HOME/Library/Logs/daily-blog-reel.log"

export PATH="/usr/local/bin:$PATH"

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
  <array><string>/Users/nick/bin/daily-blog-reel.sh</string></array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>${retry_hour}</integer>
    <key>Minute</key><integer>${retry_min}</integer>
  </dict>
</dict>
</plist>
PLIST
  launchctl bootout "gui/$(id -u)/${retry_label}" 2>/dev/null
  launchctl bootstrap "gui/$(id -u)" "$retry_plist"
  echo "Retry scheduled for ${retry_hour}:$(printf '%02d' $retry_min) (${sleep_secs}s from now)" >> "$LOG_FILE"
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
  # remaining_from CURRENT_SLUG SLUG1 SLUG2 ... — returns all from CURRENT_SLUG onward
  local target="$1"; shift
  local found=false
  local result=()
  for s in "$@"; do
    [[ "$s" == "$target" ]] && found=true
    $found && result+=("$s")
  done
  echo "${result[@]}"
}

# ── Log rotation + header ─────────────────────────────────────────────────────
log_rotate
echo "\n=== $(date) ===" >> "$LOG_FILE"

# ── Environment ───────────────────────────────────────────────────────────────
set -o allexport
source "$PROJECT_DIR/video/.env"
set +o allexport

if [[ -z "$CLOUDFLARE_API_TOKEN" ]]; then
  echo "WARN: CLOUDFLARE_API_TOKEN not set in video/.env" | tee -a "$LOG_FILE"
  notify "config" "CLOUDFLARE_API_TOKEN missing"
fi

if [[ -n "$CLOUDFLARE_API_TOKEN" ]]; then
  if ! curl -s --max-time 30 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "https://api.cloudflare.com/client/v4/user/tokens/verify" | grep -q '"status":"active"'; then
    echo "WARN: Cloudflare token verify failed" | tee -a "$LOG_FILE"
    notify "auth" "Cloudflare token canary failed"
  fi
fi

pkill -f "chrome-headless-shell" 2>/dev/null || true
FD_USED=$(sysctl -n kern.num_files)
FD_MAX=$(sysctl -n kern.maxfiles)
if (( FD_USED * 100 / FD_MAX > 80 )); then
  echo "WARN: kernel file table at ${FD_USED}/${FD_MAX}" | tee -a "$LOG_FILE"
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
  echo "Running self-directed mode (1 silver + 1 tech)..." >> "$LOG_FILE"
  SELF_TMPOUT=$(mktemp)
  claude -p \
"Follow the blog pipeline in public/blog/BLOG-SOP.md. Read public/blog/BLOG-REF.md for templates (copy verbatim).
IMPORTANT: Fully automated pipeline. Do NOT ask for confirmation. Rendering happens at 11 AM — do NOT render.

## NO GEMMA QUEUE FOUND FOR TODAY
Fall back to self-directed mode: write ONE tech post + ONE silver post.
Use seo-plan skill to pick keywords, then blog-write skill for the draft.
Follow public/blog/BLOG-SOP.md fully.
Do NOT commit, push, or deploy — shell handles that." \
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

  # Fallback: discover built slugs from git
  SLUGS=($(git log --since=midnight --diff-filter=A --name-only --pretty=format: \
    -- 'public/blog/*/index.html' 2>/dev/null \
    | sed -E 's|public/blog/([^/]+)/index.html|\1|' | sort -u))
fi

for SLUG in "${SLUGS[@]}"; do
  echo "\n--- Post: $SLUG ---" >> "$LOG_FILE"

  # Skip already-built posts
  if [[ -f "public/blog/$SLUG/index.html" && -f "public/blog/$SLUG/hero.jpg" ]]; then
    echo "SKIP: $SLUG already built" >> "$LOG_FILE"
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

  # Run claude for this post
  POST_TMPOUT=$(mktemp)
  claude -p \
"Follow the blog pipeline in public/blog/BLOG-SOP.md. Read public/blog/BLOG-REF.md for templates (copy verbatim).

IMPORTANT: Fully automated pipeline. Do NOT ask for confirmation or direction.
Rendering happens automatically at 11 AM — do NOT render, do NOT run render.mjs.
Build ONE post only: $SLUG
Do NOT commit, push, deploy, or regenerate the sitemap — shell handles that.

## THIS POST
$POST_DATA

## YOUR JOB FOR THIS POST

1. Read the gemma_draft.md at the path listed in the post data above
2. Polish the draft:
   - Apply ALL writing rules below strictly
   - Replace any [VERIFY] stat with a real sourced statistic
   - Do NOT rewrite from scratch — edit only what violates the rules
3. Run blog-seo-check skill — validate title, meta, H1, H2s, canonical, OG
4. Run seo-schema skill — only if post has real FAQ content
5. Run seo-local skill — ONLY for tech posts covering local business, Google, or map pack topics
6. Build public/blog/$SLUG/index.html from BLOG-REF.md template
7. Build public/blog/$SLUG/hero.svg (§7 — numeric XML entities only, no HTML entities)
8. Generate hero.jpg:
     \"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome\" \\
       --headless=new --disable-gpu \\
       --screenshot=/tmp/hero-tmp.png \\
       --window-size=1200,630 \\
       \"file://\$(pwd)/public/blog/$SLUG/hero.svg\" 2>/dev/null && \\
     sips -s format jpeg /tmp/hero-tmp.png --out public/blog/$SLUG/hero.jpg -s formatOptions 85 && \\
     rm /tmp/hero-tmp.png
   Verify: ls -lh public/blog/$SLUG/hero.jpg — must exist and be > 50 KB
9. Run: node public/blog/scripts/fetch-pexels.mjs --post=$SLUG --queries=\"q1|q2\"
10. Write public/blog/$SLUG/reel-data.md (§11)
11. Write public/blog/$SLUG/reel-script.md — Long Form, 8-14 segments, ends with QUESTION
    Timing validation: words ÷ 2.5 + 2 = minimum window. Fix any segment that fails.
12. Build public/blog/$SLUG/photo-post.svg (§15 — 1200×1200 canvas)
13. Generate photo-post.jpg:
     \"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome\" \\
       --headless=new --disable-gpu \\
       --screenshot=/tmp/photo-post-tmp.png \\
       --window-size=1200,1200 \\
       \"file://\$(pwd)/public/blog/$SLUG/photo-post.svg\" 2>/dev/null && \\
     sips -s format jpeg /tmp/photo-post-tmp.png --out public/blog/$SLUG/photo-post.jpg -s formatOptions 85 && \\
     rm /tmp/photo-post-tmp.png
14. Write public/blog/$SLUG/social-copy.json (§14) — 4 platforms, reel + photo variants, discussion_question
    Apply writing rules to every caption field.
15. Prepend entry to public/blog/posts.json — use \"image\": \"/blog/$SLUG/hero.jpg\" (NOT .svg)
16. Add 2-3 internal links to related posts (check posts.json for slugs)

## VALIDATIONS (run before finishing this post)

grep -c '—'                   public/blog/$SLUG/reel-script.md   # must be 0
grep -c '## QUESTION'         public/blog/$SLUG/reel-script.md   # must be >= 1
grep -c 'Narration:.*%'       public/blog/$SLUG/reel-script.md   # must be 0
grep -cE 'Narration:.*\bUS\b' public/blog/$SLUG/reel-script.md   # must be 0

python3 -c \"import json,sys; d=json.load(open('public/blog/$SLUG/social-copy.json')); txt=str(d); sys.exit(1 if '—' in txt else 0)\"

grep -En '&[a-zA-Z]+;' public/blog/$SLUG/hero.svg public/blog/$SLUG/photo-post.svg
# If any matches: fix with numeric entities, regenerate jpg

Run social-ad skill for this post slug. Read MASTER_CONTEXT-[brand].md.
Run ugc-script skill for this post slug. Validate: no em dashes, no %, no standalone US, hook <=8 words, 60-95 words total.

Append to public/blog/topic-history.md:
| $TODAY | $SLUG | [Broad Category] | [one-line angle] |

## BRAND ROUTING
| Brand | Sub-line | CTA |
|-------|----------|-----|
| silver | Distribution | /reserve/ |
| tech | Technology Solutions | /#contact |

## WRITING RULES
- No em dashes (—). Use a comma, period, or two sentences instead. Never.
- No AI buzzwords: leverage, utilize, streamline, foster, harness, empower, elevate, transform,
  optimize, revolutionize, unlock, paradigm, ecosystem, synergy, cornerstone, testament, seamlessly,
  robust, cutting-edge, game-changing, comprehensive, holistic, impactful, groundbreaking, vibrant.
- No hedging: 'it is important to note', 'it is worth mentioning', 'needless to say'.
- No filler transitions: moreover, furthermore, additionally, consequently, notably, thus, indeed.
- No polished openers: 'In today's digital landscape', 'In an era of', 'When it comes to'.
- Short sentences. Mix lengths deliberately. Use 'you' and 'your' directly.
- Say what something does — not what it 'enables' or 'allows'.
- Opinions fine. 'This works better' beats 'this may be considered more effective'.
- No filler starters: Basically, Simply, Just, Really, Essentially, Actually.
- Numbers beat vague claims. Specific over general always.
- Reel narration: write 'percent' not '%', 'USA' not 'US'." \
    --allowedTools "Bash,Read,Write,Edit,Glob,Grep,Skill" 2>&1 | tee -a "$LOG_FILE" "$POST_TMPOUT" > /dev/null
  POST_EXIT=$pipestatus[1]

  echo "Post $SLUG exit: $POST_EXIT" >> "$LOG_FILE"

  # Session limit mid-post
  if [[ $POST_EXIT -ne 0 ]] && grep -qi "session limit\|usage limit" "$POST_TMPOUT"; then
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

  # Validate required output files
  MISSING=()
  for F in \
    "public/blog/$SLUG/index.html" \
    "public/blog/$SLUG/hero.jpg" \
    "public/blog/$SLUG/reel-script.md" \
    "public/blog/$SLUG/social-copy.json"; do
    [[ ! -f "$F" ]] && MISSING+=("$F")
  done
  (( ${#MISSING[@]} > 0 )) && {
    echo "WARN: $SLUG missing files: ${MISSING[*]}" >> "$LOG_FILE"
    notify "missing files" "$SLUG: ${#MISSING[@]} file(s) absent"
  }

  # Regenerate sitemap
  node public/blog/scripts/generate-sitemap.mjs >> "$LOG_FILE" 2>&1

  # Commit this post
  git add \
    "public/blog/$SLUG/" \
    public/sitemap.xml \
    public/blog/posts.json \
    public/blog/topic-history.md 2>/dev/null
  git commit -m "feat: $SLUG" >> "$LOG_FILE" 2>&1

  # Push
  PUSH_ERR=$(git push origin main 2>&1)
  if [[ $? -ne 0 ]]; then
    echo "$PUSH_ERR" >> "$LOG_FILE"
    if echo "$PUSH_ERR" | grep -qi "secret"; then
      echo "BLOCKED: GitHub secret scanning. Fix per BLOG-SOP.md §17, then: git push origin main && npx wrangler deploy" >> "$LOG_FILE"
      notify "push blocked" "secret scanning — see log for scrub recipe"
    else
      notify "push failed" "see daily-blog-reel.log"
    fi
  fi

  # Deploy
  npx wrangler deploy >> "$LOG_FILE" 2>&1

  # Verify live
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

LIVE_LOCS=$(curl -s --max-time 20 "https://fuseddistribution.com/sitemap.xml" | grep -c "<loc>")
LOCAL_LOCS=$(grep -c "<loc>" public/sitemap.xml 2>/dev/null || echo 0)
if [[ "$LIVE_LOCS" == "$LOCAL_LOCS" ]]; then
  echo "VERIFY PASS: sitemap ($LIVE_LOCS URLs live = $LOCAL_LOCS local)" >> "$LOG_FILE"
else
  echo "VERIFY FAIL: sitemap live=$LIVE_LOCS local=$LOCAL_LOCS" >> "$LOG_FILE"
  FAILS=$(( FAILS + 1 ))
fi

if (( FAILS > 0 )); then
  notify "verification" "$FAILS check(s) FAILED — see daily-blog-reel.log"
  echo "RESULT: $FAILS verification failure(s) — built: ${BUILT[*]:-none}" >> "$LOG_FILE"
else
  echo "RESULT: all verifications passed (${#BUILT[@]} slugs + sitemap)" >> "$LOG_FILE"
fi
```

- [ ] **Step 2: Make executable**

```bash
chmod +x /Users/nick/bin/daily-blog-reel.sh
```

- [ ] **Step 3: Syntax check**

```bash
zsh -n /Users/nick/bin/daily-blog-reel.sh
```

Expected: no output (clean parse).

---

### Task 4: Smoke test

**Files:** None modified — read-only verification

- [ ] **Step 1: Verify probe_session logic works**

Extract and run the probe manually:

```bash
claude -p "respond with ok" 2>&1
```

Expected: prints `ok` and exits 0. Confirms Claude CLI is reachable from shell.

- [ ] **Step 2: Verify session-limit string detection**

```bash
echo "You've hit your session limit · resets 7:40pm" | grep -qi "session limit\|usage limit\|rate limit" && echo "MATCH" || echo "NO MATCH"
```

Expected: `MATCH`

- [ ] **Step 3: Verify write_pending produces valid JSON**

Source just the helper and call it:

```bash
cd /Users/nick/projects/fuseddistribution
zsh -c '
write_pending() {
  local pending_file="$1"; shift
  local arr_json=""
  for s in "$@"; do arr_json+="\"$s\","; done
  arr_json="[${arr_json%,}]"
  cat > "$pending_file" <<JSON
{
  "date": "$(date +%Y-%m-%d)",
  "remaining": $arr_json,
  "interrupted_at": "$(date -u +%Y-%m-%dT%H:%M:%S)"
}
JSON
}
write_pending /tmp/test-pending.json slug-b slug-c slug-d
cat /tmp/test-pending.json
python3 -c "import json; d=json.load(open(\"/tmp/test-pending.json\")); print(\"OK:\", d[\"remaining\"])"
rm /tmp/test-pending.json
'
```

Expected output:
```
{
  "date": "2026-06-12",
  "remaining": ["slug-b","slug-c","slug-d"],
  "interrupted_at": "..."
}
OK: ['slug-b', 'slug-c', 'slug-d']
```

- [ ] **Step 4: Verify remaining_from logic**

```bash
zsh -c '
remaining_from() {
  local target="$1"; shift
  local found=false result=()
  for s in "$@"; do
    [[ "$s" == "$target" ]] && found=true
    $found && result+=("$s")
  done
  echo "${result[@]}"
}
result=($(remaining_from "slug-b" "slug-a" "slug-b" "slug-c" "slug-d"))
echo "${result[@]}"
'
```

Expected: `slug-b slug-c slug-d`

- [ ] **Step 5: Confirm launchd still sees the job**

```bash
launchctl list | grep daily-blog-reel
```

Expected: `- 0 com.nick.daily-blog-reel` (loaded, last exit 0)

- [ ] **Step 6: Verify new PROJECT_DIR resolves in context**

```bash
ls /Users/nick/projects/fuseddistribution/public/blog/ | head -5
ls /Users/nick/projects/fuseddistribution/video/.env 2>/dev/null && echo "env OK" || echo "env MISSING"
```

Expected: blog dir lists content, env file exists.

---

## Self-Review Notes

**Spec coverage:**
- Folder move → Task 1 ✓
- Update 3 script paths → Task 2 ✓
- probe_session + initial probe → Task 3 (helpers block + initial probe section) ✓
- Pending file read/filter → Task 3 (apply pending filter section) ✓
- Per-post loop with probe + skip + claude call → Task 3 ✓
- Session limit → pending.json + retry → Task 3 ✓
- Per-post validate + sitemap + commit + push + deploy + verify → Task 3 ✓
- Cleanup + final summary → Task 3 ✓
- Fallback self-directed mode preserved → Task 3 ✓
- Smoke tests → Task 4 ✓

**No placeholders found.**

**Type/name consistency:** `probe_session`, `schedule_retry`, `write_pending`, `remaining_from` defined once in helpers, referenced consistently throughout loop.
