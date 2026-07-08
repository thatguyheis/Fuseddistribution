#!/usr/bin/env bash
# build-chart.sh — chart brain stage. Extracts 3-6 comparable sourced stats
# from the finished article and writes chart.json, then runs the deterministic
# validator/injector (build-chart-inject.mjs).
#
# Brain selection: claude when reachable and enabled, otherwise LOCAL_LLM.
# Either way, every value is validated against the post's own text by the
# injector — a hallucinated number causes the whole chart to be rejected,
# never published.
#
# Exit: 0 = chart injected or cleanly skipped (charts are enhancement, not gate)
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"

SLUG="" BRAND="silver"
for a in "$@"; do case "$a" in
  --brand=*) BRAND="${a#--brand=}";; --*) ;; *) SLUG="$a";; esac; done
[[ -n "$SLUG" ]] || { echo "usage: build-chart.sh <slug> [--brand=]" >&2; exit 2; }
DIR="$BLOG_DIR/$SLUG"
[[ -f "$DIR/verified.md" ]] || { echo "[chart] skip: no verified.md" >&2; exit 0; }

# Already has a chart? Nothing to do.
if [[ -f "$DIR/chart.json" ]] && ! grep -q '"skipped": *true' "$DIR/chart.json" 2>/dev/null; then
  node "$SCRIPT_DIR/build-chart-inject.mjs" --slug="$SLUG"
  RC=$?; [[ $RC -eq 0 || $RC -eq 3 ]] && exit 0 || exit $RC
fi

ARTICLE=$(cat "$DIR/verified.md")
RESEARCH=""
[[ -f "$DIR/research.json" ]] && RESEARCH=$(cat "$DIR/research.json")

PROMPT="You are extracting chart data from a finished blog article. Do NOT invent, round, or adjust any number — only use numbers that appear verbatim in the article or research JSON below.

Task: find 3-6 COMPARABLE numeric stats (same unit: all %, all \$, or all plain numbers) that would make a useful horizontal bar chart for this article. Prefer stats with a named source.

Output ONLY valid JSON, no code fences, no commentary, exactly this shape:
{\"title\":\"CHART TITLE UNDER 90 CHARS\",\"source\":\"Source Name (Year)\",\"bars\":[{\"label\":\"Short Label Max 42 Chars\",\"value\":\"92%\"}],\"hero_stat\":{\"value\":\"92%\",\"label\":\"short on-topic label max 60 chars\"},\"narration\":\"2-3 sentences describing what the chart shows, for a video voiceover. Only facts from the article.\"}

Rules:
- bars[].value must be copied character-for-character from the article/research (e.g. \"~\$6.00\", \"92%\", \"150\").
- hero_stat must be THE single most compelling on-topic stat from THIS article (it goes on the hero image).
- If the article has fewer than 3 comparable sourced numbers, output exactly: {\"skipped\":true,\"skip_reason\":\"no comparable sourced stats\"}

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
    RAW=$(printf '%s' "$PROMPT" | HERMES_LOCAL_MAX_TOKENS=700 GEMMA_MAX_TOKENS=700 "$LOCAL_LLM" 2>/dev/null || true)
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
  echo "[chart] skipped (validator or brain declined)" >&2
  exit 0
fi
exit $RC
