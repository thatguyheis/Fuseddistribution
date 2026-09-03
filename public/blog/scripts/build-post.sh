#!/usr/bin/env bash
# Orchestrator — runs the decoupled per-slug pipeline. File -> file, each stage a
# separate process. Hermes/local LLM owns the scheduled path; Codex owns
# recovery and editorial review. Legacy Claude branches remain non-default only
# so historical runs are diagnosable, not as a production dependency.
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
ARTICLE_MODEL="${HERMES_ARTICLE_MODEL:-${HERMES_LOCAL_MODEL:-gemma3:4b-it-qat}}"
LEAF_MODEL="${HERMES_LEAF_MODEL:-hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF:Q4_K_M}"
STRUCTURED_MODEL="${HERMES_STRUCTURED_MODEL:-gemma3:4b-it-qat}"
QA_MODEL="${HERMES_QA_MODEL:-gemma3:4b-it-qat}"
if [[ ! -x "$LOCAL_LLM" ]]; then
  LOCAL_LLM="$HOME/bin/gemma.sh"
fi
HERMES_TAKEOVER="${HERMES_TAKEOVER:-1}"
CLAUDE_ENABLED="${CLAUDE_ENABLED:-0}"

SLUG="" BRAND="" KEYWORD="" GAP="" DEGRADED=0 FORCE=0
for a in "$@"; do case "$a" in
  --brand=*) BRAND="${a#--brand=}";; --keyword=*) KEYWORD="${a#--keyword=}";; --gap=*) GAP="${a#--gap=}";;
  --degraded) DEGRADED=1;; --force) FORCE=1;; --*) echo "unknown flag $a">&2; exit 2;; *) SLUG="$a";; esac; done
[[ -n "$SLUG" && -n "$BRAND" ]] || { echo "usage: build-post.sh <slug> --brand=silver|tech [--keyword=] [--degraded] [--force]">&2; exit 2; }
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
if [[ ! -f "$DIR/gemma_draft.md" && ! -f "$DIR/content-plan.json" ]]; then
  log "no gemma_draft.md — generating outline via local model (structural reference only)"
  { echo "Write a 10-bullet outline for an article titled \"$KEYWORD\". Stay on the exact title promise; do not substitute an adjacent topic. Each bullet = one H2 section topic. At least half the bullets must include the title's core terms or close synonyms. Plain text, no prose, no sentences. One line per bullet."; } | "$LOCAL_LLM" > "$DIR/gemma_draft.md" 2>/dev/null || true
fi
# gemma_draft.md is structural reference; write-article writes the real article

# ── T5 write. A Codex-authored content plan activates resumable local worker
# segments. Posts without a plan retain the proven legacy writer. ──
if [[ "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" ]]; then
  if [[ $FORCE -eq 0 && -s "$DIR/verified.md" ]] && node "$SD/lint-draft.mjs" "$DIR/verified.md" --out="$DIR/lint.json" --quiet 2>/dev/null; then
    log "T5 local write: verified.md exists and lint passes — resuming downstream stages"
    mark write-local-resume
  else
    if [[ -f "$DIR/content-plan.json" ]]; then
      log "T5 segmented write from Codex master plan"
      SEGMENTED_FORCE=()
      [[ $FORCE -eq 1 ]] && SEGMENTED_FORCE+=(--force)
      HERMES_TAKEOVER=1 LOCAL_LLM="$LOCAL_LLM" HERMES_LOCAL_MODEL="$ARTICLE_MODEL" \
        node "$SD/write-segmented-article.mjs" "$SLUG" "${SEGMENTED_FORCE[@]}" 2>&1 | sed 's/^/  /'
      WRITER_STAGE="write-segmented"
    else
      log "T5 write via legacy local model path"
      HERMES_TAKEOVER=1 LOCAL_LLM="$LOCAL_LLM" HERMES_LOCAL_MODEL="$ARTICLE_MODEL" \
        "$SD/write-article.sh" "$SLUG" --brand="$BRAND" --keyword="$KEYWORD" 2>&1 | sed 's/^/  /'
      WRITER_STAGE="write-local"
    fi
    WRC=${PIPESTATUS[0]}
    case "$WRC" in
      0) mark "$WRITER_STAGE";;
      4) log "T5 local write DEFERRED -> empty/error, no article written. Keep for retry."; mark write-deferred; log "DONE. stages: ${DONE[*]}"; exit 0;;
      5) log "T5 local write QUALITY BLOCKED -> structural requirements were not met."; mark write-quality-fail; log "DONE. stages: ${DONE[*]}"; exit 0;;
      *) if [[ ! -s "$DIR/verified.md" ]]; then
           log "T5 local write DEFERRED -> exit $WRC with no usable article. Keep for retry."
           mark write-deferred; log "DONE. stages: ${DONE[*]}"; exit 0
         fi
         log "local write lint-failed (verified.md written, continue)"; mark write-warn;;
    esac
  fi
elif [[ $CLAUDE_OK -eq 1 ]]; then
  log "T5 write"
  # Skip if verified.md already exists and passes lint (e.g. pre-written by a manual run)
  if [[ -s "$DIR/verified.md" ]] && node "$SD/lint-draft.mjs" "$DIR/verified.md" --out="$DIR/lint.json" --quiet 2>/dev/null; then
    log "T5 write: verified.md exists and lint passes — skipping rewrite"
    mark write
  else
    HERMES_LOCAL_MODEL="$ARTICLE_MODEL" "$SD/write-article.sh" "$SLUG" --brand="$BRAND" --keyword="$KEYWORD" 2>&1 | sed 's/^/  /'
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
if [[ $FORCE -eq 1 || ! -f "$DIR/meta.json" ]]; then
  log "meta.json: deriving"
  TITLE=$(grep -m1 '^# ' "$DIR/verified.md" | sed 's/^# *//' | sed 's/^GEMMA DRAFT[[:space:]]*—[[:space:]]*//' | tr -d '\r')
  [[ -z "$TITLE" ]] && TITLE=$(echo "$KEYWORD" | sed 's/.*/\u&/')
  DESC=$(HERMES_LOCAL_MAX_TOKENS=60 GEMMA_MAX_TOKENS=60 HERMES_LOCAL_MODEL="$STRUCTURED_MODEL" bash -c "echo \"Write a 150-character SEO meta description for an article titled '$TITLE'. One line, no quotes.\" | '$LOCAL_LLM'" 2>/dev/null | tr '\n' ' ' | sed 's/  */ /g' | cut -c1-160)
  ALT=$(HERMES_LOCAL_MAX_TOKENS=30 GEMMA_MAX_TOKENS=30 HERMES_LOCAL_MODEL="$STRUCTURED_MODEL" bash -c "echo \"Write 6-word alt text for a hero image of an article titled '$TITLE'. No quotes.\" | '$LOCAL_LLM'" 2>/dev/null | tr -d '\n"' | cut -c1-90)
  if [[ "$BRAND" == "silver" ]]; then T1="Silver"; T2="Investing"; else T1="Local Business"; T2="Marketing"; fi
  BLOGDIR="$BLOG_DIR" TITLE="$TITLE" DESC="${DESC:-$TITLE}" ALT="${ALT:-$TITLE}" SLUG="$SLUG" BRAND="$BRAND" T1="$T1" T2="$T2" python3 -c '
import json, os, datetime, re
def clean(s, fallback):
    # Same broad match as qa-local.mjs preamble blocker. Gemma frequently echoes
    # the instruction ("Here are six-word alt text options: 1) ... 2) ...")
    # without the word "image", so a surgical strip below misses it and the
    # leftover list garbage passes clean() only to be blocked later by QA.
    # Once this pattern is seen at all, do not try to salvage a line from the
    # list -- fall back to the deterministic title-based value.
    if re.search(r"(?i)\bhere (?:are|is)\b.*(?:six-word|6-word).*(?:alt texts?|options?)\b", s):
        return fallback
    s = re.sub(r"\*+", "", s)                       # strip markdown bold/italic
    s = re.sub(r"\s*[–—]\s*", " - ", s)            # keep metadata inside the deterministic style gate
    s = re.sub(r"(?i)^here (?:are|is)\s+(?:six-word|6-word)?\s*(?:alt texts?|options?)\s+(?:for\s+)?(?:the\s+)?(?:hero\s+)?image\s*:\s*(?:\d+[.)]?\s*)?", "", s)
    s = re.sub(r"^\s*\d+[.)]\s*", "", s)           # keep only the first clean option
    s = re.sub(r"(?i)option\s*\d+\s*\([^)]*\)\s*:?", "", s)  # strip "Option N (...):"
    s = re.sub(r"(?i)\b(here( is|s)|sure|alt text|option)\b[: ]*", "", s)
    s = re.sub(r"\.\s*\d.*$", ".", s)               # drop trailing ".2 (F" style junk
    s = re.sub(r"\s*\([^)]*$", "", s)               # drop trailing unclosed "(..."
    s = s.strip(" \t:-—\"" + "‘’")
    s = re.sub(r"\s{2,}", " ", s)
    return s if (len(s) >= 8 and re.search(r"[A-Za-z]", s)) else fallback
def fixed_alt(value, title):
    words = re.findall(r"[A-Za-z0-9]+", value)
    if len(words) != 6:
        words = re.findall(r"[A-Za-z0-9]+", title)[:6]
    while len(words) < 6:
        words.append("detail")
    return " ".join(words[:6])
def fixed_description(value, title):
    value = re.sub(r"\s*[–—]\s*", ", ", value or "")
    value = re.sub(r"\s+", " ", value).strip(" \"")
    if 140 <= len(value) <= 160 and not re.search(r"(?i)best deal|lowest price|buy now|do not miss", value):
        return value
    value = f"{title}: compare premiums, payment fees, shipping, and total purchase cost before you buy from any dealer."
    while len(value) < 140:
        value += " Review the complete cost and terms before ordering."
    return value[:160].rstrip(" ,.;:")
title = os.environ["TITLE"]
d = {"title":title, "slug":os.environ["SLUG"],
     "description":fixed_description(clean(os.environ["DESC"], title), title),
     "alt":fixed_alt(clean(os.environ["ALT"], title), title),
     "date":os.environ.get("BLOG_PUBLISH_DATE") or datetime.date.today().isoformat(),
     "tags":[os.environ["T1"], os.environ["T2"]], "brand":os.environ["BRAND"]}
json.dump(d, open(os.path.join(os.environ["BLOGDIR"], os.environ["SLUG"], "meta.json"), "w"), indent=2)
'
fi
mark meta

# ── internal links (deterministic, curl-verified) — into verified.md before html ──
log "internal links"; node "$SD/build-links.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' && mark links || log "links failed (continue)"

# ── T6 hooks (gemma) ──
if [[ $FORCE -eq 0 ]] && jq -e '.hook and .discussion_question and .hashtags' "$DIR/hooks.json" >/dev/null 2>&1; then
  log "T6 hooks: valid checkpoint exists — resuming"
  mark hooks-resume
else
  log "T6 hooks"; HERMES_LOCAL_MODEL="$LEAF_MODEL" "$SD/build-hooks.sh" "$SLUG" --brand="$BRAND" 2>&1 | sed 's/^/  /' >/dev/null && mark hooks || log "hooks failed"
fi

# ── T8 svg (deterministic) ──
log "T8 svg"; node "$SD/build-svg.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' && mark svg || log "svg failed"

# ── T7 html (deterministic) ──
log "T7 html"; node "$SD/build-html.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' && mark html || log "html failed"

# ── Pexels photos (SOP §8) — inject figures into index.html ──
log "pexels"; "$SD/build-pexels.sh" "$SLUG" --keyword="$KEYWORD" --brand="$BRAND" 2>&1 | sed 's/^/  /' && mark pexels || log "pexels skipped/failed (continue)"

# ── T8b chart (brain + deterministic validator) — body chart, reel-data ## chart,
#    hero key_stat sync. Enhancement stage: never blocks publish. Runs before reel
#    so reel-data picks up the chart, and re-runs svg so the hero gets the mini chart. ──
log "T8b chart"
if [[ $FORCE -eq 0 ]] && jq -e 'type == "object" and (has("skipped") or has("type") or has("series"))' "$DIR/chart.json" >/dev/null 2>&1; then
  log "chart: valid checkpoint exists — resuming"
  if ! grep -q '"skipped": *true' "$DIR/chart.json" 2>/dev/null; then
    node "$SD/build-chart-inject.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' || log "chart: checkpoint reinjection failed"
    node "$SD/build-svg.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' || log "chart: svg re-run failed"
    mark chart-resume
  fi
elif HERMES_TAKEOVER="${HERMES_TAKEOVER:-0}" CLAUDE_ENABLED="${CLAUDE_ENABLED:-1}" LOCAL_LLM="${LOCAL_LLM:-}" HERMES_LOCAL_MODEL="$STRUCTURED_MODEL" \
   "$SD/build-chart.sh" "$SLUG" --brand="$BRAND" 2>&1 | sed 's/^/  /'; then
  if [[ -f "$DIR/chart.json" ]] && ! grep -q '"skipped": *true' "$DIR/chart.json" 2>/dev/null; then
    node "$SD/build-svg.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' || log "chart: svg re-run failed (hero keeps stat card)"
    mark chart
  else
    log "chart: no chartable data — post ships without chart"
  fi
else
  log "chart failed (continue — enhancement only)"
fi

log "custom graphic fallback"; node "$SD/ensure-custom-graphic.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' || log "custom graphic fallback failed"

# ── T9 reel (deterministic+) ──
log "T9 reel"; "$SD/build-reel.sh" "$SLUG" --brand="$BRAND" --keyword="$KEYWORD" 2>&1 | sed 's/^/  /' && mark reel || log "reel failed"

# ── T10 social (gemma) ──
if [[ $FORCE -eq 0 ]] && jq -e --arg slug "$SLUG" '.slug == $slug and (.reel.x | type == "string" and length <= 280) and (.discussion_question | endswith("?"))' "$DIR/social-copy.json" >/dev/null 2>&1; then
  log "T10 social: valid checkpoint exists — resuming"
  mark social-resume
else
  log "T10 social"; HERMES_LOCAL_MODEL="$STRUCTURED_MODEL" "$SD/build-social.sh" "$SLUG" --brand="$BRAND" 2>&1 | sed 's/^/  /' && mark social || log "social failed"
fi

# Keep the blog honest while the rendered reel waits for release or social
# publication. The panel is replaced by sync-social-video-links.mjs later.
log "pending reel slot"; node "$SD/sync-pending-reel-slot.mjs" --slug="$SLUG" 2>&1 | sed 's/^/  /' || log "pending reel slot skipped"

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

# ── T11 preflight artifact gate ──
# Run the deterministic checks before image rendering. The checks cover the
# generated HTML, social copy, and reel timing, so a known-bad post cannot
# spend time producing JPG assets only to be quarantined by the identical
# final gate later in this pipeline.
log "T11 preflight artifact QA"
if node "$SD/qa-local.mjs" --slug="$SLUG" --out="$DIR/qa-preflight.json" 2>&1 | sed 's/^/  /'; then
  mark qa-preflight-pass
else
  log "preflight FAILED -> deterministic artifact gate blocked asset rendering and publish"
  mark qa-preflight-fail
  log "DONE. stages: ${DONE[*]}"
  exit 0
fi

# ── assets: jpg from svg (libvips via sharp), pexels (best-effort) ──
# Do not launch the full macOS Chrome app from an automation sandbox. Chrome
# aborts during LaunchServices registration before headless rendering begins.
ASSET_RENDER_FAILED=0
for pair in "hero.svg:hero.jpg:1200:630" "photo-post.svg:photo-post.jpg:1200:1200"; do
  src="${pair%%:*}"; rest="${pair#*:}"
  out="${rest%%:*}"; rest="${rest#*:}"
  width="${rest%%:*}"; height="${rest#*:}"
  if [[ -f "$DIR/$src" ]]; then
    node "$SD/render-svg-jpg.mjs" \
      --input="$DIR/$src" --output="$DIR/$out" \
      --width="$width" --height="$height" --quality=85 \
      2>&1 | sed 's/^/  /' || ASSET_RENDER_FAILED=1
  fi
done
if [[ $ASSET_RENDER_FAILED -eq 0 && -s "$DIR/hero.jpg" && -s "$DIR/photo-post.jpg" ]]; then
  mark assets
else
  log "assets: required JPG rendering failed; post will remain pending for retry"
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
  if HERMES_LOCAL_MODEL="$QA_MODEL" "$SD/qa-gate.sh" "$SLUG" 2>&1 | sed 's/^/  /'; then
    QA_RC=0
  else
    QA_RC=$?
  fi
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
  BLOGDIR="$BLOG_DIR" SLUG="$SLUG" BRAND="$BRAND" KEYWORD="$KEYWORD" TODAY="${BLOG_PUBLISH_DATE:-$(date +%F)}" python3 - <<'PY' && mark topic-history || log "topic-history failed"
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
