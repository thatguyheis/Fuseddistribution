#!/bin/zsh
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/Users/nick/projects/fuseddistribution}"
CURRENT_SCHEDULED="${BUFFER_CURRENT_SCHEDULED:-}"
BUFFER_LIMIT="${BUFFER_SCHEDULE_LIMIT:-10}"
RESERVE_SLOTS="${BUFFER_RESERVE_SLOTS:-1}"
PLATFORM_COUNT="${BUFFER_PLATFORM_COUNT:-3}"
MEDIA_MAP="${BUFFER_MEDIA_MAP:-.buffer-media-urls.json}"
SCHEDULED_LOG="${BUFFER_SCHEDULED_LOG:-.buffer-youtube-scheduled.json}"
SCHEDULE_WINDOW_START="${BUFFER_SCHEDULE_WINDOW_START:-13:00}"
SCHEDULE_WINDOW_END="${BUFFER_SCHEDULE_WINDOW_END:-19:00}"
SCHEDULE_INTERVAL_MINUTES="${BUFFER_SCHEDULE_INTERVAL_MINUTES:-105}"

cd "$PROJECT_DIR"

if [[ -z "$CURRENT_SCHEDULED" ]]; then
  echo "BUFFER_CURRENT_SCHEDULED is required. Query Buffer scheduled/sending posts before running this script." >&2
  exit 2
fi

npm run social:buffer:plan -- \
  --current-scheduled="$CURRENT_SCHEDULED" \
  --limit="$BUFFER_LIMIT" \
  --reserve-slots="$RESERVE_SLOTS" \
  --platform-count="$PLATFORM_COUNT" \
  --media-map="$MEDIA_MAP" \
  --scheduled-log="$SCHEDULED_LOG" \
  --verify-media-urls \
  --schedule-window-start="$SCHEDULE_WINDOW_START" \
  --schedule-window-end="$SCHEDULE_WINDOW_END" \
  --schedule-interval-minutes="$SCHEDULE_INTERVAL_MINUTES" \
  --write-packs
