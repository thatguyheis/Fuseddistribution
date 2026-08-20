#!/usr/bin/env bash
# T5 write-article — writes the full article from keyword + research.
# The production path uses the configured local LLM helper. Codex owns review
# and recovery; the legacy Claude branch is disabled by default.
# Replaces polish-draft.sh. Local drafts are used as structural reference only.
# Output: verified.md (lint-clean) + lint.json
#
# Usage: write-article.sh <slug>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"
LINT="$SCRIPT_DIR/lint-draft.mjs"
LOCAL_LLM="${LOCAL_LLM:-$HOME/bin/hermes-local.sh}"
if [[ ! -x "$LOCAL_LLM" ]]; then
  LOCAL_LLM="$HOME/bin/gemma.sh"
fi
HERMES_TAKEOVER="${HERMES_TAKEOVER:-1}"
CLAUDE_ENABLED="${CLAUDE_ENABLED:-0}"
ARTICLE_MAX_TOKENS="${HERMES_ARTICLE_MAX_TOKENS:-2200}"
ARTICLE_TIMEOUT_SECONDS="${HERMES_ARTICLE_TIMEOUT_SECONDS:-900}"
ARTICLE_SHAPE_REWRITE_ATTEMPTS="${HERMES_ARTICLE_SHAPE_REWRITE_ATTEMPTS:-1}"

SLUG="" KEYWORD_ARG="" BRAND_ARG=""
for a in "$@"; do
  case "$a" in
    --keyword=*) KEYWORD_ARG="${a#--keyword=}" ;;
    --brand=*) BRAND_ARG="${a#--brand=}" ;;
    --*) echo "unknown flag: $a" >&2; exit 2 ;;
    *) SLUG="$a" ;;
  esac
done
[[ -n "$SLUG" ]] || { echo "usage: write-article.sh <slug> [--brand=silver|tech] [--keyword=...]" >&2; exit 2; }

DIR="$BLOG_DIR/$SLUG"
META="$DIR/meta.json"
RESEARCH="$DIR/research.json"
DRAFT="$DIR/gemma_draft.md"
OUT="$DIR/verified.md"
LINT_OUT="$DIR/lint.json"

if [[ -f "$META" ]]; then
  KEYWORD=$(python3 -c "import json,sys; d=json.load(open('$META')); print(d.get('description','')[:120])" 2>/dev/null || echo "$SLUG")
  TITLE=$(python3 -c "import json,sys,re; d=json.load(open('$META')); t=d.get('title',''); print(re.sub(r'^GEMMA DRAFT\s*[—-]\s*','',t,flags=re.I))" 2>/dev/null || echo "")
  BRAND=$(python3 -c "import json,sys; d=json.load(open('$META')); print(d.get('brand','silver'))" 2>/dev/null || echo "silver")
else
  KEYWORD="${KEYWORD_ARG:-$(echo "$SLUG" | tr '-' ' ')}"
  TITLE=$(echo "$KEYWORD" | python3 -c "import sys; print(sys.stdin.read().strip().title())")
  BRAND="${BRAND_ARG:-silver}"
fi

if [[ "$BRAND" == "silver" ]]; then
  BRAND_VOICE="Silver and precious metals investing. Fused Distribution sells silver. First-person business voice (\"we stock\", \"we recommend\"). Audience: US retail buyers, beginner to intermediate investors."
else
  BRAND_VOICE="Local business marketing and web design. Fused Distribution builds websites and runs SEO for small local businesses. First-person business voice. Audience: US small business owners, non-technical."
fi

RESEARCH_BLOCK=""
if [[ -f "$RESEARCH" ]]; then
  RESEARCH_BLOCK="
SOURCED STATS (use these; cite source inline as 'Source: Name'):
$(python3 -c "
import json
d=json.load(open('$RESEARCH'))
for s in d.get('stats',[]):
    print(f\"- {s['claim']} (Source: {s['source_name']})\")
" 2>/dev/null || cat "$RESEARCH")
"
fi

DRAFT_BLOCK=""
if [[ -f "$DRAFT" ]]; then
  DRAFT_BLOCK="
ROUGH DRAFT (structural reference only — do NOT copy sentences verbatim; rewrite everything):
$(head -80 "$DRAFT")
"
fi

run_writer() {
  local writer_max_tokens="${WRITER_MAX_TOKENS:-$ARTICLE_MAX_TOKENS}"
  local writer_timeout_seconds="${WRITER_TIMEOUT_SECONDS:-$ARTICLE_TIMEOUT_SECONDS}"
  if [[ "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" ]]; then
    HERMES_LOCAL_MAX_TOKENS="$writer_max_tokens" \
      HERMES_LOCAL_TIMEOUT="$(( writer_timeout_seconds - 30 ))" \
      python3 -c '
import os
import subprocess
import sys

helper, timeout = sys.argv[1], int(sys.argv[2])
prompt = sys.stdin.read()
try:
    result = subprocess.run(
        [helper, prompt],
        env=os.environ,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        timeout=timeout,
        check=False,
    )
except subprocess.TimeoutExpired:
    raise SystemExit(124)
sys.stdout.write(result.stdout)
raise SystemExit(result.returncode)
' "$LOCAL_LLM" "$writer_timeout_seconds"
  else
    claude -p "$(cat)" --allowedTools "" 2>/dev/null
  fi
}

# Sentinels that mean Claude returned a limit/error message instead of an article.
# Exit 4 = limit hit -> caller should DEFER, never write this text into the post.
LIMIT_RE="hit your limit|usage limit|session limit|rate limit|your limit has been reached|limit reached|resets [0-9]"
is_limit() { grep -qiE "$LIMIT_RE"; }

echo "[write-article] writing: $SLUG"

{
cat <<PROMPT
Write a complete, publish-ready blog post for the following.

Title: $TITLE
Brand context: $BRAND_VOICE
$RESEARCH_BLOCK
$DRAFT_BLOCK

REQUIREMENTS:
- 1200-1800 words total
- 8-12 substantive H2 sections so the article can produce a complete long form reel
- Topic contract is mandatory: the title, slug, keyword, H2s, body, examples, CTA, reel source material, and social source material must all answer the same reader problem
- If the rough draft or research reference conflicts with the title/keyword, ignore the conflicting reference and write to the title/keyword
- The first 250 words must name the title topic directly and answer the reader's expected question
- At least half of H2 headings must directly deliver part of the title promise or a clear synonym
- Supporting topics can appear only when they help the title topic; do not let local SEO, Google Business Profile, reviews, website design, or silver investing take over an unrelated article
- Answer-first opening: lead with the most useful information, not context-setting
- H2 headings that deliver on the title promise (no generic headings like "Introduction")
- Every H2 section must have unique content — no repeated sentences or paragraphs across sections
- Include at least 3 of the sourced stats above, cited inline
- Of the stats you include, at least 3 must be COMPARABLE and SAME-UNIT (all percentages, or all dollar amounts) so the automated chart stage can turn them into a bar chart; quote each value exactly as given (no rounding, no reformatting)
- Never attribute a number, statistic, or claim to a named organization, study, platform, or publication unless it appears in the SOURCED STATS list above; if that list is empty, make no named-source claims at all (no "According to X", no "(Source: X)", no "X data shows")
- Specific, actionable advice (scripts, numbers, timing, exact steps — not vague guidance)
- Short sentences, varied length, plain language
- No em dashes or en dashes (use commas or periods instead)
- No AI buzzwords: leverage, utilize, streamline, facilitate, foster, harness, empower, elevate, revolutionize, embark, robust, seamlessly, cutting-edge, holistic, paradigm, ecosystem, synergy, cornerstone, testament, landscape, realm, beacon, catalyst, transformative, groundbreaking
- No hedging phrases: "it is important to note", "it is worth mentioning", "needless to say"
- No filler transitions: moreover, furthermore, additionally, consequently, notably, thus, indeed
- No filler openers: "In today's landscape", "When it comes to", "In an era of", "In recent years"
- No banned phrases: dive in, delve into, bridge the gap, a testament to, in this article, master the art of
- Second person (you/your) throughout
- No conclusion section titled "Conclusion" — end with a forward-looking action paragraph
- No placeholder syntax of any kind: do NOT write [INTERNAL-LINK: ...], [LINK: ...], [INSERT: ...], or any bracketed placeholders — write real sentences with no placeholders; internal links are added by a separate automated stage

Output ONLY the markdown article. Start with # Title. No preamble, no commentary, no code fences.
PROMPT
} | run_writer > "$OUT.raw" || true
# NOTE: `|| true` is REQUIRED. claude -p exits non-zero on a usage/session limit.
# With `set -euo pipefail`, an un-guarded pipeline would abort the script HERE,
# before the is_limit defer guard below — leaving a limit message in $OUT.raw and
# returning a generic failure that the caller mislabels as a quality fault
# (write-warn) and quarantines. Keep going so the guard can DEFER (exit 4) instead.

# The style linter intentionally does not enforce article size. Without this
# structural gate, a short but clean local-model response becomes a permanent
# resume checkpoint, then fails the required reel stage on every later run.
article_shape_ok() {
  python3 - "$1" <<'PY'
import re
import sys

text = open(sys.argv[1], encoding="utf-8").read()
word_count = len(re.findall(r"\b[\w'-]+\b", text))
h2_count = len(re.findall(r"^##\s+\S", text, flags=re.M))
raise SystemExit(0 if word_count >= 1100 and 8 <= h2_count <= 12 else 1)
PY
}

# When a full-article pass keeps coming back too short, fall back to
# section-by-section assembly so the same slug does not defer forever.
build_sectioned_article() {
  local seed_path="$1"
  local outline="$DIR/section-outline.txt"
  local outline_raw="$DIR/section-outline.raw"
  local opening_raw="$DIR/section-opening.raw"
  local section_raw="$DIR/section-body.raw"
  local section_tmp="$DIR/section-body.tmp"
  local assembled="$DIR/sectioned-article.tmp"

  python3 - "$seed_path" "$outline" <<'PY'
import re
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8")
headings = []
for line in text.splitlines():
    stripped = line.strip()
    if re.match(r"^##\s+\S", stripped):
        cleaned = re.sub(r"\s+", " ", stripped)
        if cleaned not in headings:
            headings.append(cleaned)
if 8 <= len(headings) <= 12:
    Path(sys.argv[2]).write_text("\n".join(headings) + "\n", encoding="utf-8")
else:
    Path(sys.argv[2]).write_text("", encoding="utf-8")
PY

  if [[ ! -s "$outline" ]]; then
    local outline_attempt=1
    while (( outline_attempt <= 2 )); do
      {
        cat <<PROMPT
Create a publish-ready blog outline.

Title: $TITLE
Brand context: $BRAND_VOICE
$RESEARCH_BLOCK

Requirements:
- Output exactly 8 H2 headings, one per line.
- Every line must start with ## and contain only the heading text.
- At least half of the headings must directly answer the title promise or use a close synonym.
- Supporting headings may appear only when they clearly help the exact title topic.
- No numbering, bullets, notes, or commentary.
PROMPT
      } | WRITER_MAX_TOKENS=180 WRITER_TIMEOUT_SECONDS=60 run_writer > "$outline_raw" || true
      if [[ -s "$outline_raw" ]] && ! head -40 "$outline_raw" | is_limit; then
        break
      fi
      rm -f "$outline_raw"
      outline_attempt=$(( outline_attempt + 1 ))
    done
    if [[ ! -s "$outline_raw" ]]; then
      rm -f "$outline" "$opening_raw" "$section_raw" "$section_tmp" "$assembled"
      return 1
    fi
    python3 - "$outline_raw" "$outline" <<'PY'
import re
import sys
from pathlib import Path

raw = Path(sys.argv[1]).read_text(encoding="utf-8")
headings = []
for line in raw.splitlines():
    stripped = line.strip().lstrip("-*0123456789. ").strip()
    if not stripped:
        continue
    stripped = re.sub(r"^##\s*", "", stripped)
    if not stripped:
        continue
    cleaned = f"## {re.sub(r'\s+', ' ', stripped)}"
    if cleaned not in headings:
        headings.append(cleaned)
if 8 <= len(headings) <= 12:
    Path(sys.argv[2]).write_text("\n".join(headings) + "\n", encoding="utf-8")
else:
    Path(sys.argv[2]).write_text("", encoding="utf-8")
PY
  fi

  if [[ ! -s "$outline" ]]; then
    rm -f "$outline" "$outline_raw" "$opening_raw" "$section_raw" "$section_tmp" "$assembled"
    return 1
  fi

  local opening_attempt=1
  while (( opening_attempt <= 2 )); do
    {
      cat <<PROMPT
Write ONLY the opening for this markdown article.

Title: $TITLE
Brand context: $BRAND_VOICE
$RESEARCH_BLOCK

Requirements:
- Start with exactly: # $TITLE
- 170-220 words.
- Answer the reader's question in the first paragraph.
- Stay on the exact title topic.
- Preview the practical sections that follow.
- No H2 headings, bullets, code fences, preamble, or conclusion label.
- No em dashes or en dashes.
- No new named sources beyond the sourced stats list.
PROMPT
    } | WRITER_MAX_TOKENS=320 WRITER_TIMEOUT_SECONDS=90 run_writer > "$opening_raw" || true
    if [[ -s "$opening_raw" ]] && ! head -40 "$opening_raw" | is_limit; then
      break
    fi
    rm -f "$opening_raw"
    opening_attempt=$(( opening_attempt + 1 ))
  done

  if [[ ! -s "$opening_raw" ]]; then
    rm -f "$outline" "$outline_raw" "$opening_raw" "$section_raw" "$section_tmp" "$assembled"
    return 1
  fi

  python3 - "$opening_raw" "$assembled" "$TITLE" <<'PY'
import re
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8")
lines = []
for line in text.splitlines():
    stripped = line.strip()
    if stripped.startswith("#"):
        continue
    lines.append(line.rstrip())
body = "\n".join(lines).strip()
body = re.sub(r"\n{3,}", "\n\n", body)
Path(sys.argv[2]).write_text(f"# {sys.argv[3]}\n\n{body}\n", encoding="utf-8")
PY

  local headings=()
  while IFS= read -r heading_line; do
    [[ -n "$heading_line" ]] && headings+=("$heading_line")
  done < "$outline"
  if (( ${#headings[@]} == 0 )); then
    rm -f "$outline" "$outline_raw" "$opening_raw" "$section_raw" "$section_tmp" "$assembled"
    return 1
  fi
  local index=0
  for heading in "${headings[@]}"; do
    index=$(( index + 1 ))
    local use_stats=""
    if [[ -n "$RESEARCH_BLOCK" && "$index" -le 3 ]]; then
      use_stats="- Use at least one sourced stat when it naturally fits and cite it inline."
    fi
    local section_attempt=1
    while (( section_attempt <= 2 )); do
      {
        cat <<PROMPT
Write ONLY one markdown section for this article.

Article title: $TITLE
Heading: ${heading#\#\# }
Brand context: $BRAND_VOICE
$RESEARCH_BLOCK

Requirements:
- First line must be the heading text only.
- 120-170 words.
- 2-3 short paragraphs.
- Stay on the exact article topic.
$use_stats
- No bullets, intro preamble, conclusion label, code fences, or extra headings.
- No em dashes or en dashes.
- No new named sources beyond the sourced stats list.
PROMPT
      } | WRITER_MAX_TOKENS=260 WRITER_TIMEOUT_SECONDS=90 run_writer > "$section_raw" || true
      if [[ -s "$section_raw" ]] && ! head -40 "$section_raw" | is_limit; then
        break
      fi
      rm -f "$section_raw"
      section_attempt=$(( section_attempt + 1 ))
    done

    if [[ ! -s "$section_raw" ]]; then
      rm -f "$outline" "$outline_raw" "$opening_raw" "$section_raw" "$section_tmp" "$assembled"
      return 1
    fi

    python3 - "$section_raw" "$section_tmp" "$heading" <<'PY'
import re
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8")
body_lines = []
for line in text.splitlines():
    stripped = line.strip()
    if stripped.startswith("#"):
        continue
    body_lines.append(line.rstrip())
body = "\n".join(body_lines).strip()
body = re.sub(r"\n{3,}", "\n\n", body)
Path(sys.argv[2]).write_text(f"{sys.argv[3]}\n\n{body}\n", encoding="utf-8")
PY

    cat "$section_tmp" >> "$assembled"
    printf '\n' >> "$assembled"
  done

  if [[ -s "$assembled" ]] && article_shape_ok "$assembled"; then
    mv "$assembled" "$OUT.raw"
    rm -f "$outline" "$outline_raw" "$opening_raw" "$section_raw" "$section_tmp"
    return 0
  fi

  rm -f "$outline" "$outline_raw" "$opening_raw" "$section_raw" "$section_tmp" "$assembled"
  return 1
}

if [[ ! -s "$OUT.raw" ]]; then
  echo "[write-article] writer returned empty output; attempting section fallback" >&2
  seed_for_sections="$OUT.raw"
  [[ -f "$DRAFT" ]] && seed_for_sections="$DRAFT"
  if ! build_sectioned_article "$seed_for_sections"; then
    rm -f "$OUT.raw"
    echo "error: writer produced empty output" >&2
    exit 4
  fi
fi

if head -40 "$OUT.raw" | is_limit; then
  rm -f "$OUT.raw"
  echo "error: writer returned a limit/error message, not an article — DEFER (not writing $OUT)" >&2
  exit 4
fi

shape_attempt=1
while (( shape_attempt <= ARTICLE_SHAPE_REWRITE_ATTEMPTS )); do
  article_shape_ok "$OUT.raw" && break
  echo "[write-article] article is undersized; requesting structural rewrite (attempt $shape_attempt)" >&2
  {
    echo "Rewrite the markdown below as a complete 1200-1800 word article with 8-12 substantive H2 sections."
    echo "Keep the exact title and topic. Preserve only sourced claims and citations already present."
    echo "Add specific, useful detail without repetition, filler, invented statistics, or new named sources."
    echo "Use no em dashes or en dashes. Output only the full corrected markdown."
    echo ""
    echo "--- MARKDOWN ---"
    cat "$OUT.raw"
  } | run_writer > "$OUT.expanded" || true
  if [[ -s "$OUT.expanded" ]] && ! head -40 "$OUT.expanded" | is_limit; then
    mv "$OUT.expanded" "$OUT.raw"
  else
    rm -f "$OUT.expanded"
  fi
  shape_attempt=$(( shape_attempt + 1 ))
done

if ! article_shape_ok "$OUT.raw"; then
  echo "[write-article] article is still undersized; assembling section fallback" >&2
  if ! build_sectioned_article "$OUT.raw"; then
    rm -f "$OUT.raw" "$OUT.expanded"
    echo "error: writer did not produce 1100+ words with 8-12 H2 sections; quality block" >&2
    exit 5
  fi
fi

if ! article_shape_ok "$OUT.raw"; then
  rm -f "$OUT.raw" "$OUT.expanded"
  echo "error: writer did not produce 1100+ words with 8-12 H2 sections; deferring post" >&2
  exit 4
fi
mv "$OUT.raw" "$OUT"

# Deterministic dash sanitizer — local models keep emitting em/en dashes and the
# LLM fix loop cannot reliably remove them (root cause of 2026-06-25..07-02
# quarantines). Numeric ranges become hyphens; every other em/en dash becomes a
# spaced hyphen. Runs before every lint pass so the fix loop only handles wording.
sanitize_dashes() {
  python3 - "$1" <<'PY'
import re, sys
p = sys.argv[1]
t = open(p, encoding="utf-8").read()
t = re.sub(r'(?<=\d)\s*[–—]\s*(?=\d)', '-', t)   # 180–240 -> 180-240
t = re.sub(r'\s*[–—]\s*', ' - ', t)               # word—word -> word - word
open(p, "w", encoding="utf-8").write(t)
PY
}

# Lint gate + fix loop (max 2 passes)
for attempt in 1 2 3; do
  sanitize_dashes "$OUT"
  python3 "$SCRIPT_DIR/sanitize-draft.py" "$OUT"
  if node "$LINT" "$OUT" --out="$LINT_OUT" --quiet; then
    echo "[write-article] lint PASS (attempt $attempt) -> $OUT"
    exit 0
  fi
  echo "[write-article] lint violations (attempt $attempt) — fixing"
  VIOLATIONS=$(node "$LINT" "$OUT" 2>/dev/null | python3 -c '
import json,sys
d=json.load(sys.stdin)
terms=[t["term"] for t in d["banned"]+d["hedging"]+d["filler_transitions"]+d["openers"]+d.get("uncited_sources",[])]
extra=[]
if d["em_dash"]: extra.append("em dash")
if d["en_dash"]: extra.append("en dash")
print(", ".join(extra+terms))' || echo "")
  [[ $attempt -ge 3 ]] && break
  UNCITED_ONLY=$(node "$LINT" "$OUT" 2>/dev/null | python3 -c '
import json,sys
d=json.load(sys.stdin)
other=d["em_dash"]+d["en_dash"]+len(d["banned"])+len(d["hedging"])+len(d["filler_transitions"])+len(d["openers"])
print("1" if d.get("uncited_sources") and other == 0 else "0")' || echo "0")
  if [[ "$UNCITED_ONLY" == "1" ]]; then
    echo "[write-article] unsupported attribution requires source repair; skipping wasteful full-article model rewrite" >&2
    break
  fi
  {
    echo "Fix these style violations in the markdown below. Remove/replace ONLY these, keep everything else identical. Output ONLY the corrected markdown, no commentary, no code fences."
    echo "For any 'uncited stat attribution' violation: rewrite that sentence as a general claim with no named source and no invented number. Do not substitute a different source name."
    echo "Violations to remove: $VIOLATIONS"
    echo ""
    echo "--- MARKDOWN ---"
    cat "$OUT"
  } | run_writer > "$OUT.tmp" || true   # see note above: don't let a limit abort before the guard
  if [[ -s "$OUT.tmp" ]] && ! head -40 "$OUT.tmp" | is_limit; then
    mv "$OUT.tmp" "$OUT"
  else
    rm -f "$OUT.tmp"; echo "[write-article] fix pass hit limit/empty — keeping prior draft" >&2
  fi
done

echo "[write-article] WARNING: lint still failing after fixes. Violations: $VIOLATIONS" >&2
echo "[write-article] wrote $OUT (needs review)" >&2
exit 1
