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
QUEUE_START_DATE="${OLLAMA_WATCHDOG_QUEUE_START_DATE:-$(TZ=America/Los_Angeles date +%F)}"
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
    -d "{\"model\":\"$PROBE_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with exactly OK.\"}],\"stream\":false,\"options\":{\"num_predict\":4},\"keep_alive\":\"0s\"}" 2>&1) || {
      log "Ollama probe failed for $PROBE_MODEL: $response"
      return 1
    }
  print -r -- "$response" | grep -Eq '"content"[[:space:]]*:[[:space:]]*"[^"].*"' || {
    log "Ollama probe returned no assistant content for $PROBE_MODEL"
    return 1
  }
}

oldest_pending() {
  find "$PROJECT_DIR/public/blog/research" -maxdepth 1 -type f -name '????-??-??-pending.json' -print 2>/dev/null \
    | sort \
    | awk -v start="$QUEUE_START_DATE" 'BEGIN { FS="/" } { name=$NF; date=substr(name,1,10); if (date >= start) { print; exit } }'
}

publisher_running() {
  local line pid
  line=$(launchctl list "$PUBLISHER_LABEL" 2>/dev/null || true)
  pid=$(print -r -- "$line" | awk 'NR==2 {print $1}')
  [[ "$pid" == <-> && "$pid" -gt 0 ]]
}

if ! healthy && ! restart_ollama; then
  log "BLOCKED: Ollama listener did not recover"
  exit 1
fi

if ! probe_model; then
  log "BLOCKED: Ollama listener is up but model probe failed"
  exit 1
fi

pending=$(oldest_pending)
if [[ -z "$pending" ]]; then
  log "OK: Ollama healthy; no dated blog queue is pending"
  exit 0
fi

if publisher_running; then
  log "OK: Ollama healthy; publisher already running for $(basename "$pending")"
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
log "WAKE: Ollama healthy; starting publisher for $(basename "$pending")"
launchctl kickstart "gui/$(id -u)/$PUBLISHER_LABEL" >> "$LOG_FILE" 2>&1 || {
  log "BLOCKED: failed to kickstart $PUBLISHER_LABEL"
  exit 1
}
