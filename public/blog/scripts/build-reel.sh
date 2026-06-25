#!/usr/bin/env bash
# Build reel-data.md and reel-script.md deterministically from a verified article.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$SCRIPT_DIR/build-reel.py" "$@"
