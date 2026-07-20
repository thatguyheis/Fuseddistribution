#!/usr/bin/env bash
# T5 write-article — writes the full article from keyword + research.
# Hermes takeover mode uses the configured local LLM helper. Claude remains available
# when CLAUDE_ENABLED=1 and HERMES_TAKEOVER is not set.
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
HERMES_TAKEOVER="${HERMES_TAKEOVER:-0}"
CLAUDE_ENABLED="${CLAUDE_ENABLED:-1}"
ARTICLE_MAX_TOKENS="${HERMES_ARTICLE_MAX_TOKENS:-2200}"
ARTICLE_TIMEOUT_SECONDS="${HERMES_ARTICLE_TIMEOUT_SECONDS:-900}"

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
  if [[ "$HERMES_TAKEOVER" == "1" || "$CLAUDE_ENABLED" == "0" ]]; then
    HERMES_LOCAL_MAX_TOKENS="$ARTICLE_MAX_TOKENS" \
      HERMES_LOCAL_TIMEOUT="$(( ARTICLE_TIMEOUT_SECONDS - 30 ))" \
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
' "$LOCAL_LLM" "$ARTICLE_TIMEOUT_SECONDS"
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

if [[ ! -s "$OUT.raw" ]]; then
  rm -f "$OUT.raw"; echo "error: writer produced empty output" >&2; exit 4
fi
if head -40 "$OUT.raw" | is_limit; then
  rm -f "$OUT.raw"
  echo "error: writer returned a limit/error message, not an article — DEFER (not writing $OUT)" >&2
  exit 4
fi

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

for shape_attempt in 1 2; do
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
done

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
