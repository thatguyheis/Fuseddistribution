#!/usr/bin/env bash
# Orchestrator — runs the decoupled per-slug pipeline. File -> file, each stage a
# separate process. Hermes/local LLM owns the normal path; Claude is optional
# only when Hermes takeover is disabled and Claude is explicitly enabled.
# Replaces the monolith claude call in daily-blog-reel.sh.
#
# Usage: build-post.sh <slug> --brand=silver|tech [--keyword="..."] [--gap="..."]
#                              [--degraded]   # skip all claude stages
#
# Requires: gemma_draft.md present (from nightly local draft) OR --keyword to draft.
# Stages: T1 research -> T5 polish -> meta -> T6 hooks -> T8 svg -> T7 html
#         -> T9 reel -> T10 social -> assets(jpg) -> T12 qa. Publish handled separately.
set -uo pipefail
SD="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SD")"
LOCAL_LLM="${LOCAL_LLM:-$HOME/bin/hermes-local.sh}"
if [[ ! -x "$LOCAL_LLM" ]]; then
  LOCAL_LLM="$HOME/bin/gemma.sh"
fi
HERMES_TAKEOVER="${HERMES_TAKEOVER:-0}"
CLAUDE_ENABLED="${CLAUDE_ENABLED:-1}"

SLUG="" BRAND="" KEYWORD="" GAP="" DEGRADED=0
for a in "$@"; do case "$a" in
  --brand=*) BRAND="${a#--brand=}";; --keyword=*) KEYWORD="${a#--keyword=}";; --gap=*) GAP="${a#--gap=}";;
  --degraded) DEGRADED=1;; --*) echo "unknown flag $a">&2; exit 2;; *) SLUG="$a";; esac; done
[[ -n "$SLUG" && -n "$BRAND" ]] || { echo "usage: build-post.sh <slug> --brand=silver|tech [--keyword=] [--degraded]">&2; exit 2; }
KEYWORD="${KEYWORD:-$(echo "$SLUG" | tr '-' ' ')}"
DIR="$BLOG_DIR/$SLUG"; mkdir -p "$DIR"
log(){ echo "[build-post:$SLUG] $*"; }
STATUS="$DIR/_status.json"; declare -a DONE=()
mark(){ DONE+=("$1"); printf '{"slug":"%s","stages":[%s],"degraded":%s,"ts":"%s"}\n' "$SLUG" "$(printf '"%s",' "${DONE[@]}" | sed 's/,$//')" "$DEGRADED" "$(date -u +%FT%TZ)" > "$STATUS"; }

# Claude availability probe (once). Hermes takeover intentionally avoids Claude
# so the scheduled path can run without external API quota.
CLAUDE_OK=0
if [[ $DEGRADED -eq 0 && "$HERMES_TAKEOVER" != "1" && "$CLAUDE_ENABLED" != "0" ]]; then
  if echo "ok" | claude -p "reply ok" --allowedTools "" 2>/dev/null | grep -qi ok; then CLAUDE_OK=1; else log "claude unavailable -> degraded"; fi
fi

# ── T1 research (Claude only outside Hermes takeover, optional) ──
if [[ $CLAUDE_OK -eq 1 ]]; then
  log "T1 research"; "$SD/research.sh" "$SLUG" --keyword="$KEYWORD" --gap="$GAP" --out="$DIR/research.json" 2>&1 | sed 's/^/  /' && mark research || log "research failed (continue)"
fi

# ── ensure a draft exists ──
if [[ ! -f "$DIR/gemma_draft.md" ]]; then
  log "no gemma_draft.md — generating outline via local model (structural reference only)"
  { echo "Write a 10-bullet outline for an article titled \"$KEYWORD\". Stay on the exact title promise; do not substitute an adjacent topic. Each bullet = one H2 section topic. At least half the bullets must include the title's core terms or close synonyms. Plain text, no prose, no sentences. One line per bullet."; } | "$LOCAL_LLM" > "$DIR/gemma_draft.md" 2>/dev/null || true
fi
# gemma_draft.md is structural reference; write-article writes the real article

# ── T5 write (local Phi-4 first in Hermes takeover, otherwise Claude) or degraded copy ──
if [[ "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" ]]; then
  log "T5 write via local Phi-4"
  HERMES_TAKEOVER=1 LOCAL_LLM="$LOCAL_LLM" \
    "$SD/write-article.sh" "$SLUG" --brand="$BRAND" --keyword="$KEYWORD" 2>&1 | sed 's/^/  /'
  WRC=${PIPESTATUS[0]}
  case "$WRC" in
    0) mark write-local;;
    4) log "T5 local write DEFERRED -> empty/error, no article written. Keep for retry."; mark write-deferred; log "DONE. stages: ${DONE[*]}"; exit 0;;
    *) if [[ ! -s "$DIR/verified.md" ]]; then
         log "T5 local write DEFERRED -> exit $WRC with no usable article. Keep for retry."
         mark write-deferred; log "DONE. stages: ${DONE[*]}"; exit 0
       fi
       log "local write lint-failed (verified.md written, continue)"; mark write-warn;;
  esac
elif [[ $CLAUDE_OK -eq 1 ]]; then
  log "T5 write"
  # Skip if verified.md already exists and passes lint (e.g. pre-written by a manual run)
  if [[ -s "$DIR/verified.md" ]] && node "$SD/lint-draft.mjs" "$DIR/verified.md" --out="$DIR/lint.json" --quiet 2>/dev/null; then
    log "T5 write: verified.md exists and lint passes — skipping rewrite"
    mark write
  else
    "$SD/write-article.sh" "$SLUG" --brand="$BRAND" --keyword="$KEYWORD" 2>&1 | sed 's/^/  /'
    WRC=${PIPESTATUS[0]}
    LIMIT_RE="hit your limit|usage limit|session limit|rate limit|your limit has been reached|limit reached|resets [0-9]"
    case "$WRC" in
      0) mark write;;
      4) log "T5 write DEFERRED -> claude limit/empty, no article written. Keep for retry."; mark write-deferred; log "DONE. stages: ${DONE[*]}"; exit 0;;
      *) # Non-zero, non-4. Only a lint-warn if a REAL article landed. If verified.md is
         # missing/empty or holds a limit message, this is an outage -> DEFER, never warn
         # (warn -> FATAL no-verified.md -> parent quarantines as a quality fault).
         if [[ ! -s "$DIR/verified.md" ]] || head -40 "$DIR/verified.md" 2>/dev/null | grep -qiE "$LIMIT_RE"; then
           rm -f "$DIR/verified.md"
           log "T5 write DEFERRED -> exit $WRC with no usable article (claude limit/outage). Keep for retry."
           mark write-deferred; log "DONE. stages: ${DONE[*]}"; exit 0
         fi
         log "write lint-failed (verified.md written, continue)"; mark write-warn;;
    esac
  fi
else
  log "T5 degraded: gemma draft -> verified.md + lint (claude unavailable)"
  # Strip gemma header (everything through first ---) then prepend proper title
  awk 'BEGIN{p=0} /^---$/{if(!p){p=1;next}} p{print}' "$DIR/gemma_draft.md" > "$DIR/verified.md"
  CLEAN_TITLE=$(echo "$KEYWORD" | python3 -c "import sys; t=sys.stdin.read().strip(); print(' '.join(w.capitalize() for w in t.split()))")
  { printf '# %s\n\n' "$CLEAN_TITLE"; cat "$DIR/verified.md"; } > "$DIR/verified.md.tmp" && mv "$DIR/verified.md.tmp" "$DIR/verified.md"
  node "$SD/lint-draft.mjs" "$DIR/verified.md" --out="$DIR/lint.json" --quiet || log "  lint flagged violations (degraded)"
fi
[[ -s "$DIR/verified.md" ]] || { log "FATAL: no verified.md"; exit 1; }

# ── meta.json (derive if absent) ──
if [[ ! -f "$DIR/meta.json" ]]; then
  log "meta.json: deriving"
  TITLE=$(grep -m1 '^# ' "$DIR/verified.md" | sed 's/^# *//' | sed 's/^GEMMA DRAFT[[:space:]]*—[[:space:]]*//' | tr -d '\r')
  [[ -z "$TITLE" ]] && TITLE=$(echo "$KEYWORD" | sed 's/.*/\u&/')
  DESC=$(HERMES_LOCAL_MAX_TOKENS=60 GEMMA_MAX_TOKENS=60 bash -c "echo \"Write a 150-character SEO meta description for an article titled '$TITLE'. One line, no quotes.\" | '$LOCAL_LLM'" 2>/dev/null | tr '\n' ' ' | sed 's/  */ /g' | cut -c1-160)
  ALT=$(HERMES_LOCAL_MAX_TOKENS=30 GEMMA_MAX_TOKENS=30 bash -c "echo \"Write 6-word alt text for the hero image of an article titled '$TITLE'. No quotes.\" | '$LOCAL_LLM'" 2>/dev/null | tr -d '\n"' | cut -c1-90)
  if [[ "$BRAND" == "silver" ]]; then T1="Silver"; T2="Investing"; else T1="Local Business"; T2="Marketing"; fi
  BLOGDIR="$BLOG_DIR" TITLE="$TITLE" DESC="${DESC:-$TITLE}" ALT="${ALT:-$TITLE}" SLUG="$SLUG" BRAND="$BRAND" T1="$T1" T2="$T2" python3 -c '
import json, os, datetime, re
def clean(s, fallback):
    s = re.sub(r"\*+", "", s)                       # strip markdown bold/italic
    s = re.sub(r"(?i)option\s*\d+\s*\([^)]*\)\s*:?", "", s)  # strip "Option N (...):"
    s = re.sub(r"(?i)\b(here( is|s)|sure|alt text|option)\b[: ]*", "", s)
    s = re.sub(r"\.\s*\d.*$", ".", s)               # drop trailing ".2 (F" style junk
    s = re.sub(r"\s*\([^)]*$", "", s)               # drop trailing unclosed "(..."
    s = s.strip(" \t:-—\"" + "‘’")
    s = re.sub(r"\s{2,}", " ", s)
    return s if (len(s) >= 8 and re.search(r"[A-Za-z]", s)) else fallback
title = os.environ["TITLE"]
d = {"title":title, "slug":os.environ["SLUG"],
     "description":clean(os.environ["DESC"], title),
     "alt":clean(os.environ["ALT"], title),
     "date":datetime.date.today().isoformat(),
     "tags":[os.environ["T1"], os.environ["T2"]], "brand":os.environ["BRAND"]}
json.dump(d, open(os.path.join(os.environ["BLOGDIR"], os.environ["SLUG"], "meta.json"), "w"), indent=2)
'
fi
mark meta

# ── internal links (deterministic, curl-verified) — into verified.md before html ──
log "internal links"; node "$SD/build-links.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' && mark links || log "links failed (continue)"

# ── T6 hooks (gemma) ──
log "T6 hooks"; "$SD/build-hooks.sh" "$SLUG" --brand="$BRAND" 2>&1 | sed 's/^/  /' >/dev/null && mark hooks || log "hooks failed"

# ── T8 svg (deterministic) ──
log "T8 svg"; node "$SD/build-svg.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' && mark svg || log "svg failed"

# ── T7 html (deterministic) ──
log "T7 html"; node "$SD/build-html.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' && mark html || log "html failed"

# ── Pexels photos (SOP §8) — inject figures into index.html ──
log "pexels"; "$SD/build-pexels.sh" "$SLUG" --keyword="$KEYWORD" --brand="$BRAND" 2>&1 | sed 's/^/  /' && mark pexels || log "pexels skipped/failed (continue)"

# ── T9 reel (deterministic+) ──
log "T9 reel"; "$SD/build-reel.sh" "$SLUG" --brand="$BRAND" --keyword="$KEYWORD" 2>&1 | sed 's/^/  /' && mark reel || log "reel failed"

# ── T10 social (gemma) ──
log "T10 social"; "$SD/build-social.sh" "$SLUG" --brand="$BRAND" 2>&1 | sed 's/^/  /' && mark social || log "social failed"

# ── Optional Claude enhancement stages ──
# These are useful, but they are not production-critical. They can consume plan quota
# and hang behind launchd, so the daily path skips them unless explicitly enabled.
run_claude() { # $1=prompt $2=timeout_secs
  perl -e 'alarm shift; exec @ARGV or exit 127' "$2" \
    claude -p "$1" --allowedTools "Bash,Read,Write,Edit,Glob,Grep,Skill" </dev/null 2>/dev/null
}
RUN_CLAUDE_ENHANCEMENTS="${RUN_CLAUDE_ENHANCEMENTS:-0}"
CLAUDE_ENHANCEMENT_TIMEOUT="${CLAUDE_ENHANCEMENT_TIMEOUT:-180}"
if [[ $CLAUDE_OK -eq 1 && "$RUN_CLAUDE_ENHANCEMENTS" == "1" && "$CLAUDE_ENABLED" != "0" ]]; then
  log "social-ad skill"
  run_claude "Run the social-ad skill for blog post slug $SLUG (folder public/blog/$SLUG). Read public/blog/MASTER_CONTEXT-$BRAND.md for brand context. Generate 2 organic ad SVG templates, convert to JPG via Chrome headless, run the named-entity check, and append the file paths to public/blog/$SLUG/social-copy.json under organic_ads[]. Do not commit or deploy." "$CLAUDE_ENHANCEMENT_TIMEOUT" \
    | tail -2 | sed 's/^/  /' && mark social-ad || log "social-ad failed (continue)"
  log "ugc-script skill"
  run_claude "Run the ugc-script skill for slug $SLUG (folder public/blog/$SLUG). Read public/blog/MASTER_CONTEXT-$BRAND.md. Write 2 A/B UGC script variants to public/blog/$SLUG/ugc-script.md. Validate: no em dashes, no standalone %, hook <=8 words, 60-95 words per variant. Do not commit or deploy." "$CLAUDE_ENHANCEMENT_TIMEOUT" \
    | tail -2 | sed 's/^/  /' && mark ugc || log "ugc failed (continue)"
elif [[ $CLAUDE_OK -eq 1 ]]; then
  log "Claude enhancement stages skipped (set RUN_CLAUDE_ENHANCEMENTS=1 to enable)"
fi

# ── assets: jpg from svg (Chrome headless), pexels (best-effort) ──
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ -x "$CHROME" ]]; then
  for pair in "hero.svg:hero.jpg:1200,630" "photo-post.svg:photo-post.jpg:1200,1200"; do
    src="${pair%%:*}"; rest="${pair#*:}"; out="${rest%%:*}"; size="${rest#*:}"
    if [[ -f "$DIR/$src" ]]; then
      "$CHROME" --headless=new --disable-gpu --screenshot=/tmp/bp-tmp.png --window-size="$size" "file://$DIR/$src" 2>/dev/null \
        && sips -s format jpeg /tmp/bp-tmp.png --out "$DIR/$out" -s formatOptions 85 >/dev/null 2>&1 && rm -f /tmp/bp-tmp.png
    fi
  done
  [[ -s "$DIR/hero.jpg" ]] && mark assets || log "assets: hero.jpg not generated"
else
  log "assets: Chrome not found, skipping jpg (svg still present)"
fi

# ── SVG entity gate (SOP §13) ──
if grep -lEn "&[a-zA-Z]+;" "$DIR"/*.svg >/dev/null 2>&1; then
  log "WARN: named entity in an SVG — fix before publish"
fi

# ── T11 deterministic artifact gate ──
PUBLISH_OK=1
log "T11 deterministic artifact QA"
if node "$SD/qa-local.mjs" --slug="$SLUG" --out="$DIR/qa.json" 2>&1 | sed 's/^/  /'; then
  mark qa-local-pass
else
  log "qa FAILED -> deterministic artifact gate blocked publish"
  mark qa-local-fail
  PUBLISH_OK=0
fi

# ── T12 brain QA (Hermes first, Claude optional) ──
if [[ $PUBLISH_OK -eq 1 && -f "$DIR/index.html" && ( "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" || $CLAUDE_OK -eq 1 ) ]]; then
  log "T12 brain qa-gate"
  "$SD/qa-gate.sh" "$SLUG" 2>&1 | sed 's/^/  /'
  QA_RC=${PIPESTATUS[0]}
  case "$QA_RC" in
    0) mark qa-brain-pass;;
    3) if [[ "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" ]]; then
         log "qa brain unavailable -> deterministic gate already passed; continuing"
         mark qa-brain-skipped
       else
         log "qa DEFERRED -> brain-stage outage, NOT a quality failure. Keep for retry."
         mark qa-deferred
         PUBLISH_OK=0
       fi;;
    *) log "qa FAILED -> not registering for publish"; mark qa-fail; PUBLISH_OK=0;;
  esac
fi

# ── register for publish (posts.json + topic-history) — only if qa passed/degraded ──
if [[ $PUBLISH_OK -eq 1 ]]; then
  log "posts.json entry"; node "$SD/add-to-posts.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' && mark postsjson || log "posts.json failed"
  log "topic-history append"
  BLOGDIR="$BLOG_DIR" SLUG="$SLUG" BRAND="$BRAND" KEYWORD="$KEYWORD" TODAY="$(date +%F)" python3 - <<'PY' && mark topic-history || log "topic-history failed"
import os
bd=os.environ["BLOGDIR"]; slug=os.environ["SLUG"]; brand=os.environ["BRAND"]
today=os.environ["TODAY"]; kw=os.environ["KEYWORD"]
path=os.path.join(bd,"topic-history.md")
section="## Silver Posts" if brand=="silver" else "## Tech Posts"
row=f"| {today} | {slug} | General | {kw} |"
default=("## Tech Posts\n\n| Date | Slug | Broad Category | Angle |\n|------|------|----------------|-------|\n\n"
         "## Silver Posts\n\n| Date | Slug | Broad Category | Angle |\n|------|------|----------------|-------|\n")
text=open(path).read() if os.path.exists(path) else default
if slug in text:
    print("topic-history: already present"); raise SystemExit(0)

def insert(text, section, row):
    lines=text.splitlines(); res=[]; i=0; done=False
    while i < len(lines):
        res.append(lines[i])
        if not done and lines[i].strip()==section:
            j=i+1
            while j < len(lines) and not (("|" in lines[j]) and set(lines[j].strip()) <= set("|-: ")):
                res.append(lines[j]); j+=1
            if j < len(lines):
                res.append(lines[j]); res.append(row); i=j; done=True
        i+=1
    if not done:
        res += ["", section, "", "| Date | Slug | Broad Category | Angle |", "|------|------|----------------|-------|", row]
    return "\n".join(res)

open(path,"w").write(insert(text, section, row)+"\n")
print(f"topic-history: appended {slug} under {section}")
PY
else
  log "SKIP posts.json/topic-history (qa failed). Post built but not registered."
fi

log "DONE. stages: ${DONE[*]}"
[[ $PUBLISH_OK -eq 1 ]] && log "registered for publish (posts.json + topic-history)" || log "NOT registered (qa failed) — review $DIR/qa.json"
log "artifacts in $DIR"
