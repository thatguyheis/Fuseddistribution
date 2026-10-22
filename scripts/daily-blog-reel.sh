#!/bin/zsh
# Daily blog pipeline — runs via launchd at 9 AM.
# The scheduled path is provider-independent: local drafting plus deterministic
# gates, with Codex owning recovery, review, and operational follow-through.

PROJECT_DIR="/Users/nick/projects/fuseddistribution"
LOG_FILE="$HOME/Library/Logs/daily-blog-reel.log"
COIN_DRAFT_LOCK="/tmp/fused-coin-history-drafts.lock"
if [[ -d "$COIN_DRAFT_LOCK" ]] && python3 "$PROJECT_DIR/scripts/lock-owner-alive.py" "$COIN_DRAFT_LOCK"; then
  echo "Coin-history recovery owns local inference; deferring publisher launch" >> "$LOG_FILE"
  exit 0
fi
PUBLISHER_LOCK="/tmp/fused-blog-publisher.lock"
if [[ -d "$PUBLISHER_LOCK" ]] && ! python3 "$PROJECT_DIR/scripts/lock-owner-alive.py" "$PUBLISHER_LOCK"; then
  mv "$PUBLISHER_LOCK" "${PUBLISHER_LOCK}.stale.$(date +%s).$$" || exit 1
fi
if ! mkdir "$PUBLISHER_LOCK" 2>/dev/null; then
  echo "Publisher already active or lock owner indeterminate; skipping duplicate launch" >> "$LOG_FILE"
  exit 0
fi
echo "$$" > "$PUBLISHER_LOCK/pid"
release_publisher_lock() {
  if [[ "$(cat "$PUBLISHER_LOCK/pid" 2>/dev/null)" == "$$" ]]; then
    mv "$PUBLISHER_LOCK" "${PUBLISHER_LOCK}.finished.$(date +%s).$$"
  fi
}
trap release_publisher_lock EXIT


export PATH="/usr/local/bin:/opt/homebrew/bin:/Users/nick/.local/bin:$PATH"
AUTO_DEPLOY="${BLOG_AUTO_DEPLOY:-0}"
GIT_SYNC="${BLOG_GIT_SYNC:-0}"
[[ "${BLOG_GIT_COMMIT:-0}" == "1" ]] || GIT_SYNC=0
# Claude Code is no longer an available production dependency. Intentionally
# override stale retry plists or shell environments that still advertise it.
HERMES_TAKEOVER="1"
CLAUDE_ENABLED="0"
LOCAL_LLM="${LOCAL_LLM:-$PROJECT_DIR/scripts/ollama-local-no-think.sh}"
# Gemma owns long-form and final QA work; the smaller LFM model is reserved for
# bounded leaf transformations. The watchdog probes a lightweight Gemma model
# before waking this job so an unavailable listener does not consume a queue.
HERMES_LOCAL_MODEL="${HERMES_LOCAL_MODEL:-gemma3:4b}"
HERMES_ARTICLE_MODEL="${HERMES_ARTICLE_MODEL:-gemma3:4b}"
HERMES_LEAF_MODEL="${HERMES_LEAF_MODEL:-hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF:Q4_K_M}"
HERMES_STRUCTURED_MODEL="${HERMES_STRUCTURED_MODEL:-gemma3:4b}"
HERMES_QA_MODEL="${HERMES_QA_MODEL:-gemma3:4b}"
HERMES_MEDIA_MODEL="${HERMES_MEDIA_MODEL:-hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF:Q4_K_M}"
PROBE_TIMEOUT_SECONDS="${BLOG_PROBE_TIMEOUT_SECONDS:-120}"
VERIFY_ATTEMPTS="${BLOG_VERIFY_ATTEMPTS:-8}"
VERIFY_DELAY_SECONDS="${BLOG_VERIFY_DELAY_SECONDS:-15}"
POST_TIMEOUT_SECONDS="${BLOG_POST_TIMEOUT_SECONDS:-1800}"
MAX_POST_ATTEMPTS="${BLOG_MAX_POST_ATTEMPTS:-3}"
RETRY_DELAY_SECONDS="${BLOG_RETRY_DELAY_SECONDS:-900}"
RUN_DATE_OVERRIDE="${BLOG_RUN_DATE:-}"
QUEUE_START_DATE="${BLOG_QUEUE_START_DATE:-0000-00-00}"
export HERMES_TAKEOVER CLAUDE_ENABLED LOCAL_LLM HERMES_LOCAL_MODEL \
  HERMES_ARTICLE_MODEL HERMES_LEAF_MODEL HERMES_STRUCTURED_MODEL \
  HERMES_QA_MODEL HERMES_MEDIA_MODEL

SELF_LABEL="${XPC_SERVICE_NAME:-}"
RETRY_LABEL="com.nick.daily-blog-reel.retry"

# ── Retry plist cleanup ────────────────────────────────────────────────────────
# `launchctl bootout` on your OWN currently-running label SIGTERMs this process
# immediately -- before this line even returns, let alone before the "===" log
# line below. When launchd fires the retry job itself, XPC_SERVICE_NAME equals
# RETRY_LABEL and this used to self-kill the run silently before it logged
# anything: the exact cause of the multi-week backlog fixed 2026-07-22 (see
# BLOG-SOP.md #20). Only clean up the retry registration when we are NOT it.
if [[ "$SELF_LABEL" != "$RETRY_LABEL" ]]; then
  launchctl bootout "gui/$(id -u)/${RETRY_LABEL}" 2>/dev/null
  rm -f "$HOME/Library/LaunchAgents/${RETRY_LABEL}.plist"
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
notify() { osascript -e "display notification \"$2\" with title \"Blog pipeline: $1\"" 2>/dev/null || true }
retry_launchd_state_matches() {
  local label="$1"
  local expected_date="$2"
  local expected_hour="$3"
  local expected_min="$4"
  local state
  state=$(launchctl print "gui/$(id -u)/${label}" 2>&1) || return 1
  print -r -- "$state" | grep -Fq "BLOG_RUN_DATE => ${expected_date}" || return 1
  print -r -- "$state" | grep -Eq "\"Hour\" => ${expected_hour}\\b" || return 1
  print -r -- "$state" | grep -Eq "\"Minute\" => ${expected_min}\\b" || return 1
}

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
  if ! python3 "$PROJECT_DIR/scripts/publisher-retry-policy.py" transient "$TODAY" >> "$LOG_FILE"; then
    echo "BLOCKED: unchanged input or retry budget exhausted; owner repair required" >> "$LOG_FILE"
    return 1
  fi
  local reset_raw="$1"
  local sleep_secs="${2:-$RETRY_DELAY_SECONDS}"
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
  local retry_epoch=$(( $(TZ=America/Los_Angeles date '+%s') + sleep_secs ))
  local retry_hour=$(( 10#$(TZ=America/Los_Angeles date -r "$retry_epoch" '+%H') ))
  local retry_min=$(( 10#$(TZ=America/Los_Angeles date -r "$retry_epoch" '+%M') ))
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
    <key>HERMES_ARTICLE_MODEL</key><string>${HERMES_ARTICLE_MODEL}</string>
    <key>HERMES_LEAF_MODEL</key><string>${HERMES_LEAF_MODEL}</string>
    <key>HERMES_STRUCTURED_MODEL</key><string>${HERMES_STRUCTURED_MODEL}</string>
    <key>HERMES_QA_MODEL</key><string>${HERMES_QA_MODEL}</string>
    <key>HERMES_MEDIA_MODEL</key><string>${HERMES_MEDIA_MODEL}</string>
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
  write_retry_checkpoint "$retry_epoch" "$retry_hour" "$retry_min"
  if [[ "$SELF_LABEL" == "$retry_label" ]]; then
    # A nohup child still belongs to this launchd job and can die with it.
    # Submit an independent one-shot job, which waits for this owner to exit.
    local reload_label="${retry_label}.reload.$$.${retry_epoch}"
    if ! python3 "$PROJECT_DIR/scripts/launch-once.py" --label "$reload_label" --log "$LOG_FILE" -- \
      /bin/zsh "$PROJECT_DIR/scripts/reload-retry-launchagent.sh" \
      --wait-pid "$$" --label "$retry_label" --plist "$retry_plist" \
      --expected-date "$TODAY" --expected-hour "$retry_hour" \
      --expected-minute "$retry_min" --log-file "$LOG_FILE"; then
      echo "RETRY SCHEDULE FAILED: independent reload job was not submitted" >> "$LOG_FILE"
      return 1
    fi
    echo "Retry reload submitted: ${reload_label}; expected ${TODAY} ${retry_hour}:${retry_min}. Await loaded-state confirmation." >> "$LOG_FILE"
    return 0
  fi
  launchctl bootout "gui/$(id -u)/${retry_label}" 2>/dev/null
  local bootstrap_err bootstrap_rc
  bootstrap_err=$(launchctl bootstrap "gui/$(id -u)" "$retry_plist" 2>&1)
  bootstrap_rc=$?
  if [[ $bootstrap_rc -ne 0 ]]; then
    echo "RETRY SCHEDULE FAILED: bootstrap rc=$bootstrap_rc: $bootstrap_err" >> "$LOG_FILE"
    notify "retry failed" "Could not schedule ${retry_hour}:$(printf '%02d' "$retry_min") catch-up run — check daily-blog-reel.log"
    return 1
  fi
  if ! retry_launchd_state_matches "$retry_label" "$TODAY" "$retry_hour" "$retry_min"; then
    echo "RETRY SCHEDULE FAILED: bootstrap returned 0 but ${retry_label} did not load expected date/time (${TODAY} ${retry_hour}:$(printf '%02d' "$retry_min"))" >> "$LOG_FILE"
    notify "retry failed" "Catch-up job did not load the expected retry state — check daily-blog-reel.log"
    return 1
  fi
  echo "Retry scheduled for ${retry_hour}:$(printf '%02d' "$retry_min") (${sleep_secs}s from now) — confirmed loaded" >> "$LOG_FILE"
}

write_pending() {
  local pending_file="$1"
  shift
  local arr_json=""
  local attempts_json
  attempts_json=$(python3 - "$pending_file" <<'PY' 2>/dev/null || echo '{}'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
try:
    data = json.loads(path.read_text())
except Exception:
    data = {}
print(json.dumps(data.get("attempts", {}), separators=(",", ":")))
PY
  )
  for s in "$@"; do
    arr_json+="\"${s}\","
  done
  arr_json="[${arr_json%,}]"
  cat > "$pending_file" <<JSON
{
  "date": "${TODAY:-$(TZ=America/Los_Angeles date +%F)}",
  "remaining": $arr_json,
  "attempts": $attempts_json,
  "interrupted_at": "$(TZ=America/Los_Angeles date +%Y-%m-%dT%H:%M:%S%z)"
}
JSON
}

increment_attempt() {
  local pending_file="$1"
  local slug="$2"
  python3 - "$pending_file" "$slug" <<'PY'
import json
import os
import sys
import tempfile
from pathlib import Path

path = Path(sys.argv[1])
slug = sys.argv[2]
try:
    data = json.loads(path.read_text())
except Exception:
    data = {"date": "", "remaining": []}
attempts = data.setdefault("attempts", {})
attempts[slug] = int(attempts.get(slug, 0)) + 1
fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
try:
    with os.fdopen(fd, "w") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")
    os.replace(temp_name, path)
except Exception:
    try:
        os.unlink(temp_name)
    except FileNotFoundError:
        pass
    raise
print(attempts[slug])
PY
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
  local reason="${2:-blocked}"
  local src="public/blog/$slug"
  [[ -d "$src" ]] || return 0
  local dest_root=".workflow-blocked/$(TZ=America/Los_Angeles date +%F)"
  local dest="$dest_root/$slug-$(date +%H%M%S)-$reason"
  mkdir -p "$dest_root"
  mv "$src" "$dest"
  echo "QUARANTINED: $slug artifacts moved to $dest" >> "$LOG_FILE"
}

# ── Log rotation + header ─────────────────────────────────────────────────────
log_rotate
echo "\n=== $(TZ=America/Los_Angeles date '+%F %T %Z') ===" >> "$LOG_FILE"
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

# Exhausted quality blocks require an evidence-based owner repair. Recreating
# their pending markers with attempts={} on every launch resets the retry ceiling
# and lets an old failure consume all future publishing days.

# Checkpoint today's queue before selecting an older pending day. Without this,
# backlog recovery can consume the only daily launch and silently skip today.
CALENDAR_TODAY=$(TZ=America/Los_Angeles date +%F)
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
  OLDEST_PENDING=$(node scripts/publisher-wake-eligible.mjs --select "$QUEUE_START_DATE")
  if [[ -n "$OLDEST_PENDING" ]]; then
    PENDING_NAME="${OLDEST_PENDING:t:r}"
    TODAY="${PENDING_NAME%-pending}"
    echo "Recovery: resuming oldest pending blog date $TODAY" >> "$LOG_FILE"
  else
    TODAY=$(TZ=America/Los_Angeles date +%F)
  fi
fi
if [[ "$TODAY" > "$CALENDAR_TODAY" ]]; then
  echo "Future queue $TODAY is not due; preserving preparation" >> "$LOG_FILE"
  exit 0
fi
QUEUE_FILE="public/blog/research/${TODAY}-queue.json"
PENDING_FILE="public/blog/research/${TODAY}-pending.json"
COMPLETE_FILE="public/blog/research/${TODAY}-complete.json"
if ! python3 "$PROJECT_DIR/scripts/publisher-retry-policy.py" check "$TODAY" >> "$LOG_FILE"; then
  echo "BLOCKED: approved inputs unchanged; no model or automatic retry" >> "$LOG_FILE"
  exit 0
fi

RUN_STATE_DIR="$PROJECT_DIR/.workflow-state"
RUN_STATE_FILE="$RUN_STATE_DIR/blog-${TODAY}.json"
RUN_ID="${RUN_ID:-${TODAY}-$$-$(TZ=America/Los_Angeles date +%H%M%S)}"

write_run_state() {
  local event="$1"
  local slug="${2:-}"
  mkdir -p "$RUN_STATE_DIR"
  python3 - "$RUN_STATE_FILE" "$TODAY" "$RUN_ID" "$$" "$SELF_LABEL" "$event" "$slug" <<'PY' 2>/dev/null || true
import json
import os
import sys
from datetime import datetime
from pathlib import Path

path = Path(sys.argv[1])
try:
    state = json.loads(path.read_text())
except Exception:
    state = {}
now = datetime.now().astimezone().isoformat(timespec="seconds")
if state.get("run_id") != sys.argv[3]:
    state = {"started_at": now}
state.update({
    "date": sys.argv[2],
    "run_id": sys.argv[3],
    "pid": int(sys.argv[4]),
    "launch_label": sys.argv[5] or "manual",
    "event": sys.argv[6],
    "slug": sys.argv[7],
    "heartbeat_at": now,
})
state.setdefault("started_at", now)
if sys.argv[6] == "exited":
    state["ended_at"] = now
tmp = path.with_suffix(path.suffix + ".tmp")
tmp.write_text(json.dumps(state, indent=2) + "\n")
os.replace(tmp, path)
PY
}

write_retry_checkpoint() {
  local retry_epoch="$1"
  local retry_hour="$2"
  local retry_min="$3"
  mkdir -p "$RUN_STATE_DIR"
  python3 - "$RUN_STATE_DIR/retry.json" "$TODAY" "$retry_epoch" "$retry_hour" "$retry_min" <<'PY' 2>/dev/null || true
import json
import os
import sys
from datetime import datetime
from pathlib import Path

path = Path(sys.argv[1])
state = {
    "date": sys.argv[2],
    "due_epoch": int(sys.argv[3]),
    "due_local": f"{sys.argv[4]}:{sys.argv[5]}",
    "scheduled_at": datetime.now().astimezone().isoformat(timespec="seconds"),
    "label": "com.nick.daily-blog-reel.retry",
}
tmp = path.with_suffix(path.suffix + ".tmp")
tmp.write_text(json.dumps(state, indent=2) + "\n")
os.replace(tmp, path)
PY
}

write_run_state "started"
finish_run() {
  local rc=$?
  write_run_state "exited" ""
  release_publisher_lock
  trap - EXIT
  exit "$rc"
}
trap finish_run EXIT

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
  PROBE_CANONICAL=$(node scripts/resolve-canonical-topic.mjs --queued="$PROBE_SLUG" 2>>"$LOG_FILE")
  PROBE_CANONICAL_RC=$?
  # Canonical checkpoints need verification or owner evidence repair, neither
  # of which requires loading a model beside an active renderer.
  if [[ -n "$PROBE_CANONICAL" || $PROBE_CANONICAL_RC -ne 0 ]]; then
    continue
  fi
  node scripts/reviewed-blog-ready.mjs --slug="$PROBE_SLUG" --day="$TODAY" >> "$LOG_FILE" 2>&1
  REVIEWED_PROBE=$?
  # Reviewed but blocked packages need owner repair, never regeneration.
  (( REVIEWED_PROBE != 1 )) && continue
  # An existing but unreviewed draft still enters the model-driven builder.
  # File presence cannot exempt it from the shared heavy-compute guard.
  NEEDS_MODEL=1
  break
done
if (( NEEDS_MODEL == 1 )); then
  if [[ -d /tmp/fused-remotion-render.lock ]] && python3 "$PROJECT_DIR/scripts/lock-owner-alive.py" /tmp/fused-remotion-render.lock; then
    echo "Renderer owns heavy compute; model generation deferred with pending preserved" >> "$LOG_FILE"
    exit 0
  fi
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
CANONICAL_REVIEW_BLOCKED=0
typeset -U RETRY_SLUGS

if ! $QUEUE_MODE && [[ "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" ]]; then
  echo "BLOCKED: no valid queue for $TODAY; owner input required, no automatic retry" >> "$LOG_FILE"
  python3 "$PROJECT_DIR/scripts/publisher-retry-policy.py" block "$TODAY" --reason missing_approved_queue >> "$LOG_FILE"
  notify "queue missing" "$TODAY needs reviewed input; automatic retries stopped"
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
  ATTEMPT=$(increment_attempt "$PENDING_FILE" "$SLUG")
  echo "\n--- Post: $SLUG ---" >> "$LOG_FILE"
  echo "Attempt $ATTEMPT/$MAX_POST_ATTEMPTS: $SLUG" >> "$LOG_FILE"
  write_run_state "post-start" "$SLUG"

  # Published slugs are immutable publication identities. Repeated queue topics
  # are existing checkpoints, never permission to overwrite a live article.
  FORCE_POST=0
  # A verified equivalent satisfies this topic only after the canonical page
  # passes the same live gate. Keep the queued alias in pending bookkeeping.
  CANONICAL_SLUG=$(node scripts/resolve-canonical-topic.mjs --queued="$SLUG" 2>>"$LOG_FILE")
  RESOLVE_RC=$?
  if [[ $RESOLVE_RC -ne 0 ]]; then
    echo "BLOCKED: canonical resolution validation failed for $SLUG; retaining alias pending" >> "$LOG_FILE"
    FAILS=$(( FAILS + 1 ))
    RETRY_SLUGS+=("$SLUG")
    if (( ATTEMPT >= MAX_POST_ATTEMPTS )); then
      CANONICAL_REVIEW_BLOCKED=$(( CANONICAL_REVIEW_BLOCKED + 1 ))
    fi
    continue
  fi
  if [[ -n "$CANONICAL_SLUG" ]]; then
    if [[ "$AUTO_DEPLOY" == "1" ]]; then
      CODE=$(verify_live_slug "$CANONICAL_SLUG")
      if [[ "$CODE" != "200" ]]; then
        echo "VERIFY FAIL: canonical equivalent /blog/$CANONICAL_SLUG/ ($CODE); retaining alias $SLUG" >> "$LOG_FILE"
        FAILS=$(( FAILS + 1 ))
        RETRY_SLUGS+=("$SLUG")
        continue
      fi
    fi
    echo "SKIP: $SLUG resolved to verified canonical $CANONICAL_SLUG" >> "$LOG_FILE"
    BUILT+=("$SLUG")
    [[ "$AUTO_DEPLOY" != "1" ]] && RETRY_SLUGS+=("$SLUG")
    continue
  fi
  if [[ -f "public/blog/$SLUG/index.html" && -f "public/blog/$SLUG/hero.jpg" ]] \
      && grep -q "\"slug\": \"$SLUG\"" public/blog/posts.json 2>/dev/null; then
    # A registered checkpoint may predate the current deterministic QA rules.
    # Recheck it before treating recovery as healthy, but do not quarantine or
    # rewrite already-live content from this recovery-only path.
    RECHECK_QA_OUT="/tmp/daily-blog-qa-${SLUG}-$$.json"
    if node public/blog/scripts/qa-local.mjs --slug="$SLUG" --out="$RECHECK_QA_OUT" >> "$LOG_FILE" 2>&1; then
      echo "QUALITY RECHECK PASS: $SLUG" >> "$LOG_FILE"
    else
      echo "QUALITY RECHECK WARN: $SLUG has current deterministic QA findings; preserving registered artifact for owner repair" >> "$LOG_FILE"
    fi
    rm -f "$RECHECK_QA_OUT"
    if [[ "$AUTO_DEPLOY" == "1" ]]; then
      CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "https://fuseddistribution.com/blog/$SLUG/")
      if [[ "$CODE" != "200" ]]; then
        echo "RESUME: $SLUG is registered but not live ($CODE); redeploying checkpointed artifacts" >> "$LOG_FILE"
        if ! node scripts/deploy-approved-blog.mjs --slug="$SLUG" >> "$LOG_FILE" 2>&1; then
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

  if grep -q "\"slug\": \"$SLUG\"" public/blog/posts.json 2>/dev/null; then
    echo "BLOCKED: registered $SLUG has missing artifacts; owner restoration required" >> "$LOG_FILE"
    FAILS=$(( FAILS + 1 ))
    RETRY_SLUGS+=("$SLUG")
    continue
  fi

  node scripts/reviewed-blog-ready.mjs --slug="$SLUG" --day="$TODAY" >> "$LOG_FILE" 2>&1
  REVIEWED_READY=$?
  if (( REVIEWED_READY == 2 )); then
    echo "BLOCKED: reviewed $SLUG needs owner repair; no model regeneration" >> "$LOG_FILE"
    RETRY_SLUGS+=("$SLUG")
    continue
  fi
  # Approved inventory does not require a drafting model to be available.
  if (( REVIEWED_READY != 0 )); then
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
  if (( REVIEWED_READY == 0 )); then
    node public/blog/scripts/qa-local.mjs --slug="$SLUG" --out="/tmp/fused-prepared-${SLUG}-qa.json" >> "$POST_TMPOUT" 2>&1
    POST_EXIT=$?
    if (( POST_EXIT == 0 )); then
      node public/blog/scripts/add-to-posts.mjs --slug="$SLUG" >> "$POST_TMPOUT" 2>&1
      POST_EXIT=$?
    fi
  else
    FORCE_ARGS=()
    (( FORCE_POST == 1 )) && FORCE_ARGS+=(--force)
    python3 scripts/run-with-timeout.py "$POST_TIMEOUT_SECONDS" env \
      HERMES_TAKEOVER="$HERMES_TAKEOVER" CLAUDE_ENABLED="$CLAUDE_ENABLED" LOCAL_LLM="$LOCAL_LLM" \
      HERMES_LOCAL_MODEL="$HERMES_ARTICLE_MODEL" HERMES_ARTICLE_MODEL="$HERMES_ARTICLE_MODEL" \
      HERMES_LEAF_MODEL="$HERMES_LEAF_MODEL" HERMES_STRUCTURED_MODEL="$HERMES_STRUCTURED_MODEL" \
      HERMES_QA_MODEL="$HERMES_QA_MODEL" HERMES_MEDIA_MODEL="$HERMES_MEDIA_MODEL" \
        BLOG_PUBLISH_DATE="$TODAY" \
      public/blog/scripts/build-post.sh "$SLUG" --brand="$BRAND" --keyword="$KW" "${FORCE_ARGS[@]}" 2>&1 \
      | tee -a "$LOG_FILE" "$POST_TMPOUT" > /dev/null
    POST_EXIT=$pipestatus[1]
  fi
  write_run_state "post-build-exit-${POST_EXIT}" "$SLUG"

  if (( REVIEWED_READY == 0 && POST_EXIT != 0 )); then
    echo "BLOCKED: prepared $SLUG failed release validation; preserving reviewed source for owner" >> "$LOG_FILE"
    RETRY_SLUGS+=("$SLUG")
    continue
  fi

  # A clean but undersized article can pass the style lint and become a stale
  # resume checkpoint while the required reel stage fails forever. Rebuild the
  # writer and dependent artifacts once before retaining the post for retry.
  if [[ $POST_EXIT -eq 0 && -s "public/blog/$SLUG/verified.md" ]] \
     && [[ ! -s "public/blog/$SLUG/reel-data.md" || ! -s "public/blog/$SLUG/reel-script.md" ]]; then
    echo "RECOVERY: $SLUG is missing required reel artifacts; forcing one full content rebuild" >> "$LOG_FILE"
    python3 scripts/run-with-timeout.py "$POST_TIMEOUT_SECONDS" env \
      HERMES_TAKEOVER="$HERMES_TAKEOVER" CLAUDE_ENABLED="$CLAUDE_ENABLED" LOCAL_LLM="$LOCAL_LLM" \
      HERMES_LOCAL_MODEL="$HERMES_ARTICLE_MODEL" HERMES_ARTICLE_MODEL="$HERMES_ARTICLE_MODEL" \
      HERMES_LEAF_MODEL="$HERMES_LEAF_MODEL" HERMES_STRUCTURED_MODEL="$HERMES_STRUCTURED_MODEL" \
      HERMES_QA_MODEL="$HERMES_QA_MODEL" HERMES_MEDIA_MODEL="$HERMES_MEDIA_MODEL" \
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

  if [[ "$POST_EXIT" == "124" ]]; then
    echo "POST TIMEOUT: $SLUG exceeded ${POST_TIMEOUT_SECONDS}s watchdog." >> "$LOG_FILE"
    FAILS=$(( FAILS + 1 ))
    DEFERRED=$(( DEFERRED + 1 ))
    if (( ATTEMPT >= MAX_POST_ATTEMPTS )); then
      echo "RETRY EXHAUSTED: $SLUG after $ATTEMPT timed-out attempts — preserving quarantine for owner repair." >> "$LOG_FILE"
      QUALITY_BLOCKED=$(( QUALITY_BLOCKED + 1 ))
      quarantine_post_dir "$SLUG" "timeout"
    else
      RETRY_SLUGS+=("$SLUG")
    fi
    continue
  fi

  if grep -q -- '-quality-fail"' "public/blog/$SLUG/_status.json" 2>/dev/null \
     && ! grep -q "\"slug\": \"$SLUG\"" public/blog/posts.json 2>/dev/null; then
    echo "QUALITY BLOCKED: $SLUG — structural content gate failed; preserving quarantine." >> "$LOG_FILE"
    notify "quality blocked" "$SLUG requires Codex editorial repair"
    FAILS=$(( FAILS + 1 ))
    QUALITY_BLOCKED=$(( QUALITY_BLOCKED + 1 ))
    quarantine_post_dir "$SLUG" "quality"
    continue
  fi

  # Deferred = a claude brain-stage outage (write or QA), NOT a quality failure.
  # Keep artifacts in place for the next run; do not quarantine, do not count as FAIL.
  if grep -q -- '-deferred"' "public/blog/$SLUG/_status.json" 2>/dev/null \
     && ! grep -q "\"slug\": \"$SLUG\"" public/blog/posts.json 2>/dev/null; then
    echo "DEFERRED: $SLUG — brain-stage outage, left in place for retry." >> "$LOG_FILE"
    notify "qa deferred" "$SLUG — brain QA outage, will retry"
    DEFERRED=$(( DEFERRED + 1 ))
    if (( ATTEMPT >= MAX_POST_ATTEMPTS )); then
      echo "RETRY EXHAUSTED: $SLUG after $ATTEMPT attempts — preserving quarantine for owner repair." >> "$LOG_FILE"
      QUALITY_BLOCKED=$(( QUALITY_BLOCKED + 1 ))
      quarantine_post_dir "$SLUG" "retry-exhausted"
    else
      RETRY_SLUGS+=("$SLUG")
    fi
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
    if (( ATTEMPT >= MAX_POST_ATTEMPTS )); then
      echo "RETRY EXHAUSTED: $SLUG after $ATTEMPT incomplete attempts — preserving quarantine for owner repair." >> "$LOG_FILE"
      QUALITY_BLOCKED=$(( QUALITY_BLOCKED + 1 ))
      quarantine_post_dir "$SLUG" "incomplete"
    else
      RETRY_SLUGS+=("$SLUG")
    fi
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

  # Source delivery is separate from authorized website publication.
  # Keep commits opt-in so an unattended run cannot consume unrelated staging.
  if [[ "${BLOG_GIT_COMMIT:-0}" == "1" ]]; then
    git add "public/blog/$SLUG/" public/sitemap.xml public/blog/posts.json public/blog/topic-history.md
    git commit -m "feat: $SLUG" -- "public/blog/$SLUG/" public/sitemap.xml public/blog/posts.json public/blog/topic-history.md >> "$LOG_FILE" 2>&1
  fi

  if [[ "$AUTO_DEPLOY" != "1" ]]; then
    echo "PUBLISH PENDING: $SLUG validated locally; deployment and live verification remain pending." >> "$LOG_FILE"
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
    echo "SYNC PENDING: local commit retained for Codex review; website deployment continues" >> "$LOG_FILE"
  fi

  if ! node scripts/deploy-approved-blog.mjs --slug="$SLUG" >> "$LOG_FILE" 2>&1; then
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
  # Registered resume paths skip the per-post build branch. Refresh the local
  # comparison sitemap from the current catalog before live verification too.
  node public/blog/scripts/generate-sitemap.mjs >> "$LOG_FILE" 2>&1
  if SITEMAP_CHECK=$(curl -fsS --max-time 20 "https://fuseddistribution.com/sitemap.xml" \
      | node scripts/verify-sitemap.mjs public/sitemap.xml public/blog/posts.json 2>&1); then
    echo "VERIFY PASS: $SITEMAP_CHECK" >> "$LOG_FILE"
  else
    echo "VERIFY FAIL: $SITEMAP_CHECK" >> "$LOG_FILE"
    FAILS=$(( FAILS + 1 ))
    RETRY_SLUGS+=("${BUILT[@]}")
  fi

  # Compare every entry and date order. Same-day permutations are valid:
  # scoped deployment preserves baseline ties while registration prepends.
  verify_posts_json() {
    CATALOG_CHECK=$(curl -fsS --max-time 20 "https://fuseddistribution.com/blog/posts.json" \
      | node scripts/verify-blog-catalog.mjs public/blog/posts.json 2>&1)
  }
  if verify_posts_json; then
    echo "VERIFY PASS: posts.json ($CATALOG_CHECK)" >> "$LOG_FILE"
  else
    echo "VERIFY WARN: posts.json mismatch ($CATALOG_CHECK) — redeploying once" >> "$LOG_FILE"
    node scripts/deploy-approved-blog.mjs >> "$LOG_FILE" 2>&1
    PJ_OK=0
    for wait_round in 1 2 3 4 5 6; do
      sleep 120
      if verify_posts_json; then PJ_OK=1; break; fi
    done
    if [[ "$PJ_OK" == "1" ]]; then
      echo "VERIFY PASS: posts.json verified after redeploy ($CATALOG_CHECK)" >> "$LOG_FILE"
    else
      echo "VERIFY FAIL: posts.json still mismatched after redeploy + 12 min ($CATALOG_CHECK)" >> "$LOG_FILE"
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
  echo "NOTICE: $UNPUSHED commits unpushed to origin/main — Codex review/push overdue" >> "$LOG_FILE"
  notify "git backlog" "$UNPUSHED commits awaiting Codex review and approved push"
fi

# Clear recovery state only after every approved post and the global listing
# checks are live. QA-blocked posts are terminal and recorded separately.
if (( ${#RETRY_SLUGS[@]} > 0 )); then
  write_pending "$PENDING_FILE" "${RETRY_SLUGS[@]}"
  echo "Recovery marker retained: $PENDING_FILE (${#RETRY_SLUGS[@]} retryable)" >> "$LOG_FILE"
  if (( ${#RETRY_SLUGS[@]} > CANONICAL_REVIEW_BLOCKED )); then
    schedule_retry ""
  else
    echo "BLOCKED: canonical validation reached attempt limit; pending preserved for owner repair or next daily run, no rapid retry" >> "$LOG_FILE"
  fi
else
  rm -f "$PENDING_FILE"
  EQUIVALENTS_JSON=$(node scripts/resolve-canonical-topic.mjs --all 2>>"$LOG_FILE")
  EQUIVALENTS_RC=$?
  if [[ $EQUIVALENTS_RC -ne 0 ]]; then
    echo "BLOCKED: canonical resolution registry validation failed; completion remains blocked" >> "$LOG_FILE"
    FAILS=$(( FAILS + 1 ))
    EQUIVALENTS_JSON='{}'
  fi
  QUEUE_SUMMARY=$(python3 - "$QUEUE_FILE" "public/blog/posts.json" "$TODAY" "$EQUIVALENTS_JSON" <<'PY'
import json
import sys
from pathlib import Path

queue_path, posts_path, date, equivalents_raw = sys.argv[1:]
try:
    queue = json.loads(Path(queue_path).read_text()).get("posts", [])
except Exception:
    queue = []
try:
    registered = {post.get("slug") for post in json.loads(Path(posts_path).read_text())}
except Exception:
    registered = set()
try:
    equivalents = json.loads(equivalents_raw)
    if not isinstance(equivalents, dict):
        raise ValueError
except Exception:
    equivalents = {}
blocked_root = Path(".workflow-blocked") / date
blocked = set()
if blocked_root.is_dir():
    for path in blocked_root.iterdir():
        if path.is_dir():
            for post in queue:
                slug = post.get("slug")
                if slug and path.name.startswith(f"{slug}-"):
                    blocked.add(slug)
required = ('index.html', 'hero.jpg', 'reel-data.md', 'reel-script.md', 'social-copy.json')
def published_slug(post):
    slug = post.get('slug')
    return slug if slug in registered else equivalents.get(slug)
def intact(post):
    slug = published_slug(post)
    direct_fresh = post.get('slug') in registered and next((p.get('date') for p in json.loads(Path(posts_path).read_text()) if p.get('slug') == post.get('slug')), '') == date
    return bool(slug) and (post.get('slug') in equivalents or direct_fresh) and all((Path('public/blog') / slug / file).is_file() and (Path('public/blog') / slug / file).stat().st_size > 0 for file in required)
live = sum(1 for post in queue if intact(post))
quality_blocked = sum(1 for post in queue if not intact(post))
dated = {p.get('slug') for p in json.loads(Path(posts_path).read_text()) if p.get('date') == date}
if queue and not any(p.get('slug') in dated and intact(p) for p in queue):
    quality_blocked = max(1, quality_blocked)  # Recycled topics are not fresh daily output.
print(f"{live} {quality_blocked}")
PY
  )
  QUEUE_LIVE=${QUEUE_SUMMARY%% *}
  QUEUE_BLOCKED=${QUEUE_SUMMARY##* }
  [[ "$QUEUE_LIVE" == <-> ]] || QUEUE_LIVE=${#BUILT[@]}
  [[ "$QUEUE_BLOCKED" == <-> ]] || QUEUE_BLOCKED=$QUALITY_BLOCKED
  # A dated completion marker is only authoritative when every queued slug is
  # registered. Quality blocks are recovery work, not successful completion.
  if (( QUEUE_BLOCKED > 0 || FAILS > 0 )); then
    echo "CHECKPOINT INCOMPLETE: $QUEUE_BLOCKED unresolved slug(s), $FAILS verification failure(s)" >> "$LOG_FILE"
    python3 - "$QUEUE_FILE" "$RUN_STATE_DIR/blocked-${TODAY}.json" <<'PYBLOCK'
import json, sys
from datetime import datetime, timezone
queue = json.load(open(sys.argv[1]))
queue.update(status='blocked', checked_at=datetime.now(timezone.utc).isoformat(), reason='Unresolved artifacts or live verification failure; owner repair required')
with open(sys.argv[2], 'w') as output:
    json.dump(queue, output, indent=2)
PYBLOCK
  else
    cat > "$COMPLETE_FILE" <<JSON
{
  "date": "$TODAY",
  "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "live": $QUEUE_LIVE,
  "quality_blocked": $QUEUE_BLOCKED,
  "source_sync_warnings": $SYNC_FAILS
}
JSON
  fi
  NEXT_PENDING=$(node scripts/publisher-wake-eligible.mjs --select "$QUEUE_START_DATE")
  if [[ -n "$NEXT_PENDING" ]]; then
    PREVIOUS_TODAY="$TODAY"
    NEXT_PENDING_NAME="${NEXT_PENDING:t:r}"
    TODAY="${NEXT_PENDING_NAME%-pending}"
    schedule_retry "" 300
    TODAY="$PREVIOUS_TODAY"
    echo "Recovery: next pending date ${NEXT_PENDING_NAME%-pending} scheduled after completing $PREVIOUS_TODAY" >> "$LOG_FILE"
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
