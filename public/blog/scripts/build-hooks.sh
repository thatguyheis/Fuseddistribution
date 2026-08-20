#!/usr/bin/env bash
# T6 hooks — local LLM leaf stage. Reads verified.md, writes hooks.json.
# The model fills small focused prompts; Python guarantees valid JSON +
# deterministic hashtag sets. Output schema:
#   { hook, hook_type, key_stat:{value,label}, discussion_question, hashtags }
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"
LOCAL_LLM="${LOCAL_LLM:-$HOME/bin/hermes-local.sh}"
MODEL_TIMEOUT_SECONDS="${BLOG_LEAF_MODEL_TIMEOUT_SECONDS:-120}"
if [[ ! -x "$LOCAL_LLM" ]]; then
  LOCAL_LLM="$HOME/bin/gemma.sh"
fi

SLUG="" IN="" OUT="" BRAND="silver"
for a in "$@"; do case "$a" in
  --in=*) IN="${a#--in=}";; --out=*) OUT="${a#--out=}";; --brand=*) BRAND="${a#--brand=}";;
  --*) echo "unknown flag $a">&2; exit 2;; *) SLUG="$a";; esac; done
if [[ -n "$SLUG" ]]; then IN="${IN:-$BLOG_DIR/$SLUG/verified.md}"; OUT="${OUT:-$BLOG_DIR/$SLUG/hooks.json}"; fi
[[ -f "$IN" ]] || { echo "error: no input $IN">&2; exit 2; }

# Leaf prompts need the answer-first body, headings, and ending rather than the
# entire long article. Keep local inference bounded while preserving topic arc.
BODY="$( { head -c 5000 "$IN"; printf '\n\n--- remaining headings ---\n'; grep '^## ' "$IN" || true; printf '\n\n--- ending ---\n'; tail -c 900 "$IN"; } )"
g() {
  HERMES_LOCAL_MAX_TOKENS="$2" GEMMA_MAX_TOKENS="$2" \
    perl -e 'alarm shift; exec @ARGV or exit 127' "$MODEL_TIMEOUT_SECONDS" "$LOCAL_LLM" "$1" 2>/dev/null \
    | tr -d '\r' | grep -v '^$' | head -1
}

HOOK=$(g "From this article, write ONE punchy hook line (max 14 words) using the strongest number or claim. No quotes, no hashtags, one line only:

$BODY" 60)
DQ=$(g "Write ONE short opinion-inviting question (max 16 words) to close a social caption for this article. One line, no quotes:

$BODY" 50)

# Hashtags — deterministic per brand (SOP §14)
if [[ "$BRAND" == "silver" ]]; then HASHTAGS="#SilverInvesting #PreciousMetals #SilverBugs #HardAssets #InflationHedge"
else HASHTAGS="#LocalBusiness #SmallBusinessTips #DigitalMarketing #GoogleMyBusiness #WebDesign"; fi

# Assemble JSON; key_stat via regex (first percent or number+label), gemma fallback for hook_type.
HOOK="$HOOK" DQ="$DQ" HASHTAGS="$HASHTAGS" BODY="$BODY" OUT="$OUT" python3 <<'PY'
import json, os, re
body = os.environ["BODY"]; hook = os.environ["HOOK"].strip() or "Key insight from the post."
# key_stat: first "NN%" or "$NN" with a short label from surrounding words
m = re.search(r'(\d[\d,]*\.?\d*\s?%|\$\s?\d[\d,]*\.?\d*)', body)
if m:
    value = m.group(1).replace(" ", "")
    tail = body[m.end():m.end()+60]
    words = re.findall(r"[A-Za-z][A-Za-z'-]*", tail)[:4]
    label = " ".join(words).strip() or "of buyers"
else:
    value, label = "", ""
ht = "contrarian_stat" if "%" in value else ("immediate_value" if value else "pain_point")
out = {
    "hook": hook,
    "hook_type": ht,
    "key_stat": {"value": value, "label": label},
    "discussion_question": os.environ["DQ"].strip() or "What's your take?",
    "hashtags": os.environ["HASHTAGS"],
}
open(os.environ["OUT"], "w").write(json.dumps(out, indent=2))
print(json.dumps(out, indent=2))
PY
echo "[hooks] wrote $OUT" >&2
