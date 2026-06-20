#!/usr/bin/env bash
# T12 qa-gate — Claude brain stage. Final judgment on the two human-facing
# artifacts (index.html + social-copy.json). Writes qa.json.
# Schema: { slug, score, pass, blockers:[] }   pass=false -> skip publish.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"

SLUG="" HTML="" SOCIAL="" OUT=""
for a in "$@"; do case "$a" in
  --html=*) HTML="${a#--html=}";; --social=*) SOCIAL="${a#--social=}";; --out=*) OUT="${a#--out=}";;
  --*) echo "unknown flag $a">&2; exit 2;; *) SLUG="$a";; esac; done
[[ -n "$SLUG" ]] || { echo "usage: qa-gate.sh <slug>">&2; exit 2; }
HTML="${HTML:-$BLOG_DIR/$SLUG/index.html}"
SOCIAL="${SOCIAL:-$BLOG_DIR/$SLUG/social-copy.json}"
OUT="${OUT:-$BLOG_DIR/$SLUG/qa.json}"
[[ -f "$HTML" ]] || { echo "error: no html $HTML">&2; exit 2; }

PROMPT="You are the final QA gate for a blog post. Judge ONLY these two artifacts.
Score 0-100 on: writing quality, no AI buzzwords/em dashes, answer-first intro, complete meta/schema, caption quality.
pass = score >= 85 AND no critical blocker (broken/empty content, leftover [SLOT]/[VERIFY] in body, em dash).
Output ONLY valid JSON (no fences, no commentary): {\"slug\":\"$SLUG\",\"score\":0,\"pass\":true,\"blockers\":[]}

--- index.html ---
$(cat "$HTML")

--- social-copy.json ---
$( [[ -f "$SOCIAL" ]] && cat "$SOCIAL" || echo '{}' )"

run_claude() { claude -p "$(cat)" --allowedTools "" 2>/dev/null; }
RAW=$(echo "$PROMPT" | run_claude || true)
echo "$RAW" | python3 -c '
import json,sys,re
raw=re.sub(r"^```[a-z]*|```$","",sys.stdin.read().strip(),flags=re.M)
m=re.search(r"\{.*\}", raw, re.S)
if not m: sys.exit("qa: no JSON in claude output")
d=json.loads(m.group(0))
json.dump(d, open(sys.argv[1],"w"), indent=2)
print("[qa] score=%s pass=%s blockers=%s" % (d.get("score"), d.get("pass"), d.get("blockers")))
sys.exit(0 if d.get("pass") else 1)
' "$OUT"
