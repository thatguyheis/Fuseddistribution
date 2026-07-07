#!/usr/bin/env bash
# T12 qa-gate — brain stage. In Hermes takeover mode this uses the configured
# local LLM helper; otherwise it can use Claude when explicitly enabled.
# Writes qa.json.
# Schema: { slug, score, pass, blockers:[] }   pass=false -> skip publish.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"

LOCAL_LLM="${LOCAL_LLM:-$HOME/bin/hermes-local.sh}"
HERMES_TAKEOVER="${HERMES_TAKEOVER:-0}"
CLAUDE_ENABLED="${CLAUDE_ENABLED:-1}"

SLUG="" HTML="" SOCIAL="" OUT="" ARTICLE="" REEL=""
for a in "$@"; do case "$a" in
  --html=*) HTML="${a#--html=}";; --social=*) SOCIAL="${a#--social=}";; --out=*) OUT="${a#--out=}";;
  --article=*) ARTICLE="${a#--article=}";; --reel=*) REEL="${a#--reel=}";;
  --*) echo "unknown flag $a">&2; exit 2;; *) SLUG="$a";; esac; done
[[ -n "$SLUG" ]] || { echo "usage: qa-gate.sh <slug>">&2; exit 2; }
HTML="${HTML:-$BLOG_DIR/$SLUG/index.html}"
SOCIAL="${SOCIAL:-$BLOG_DIR/$SLUG/social-copy.json}"
OUT="${OUT:-$BLOG_DIR/$SLUG/qa.json}"
ARTICLE="${ARTICLE:-$BLOG_DIR/$SLUG/verified.md}"
REEL="${REEL:-$BLOG_DIR/$SLUG/reel-script.md}"
[[ -f "$HTML" ]] || { echo "error: no html $HTML">&2; exit 2; }

ARTICLE_TEXT="$(head -c "${HERMES_LOCAL_QA_ARTICLE_CHARS:-4500}" "$ARTICLE" 2>/dev/null || true)"
SOCIAL_TEXT="$(head -c "${HERMES_LOCAL_QA_SOCIAL_CHARS:-3200}" "$SOCIAL" 2>/dev/null || echo '{}')"
REEL_TEXT="$(grep -E '^## (HOOK|STAT|OVERLAY|QUESTION)|^Text:|^Subtext:' "$REEL" 2>/dev/null | head -c "${HERMES_LOCAL_QA_REEL_CHARS:-2600}" || true)"
ARTICLE_TITLE="$(python3 - "$HTML" <<'PY' 2>/dev/null || true
from pathlib import Path
import html as html_mod
import re, sys
text = Path(sys.argv[1]).read_text(errors="ignore")
for pattern in (r"<h1\b[^>]*>(.*?)</h1>", r"<title\b[^>]*>(.*?)</title>"):
    m = re.search(pattern, text, re.S | re.I)
    if m:
        title = re.sub(r"<[^>]+>", " ", m.group(1))
        title = html_mod.unescape(re.sub(r"\s+", " ", title)).strip()
        title = re.sub(r"\s*\|\s*Fused.*$", "", title).strip()
        print(title)
        break
PY
)"
HTML_HEAD="$(python3 - "$HTML" <<'PY' 2>/dev/null || true
from pathlib import Path
import re, sys
html = Path(sys.argv[1]).read_text(errors="ignore")
head = re.search(r"<head\b[^>]*>(.*?)</head>", html, re.S | re.I)
print((head.group(1) if head else html[:4000])[:4000])
PY
)"

PROMPT="You are the final QA gate for a production blog-to-reel workflow. Judge these artifacts together.
Title promise: $ARTICLE_TITLE
Slug: $SLUG

Score 0-100 on: title/body topic coherence, useful answer-first writing, factual/numeric sanity, no AI filler, no em dashes, complete metadata/schema, caption quality, and reel script coherence.
Block publish for malformed years/numbers, placeholders, broken JSON, thin generic copy, title/body mismatch, repeated sections, off-topic reel segments, or awkward/truncated reel labels.
Topic coherence is a critical gate: the article must answer the exact reader problem promised by the title/slug. Mark each H2 mentally as on-topic, supporting, or drift. If fewer than half are on-topic, or if the body mainly answers another query, fail. Clean grammar and complete metadata cannot compensate for drift.
Repetition is a critical gate: fail if the same 3-5 talking points are repeated under different H2s instead of adding new information.
pass = score >= 85 AND no critical blocker (broken/empty content, title/body drift, repeated sections, leftover [SLOT]/[VERIFY] in body, em dash).
Output ONLY valid JSON (no fences, no commentary): {\"slug\":\"$SLUG\",\"score\":0,\"pass\":true,\"blockers\":[]}

--- article markdown ---
$ARTICLE_TEXT

--- html head ---
$HTML_HEAD

--- social-copy.json ---
$SOCIAL_TEXT

--- reel-script.md ---
$REEL_TEXT"

DEBUG="$BLOG_DIR/$SLUG/.qa-brain.log"
: > "$DEBUG"
run_brain_once() {
  if [[ "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" ]]; then
    [[ -x "$LOCAL_LLM" ]] || { echo "qa: local LLM helper missing: $LOCAL_LLM" >&2; return 127; }
    HERMES_LOCAL_MAX_TOKENS="${HERMES_LOCAL_QA_MAX_TOKENS:-220}" \
      HERMES_LOCAL_TIMEOUT="${HERMES_LOCAL_QA_TIMEOUT:-30}" \
      perl -e 'alarm shift; exec @ARGV or exit 127' "${HERMES_LOCAL_QA_WALL_TIMEOUT:-75}" "$LOCAL_LLM" "$PROMPT"
  else
    claude -p "$PROMPT" --allowedTools ""
  fi
}

# Retry transient empty/no-JSON brain output. Capture stderr.
run_brain_retry() {
  local tries="${1:-3}" raw="" i=0
  while (( i < tries )); do
    i=$((i+1))
    raw=$(run_brain_once 2>>"$DEBUG")
    if printf '%s' "$raw" | grep -q '{'; then printf '%s' "$raw"; return 0; fi
    echo "[qa-gate] attempt $i/$tries: empty or no-JSON brain output" >> "$DEBUG"
    (( i < tries )) && sleep $(( i * 5 ))
  done
  printf '%s' "$raw"; return 1
}
TRIES=3
if [[ "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" ]]; then TRIES=1; fi
RAW=$(run_brain_retry "$TRIES" || true)
# Distinguish brain-stage outage (could not judge) from a real quality verdict.
if ! printf '%s' "$RAW" | grep -q '{'; then
  echo "qa: brain produced no JSON after retries — brain-stage outage, NOT a quality verdict. See $DEBUG" >&2
  exit 3
fi
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
