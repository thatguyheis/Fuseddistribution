#!/bin/zsh
set -euo pipefail
cd /Users/nick/projects/fuseddistribution
slug="$1"
case "$slug" in pittman-act-silver-dollar-melting|peace-dollar-history-and-symbolism) ;; *) exit 2 ;; esac
WHISPER_RUNTIME_CONFIG="content/coin-history/$slug/whisper-runtime.json" node video/scripts/render.mjs --post="$slug" --music=cycle --quality=presentation
python3 content/coin-history/production-2026-10-14/master.py "$slug"
node content/coin-history/production-2026-10-14/inspect-render.mjs "$slug"
