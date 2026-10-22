#!/bin/zsh
# Render registered blog reels at 11 AM without consuming Claude quota.
set -u

PROJECT_DIR="/Users/nick/projects/fuseddistribution"
VIDEO_DIR="$PROJECT_DIR/video"
BLOG_DIR="$PROJECT_DIR/public/blog"
LOG_FILE="${REEL_LOG_FILE:-/tmp/fuseddistribution-render-missing-reels.log}"
MAX_RETRIES="${MAX_RETRIES:-1}"
MAX_RENDERS_PER_RUN="${MAX_RENDERS_PER_RUN:-4}"
RENDER_TIMEOUT_SECONDS="${RENDER_TIMEOUT_SECONDS:-18000}"
export CHATTERBOX_BATCH_TIMEOUT_MS="${CHATTERBOX_BATCH_TIMEOUT_MS:-2700000}"
VOICE="${REEL_VOICE:-chatterbox}"
GLOBAL_RENDER_LOCK="/tmp/fused-remotion-render.lock"

# Generate one controlled, topic-matched atmospheric background for the hook.
# The media adapter falls back to the normal local/stock path if local inference
# is unavailable, times out, or fails validation. Every value remains
# environment-overridable for incident response and reviewed experiments.
export GENERATIVE_MEDIA_ENABLED="${GENERATIVE_MEDIA_ENABLED:-1}"
export GENERATIVE_MEDIA_MODE="${GENERATIVE_MEDIA_MODE:-production}"
export GENERATIVE_MEDIA_PRODUCTION_APPROVED="${GENERATIVE_MEDIA_PRODUCTION_APPROVED:-1}"
export GENERATIVE_MEDIA_MAX_SEGMENTS="${GENERATIVE_MEDIA_MAX_SEGMENTS:-2}"
export GENERATIVE_MEDIA_STEPS="${GENERATIVE_MEDIA_STEPS:-20}"
export GENERATIVE_MEDIA_TIMEOUT_MS="${GENERATIVE_MEDIA_TIMEOUT_MS:-14400000}"

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Users/nick/.local/bin"

notify() { osascript -e "display notification \"$2\" with title \"Reel pipeline: $1\"" 2>/dev/null || true }
log() { echo "[$(date +%T)] $*" >> "$LOG_FILE"; }

# Prevent a calendar launch and a manual recovery launch from rendering the
# same backlog at once. mkdir is atomic on macOS.
SCHEDULER_LOCK="/tmp/fused-reel-scheduler.lock"
if [[ -d "$SCHEDULER_LOCK" ]] && ! python3 "$PROJECT_DIR/scripts/lock-owner-alive.py" "$SCHEDULER_LOCK"; then
  mv "$SCHEDULER_LOCK" "${SCHEDULER_LOCK}.stale.$(date +%s).$$" || exit 1
  log "Recovered scheduler lock with exited owner"
fi
if ! mkdir "$SCHEDULER_LOCK" 2>/dev/null; then
  log "Another reel scheduler is active; skipping this run"
  exit 0
fi
echo "$$" > "$SCHEDULER_LOCK/pid"
cleanup_scheduler_lock() {
  mv "$SCHEDULER_LOCK" "${SCHEDULER_LOCK}.finished.$(date +%s).$$" 2>/dev/null || true
}
trap cleanup_scheduler_lock EXIT

if [[ -d /tmp/fused-blog-publisher.lock ]] && python3 "$PROJECT_DIR/scripts/lock-owner-alive.py" /tmp/fused-blog-publisher.lock; then
  log "Blog publisher active; deferring heavy render work"
  exit 0
fi

echo "\n=== $(date) ===" >> "$LOG_FILE"
if [[ -d "$GLOBAL_RENDER_LOCK" ]]; then
  if python3 "$PROJECT_DIR/scripts/lock-owner-alive.py" "$GLOBAL_RENDER_LOCK"; then
    log "Another Remotion render is active or lock ownership is indeterminate; skipping"
    exit 0
  fi
  mv "$GLOBAL_RENDER_LOCK" "${GLOBAL_RENDER_LOCK}.stale.$(date +%s).$$" || exit 1
  log "Recovered render lock with exited owner"
fi
ulimit -n 65536 2>/dev/null || true
cd "$PROJECT_DIR" || exit 1

if [[ -f "$VIDEO_DIR/.env" ]]; then
  set -o allexport
  source "$VIDEO_DIR/.env"
  set +o allexport
fi
log "Media env: PEXELS_API_KEY=$([[ -n "${PEXELS_API_KEY:-}" ]] && echo set || echo unset) PIXABAY_API_KEY=$([[ -n "${PIXABAY_API_KEY:-}" ]] && echo set || echo unset) GENERATIVE_MEDIA=${GENERATIVE_MEDIA_ENABLED}/${GENERATIVE_MEDIA_MODE} max=${GENERATIVE_MEDIA_MAX_SEGMENTS}"

TRACK="cycle"

REGISTERED_SLUGS=($(python3 - <<'PY'
import os
import json
from pathlib import Path

posts = json.loads(Path("public/blog/posts.json").read_text())
for post in posts:
    slug = post.get("slug")
    if slug and (not os.environ.get("REEL_SLUG") or slug == os.environ["REEL_SLUG"]):
        print(slug)
PY
))

RENDERED=0
ATTEMPTED_RENDERS=0
FAILED=0
COMMITTED=()
FAILED_SLUGS=()

for SLUG in "${REGISTERED_SLUGS[@]}"; do
  SCRIPT_FILE="$BLOG_DIR/$SLUG/reel-script.md"
  [[ -f "$SCRIPT_FILE" ]] || continue
  if ! node video/scripts/approved-sources.mjs "$SLUG" >> "$LOG_FILE" 2>&1; then
    log "BLOCKED editorial source integrity: $SLUG"
    continue
  fi

  MP4="$VIDEO_DIR/out/$SLUG/$SLUG.mp4"
  META="$VIDEO_DIR/out/$SLUG/render-meta.json"
  MP4_SIZE=$(stat -f%z "$MP4" 2>/dev/null || echo 0)
  META_VOICE=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("voice", ""))' "$META" 2>/dev/null || true)
  if [[ "$MP4_SIZE" -gt 5242880 && "$META_VOICE" == "$VOICE" && ! "$SCRIPT_FILE" -nt "$MP4" ]]; then
    if (( MP4_SIZE >= 50000000 )); then
      log "Oversized existing render: running two-pass size correction for $SLUG (${MP4_SIZE} bytes)"
      if node "$VIDEO_DIR/scripts/fit-upload-size.mjs" --input="$MP4" >> "$LOG_FILE" 2>&1; then
        MP4_SIZE=$(stat -f%z "$MP4" 2>/dev/null || echo 0)
      else
        log "FAILED upload-size correction: $SLUG"
        FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
      fi
      if (( MP4_SIZE >= 50000000 )); then
        log "FAILED upload-size gate after correction: $SLUG is ${MP4_SIZE} bytes"
        FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
      fi
    fi
    if (cd "$VIDEO_DIR" && node scripts/release-reel.mjs --post="$SLUG" >> "$LOG_FILE" 2>&1); then
      log "Current render already has passing release QA: $SLUG"
      continue
    fi
    log "Current render is missing or stale release QA; reviewing its encoded frames: $SLUG"
    if python3 "$VIDEO_DIR/scripts/auto-visual-review.py" --slug="$SLUG" --model="${COIN_HISTORY_MODEL:-gemma3:4b}" >> "$LOG_FILE" 2>&1 \
      && (cd "$VIDEO_DIR" && node scripts/release-reel.mjs --post="$SLUG" >> "$LOG_FILE" 2>&1); then
      log "PASS existing render recovered through exact-file visual and release QA: $SLUG"
      continue
    fi
    log "FAILED existing render visual or release QA: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi

  if (( ATTEMPTED_RENDERS >= MAX_RENDERS_PER_RUN )); then
    log "Render budget reached ($MAX_RENDERS_PER_RUN); remaining stale reels will continue on the next run"
    break
  fi

  log "Validating: $SLUG"
  if ! (cd "$VIDEO_DIR" && node scripts/parse-script.mjs --post="$SLUG" >> "$LOG_FILE" 2>&1); then
    log "FAILED parse: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi

  # Repair only this parsed script before validation. Repairs are deterministic:
  # numeric cards without a matching figure become overlays, malformed question
  # cards receive a question mark, and prohibited dash punctuation is normalized.
  if ! (cd "$VIDEO_DIR" && node scripts/repair-reel-scripts.mjs --slug="$SLUG" >> "$LOG_FILE" 2>&1); then
    log "FAILED deterministic repair: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi

  if ! (cd "$VIDEO_DIR" && node scripts/validate-reel.mjs --script="out/$SLUG/script.json" >> "$LOG_FILE" 2>&1); then
    log "FAILED validation: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi
  if ! (cd "$VIDEO_DIR" && node scripts/preflight-narration-duration.mjs --script="out/$SLUG/script.json" >> "$LOG_FILE" 2>&1); then
    log "BLOCKED narration length before TTS: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi
  ATTEMPTED_RENDERS=$((ATTEMPTED_RENDERS + 1))

  PHOTO_DIR="$VIDEO_DIR/public/photos/$SLUG"
  mkdir -p "$PHOTO_DIR"
  [[ -f "$PHOTO_DIR/segment-0.jpg" ]] || cp "$BLOG_DIR/$SLUG/hero.jpg" "$PHOTO_DIR/segment-0.jpg" 2>/dev/null || true
  [[ -f "$PHOTO_DIR/segment-1.jpg" ]] || cp "$BLOG_DIR/$SLUG/images/pexels-0.jpg" "$PHOTO_DIR/segment-1.jpg" 2>/dev/null || true
  [[ -f "$PHOTO_DIR/segment-2.jpg" ]] || cp "$BLOG_DIR/$SLUG/images/pexels-1.jpg" "$PHOTO_DIR/segment-2.jpg" 2>/dev/null || true

  RECOVERY_ARGS=()
  if ! python3 scripts/tts-circuit.py check --voice="$VOICE" >> "$LOG_FILE"; then
    if [[ "${TTS_AUTO_RECOVERY:-0}" == "1" ]]; then
      log "TTS circuit held; run a bounded Chatterbox preflight and clear it only after decoded audio passes"
      RECOVERY_ARGS+=(--supervised-tts-recovery)
    else
      log "BLOCKED TTS: circuit held and unattended recovery is disabled"
      break
    fi
  fi
  log "Rendering: $SLUG voice=$VOICE track=$TRACK"
  ATTEMPT=0
  RENDER_EXIT=1
  while (( ATTEMPT < MAX_RETRIES )); do
    ATTEMPT=$((ATTEMPT + 1))
    ATTEMPT_LOG=$(mktemp "/tmp/fused-reel-${SLUG}-attempt-${ATTEMPT}.XXXXXX")
    ATTEMPT_STARTED=$(node -e 'process.stdout.write(String(Date.now()))')
    (cd "$VIDEO_DIR" && python3 "$PROJECT_DIR/scripts/run-with-timeout.py" "$RENDER_TIMEOUT_SECONDS" \
      node scripts/render.mjs --post="$SLUG" --music="$TRACK" --voice="$VOICE" "${RECOVERY_ARGS[@]}" > "$ATTEMPT_LOG" 2>&1)
    RENDER_EXIT=$?
    cat "$ATTEMPT_LOG" >> "$LOG_FILE"
    MP4_SIZE=$(stat -f%z "$MP4" 2>/dev/null || echo 0)
    [[ "$RENDER_EXIT" -eq 0 && "$MP4_SIZE" -gt 5242880 ]] && break
    LAST_STAGE=$(grep '^→ ' "$ATTEMPT_LOG" | tail -1)
    if grep -Eq 'Chatterbox.*failed|TTS_PREFLIGHT_FAILED|ERROR:.*segments failed TTS' "$ATTEMPT_LOG" || [[ "$RENDER_EXIT" -eq 124 && "$LAST_STAGE" == *generate-audio.mjs* ]]; then
      # Normal TTS failures are recorded by render.mjs; only an outer timeout
      # prevents that handler from recording the failure itself.
      if [[ "$RENDER_EXIT" -eq 124 ]]; then python3 scripts/tts-circuit.py failure --voice="$VOICE" >> "$LOG_FILE" || true; fi
      break
    fi
    log "Attempt $ATTEMPT failed for $SLUG (exit=$RENDER_EXIT size=$MP4_SIZE log=$ATTEMPT_LOG)"
    if (( ATTEMPT < MAX_RETRIES )); then
      (cd "$PROJECT_DIR" && node video/scripts/recover-media-timeout.mjs \
        --slug="$SLUG" --log="$ATTEMPT_LOG" --started="$ATTEMPT_STARTED") >> "$LOG_FILE" 2>&1 || true
    fi
    sleep 5
  done

  if [[ "$RENDER_EXIT" -ne 0 || "$MP4_SIZE" -le 5242880 ]]; then
    log "FAILED render: $SLUG after $MAX_RETRIES attempts"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi
  if [[ "$MP4_SIZE" -ge 50000000 ]]; then
    log "Oversized fresh render: running two-pass size correction for $SLUG (${MP4_SIZE} bytes)"
    if node "$VIDEO_DIR/scripts/fit-upload-size.mjs" --input="$MP4" >> "$LOG_FILE" 2>&1; then
      MP4_SIZE=$(stat -f%z "$MP4" 2>/dev/null || echo 0)
    else
      log "FAILED upload-size correction: $SLUG"
      FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
    fi
    if (( MP4_SIZE >= 50000000 )); then
      log "FAILED upload-size gate after correction: $SLUG is ${MP4_SIZE} bytes"
      FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
    fi
  fi

  if ! python3 "$VIDEO_DIR/scripts/auto-visual-review.py" --slug="$SLUG" --model="${COIN_HISTORY_MODEL:-gemma3:4b}" >> "$LOG_FILE" 2>&1; then
    log "FAILED automated encoded-frame visual QA: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi

  if ! (cd "$VIDEO_DIR" && node scripts/release-reel.mjs --post="$SLUG" >> "$LOG_FILE" 2>&1); then
    log "FAILED release gate: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi

  python3 scripts/tts-circuit.py success --voice="$VOICE" >> "$LOG_FILE"
  log "OK: $SLUG size=$((MP4_SIZE / 1048576))MB"
  RENDERED=$((RENDERED + 1))
  COMMITTED+=("$SLUG")
done

if (( ${#COMMITTED[@]} > 0 )) && [[ "${REEL_GIT_COMMIT:-0}" == "1" ]]; then
  COMMIT_PATHS=()
  for SLUG in "${COMMITTED[@]}"; do
    git add -f \
      "video/out/$SLUG/script.json" \
      "video/out/$SLUG/media.json" \
      "video/out/$SLUG/photos.json" \
      "video/out/$SLUG/media-manifest.json" \
      "video/out/$SLUG/render-meta.json" \
      "video/out/$SLUG/captions.json" \
      "video/out/$SLUG/captions-meta.json" \
      "video/out/$SLUG/audio-timing.json" \
      "video/out/$SLUG/release-qa.json" 2>/dev/null || true
    git add "public/blog/$SLUG/reel-script.md" "public/blog/$SLUG/reel-data.md" 2>/dev/null || true
    COMMIT_PATHS+=(
      "video/out/$SLUG/script.json"
      "video/out/$SLUG/media.json"
      "video/out/$SLUG/photos.json"
      "video/out/$SLUG/media-manifest.json"
      "video/out/$SLUG/render-meta.json"
      "video/out/$SLUG/captions.json"
      "video/out/$SLUG/captions-meta.json"
      "video/out/$SLUG/audio-timing.json"
      "video/out/$SLUG/release-qa.json"
      "public/blog/$SLUG/reel-script.md"
      "public/blog/$SLUG/reel-data.md"
    )
  done
  git commit -m "feat: render Chatterbox reels - ${(j:, :)COMMITTED}" -- "${COMMIT_PATHS[@]}" >> "$LOG_FILE" 2>&1 || log "No render metadata changes to commit"
  log "Committed render metadata locally. Hermes/Codex owner must review and push."
fi

log "Complete: rendered=$RENDERED failed=$FAILED"
if (( ${#FAILED_SLUGS[@]} > 0 )); then
  notify "render failed" "${#FAILED_SLUGS[@]} reel(s): ${(j:, :)FAILED_SLUGS}"
fi
