#!/bin/zsh
set -euo pipefail
cd /Users/nick/projects/fuseddistribution
for slug in recording-accessibility-feedback-from-real-customers creating-a-small-business-exception-handling-log mapping-a-manual-business-process-before-automating-it; do
  node content/coin-history/production-2026-10-14/repair-backlog.mjs "$slug" > ".workflow-state/repair-$slug.log" 2>&1
  node content/coin-history/production-2026-10-14/review-repaired.mjs "$slug"
done
