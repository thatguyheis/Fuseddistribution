#!/bin/zsh
set -euo pipefail
cd /Users/nick/projects/fuseddistribution
slug=mapping-a-manual-business-process-before-automating-it
node video/scripts/release-reel.mjs --post="$slug" > .workflow-state/mapping-repaired-release.log 2>&1
node -e 'const q=require("./video/out/mapping-a-manual-business-process-before-automating-it/release-qa.json");if(!q.readyForPosting)process.exit(1)'
node public/blog/scripts/prepare-buffer-youtube-media.mjs --slugs="$slug" > .workflow-state/mapping-repaired-delivery.log 2>&1
node public/blog/scripts/prepare-buffer-x-media.mjs --slugs="$slug" >> .workflow-state/mapping-repaired-delivery.log 2>&1
node public/blog/scripts/sync-buffer-media-kv.mjs --slugs="$slug" > .workflow-state/mapping-repaired-host.log 2>&1
node content/coin-history/production-2026-10-14/verify-hosted.mjs "$slug"
BUFFER_ALLOW_FUTURE_DAYS=1 BUFFER_RECOVERY_BATCH=9 node scripts/buffer-backlog-runner.mjs > .workflow-state/coin-pair-buffer-final-refill.log 2>&1
