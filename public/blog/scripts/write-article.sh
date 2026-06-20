#!/usr/bin/env bash
# T5 write-article — Claude writes the full article from keyword + research.
# Replaces polish-draft.sh. Gemma draft used as structural reference only.
# Output: verified.md (lint-clean) + lint.json
#
# Usage: write-article.sh <slug>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"
LINT="$SCRIPT_DIR/lint-draft.mjs"

SLUG=""
for a in "$@"; do
  case "$a" in
    --*) echo "unknown flag: $a" >&2; exit 2 ;;
    *) SLUG="$a" ;;
  esac
done
[[ -n "$SLUG" ]] || { echo "usage: write-article.sh <slug>" >&2; exit 2; }

DIR="$BLOG_DIR/$SLUG"
META="$DIR/meta.json"
RESEARCH="$DIR/research.json"
DRAFT="$DIR/gemma_draft.md"
OUT="$DIR/verified.md"
LINT_OUT="$DIR/lint.json"

[[ -f "$META" ]] || { echo "error: meta.json not found — run meta stage first" >&2; exit 1; }

KEYWORD=$(python3 -c "import json,sys; d=json.load(open('$META')); print(d.get('description','')[:120])" 2>/dev/null || echo "$SLUG")
TITLE=$(python3 -c "import json,sys; d=json.load(open('$META')); print(d.get('title',''))" 2>/dev/null || echo "")
BRAND=$(python3 -c "import json,sys; d=json.load(open('$META')); print(d.get('brand','silver'))" 2>/dev/null || echo "silver")

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

run_claude() {
  claude -p "$(cat)" --allowedTools "" 2>/dev/null
}

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
- Answer-first opening: lead with the most useful information, not context-setting
- H2 headings that deliver on the title promise (no generic headings like "Introduction")
- Every H2 section must have unique content — no repeated sentences or paragraphs across sections
- Include at least 3 of the sourced stats above, cited inline
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

Output ONLY the markdown article. Start with # Title. No preamble, no commentary, no code fences.
PROMPT
} | run_claude > "$OUT"

[[ -s "$OUT" ]] || { echo "error: claude produced empty output" >&2; exit 1; }

# Lint gate + fix loop (max 2 passes)
for attempt in 1 2 3; do
  if node "$LINT" "$OUT" --out="$LINT_OUT" --quiet; then
    echo "[write-article] lint PASS (attempt $attempt) -> $OUT"
    exit 0
  fi
  echo "[write-article] lint violations (attempt $attempt) — fixing"
  VIOLATIONS=$(node "$LINT" "$OUT" 2>/dev/null | python3 -c '
import json,sys
d=json.load(sys.stdin)
terms=[t["term"] for t in d["banned"]+d["hedging"]+d["filler_transitions"]+d["openers"]]
extra=[]
if d["em_dash"]: extra.append("em dash")
if d["en_dash"]: extra.append("en dash")
print(", ".join(extra+terms))' || echo "")
  [[ $attempt -ge 3 ]] && break
  {
    echo "Fix these style violations in the markdown below. Remove/replace ONLY these, keep everything else identical. Output ONLY the corrected markdown, no commentary, no code fences."
    echo "Violations to remove: $VIOLATIONS"
    echo ""
    echo "--- MARKDOWN ---"
    cat "$OUT"
  } | run_claude > "$OUT.tmp" && [[ -s "$OUT.tmp" ]] && mv "$OUT.tmp" "$OUT"
done

echo "[write-article] WARNING: lint still failing after fixes. Violations: $VIOLATIONS" >&2
echo "[write-article] wrote $OUT (needs review)" >&2
exit 1
