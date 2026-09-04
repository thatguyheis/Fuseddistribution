#!/bin/zsh
# Render registered blog reels at 11 AM without consuming Claude quota.
set -u

PROJECT_DIR="/Users/nick/projects/fuseddistribution"
VIDEO_DIR="$PROJECT_DIR/video"
BLOG_DIR="$PROJECT_DIR/public/blog"
LOG_FILE="${REEL_LOG_FILE:-/tmp/fuseddistribution-render-missing-reels.log}"
MAX_RETRIES="${MAX_RETRIES:-2}"
MAX_RENDERS_PER_RUN="${MAX_RENDERS_PER_RUN:-4}"
RENDER_TIMEOUT_SECONDS="${RENDER_TIMEOUT_SECONDS:-2100}"
export CHATTERBOX_BATCH_TIMEOUT_MS="${CHATTERBOX_BATCH_TIMEOUT_MS:-1800000}"
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
export GENERATIVE_MEDIA_TIMEOUT_MS="${GENERATIVE_MEDIA_TIMEOUT_MS:-240000}"

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Users/nick/.local/bin"

notify() { osascript -e "display notification \"$2\" with title \"Reel pipeline: $1\"" 2>/dev/null || true }
log() { echo "[$(date +%T)] $*" >> "$LOG_FILE"; }

# Prevent a calendar launch and a manual recovery launch from rendering the
# same backlog at once. mkdir is atomic on macOS.
SCHEDULER_LOCK="/tmp/fused-reel-scheduler.lock"
if ! mkdir "$SCHEDULER_LOCK" 2>/dev/null; then
  log "Another reel scheduler is active; skipping this run"
  exit 0
fi
echo "$$" > "$SCHEDULER_LOCK/pid"
cleanup_scheduler_lock() {
  rm -f "$SCHEDULER_LOCK/pid"
  rmdir "$SCHEDULER_LOCK" 2>/dev/null || true
}
trap cleanup_scheduler_lock EXIT

# launchd can overlap a manually kicked run with a calendar-triggered run.
# mkdir is atomic on macOS, so only one scheduler may own the backlog at a time.
SCHEDULER_LOCK="/tmp/fused-reel-scheduler.lock"
if ! mkdir "$SCHEDULER_LOCK" 2>/dev/null; then
  log "Another reel scheduler is active; skipping this run"
  exit 0
fi
echo "$$" > "$SCHEDULER_LOCK/pid"
cleanup_scheduler_lock() {
  rm -f "$SCHEDULER_LOCK/pid"
  rmdir "$SCHEDULER_LOCK" 2>/dev/null || true
}
trap cleanup_scheduler_lock EXIT

echo "\n=== $(date) ===" >> "$LOG_FILE"
if [[ -d "$GLOBAL_RENDER_LOCK" ]]; then
  log "Another Remotion render is active; skipping this scheduled run"
  exit 0
fi
ulimit -n 65536 2>/dev/null || true
cd "$PROJECT_DIR" || exit 1

if [[ -f "$VIDEO_DIR/.env" ]]; then
  set -o allexport
  source "$VIDEO_DIR/.env"
  set +o allexport
fi
log "Media env: PEXELS_API_KEY=$([[ -n "${PEXELS_API_KEY:-}" ]] && echo set || echo unset) PIXABAY_API_KEY=$([[ -n "${PIXABAY_API_KEY:-}" ]] && echo set || echo unset) GENERATIVE_MEDIA=${GENERATIVE_MEDIA_ENABLED}/${GENERATIVE_MEDIA_MODE} max=${GENERATIVE_MEDIA_MAX_SEGMENTS}"

pkill -f "chrome-headless-shell" 2>/dev/null || true
find "$VIDEO_DIR/public/audio" -name "*_tmp.wav" -delete 2>/dev/null || true
TRACK="cycle"

REGISTERED_SLUGS=($(python3 - <<'PY'
import json
from pathlib import Path

posts = json.loads(Path("public/blog/posts.json").read_text())
for post in posts:
    slug = post.get("slug")
    if slug:
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

  MP4="$VIDEO_DIR/out/$SLUG/$SLUG.mp4"
  META="$VIDEO_DIR/out/$SLUG/render-meta.json"
  MP4_SIZE=$(stat -f%z "$MP4" 2>/dev/null || echo 0)
  META_VOICE=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("voice", ""))' "$META" 2>/dev/null || true)
  if [[ "$MP4_SIZE" -gt 5242880 && "$META_VOICE" == "$VOICE" && ! "$SCRIPT_FILE" -nt "$MP4" ]]; then
    continue
  fi

  log "Validating: $SLUG"
  if ! (cd "$VIDEO_DIR" && node scripts/parse-script.mjs --post="$SLUG" >> "$LOG_FILE" 2>&1); then
    log "FAILED parse: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi

  # Deterministic repair is limited to the active slug. It preserves Markdown
  # structure, converts malformed numeric cards to overlays, and repairs
  # truncated question cards before validation.
  if ! (cd "$VIDEO_DIR" && node scripts/repair-reel-scripts.mjs --slug="$SLUG" >> "$LOG_FILE" 2>&1); then
    log "FAILED deterministic repair: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi

  # Repair only this parsed script before validation. Repairs are deterministic:
  # numeric cards without a matching figure become overlays, malformed question
  # cards receive a question mark, and prohibited dash punctuation is normalized.
  if ! (cd "$VIDEO_DIR" && node scripts/repair-reel-scripts.mjs --slug="$SLUG" >> "$LOG_FILE" 2>&1); then
    log "FAILED deterministic repair: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi

  if (( ATTEMPTED_RENDERS >= MAX_RENDERS_PER_RUN )); then
    log "Render budget reached ($MAX_RENDERS_PER_RUN); remaining stale reels will continue tomorrow"
    break
  fi
  if ! (cd "$VIDEO_DIR" && node scripts/validate-reel.mjs --script="out/$SLUG/script.json" >> "$LOG_FILE" 2>&1); then
    log "FAILED validation: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi
  ATTEMPTED_RENDERS=$((ATTEMPTED_RENDERS + 1))

  PHOTO_DIR="$VIDEO_DIR/public/photos/$SLUG"
  mkdir -p "$PHOTO_DIR"
  [[ -f "$PHOTO_DIR/segment-0.jpg" ]] || cp "$BLOG_DIR/$SLUG/hero.jpg" "$PHOTO_DIR/segment-0.jpg" 2>/dev/null || true
  [[ -f "$PHOTO_DIR/segment-1.jpg" ]] || cp "$BLOG_DIR/$SLUG/images/pexels-0.jpg" "$PHOTO_DIR/segment-1.jpg" 2>/dev/null || true
  [[ -f "$PHOTO_DIR/segment-2.jpg" ]] || cp "$BLOG_DIR/$SLUG/images/pexels-1.jpg" "$PHOTO_DIR/segment-2.jpg" 2>/dev/null || true

  log "Rendering: $SLUG voice=$VOICE track=$TRACK"
  ATTEMPT=0
  RENDER_EXIT=1
  while (( ATTEMPT < MAX_RETRIES )); do
    ATTEMPT=$((ATTEMPT + 1))
    pkill -f "chrome-headless-shell" 2>/dev/null || true
    (cd "$VIDEO_DIR" && python3 "$PROJECT_DIR/scripts/run-with-timeout.py" "$RENDER_TIMEOUT_SECONDS" \
      node scripts/render.mjs --post="$SLUG" --music="$TRACK" --voice="$VOICE" >> "$LOG_FILE" 2>&1)
    RENDER_EXIT=$?
    MP4_SIZE=$(stat -f%z "$MP4" 2>/dev/null || echo 0)
    [[ "$RENDER_EXIT" -eq 0 && "$MP4_SIZE" -gt 5242880 ]] && break
    log "Attempt $ATTEMPT failed for $SLUG (exit=$RENDER_EXIT size=$MP4_SIZE)"
    sleep 5
  done

  if [[ "$RENDER_EXIT" -ne 0 || "$MP4_SIZE" -le 5242880 ]]; then
    log "FAILED render: $SLUG after $MAX_RETRIES attempts"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi

  if ! (cd "$VIDEO_DIR" && node scripts/release-reel.mjs --post="$SLUG" >> "$LOG_FILE" 2>&1); then
    log "FAILED release gate: $SLUG"
    FAILED=$((FAILED + 1)); FAILED_SLUGS+=("$SLUG"); continue
  fi

  log "OK: $SLUG size=$((MP4_SIZE / 1048576))MB"
  RENDERED=$((RENDERED + 1))
  COMMITTED+=("$SLUG")
done

if (( ${#COMMITTED[@]} > 0 )); then
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
