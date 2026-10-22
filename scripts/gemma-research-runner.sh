#!/bin/zsh
set -u
PROJECT_DIR="/Users/nick/projects/fuseddistribution"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
LOG_FILE="$HOME/Library/Logs/gemma-research.log"
LOCK="/tmp/fused-blog-publisher.lock"
COIN_DRAFT_LOCK="/tmp/fused-coin-history-drafts.lock"
if [[ -d "$COIN_DRAFT_LOCK" ]] && python3 "$PROJECT_DIR/scripts/lock-owner-alive.py" "$COIN_DRAFT_LOCK"; then
  echo "$(date): coin-history recovery owns local inference; research deferred" >> "$LOG_FILE"
  exit 0
fi
if [[ -d "$LOCK" ]] && ! python3 "$PROJECT_DIR/scripts/lock-owner-alive.py" "$LOCK"; then
  mv "$LOCK" "${LOCK}.stale.$(date +%s).$$" || exit 1
fi
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "$(date): publisher active; nightly deferred to owner recovery" >> "$LOG_FILE"
  exit 0
fi
echo "$$" > "$LOCK/pid"
trap 'mv "$LOCK" "${LOCK}.finished.$(date +%s).$$" 2>/dev/null || true' EXIT
if [[ -d /tmp/fused-remotion-render.lock ]] && python3 "$PROJECT_DIR/scripts/lock-owner-alive.py" /tmp/fused-remotion-render.lock; then
  echo "$(date): renderer active; nightly deferred to owner recovery" >> "$LOG_FILE"
  exit 0
fi
cd "$PROJECT_DIR" || exit 1
# Daytime recovery fills today; the 23:00 preparation run must target tomorrow.
TODAY=$(TZ=America/Los_Angeles date '+%Y-%m-%d')
HOUR=$(TZ=America/Los_Angeles date '+%H')
if [[ -z "${GEMMA_RUN_DATE:-}${BLOG_RUN_DATE:-}" && "$HOUR" -ge 7 && "$HOUR" -lt 23 && ! -f "public/blog/research/${TODAY}-queue.json" ]]; then
  export GEMMA_RUN_DATE="$TODAY"
fi
echo "=== $(date): nightly started ===" >> "$LOG_FILE"
# Load the complete shell program before starting it. Repository repairs must
# not shift the byte offset of a script bash is still reading during inference.
NIGHTLY_SOURCE="$(cat "$PROJECT_DIR/public/blog/scripts/gemma-nightly.sh")" || exit 1
python3 scripts/run-with-timeout.py "${GEMMA_TIMEOUT_SECONDS:-21600}" /bin/bash -c "$NIGHTLY_SOURCE" "$PROJECT_DIR/public/blog/scripts/gemma-nightly.sh" >> "$LOG_FILE" 2>&1
RESULT=$?
echo "=== $(date): nightly exited $RESULT ===" >> "$LOG_FILE"
exit "$RESULT"
