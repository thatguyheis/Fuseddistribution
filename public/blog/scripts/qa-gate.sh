#!/usr/bin/env bash
# T12 qa-gate — brain stage. In Hermes takeover mode this uses the configured
# local LLM helper. Codex owns final operational review; the legacy Claude
# branch is disabled by default.
# Writes qa.json.
# Schema: { slug, score, pass, blockers:[] }   pass=false -> skip publish.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"

PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOCAL_LLM="${LOCAL_LLM:-$PROJECT_ROOT/scripts/ollama-local-no-think.sh}"
HERMES_TAKEOVER="${HERMES_TAKEOVER:-1}"
CLAUDE_ENABLED="${CLAUDE_ENABLED:-0}"

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

SOURCE_FACTS=""
CLAIM_MAP="$PROJECT_ROOT/content/coin-history/$SLUG/claim-map.json"
if [[ -f "$CLAIM_MAP" ]]; then
  SOURCE_FACTS="$(python3 - "$CLAIM_MAP" <<'PY'
import json, sys
for claim in json.load(open(sys.argv[1])).get('claims', []):
    print(f"- {claim.get('id')}: {claim.get('claim')}")
PY
)"
fi

ARTICLE_TEXT="$(head -c "${HERMES_LOCAL_QA_ARTICLE_CHARS:-4500}" "$ARTICLE" 2>/dev/null || true)"
SOCIAL_TEXT="$(head -c "${HERMES_LOCAL_QA_SOCIAL_CHARS:-3200}" "$SOCIAL" 2>/dev/null || echo '{}')"
if [[ -f "$PROJECT_ROOT/content/coin-history/$SLUG/narration-v1-approved.txt" ]]; then
  REEL_TEXT="$(head -c "${HERMES_LOCAL_QA_REEL_CHARS:-2600}" "$PROJECT_ROOT/content/coin-history/$SLUG/narration-v1-approved.txt")"
else
  REEL_TEXT="$(cat "$REEL" 2>/dev/null | head -c "${HERMES_LOCAL_QA_REEL_CHARS:-2600}" || true)"
fi
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

Score 0-100 on: title/body topic coherence, useful answer-first writing, factual/numeric sanity against the approved source fact ledger below, no AI filler, no em dashes, complete metadata/schema, caption quality, and reel script coherence.
For coin-history episodes, the reel text supplied below is the hash-approved narration and must remain unchanged. Judge that narration for a clear hook, topic fit and coherent sequence; do not fail it for not repeating every blog section or for wording that differs from the blog.
Block publish for malformed years/numbers, placeholders, broken JSON, thin generic copy, title/body mismatch, repeated sections, off-topic reel segments, or awkward/truncated reel labels.
Topic coherence is a critical gate: the article must answer the exact reader problem promised by the title/slug. Mark each H2 mentally as on-topic, supporting, or drift. If fewer than half are on-topic, or if the body mainly answers another query, fail. Clean grammar and complete metadata cannot compensate for drift.
Repetition is a critical gate: fail if the same 3-5 talking points are repeated under different H2s instead of adding new information.
Treat literal bracketed placeholders such as [YEAR], [VERIFY], or [SLOT] as placeholders. Real dates, years and quantities stated in the source ledger are valid facts, not placeholders. If a factual statement is not supported by the ledger or another supplied approved source, list the exact unsupported statement as a blocker. Do not flag a supported fact as a placeholder.
pass = score >= 85 AND no critical blocker (broken/empty content, unsupported facts, title/body drift, repeated sections, leftover instruction placeholders in body, em dash).
Output ONLY valid JSON (no fences, no commentary): {\"slug\":\"$SLUG\",\"score\":0,\"pass\":true,\"blockers\":[]}

--- article markdown ---
$ARTICLE_TEXT

--- html head ---
$HTML_HEAD

--- social-copy.json ---
$SOCIAL_TEXT

--- reel-script.md ---
$REEL_TEXT

--- approved source fact ledger ---
$SOURCE_FACTS"

DEBUG="$BLOG_DIR/$SLUG/.qa-brain.log"
: > "$DEBUG"
run_brain_once() {
  if [[ "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" ]]; then
    [[ -x "$LOCAL_LLM" ]] || { echo "qa: local LLM helper missing: $LOCAL_LLM" >&2; return 127; }
    # gemma3:4b on this machine evals ~40 tok/s; the full QA prompt is ~3.5k
    # tokens, so a single attempt needs ~150s. 30s/75s caps guaranteed outage.
    HERMES_LOCAL_MAX_TOKENS="${HERMES_LOCAL_QA_MAX_TOKENS:-220}" \
      HERMES_LOCAL_TIMEOUT="${HERMES_LOCAL_QA_TIMEOUT:-240}" \
      perl -e 'alarm shift; exec @ARGV or exit 127' "${HERMES_LOCAL_QA_WALL_TIMEOUT:-520}" "$LOCAL_LLM" "$PROMPT"
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
import hashlib, json, os, pathlib, sys, re
raw=re.sub(r"^```[a-z]*|```$","",sys.stdin.read().strip(),flags=re.M)
m=re.search(r"\{.*\}", raw, re.S)
if not m: sys.exit("qa: no JSON in claude output")
d=json.loads(m.group(0))
score = int(d.get("score") or 0)
blockers = d.get("blockers", [])
if not isinstance(blockers, list): blockers = ["invalid QA blockers schema"]
d["blockers"] = [str(value).strip() for value in blockers if str(value).strip()]
d["pass"] = bool(d.get("pass")) and score >= 85 and not d["blockers"]
if not d["pass"] and not d["blockers"]:
    d["blockers"] = ["model verdict failed or score below 85"]
out=pathlib.Path(sys.argv[1])
root=pathlib.Path(sys.argv[2])
slug=sys.argv[3]
post=root/"public/blog"/slug
if (post/"pipeline-marker.json").exists() and d["pass"]:
    artifacts=["verified.md","index.html","meta.json","research.json","hero.jpg","photo-post.jpg",
               "reel-script.md","reel-script-approved.md","reel-data.md","social-copy.json",
               "production-inputs.json","image-sources.json","content-plan.json","pipeline-marker.json"]
    if (post/"preferred-media.json").is_file(): artifacts.append("preferred-media.json")
    hashes={}
    for name in artifacts:
        path=post/name
        if not path.is_file(): sys.exit(f"qa: cannot approve missing artifact {name}")
        hashes[name]=hashlib.sha256(path.read_bytes()).hexdigest()
    work=root/"content/coin-history"/slug
    for name in ["narration-v1-approved.txt","script-approval.json","claim-map.json"]:
        path=work/name
        if not path.is_file(): sys.exit(f"qa: cannot approve missing source evidence {path}")
        hashes[f"content/coin-history/{slug}/{name}"]=hashlib.sha256(path.read_bytes()).hexdigest()
    d["mode"]="coin-history-automated"
    d["automaticApproval"]={"policy":"coin-history-auto-v1","model":os.environ.get("HERMES_LOCAL_MODEL","gemma3:4b"),
                             "qualityThreshold":85,"transcriptHashVerified":True}
    d["artifactSha256"]=hashes
json.dump(d, open(out,"w"), indent=2)
print("[qa] score=%s pass=%s blockers=%s" % (d.get("score"), d.get("pass"), d.get("blockers")))
sys.exit(0 if d.get("pass") else 1)
' "$OUT" "$PROJECT_ROOT" "$SLUG"
