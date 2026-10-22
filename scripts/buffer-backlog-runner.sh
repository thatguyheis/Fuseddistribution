#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Users/nick/projects/fuseddistribution"
LOG_FILE="${BUFFER_BACKLOG_LOG_FILE:-$HOME/Library/Logs/buffer-backlog-runner.log}"
export PATH="/opt/homebrew/bin:/usr/local/bin:/Users/nick/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "$PROJECT_DIR"
mkdir -p "${LOG_FILE:h}"
echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') buffer backlog run ===" >> "$LOG_FILE"
buffer_exit=0
/usr/local/bin/node scripts/buffer-backlog-runner.mjs >> "$LOG_FILE" 2>&1 || buffer_exit=$?
# Saved sent records can repair article embeds even when Buffer is in cooldown.
video_exit=0
video_args=(--deploy)
# Weekly checks detect older hosted files that became unavailable.
[[ "$(TZ=America/Los_Angeles date +%u)" == 7 ]] && video_args+=(--check-existing)
/usr/local/bin/node scripts/reconcile-blog-videos.mjs "${video_args[@]}" >> "$LOG_FILE" 2>&1 || video_exit=$?
(( buffer_exit == 0 && video_exit == 0 ))
