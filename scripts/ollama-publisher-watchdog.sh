#!/bin/zsh

# Closed-loop local runtime guardian for the blog publisher.
# It owns recovery of the Ollama listener and wakes the publisher only when
# the oldest dated queue is pending and no publisher process is already active.

set -u

PROJECT_DIR="/Users/nick/projects/fuseddistribution"
LOG_FILE="$HOME/Library/Logs/ollama-publisher-watchdog.log"
LOCK_DIR="/tmp/fused-ollama-publisher-watchdog.lock"
OLLAMA_LABEL="homebrew.mxcl.ollama"
PUBLISHER_LABEL="com.nick.daily-blog-reel"
OLLAMA_URL="${OLLAMA_WATCHDOG_URL:-http://127.0.0.1:11434}"
PROBE_MODEL="${OLLAMA_WATCHDOG_MODEL:-gemma3:1b}"
WAKE_COOLDOWN="${OLLAMA_WATCHDOG_COOLDOWN_SECONDS:-900}"
QUEUE_START_DATE="${OLLAMA_WATCHDOG_QUEUE_START_DATE:-0000-00-00}"
STATE_FILE="/tmp/fused-ollama-publisher-watchdog.last-wake"

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

log() {
  print -r -- "$(date '+%Y-%m-%d %H:%M:%S %Z') $*" >> "$LOG_FILE"
}

healthy() {
  curl -fsS --max-time 8 "$OLLAMA_URL/api/tags" >/dev/null 2>&1
}

restart_ollama() {
  log "Ollama health check failed; kickstarting $OLLAMA_LABEL"
  launchctl kickstart -k "gui/$(id -u)/$OLLAMA_LABEL" >> "$LOG_FILE" 2>&1 || true
  for _ in {1..12}; do
    sleep 5
    healthy && return 0
  done
  return 1
}

probe_model() {
  local response
  response=$(curl -fsS --max-time 30 "$OLLAMA_URL/api/chat" \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"$PROBE_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with exactly OK.\"}],\"think\":false,\"stream\":false,\"options\":{\"num_predict\":4},\"keep_alive\":\"0s\"}" 2>&1) || {
      log "Ollama probe failed for $PROBE_MODEL: $response"
      return 1
    }
  print -r -- "$response" | grep -Eq '"content"[[:space:]]*:[[:space:]]*"[^"].*"' || {
    log "Ollama probe returned no assistant content for $PROBE_MODEL"
    return 1
  }
}

oldest_pending() {
  (cd "$PROJECT_DIR" && node scripts/publisher-wake-eligible.mjs --select "$QUEUE_START_DATE")
}

publisher_running() {
  pgrep -f '[s]cripts/daily-blog-reel.sh' >/dev/null 2>&1
}

# Do not load a probe model or restart the runtime while a bounded production
# task owns it. Loading another model on the 8 GB host can force the writer into
# swap and turn a healthy long request into a timeout.
if publisher_running || pgrep -f '[s]cripts/render.mjs' >/dev/null 2>&1; then
  log "BUSY: production task owns the runtime; skipping model probe and restart"
  exit 0
fi
if [[ -d /tmp/fused-coin-history-drafts.lock ]] \
  && python3 "$PROJECT_DIR/scripts/lock-owner-alive.py" /tmp/fused-coin-history-drafts.lock; then
  log "BUSY: coin-history draft worker owns local inference; skipping publisher probe"
  exit 0
fi

# A missing queue cannot be repaired by waking the article publisher.
# Retry research once per date and generator revision, after local compute is idle.
today=$(TZ=America/Los_Angeles date '+%Y-%m-%d')
hour=$(TZ=America/Los_Angeles date '+%H')
research_state="$PROJECT_DIR/.workflow-state/research-recovery-wake"
if [[ "$hour" -ge 7 && ! -f "$PROJECT_DIR/public/blog/research/${today}-queue.json" ]]; then
  revision=$(cat "$PROJECT_DIR/public/blog/scripts/gemma-nightly.sh" "$PROJECT_DIR/public/blog/data/topic-pool.json" 2>/dev/null | shasum -a 256 | awk '{print $1}')
  fingerprint="$today $revision"
  previous=$(cat "$research_state" 2>/dev/null || true)
  if [[ "$previous" != "$fingerprint" ]]; then
    if launchctl kickstart "gui/$(id -u)/com.nick.gemma-research" >> "$LOG_FILE" 2>&1; then
      mkdir -p "${research_state:h}"
      print -r -- "$fingerprint" > "$research_state"
      log "WAKE: today's queue is missing; research owner requested before publisher"
    else
      log "BLOCKED: could not wake research owner"
    fi
  else
    log "BLOCKED: missing queue already retried for this generator revision; owner review required"
  fi
  exit 0
fi

pending=$(oldest_pending)
if [[ -n "$pending" ]] && ! (cd "$PROJECT_DIR" && node scripts/publisher-wake-eligible.mjs "$pending"); then
  log "BLOCKED: pending canonical review has no eligible automatic retry; no model probe or publisher wake"
  exit 0
fi

# Idle ticks must never load a model or repeat the full nightly audit.
if [[ -z "$pending" ]]; then
  log "IDLE: no due publishing work; no model probe"
  exit 0
fi

if ! (cd "$PROJECT_DIR" && node scripts/reviewed-blog-ready.mjs --queue="$pending"); then
  if ! healthy && ! restart_ollama; then
    log "BLOCKED: Ollama listener did not recover"
    exit 1
  fi

  if ! probe_model; then
    log "BLOCKED: Ollama listener is up but model probe failed"
    exit 1
  fi


fi # Reviewed inventory needs verification, not a model probe.

if publisher_running; then
  log "BUSY: publisher already running for $(basename "$pending")"
  exit 0
fi

now=$(date '+%s')
last=0
[[ -f "$STATE_FILE" ]] && last=$(tr -dc '0-9' < "$STATE_FILE")
if (( now - last < WAKE_COOLDOWN )); then
  log "WAIT: $(basename "$pending") pending; publisher wake cooldown active"
  exit 0
fi

print -r -- "$now" > "$STATE_FILE"
log "WAKE: due work eligible; starting publisher for $(basename "$pending")"
launchctl kickstart "gui/$(id -u)/$PUBLISHER_LABEL" >> "$LOG_FILE" 2>&1 || {
  log "BLOCKED: failed to kickstart $PUBLISHER_LABEL"
  exit 1
}
