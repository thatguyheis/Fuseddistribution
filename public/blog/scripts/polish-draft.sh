#!/usr/bin/env bash
# T5 polish — the Claude brain stage. Takes a rough gemma draft and produces a
# clean verified.md: applies §9 writing rules, handles [VERIFY] stats, then gates
# on the T4 linter and loops claude up to 2x to fix any remaining violations.
#
# Usage:
#   polish-draft.sh <slug>
#   polish-draft.sh --in=draft.md --out=verified.md [--research=research.json]
#
# Brain = `claude -p` (Claude Code, no API key). Scoped context: the draft only,
# not the full SOP. Writes verified.md + lint.json next to the output.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"
LINT="$SCRIPT_DIR/lint-draft.mjs"

IN="" OUT="" RESEARCH="" SLUG=""
for a in "$@"; do
  case "$a" in
    --in=*) IN="${a#--in=}" ;;
    --out=*) OUT="${a#--out=}" ;;
    --research=*) RESEARCH="${a#--research=}" ;;
    --*) echo "unknown flag: $a" >&2; exit 2 ;;
    *) SLUG="$a" ;;
  esac
done

if [[ -n "$SLUG" ]]; then
  IN="${IN:-$BLOG_DIR/$SLUG/gemma_draft.md}"
  OUT="${OUT:-$BLOG_DIR/$SLUG/verified.md}"
  RESEARCH="${RESEARCH:-$BLOG_DIR/$SLUG/research.json}"
fi
[[ -z "$IN" || -z "$OUT" ]] && { echo "usage: polish-draft.sh <slug> | --in= --out=" >&2; exit 2; }
[[ -f "$IN" ]] || { echo "error: input not found: $IN" >&2; exit 2; }
LINT_OUT="$(dirname "$OUT")/lint.json"

RULES='HARD RULES (violations = rewrite the sentence):
- No em dashes or en dashes. Use a comma, period, or two sentences.
- No AI buzzwords: leverage, utilize, streamline, facilitate, foster, harness, empower, elevate, revolutionize, embark, robust, seamlessly, cutting-edge, holistic, paradigm, ecosystem, synergy, cornerstone, testament, landscape, realm, beacon, catalyst, transformative, groundbreaking.
- No hedging: "it is important to note", "it is worth mentioning", "needless to say".
- No filler transitions: moreover, furthermore, additionally, consequently, notably, thus, indeed.
- No filler openers: "In today'\''s landscape", "When it comes to", "In an era of", "In recent years".
- No banned phrases: dive in, delve into, bridge the gap, a testament to, in this article, master the art of.
- Plain, direct, second person. Short sentences, varied length. Use contractions.'

RESEARCH_BLOCK=""
if [[ -n "$RESEARCH" && -f "$RESEARCH" ]]; then
  RESEARCH_BLOCK="
Sourced stats available (use to replace [VERIFY] markers; keep [VERIFY] only if no source fits):
$(cat "$RESEARCH")
"
fi

run_claude() {  # prompt on stdin -> polished markdown on stdout
  claude -p "$(cat)" --allowedTools "" 2>/dev/null
}

echo "[polish] pass 1: $IN -> $OUT"
{
  echo "Polish this blog draft. Edit only what violates the rules. Do NOT rewrite from scratch, do NOT change the meaning, do NOT add sections."
  echo "Replace [VERIFY] markers with a real sourced stat if one is provided below; otherwise leave [VERIFY] in place."
  echo "Output ONLY the polished markdown article. No preamble, no commentary, no code fences."
  echo ""
  echo "$RULES"
  echo "$RESEARCH_BLOCK"
  echo "--- DRAFT ---"
  cat "$IN"
} | run_claude > "$OUT"

[[ -s "$OUT" ]] || { echo "error: claude produced empty output" >&2; exit 1; }

# Lint gate + fix loop (max 2 fix passes)
for attempt in 1 2 3; do
  if node "$LINT" "$OUT" --out="$LINT_OUT" --quiet; then
    echo "[polish] lint PASS (attempt $attempt)"
    node "$LINT" "$OUT" --quiet >/dev/null || true
    echo "[polish] done: $OUT  (lint: $LINT_OUT)"
    exit 0
  fi
  echo "[polish] lint found violations (attempt $attempt) — fixing"
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
    echo "$RULES"
    echo "--- MARKDOWN ---"
    cat "$OUT"
  } | run_claude > "$OUT.tmp" && [[ -s "$OUT.tmp" ]] && mv "$OUT.tmp" "$OUT"
done

echo "[polish] WARNING: lint still failing after fixes. Remaining: $VIOLATIONS" >&2
echo "[polish] wrote $OUT (lint: $LINT_OUT) — needs manual review" >&2
exit 1
