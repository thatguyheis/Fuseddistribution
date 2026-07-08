#!/usr/bin/env bash
# T1 research — Claude brain stage. Finds sourced stats for a keyword via web
# search, writes research.json. Scoped claude -p call with web tools.
# Schema: { slug, keyword, angle, secondary_kw:[], stats:[{claim,value,source_url,source_name}] }
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"

SLUG="" KEYWORD="" GAP="" OUT=""
for a in "$@"; do case "$a" in
  --keyword=*) KEYWORD="${a#--keyword=}";; --gap=*) GAP="${a#--gap=}";; --out=*) OUT="${a#--out=}";;
  --*) echo "unknown flag $a">&2; exit 2;; *) SLUG="$a";; esac; done
[[ -n "$SLUG" ]] || { echo "usage: research.sh <slug> [--keyword= --gap= --out=]">&2; exit 2; }
KEYWORD="${KEYWORD:-$(echo "$SLUG" | tr '-' ' ')}"
OUT="${OUT:-$BLOG_DIR/$SLUG/research.json}"
mkdir -p "$(dirname "$OUT")"

# Fetch live spot price for silver posts
SPOT_CONTEXT=""
if echo "$SLUG $KEYWORD" | grep -qiE "silver|gold|precious|bullion|spot|metal|coin|stacking|stack|numismatic|junk silver|oz|ounce"; then
  SPOT_RAW=$(curl -s --max-time 10 "https://fuseddistribution.com/api/spot" 2>/dev/null || true)
  if [[ -n "$SPOT_RAW" ]]; then
    TODAY_DATE=$(date +%Y-%m-%d)
    SILVER_P=$(echo "$SPOT_RAW" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"{d['silver']:.2f}\")" 2>/dev/null || true)
    GOLD_P=$(echo "$SPOT_RAW" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"{d['gold']:.2f}\")" 2>/dev/null || true)
    if [[ -n "$SILVER_P" ]]; then
      SPOT_CONTEXT="LIVE SPOT PRICES as of $TODAY_DATE: Silver = \$$SILVER_P/oz | Gold = \$$GOLD_P/oz
When mentioning current silver price, use \$$SILVER_P/oz and cite '$TODAY_DATE' as the date. Do not use assumed or rounded prices."
    fi
  fi
fi

PROMPT="Research current, sourced statistics for a blog post.
Keyword: \"$KEYWORD\"
Competitor gap to cover: ${GAP:-none specified}
${SPOT_CONTEXT:+
$SPOT_CONTEXT
}
Use web search to find 4-6 specific, recent (2025-2026) statistics with real source URLs.
At least 3 of the stats must be COMPARABLE and SAME-UNIT (all percentages, or all dollar amounts) so a bar chart can be built from them downstream.
Output ONLY valid JSON (no code fences, no commentary) in exactly this shape:
{\"slug\":\"$SLUG\",\"keyword\":\"$KEYWORD\",\"angle\":\"one sentence\",\"secondary_kw\":[\"\",\"\"],\"stats\":[{\"claim\":\"\",\"value\":\"42%\",\"source_url\":\"https://...\",\"source_name\":\"\"}]}"

DEBUG="$BLOG_DIR/$SLUG/.research-claude.log"
: > "$DEBUG"
# Retry transient empty/no-JSON claude output. Capture stderr for diagnosis.
RAW=""; i=0
while (( i < 3 )); do
  i=$((i+1))
  RAW=$(printf '%s' "$PROMPT" | claude -p "$(cat)" --allowedTools "WebSearch,WebFetch" 2>>"$DEBUG" || true)
  printf '%s' "$RAW" | grep -q '{' && break
  echo "[research] attempt $i/3: empty or no-JSON claude output" >> "$DEBUG"
  (( i < 3 )) && sleep $(( i * 5 ))
done

# strip code fences if any, extract first {...} block, validate JSON
echo "$RAW" | python3 -c '
import json,sys,re
raw=sys.stdin.read()
raw=re.sub(r"^```[a-z]*|```$","",raw.strip(),flags=re.M)
m=re.search(r"\{.*\}", raw, re.S)
if not m: sys.exit("research: no JSON in claude output")
d=json.loads(m.group(0))
assert "stats" in d, "no stats key"
json.dump(d, open(sys.argv[1],"w"), indent=2)
n=len(d.get("stats",[]))
print("[research] wrote %s (%d stats)" % (sys.argv[1], n))
' "$OUT"
