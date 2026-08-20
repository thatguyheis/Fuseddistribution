#!/bin/zsh

set -u

WAIT_PID=""
LABEL=""
PLIST=""
EXPECTED_DATE=""
EXPECTED_HOUR=""
EXPECTED_MINUTE=""
LOG_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --wait-pid)
      WAIT_PID="$2"
      shift 2
      ;;
    --label)
      LABEL="$2"
      shift 2
      ;;
    --plist)
      PLIST="$2"
      shift 2
      ;;
    --expected-date)
      EXPECTED_DATE="$2"
      shift 2
      ;;
    --expected-hour)
      EXPECTED_HOUR="$2"
      shift 2
      ;;
    --expected-minute)
      EXPECTED_MINUTE="$2"
      shift 2
      ;;
    --log-file)
      LOG_FILE="$2"
      shift 2
      ;;
    *)
      echo "reload-retry-launchagent: unknown arg $1" >&2
      exit 64
      ;;
  esac
done

if [[ -z "$WAIT_PID" || -z "$LABEL" || -z "$PLIST" || -z "$EXPECTED_DATE" || -z "$LOG_FILE" ]]; then
  echo "reload-retry-launchagent: missing required args" >&2
  exit 64
fi

launchd_state_matches() {
  local state
  state=$(launchctl print "gui/$(id -u)/${LABEL}" 2>&1) || return 1
  print -r -- "$state" | grep -Fq "BLOG_RUN_DATE => ${EXPECTED_DATE}" || return 1
  print -r -- "$state" | grep -Eq "\"Hour\" => ${EXPECTED_HOUR}\\b" || return 1
  print -r -- "$state" | grep -Eq "\"Minute\" => ${EXPECTED_MINUTE}\\b" || return 1
}

deadline=$(( $(date '+%s') + 300 ))
while kill -0 "$WAIT_PID" 2>/dev/null; do
  if (( $(date '+%s') >= deadline )); then
    echo "RETRY RELOAD FAILED: watcher timed out waiting for pid ${WAIT_PID} to exit" >> "$LOG_FILE"
    exit 1
  fi
  sleep 1
done

attempt=1
while (( attempt <= 3 )); do
  launchctl bootout "gui/$(id -u)/${LABEL}" >> "$LOG_FILE" 2>&1 || true
  sleep 2
  bootstrap_out=$(launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>&1)
  bootstrap_rc=$?
  if launchd_state_matches; then
    echo "Retry deferred reload confirmed: label=${LABEL} date=${EXPECTED_DATE} time=$(printf '%02d:%02d' "$EXPECTED_HOUR" "$EXPECTED_MINUTE") attempt=${attempt}" >> "$LOG_FILE"
    exit 0
  fi
  echo "RETRY RELOAD ATTEMPT ${attempt} FAILED: bootstrap rc=${bootstrap_rc}: ${bootstrap_out}" >> "$LOG_FILE"
  attempt=$(( attempt + 1 ))
  sleep 3
done

osascript -e "display notification \"${LABEL} failed to reload for ${EXPECTED_DATE}. Check daily-blog-reel.log.\" with title \"Blog pipeline: retry failed\"" 2>/dev/null || true
echo "RETRY RELOAD FAILED: label=${LABEL} date=${EXPECTED_DATE} time=$(printf '%02d:%02d' "$EXPECTED_HOUR" "$EXPECTED_MINUTE") remained unloaded after 3 attempts" >> "$LOG_FILE"
exit 1
