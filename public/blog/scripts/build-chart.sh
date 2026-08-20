#!/usr/bin/env bash
# build-chart.sh — numeric-visual brain stage. Selects an appropriate visual
# contract from sourced article data, then runs the deterministic validator and
# renderer (build-chart-inject.mjs).
#
# Brain selection: LOCAL_LLM in production. The legacy Claude branch is
# available only when explicitly re-enabled for historical compatibility.
# Either way, every value is validated against the post's own text by the
# injector — a hallucinated number causes the whole chart to be rejected,
# never published.
#
# Exit: 0 = chart injected or cleanly skipped (charts are enhancement, not gate)
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"
MODEL_TIMEOUT_SECONDS="${BLOG_CHART_MODEL_TIMEOUT_SECONDS:-180}"

SLUG="" BRAND="silver"
for a in "$@"; do case "$a" in
  --brand=*) BRAND="${a#--brand=}";; --*) ;; *) SLUG="$a";; esac; done
[[ -n "$SLUG" ]] || { echo "usage: build-chart.sh <slug> [--brand=]" >&2; exit 2; }
DIR="$BLOG_DIR/$SLUG"
[[ -f "$DIR/verified.md" ]] || { echo "[chart] skip: no verified.md" >&2; exit 0; }

# Already has a chart? Nothing to do.
if [[ -f "$DIR/chart.json" ]] && ! grep -q '"skipped": *true' "$DIR/chart.json" 2>/dev/null; then
  node "$SCRIPT_DIR/build-chart-inject.mjs" --slug="$SLUG"
  RC=$?
  if [[ $RC -eq 3 ]]; then
    cp "$DIR/chart.json" "$DIR/chart-rejected.json" 2>/dev/null || true
    python3 - "$DIR/chart.json" <<'PY'
import json
import sys
from datetime import datetime, timezone

path = sys.argv[1]
payload = {
    "schema_version": 2,
    "skipped": True,
    "skip_reason": "validator_rejected_numeric_visual",
    "rejected_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
}
with open(path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, indent=2)
    handle.write("\n")
PY
    exit 0
  fi
  [[ $RC -eq 0 ]] && exit 0 || exit $RC
fi

ARTICLE=$(cat "$DIR/verified.md")
RESEARCH=""
[[ -f "$DIR/research.json" ]] && RESEARCH=$(cat "$DIR/research.json")

PROMPT="You are selecting a numeric visual from a finished blog article. Do NOT invent, round, adjust, or combine numbers. Use only exact evidence from the article or research JSON.

Choose exactly one visual type:
- bar: 3-6 categories measuring the SAME metric, unit, period, and denominator.
- before_after: exactly 2 observations of the SAME metric and unit at two named periods.
- timeline: 3-6 observations of the SAME metric and unit with ISO dates in chronological order.
- stat_cards: 2-4 independently useful facts. Mixed metrics or units are allowed because card size never encodes numeric comparison.

Output ONLY valid JSON, no code fences or commentary. Use schema_version 2:
{\"schema_version\":2,\"visual_type\":\"bar|before_after|timeline|stat_cards\",\"title\":\"UNDER 90 CHARS\",\"takeaway\":\"ONE PLAIN-LANGUAGE SENTENCE\",\"source\":\"PUBLISHER OR DATASET\",\"source_url\":\"https://...\",\"data\":[{\"label\":\"MAX 42 CHARS\",\"value\":\"EXACT DISPLAY VALUE\",\"metric\":\"WHAT IS MEASURED\",\"unit\":\"%, USD/oz, Moz, count, etc.\",\"period\":\"DATE OR PERIOD\",\"evidence\":\"EXACT VERBATIM SOURCE SENTENCE CONTAINING THE VALUE\",\"date\":\"YYYY-MM-DD ONLY FOR TIMELINE\"}],\"hero_stat\":{\"value\":\"EXACT VALUE FROM ONE DATA ITEM\",\"label\":\"MAX 60 CHARS\"},\"narration\":\"2-3 sourced sentences.\"}

Hard rules:
- Every data[].value must occur in its data[].evidence, and that complete evidence string must occur verbatim in the article or research JSON.
- source_url must be a valid HTTPS URL from the article/research. Never emit prompt text, Markdown source syntax, a search URL, or a guessed homepage.
- Use bar only when shape length represents a valid like-for-like comparison. Never compare price change, inflation, yield, index movement, supply share, or RSI as bars in one visual.
- Use before_after for two price snapshots, timeline for one metric over 3+ dates, and stat_cards when facts are useful but not comparable.
- hero_stat must exactly match one data item.
- If no valid visual can be built, output exactly: {\"schema_version\":2,\"skipped\":true,\"skip_reason\":\"no sufficiently sourced numeric visual\"}

ARTICLE:
$ARTICLE

RESEARCH JSON (may be empty):
$RESEARCH"

RAW=""
USE_CLAUDE=0
if [[ "${HERMES_TAKEOVER:-0}" != "1" && "${CLAUDE_ENABLED:-1}" != "0" ]]; then
  if command -v claude >/dev/null 2>&1; then USE_CLAUDE=1; fi
fi

if [[ $USE_CLAUDE -eq 1 ]]; then
  echo "[chart] brain: claude" >&2
  RAW=$(printf '%s' "$PROMPT" | perl -e 'alarm 180; exec @ARGV or exit 127' claude -p "$(cat)" --allowedTools "" 2>/dev/null || true)
fi
if [[ -z "$RAW" || "$RAW" != *"{"* ]]; then
  if [[ -n "${LOCAL_LLM:-}" && -x "${LOCAL_LLM:-/nonexistent}" ]]; then
    echo "[chart] brain: local llm" >&2
    RAW=$(printf '%s' "$PROMPT" \
      | env HERMES_LOCAL_MAX_TOKENS=700 GEMMA_MAX_TOKENS=700 \
        perl -e 'alarm shift; exec @ARGV or exit 127' "$MODEL_TIMEOUT_SECONDS" "$LOCAL_LLM" \
        2>/dev/null || true)
  fi
fi
if [[ -z "$RAW" || "$RAW" != *"{"* ]]; then
  echo "[chart] skip: no brain output" >&2
  exit 0
fi

# Extract first {...} block, validate JSON, write chart.json
printf '%s' "$RAW" | python3 -c '
import json, sys, re
raw = sys.stdin.read()
raw = re.sub(r"^```[a-z]*|```$", "", raw.strip(), flags=re.M)
m = re.search(r"\{.*\}", raw, re.S)
if not m: sys.exit(1)
d = json.loads(m.group(0))
json.dump(d, open(sys.argv[1], "w"), indent=2)
' "$DIR/chart.json" || { echo "[chart] skip: brain output not valid JSON" >&2; exit 0; }

node "$SCRIPT_DIR/build-chart-inject.mjs" --slug="$SLUG"
RC=$?
if [[ $RC -eq 3 ]]; then
  if [[ -f "$DIR/chart.json" ]] && ! grep -q '"skipped": *true' "$DIR/chart.json" 2>/dev/null; then
    cp "$DIR/chart.json" "$DIR/chart-rejected.json" 2>/dev/null || true
    python3 - "$DIR/chart.json" <<'PY'
import json
import sys
from datetime import datetime, timezone

path = sys.argv[1]
payload = {
    "schema_version": 2,
    "skipped": True,
    "skip_reason": "validator_rejected_numeric_visual",
    "rejected_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
}
with open(path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, indent=2)
    handle.write("\n")
PY
  fi
  echo "[chart] skipped (validator or brain declined); preserved chart-rejected.json" >&2
  exit 0
fi
exit $RC
